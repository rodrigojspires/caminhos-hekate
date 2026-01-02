const { WebSocketServer } = require('ws')
const jwt = require('jsonwebtoken')
const path = require('path')

const prismaCandidates = [
  path.join(__dirname, '../../../packages/database/node_modules/.prisma/client'),
  path.join(__dirname, '../../../packages/database/node_modules/@prisma/client'),
  path.join(__dirname, '../../../node_modules/.prisma/client'),
  path.join(__dirname, '../../../node_modules/@prisma/client'),
  '@prisma/client'
]

let PrismaClient
let prismaSource = null
for (const candidate of prismaCandidates) {
  try {
    ;({ PrismaClient } = require(candidate))
    prismaSource = candidate
    break
  } catch (error) {
    // Try next candidate.
  }
}

if (!PrismaClient) {
  console.error('Prisma Client nao encontrado. Rode prisma generate e tente novamente.')
  process.exit(1)
}

const prisma = new PrismaClient()
console.log(`Prisma Client carregado de: ${prismaSource}`)

if (!prisma.communityMembership) {
  console.error('Prisma Client nao possui o model CommunityMembership. Rode prisma generate no packages/database.')
  const models = Object.keys(prisma).filter((key) => prisma[key]?.findMany)
  console.error('Models encontrados:', models)
  process.exit(1)
}

const PORT = Number(process.env.COMMUNITY_WS_PORT || 8082)
const SECRET = process.env.NEXTAUTH_SECRET

if (!SECRET) {
  console.error('NEXTAUTH_SECRET nao definido. Encerrando.')
  process.exit(1)
}

const clients = new Map()
const communityMembers = new Map()

function addClient(ws, userId) {
  clients.set(userId, { ws, userId, communityId: null, lastActivity: new Date() })
}

function removeClient(userId) {
  const client = clients.get(userId)
  if (client && client.communityId) {
    leaveCommunity(userId, client.communityId)
  }
  clients.delete(userId)
}

async function joinCommunity(userId, communityId) {
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { status: true }
  })
  if (!membership || membership.status !== 'active') {
    throw new Error('Acesso negado')
  }

  const client = clients.get(userId)
  if (client) {
    client.communityId = communityId
    client.lastActivity = new Date()
  }

  if (!communityMembers.has(communityId)) {
    communityMembers.set(communityId, new Set())
  }
  communityMembers.get(communityId).add(userId)
}

function leaveCommunity(userId, communityId) {
  const members = communityMembers.get(communityId)
  if (members) {
    members.delete(userId)
    if (members.size === 0) {
      communityMembers.delete(communityId)
    }
  }

  const client = clients.get(userId)
  if (client) {
    client.communityId = null
  }
}

async function sendMessage({ userId, communityId, content }) {
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { status: true }
  })
  if (!membership || membership.status !== 'active') {
    throw new Error('Acesso negado')
  }

  const message = await prisma.communityMessage.create({
    data: { communityId, authorId: userId, content },
    include: { author: { select: { id: true, name: true, image: true } } }
  })

  broadcastToCommunity(communityId, {
    type: 'new_message',
    message,
    timestamp: new Date().toISOString()
  })
}

function broadcastToCommunity(communityId, payload, excludeUserId) {
  const members = communityMembers.get(communityId)
  if (!members) return 0
  let sent = 0
  for (const memberId of members) {
    if (excludeUserId && memberId === excludeUserId) continue
    const client = clients.get(memberId)
    if (client && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify(payload))
      sent += 1
    }
  }
  return sent
}

function cleanupInactiveConnections() {
  const now = new Date()
  const timeout = 30 * 60 * 1000
  for (const [userId, client] of clients.entries()) {
    const inactiveTime = now.getTime() - client.lastActivity.getTime()
    if (inactiveTime > timeout || client.ws.readyState !== client.ws.OPEN) {
      removeClient(userId)
    }
  }
}

const wss = new WebSocketServer({ port: PORT })

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

wss.on('connection', (ws) => {
  let userId = null
  let communityId = null

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Conectado ao chat da comunidade',
    timestamp: new Date().toISOString()
  }))

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString())
      switch (data.type) {
        case 'authenticate': {
          const decoded = jwt.verify(data.token, SECRET)
          userId = decoded.sub
          if (!userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Token invalido' }))
            return
          }
          addClient(ws, userId)
          ws.send(JSON.stringify({ type: 'authenticated', userId }))
          break
        }
        case 'join_community': {
          if (!userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Nao autenticado' }))
            return
          }
          communityId = data.communityId
          if (!communityId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Comunidade nao informada' }))
            return
          }
          await joinCommunity(userId, communityId)
          ws.send(JSON.stringify({ type: 'joined_community', communityId }))
          break
        }
        case 'leave_community': {
          if (userId && communityId) {
            leaveCommunity(userId, communityId)
            communityId = null
          }
          break
        }
        case 'send_message': {
          if (!userId || !communityId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Nao autenticado' }))
            return
          }
          const content = String(data.content || '').trim()
          if (!content) {
            ws.send(JSON.stringify({ type: 'error', message: 'Mensagem vazia' }))
            return
          }
          await sendMessage({ userId, communityId, content })
          break
        }
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          break
        }
      }
    } catch (error) {
      console.error('WS error:', {
        userId,
        communityId,
        error: error instanceof Error ? error.message : error
      })
      ws.send(JSON.stringify({ type: 'error', message: 'Erro interno do servidor' }))
    }
  })

  ws.on('close', () => {
    if (userId) {
      removeClient(userId)
      if (communityId) {
        leaveCommunity(userId, communityId)
      }
    }
  })
})

setInterval(cleanupInactiveConnections, 5 * 60 * 1000)

console.log(`Community WS server iniciado na porta ${PORT}`)
