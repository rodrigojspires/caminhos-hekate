import { WebSocket } from 'ws'
import { prisma } from '@hekate/database'
import { isMembershipActive } from '@/lib/community-membership'
import { z } from 'zod'

interface CommunityClient {
  ws: WebSocket
  userId: string
  communityId?: string
  lastActivity: Date
}

interface SendCommunityMessageData {
  communityId: string
  userId: string
  content: string
}

const messageSchema = z.object({
  content: z.string().min(1).max(2000)
})

class CommunityChatService {
  private clients: Map<string, CommunityClient> = new Map()
  private communityMembers: Map<string, Set<string>> = new Map()

  addClient(ws: WebSocket, userId: string) {
    this.clients.set(userId, {
      ws,
      userId,
      lastActivity: new Date()
    })
  }

  removeClient(userId: string) {
    const client = this.clients.get(userId)
    if (client?.communityId) {
      this.leaveCommunity(userId, client.communityId)
    }
    this.clients.delete(userId)
  }

  async joinCommunity(userId: string, communityId: string) {
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { status: true, paidUntil: true }
    })
    if (!isMembershipActive(membership)) {
      throw new Error('Usuário não é membro ativo da comunidade')
    }

    const client = this.clients.get(userId)
    if (client) {
      client.communityId = communityId
      client.lastActivity = new Date()
    }

    if (!this.communityMembers.has(communityId)) {
      this.communityMembers.set(communityId, new Set())
    }
    this.communityMembers.get(communityId)!.add(userId)

    this.broadcastToCommunity(communityId, {
      type: 'user_joined',
      userId,
      timestamp: new Date().toISOString()
    }, userId)
  }

  leaveCommunity(userId: string, communityId: string) {
    const members = this.communityMembers.get(communityId)
    if (members) {
      members.delete(userId)
      if (members.size === 0) {
        this.communityMembers.delete(communityId)
      }
    }

    const client = this.clients.get(userId)
    if (client) {
      client.communityId = undefined
    }

    this.broadcastToCommunity(communityId, {
      type: 'user_left',
      userId,
      timestamp: new Date().toISOString()
    }, userId)
  }

  async sendMessage(data: SendCommunityMessageData) {
    const validated = messageSchema.parse({ content: data.content })
    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: data.communityId, userId: data.userId } },
      select: { status: true, paidUntil: true }
    })
    if (!isMembershipActive(membership)) {
      throw new Error('Usuário não é membro ativo da comunidade')
    }

    const message = await prisma.communityMessage.create({
      data: {
        communityId: data.communityId,
        authorId: data.userId,
        content: validated.content
      },
      include: {
        author: { select: { id: true, name: true, image: true } }
      }
    })

    this.broadcastToCommunity(data.communityId, {
      type: 'new_message',
      message,
      timestamp: new Date().toISOString()
    })

    return message
  }

  broadcastToCommunity(communityId: string, payload: any, excludeUserId?: string) {
    const members = this.communityMembers.get(communityId)
    if (!members) return 0

    let sent = 0
    for (const userId of members) {
      if (excludeUserId && userId === excludeUserId) continue
      const client = this.clients.get(userId)
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(payload))
        sent += 1
      }
    }
    return sent
  }

  cleanupInactiveConnections() {
    const now = new Date()
    const timeout = 30 * 60 * 1000
    for (const [userId, client] of this.clients.entries()) {
      const inactiveTime = now.getTime() - client.lastActivity.getTime()
      if (inactiveTime > timeout || client.ws.readyState !== WebSocket.OPEN) {
        this.removeClient(userId)
      }
    }
  }
}

export const communityChatService = new CommunityChatService()

setInterval(() => {
  communityChatService.cleanupInactiveConnections()
}, 5 * 60 * 1000)
