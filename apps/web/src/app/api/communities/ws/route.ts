import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { communityChatService } from '@/lib/community-chat'
import jwt from 'jsonwebtoken'

let communityWss: WebSocketServer | null = null

function initCommunityWebSocketServer() {
  if (!communityWss) {
    communityWss = new WebSocketServer({ port: 8082 })

    communityWss.on('connection', (ws) => {
      let userId: string | null = null
      let communityId: string | null = null

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Conectado ao chat da comunidade',
        timestamp: new Date().toISOString()
      }))

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString())

          switch (data.type) {
            case 'authenticate':
              try {
                const decoded = jwt.verify(data.token, process.env.NEXTAUTH_SECRET!) as any
                userId = decoded.sub
                if (!userId) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Token inválido' }))
                  return
                }
                communityChatService.addClient(ws, userId)
                ws.send(JSON.stringify({ type: 'authenticated', userId, timestamp: new Date().toISOString() }))
              } catch {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Token inválido' }))
              }
              break

            case 'join_community':
              if (!userId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Usuário não autenticado' }))
                return
              }
              communityId = data.communityId
              if (!communityId) {
                ws.send(JSON.stringify({ type: 'error', message: 'ID da comunidade não fornecido' }))
                return
              }
              try {
                await communityChatService.joinCommunity(userId, communityId)
                ws.send(JSON.stringify({ type: 'joined_community', communityId, timestamp: new Date().toISOString() }))
              } catch {
                ws.send(JSON.stringify({ type: 'error', message: 'Acesso negado à comunidade' }))
              }
              break

            case 'leave_community':
              if (userId && communityId) {
                communityChatService.leaveCommunity(userId, communityId)
                communityId = null
                ws.send(JSON.stringify({ type: 'left_community', timestamp: new Date().toISOString() }))
              }
              break

            case 'send_message':
              if (!userId || !communityId) {
                ws.send(JSON.stringify({ type: 'error', message: 'Usuário não autenticado ou sem comunidade' }))
                return
              }
              try {
                await communityChatService.sendMessage({
                  communityId,
                  userId,
                  content: data.content
                })
              } catch {
                ws.send(JSON.stringify({ type: 'error', message: 'Erro ao enviar mensagem' }))
              }
              break

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
              break
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Erro interno do servidor' }))
        }
      })

      ws.on('close', () => {
        if (userId) {
          communityChatService.removeClient(userId)
          if (communityId) {
            communityChatService.leaveCommunity(userId, communityId)
          }
        }
      })
    })
  }

  return communityWss
}

export async function GET(_request: NextRequest) {
  const server = initCommunityWebSocketServer()
  return new Response(JSON.stringify({
    status: 'Community WebSocket server running',
    port: 8082,
    clients: server.clients.size,
    url: '/communities-ws'
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
