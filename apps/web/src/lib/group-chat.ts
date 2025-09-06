import { WebSocket } from 'ws'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Tipos para o serviço de chat
interface GroupClient {
  ws: WebSocket
  userId: string
  groupId?: string
  lastActivity: Date
}

interface SendMessageData {
  groupId: string
  userId: string
  content: string
  replyToId?: string
  attachments?: string[]
}

interface EditMessageData {
  messageId: string
  userId: string
  content: string
}

interface DeleteMessageData {
  messageId: string
  userId: string
}

interface ReactionData {
  messageId: string
  userId: string
  emoji: string
}

// Validação de schemas
const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  replyToId: z.string().optional(),
  attachments: z.array(z.string()).optional()
})

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000)
})

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10)
})

class GroupChatService {
  private clients: Map<string, GroupClient> = new Map()
  private groupMembers: Map<string, Set<string>> = new Map()
  private typingUsers: Map<string, Set<string>> = new Map()
  
  // Adicionar cliente autenticado
  addClient(ws: WebSocket, userId: string) {
    this.clients.set(userId, {
      ws,
      userId,
      lastActivity: new Date()
    })
    
    console.log(`Cliente ${userId} conectado. Total: ${this.clients.size}`)
  }
  
  // Remover cliente
  removeClient(userId: string) {
    const client = this.clients.get(userId)
    if (client && client.groupId) {
      this.leaveGroup(userId, client.groupId)
    }
    
    this.clients.delete(userId)
    console.log(`Cliente ${userId} desconectado. Total: ${this.clients.size}`)
  }
  
  // Entrar em um grupo
  async joinGroup(userId: string, groupId: string, ws: WebSocket) {
    // Verificar se o usuário é membro do grupo
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupId,
        // isActive: true
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            // isActive: true
          }
        }
      }
    })
    
    if (!membership) { // || !membership.group.isActive) {
      throw new Error('Usuário não é membro do grupo ou grupo inativo')
    }
    
    // Atualizar cliente
    const client = this.clients.get(userId)
    if (client) {
      client.groupId = groupId
      client.lastActivity = new Date()
    }
    
    // Adicionar à lista de membros do grupo
    if (!this.groupMembers.has(groupId)) {
      this.groupMembers.set(groupId, new Set())
    }
    this.groupMembers.get(groupId)!.add(userId)
    
    // Notificar outros membros que o usuário entrou
    this.broadcastToGroup(groupId, {
      type: 'user_joined',
      userId,
      timestamp: new Date().toISOString()
    }, userId)
    
    console.log(`Usuário ${userId} entrou no grupo ${groupId}`)
  }
  
  // Sair de um grupo
  leaveGroup(userId: string, groupId: string) {
    // Remover da lista de membros do grupo
    const groupMembers = this.groupMembers.get(groupId)
    if (groupMembers) {
      groupMembers.delete(userId)
      if (groupMembers.size === 0) {
        this.groupMembers.delete(groupId)
      }
    }
    
    // Remover da lista de usuários digitando
    const typingUsers = this.typingUsers.get(groupId)
    if (typingUsers) {
      typingUsers.delete(userId)
      if (typingUsers.size === 0) {
        this.typingUsers.delete(groupId)
      }
    }
    
    // Atualizar cliente
    const client = this.clients.get(userId)
    if (client) {
      client.groupId = undefined
    }
    
    // Notificar outros membros que o usuário saiu
    this.broadcastToGroup(groupId, {
      type: 'user_left',
      userId,
      timestamp: new Date().toISOString()
    }, userId)
    
    console.log(`Usuário ${userId} saiu do grupo ${groupId}`)
  }
  
  // Enviar mensagem
  async sendMessage(data: SendMessageData) {
    // Validar dados
    const validatedData = messageSchema.parse({
      content: data.content,
      replyToId: data.replyToId,
      attachments: data.attachments
    })
    
    // Verificar se o usuário é membro do grupo
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: data.userId,
        groupId: data.groupId
        // isActive: true
      }
    })
    
    if (!membership) {
      throw new Error('Usuário não é membro do grupo')
    }
    
    // Criar mensagem no banco
    const message = await prisma.groupMessage.create({
      data: {
        groupId: data.groupId,
        authorId: data.userId,
        content: validatedData.content,
        replyToId: validatedData.replyToId,
        attachments: validatedData.attachments || []
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                name: true
              }
            }
          }
        },
        // reactions: {
        //   include: {
        //     user: {
        //       select: {
        //         id: true,
        //         name: true
        //       }
        //     }
        //   }
        // }
      }
    })
    
    // Atualizar estatísticas do grupo
    await prisma.group.update({
      where: { id: data.groupId },
      data: {
        // lastActivity: new Date(),
        // messageCount: {
        //   increment: 1
        // }
      }
    })
    
    // Broadcast da mensagem para todos os membros do grupo
    this.broadcastToGroup(data.groupId, {
      type: 'new_message',
      message,
      timestamp: new Date().toISOString()
    })
    
    return message
  }
  
  // Editar mensagem
  async editMessage(data: EditMessageData) {
    // Validar dados
    const validatedData = editMessageSchema.parse({
      content: data.content
    })
    
    // Buscar mensagem
    const message = await prisma.groupMessage.findUnique({
      where: { id: data.messageId },
      include: {
        group: true
      }
    })
    
    if (!message) {
      throw new Error('Mensagem não encontrada')
    }
    
    // Verificar permissões (autor ou admin/owner do grupo)
    if (message.authorId !== data.userId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: data.userId,
          groupId: message.groupId,
          role: { in: ['ADMIN', 'OWNER'] }
          // isActive: true
        }
      })
      
      if (!membership) {
        throw new Error('Sem permissão para editar esta mensagem')
      }
    }
    
    // Verificar janela de edição (24 horas)
    const editWindow = 24 * 60 * 60 * 1000 // 24 horas em ms
    const now = new Date()
    const messageAge = now.getTime() - message.createdAt.getTime()
    
    if (messageAge > editWindow && message.authorId === data.userId) {
      throw new Error('Tempo limite para edição expirado')
    }
    
    // Atualizar mensagem
    const updatedMessage = await prisma.groupMessage.update({
      where: { id: data.messageId },
      data: {
        content: validatedData.content,
        editedAt: new Date()
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                name: true
              }
            }
          }
        },
        // reactions: {
        //   include: {
        //     user: {
        //       select: {
        //         id: true,
        //         name: true
        //       }
        //     }
        //   }
        // }
      }
    })
    
    // Broadcast da mensagem editada
    this.broadcastToGroup(message.groupId, {
      type: 'message_edited',
      message: updatedMessage,
      timestamp: new Date().toISOString()
    })
    
    return updatedMessage
  }
  
  // Deletar mensagem
  async deleteMessage(data: DeleteMessageData) {
    // Buscar mensagem
    const message = await prisma.groupMessage.findUnique({
      where: { id: data.messageId },
      include: {
        group: true
      }
    })
    
    if (!message) {
      throw new Error('Mensagem não encontrada')
    }
    
    // Verificar permissões (autor ou admin/owner do grupo)
    if (message.authorId !== data.userId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: data.userId,
          groupId: message.groupId,
          role: { in: ['ADMIN', 'OWNER'] }
          // isActive: true
        }
      })
      
      if (!membership) {
        throw new Error('Sem permissão para deletar esta mensagem')
      }
    }
    
    // Soft delete da mensagem
    await prisma.groupMessage.update({
      where: { id: data.messageId },
      data: {
        // isActive: false,
        // deletedAt: new Date()
      }
    })
    
    // Atualizar contador de mensagens do grupo
    await prisma.group.update({
      where: { id: message.groupId },
      data: {
        // messageCount: {
        //   decrement: 1
        // }
      }
    })
    
    // Broadcast da mensagem deletada
    this.broadcastToGroup(message.groupId, {
      type: 'message_deleted',
      messageId: data.messageId,
      timestamp: new Date().toISOString()
    })
  }
  
  // Adicionar reação
  async addReaction(data: ReactionData) {
    // Validar dados
    const validatedData = reactionSchema.parse({
      emoji: data.emoji
    })
    
    // Verificar se a mensagem existe
    const message = await prisma.groupMessage.findUnique({
      where: { id: data.messageId }
    })
    
    if (!message) {
      throw new Error('Mensagem não encontrada')
    }
    
    // Verificar se o usuário é membro do grupo
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: data.userId,
        groupId: message.groupId
        // isActive: true
      }
    })
    
    if (!membership) {
      throw new Error('Usuário não é membro do grupo')
    }
    
    // Criar ou atualizar reação
    // const reaction = await prisma.messageReaction.upsert({
    //   where: {
    //     messageId_userId_emoji: {
    //       messageId: data.messageId,
    //       userId: data.userId,
    //       emoji: validatedData.emoji
    //     }
    //   },
    //   update: {
    //     // isActive: true
    //   },
    //   create: {
    //     messageId: data.messageId,
    //     userId: data.userId,
    //     emoji: validatedData.emoji
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         name: true
    //       }
    //     }
    //   }
    // })
    
    // Broadcast da reação
    const reaction = {
      userId: data.userId,
      emoji: validatedData.emoji,
    }
    this.broadcastToGroup(message.groupId, {
      type: 'reaction_added',
      messageId: data.messageId,
      reaction,
      timestamp: new Date().toISOString()
    })
    
    return reaction
  }
  
  // Remover reação
  async removeReaction(data: ReactionData) {
    // Validar dados
    const validatedData = reactionSchema.parse({
      emoji: data.emoji
    })
    
    // Verificar se a mensagem existe
    const message = await prisma.groupMessage.findUnique({
      where: { id: data.messageId }
    })
    
    if (!message) {
      throw new Error('Mensagem não encontrada')
    }
    
    // Remover reação
    // await prisma.messageReaction.updateMany({
    //   where: {
    //     messageId: data.messageId,
    //     userId: data.userId,
    //     emoji: validatedData.emoji
    //   },
    //   data: {
    //     // isActive: false
    //   }
    // })
    
    // Broadcast da remoção de reação
    this.broadcastToGroup(message.groupId, {
      type: 'reaction_removed',
      messageId: data.messageId,
      userId: data.userId,
      emoji: validatedData.emoji,
      timestamp: new Date().toISOString()
    })
  }
  
  // Broadcast de status de digitação
  broadcastTyping(groupId: string, userId: string, isTyping: boolean) {
    if (!this.typingUsers.has(groupId)) {
      this.typingUsers.set(groupId, new Set())
    }
    
    const typingUsers = this.typingUsers.get(groupId)!
    
    if (isTyping) {
      typingUsers.add(userId)
    } else {
      typingUsers.delete(userId)
    }
    
    // Broadcast para outros membros do grupo
    this.broadcastToGroup(groupId, {
      type: 'typing_update',
      userId,
      isTyping,
      typingUsers: Array.from(typingUsers),
      timestamp: new Date().toISOString()
    }, userId)
  }
  
  // Broadcast para todos os membros de um grupo
  broadcastToGroup(groupId: string, message: any, excludeUserId?: string): number {
    const groupMembers = this.groupMembers.get(groupId)
    if (!groupMembers) {
      return 0
    }
    
    let sentCount = 0
    
    for (const userId of groupMembers) {
      if (excludeUserId && userId === excludeUserId) {
        continue
      }
      
      const client = this.clients.get(userId)
      if (client && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message))
          sentCount++
        } catch (error) {
          console.error(`Erro ao enviar mensagem para ${userId}:`, error)
        }
      }
    }
    
    return sentCount
  }
  
  // Obter estatísticas
  getStats() {
    return {
      totalClients: this.clients.size,
      activeGroups: this.groupMembers.size,
      totalGroupMembers: Array.from(this.groupMembers.values())
        .reduce((total, members) => total + members.size, 0)
    }
  }
  
  // Limpar conexões inativas
  cleanupInactiveConnections() {
    const now = new Date()
    const timeout = 30 * 60 * 1000 // 30 minutos
    
    for (const [userId, client] of this.clients.entries()) {
      const inactiveTime = now.getTime() - client.lastActivity.getTime()
      
      if (inactiveTime > timeout || client.ws.readyState !== WebSocket.OPEN) {
        console.log(`Removendo cliente inativo: ${userId}`)
        this.removeClient(userId)
      }
    }
  }
}

// Instância singleton do serviço
export const groupChatService = new GroupChatService()

// Limpeza automática a cada 5 minutos
setInterval(() => {
  groupChatService.cleanupInactiveConnections()
}, 5 * 60 * 1000)
