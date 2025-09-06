import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { groupChatService } from '@/lib/group-chat'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// Configuração do WebSocket Server para Groups
let groupWss: WebSocketServer | null = null

function initGroupWebSocketServer() {
  if (!groupWss) {
    groupWss = new WebSocketServer({ port: 8081 })
    
    groupWss.on('connection', async (ws, request) => {
      console.log('Nova conexão WebSocket para grupos')
      
      let userId: string | null = null
      let groupId: string | null = null
      
      // Enviar mensagem de boas-vindas
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Conectado ao sistema de chat em tempo real',
        timestamp: new Date().toISOString()
      }))
      
      // Lidar com mensagens do cliente
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString())
          console.log('Mensagem recebida do cliente:', data)
          
          switch (data.type) {
            case 'authenticate':
              try {
                // Verificar token JWT
                const decoded = jwt.verify(data.token, process.env.NEXTAUTH_SECRET!) as any
                userId = decoded.sub
                
                if (!userId) {
                  ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Token inválido - userId não encontrado' 
                  }))
                  return
                }
                
                // Adicionar cliente autenticado ao serviço
                groupChatService.addClient(ws, userId)
                
                ws.send(JSON.stringify({ 
                  type: 'authenticated', 
                  userId,
                  timestamp: new Date().toISOString() 
                }))
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'auth_error', 
                  message: 'Token inválido',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'join_group':
              if (!userId) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Usuário não autenticado',
                  timestamp: new Date().toISOString() 
                }))
                return
              }
              
              try {
                if (!userId) {
                  ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Usuário não autenticado' 
                  }))
                  return
                }
                
                groupId = data.groupId
                
                if (!groupId) {
                  ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'ID do grupo não fornecido' 
                  }))
                  return
                }
                
                await groupChatService.joinGroup(userId, groupId, ws)
                
                ws.send(JSON.stringify({ 
                  type: 'joined_group', 
                  groupId,
                  timestamp: new Date().toISOString() 
                }))
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Erro ao entrar no grupo',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'leave_group':
              if (userId && groupId) {
                groupChatService.leaveGroup(userId, groupId)
                groupId = null
                
                ws.send(JSON.stringify({ 
                  type: 'left_group', 
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'send_message':
              if (!userId || !groupId) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Usuário não autenticado ou não está em um grupo',
                  timestamp: new Date().toISOString() 
                }))
                return
              }
              
              try {
                await groupChatService.sendMessage({
                  groupId,
                  userId,
                  content: data.content,
                  replyToId: data.replyToId,
                  attachments: data.attachments
                })
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Erro ao enviar mensagem',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'edit_message':
              if (!userId) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Usuário não autenticado',
                  timestamp: new Date().toISOString() 
                }))
                return
              }
              
              try {
                await groupChatService.editMessage({
                  messageId: data.messageId,
                  userId,
                  content: data.content
                })
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Erro ao editar mensagem',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'delete_message':
              if (!userId) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Usuário não autenticado',
                  timestamp: new Date().toISOString() 
                }))
                return
              }
              
              try {
                await groupChatService.deleteMessage({
                  messageId: data.messageId,
                  userId
                })
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Erro ao deletar mensagem',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'add_reaction':
              if (!userId) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Usuário não autenticado',
                  timestamp: new Date().toISOString() 
                }))
                return
              }
              
              try {
                await groupChatService.addReaction({
                  messageId: data.messageId,
                  userId,
                  emoji: data.emoji
                })
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Erro ao adicionar reação',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'remove_reaction':
              if (!userId) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Usuário não autenticado',
                  timestamp: new Date().toISOString() 
                }))
                return
              }
              
              try {
                await groupChatService.removeReaction({
                  messageId: data.messageId,
                  userId,
                  emoji: data.emoji
                })
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Erro ao remover reação',
                  timestamp: new Date().toISOString() 
                }))
              }
              break
              
            case 'typing_start':
              if (userId && groupId) {
                groupChatService.broadcastTyping(groupId, userId, true)
              }
              break
              
            case 'typing_stop':
              if (userId && groupId) {
                groupChatService.broadcastTyping(groupId, userId, false)
              }
              break
              
            case 'ping':
              ws.send(JSON.stringify({ 
                type: 'pong', 
                timestamp: new Date().toISOString() 
              }))
              break
              
            default:
              console.log('Tipo de mensagem não reconhecido:', data.type)
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error)
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Erro interno do servidor',
            timestamp: new Date().toISOString() 
          }))
        }
      })
      
      // Lidar com desconexão
      ws.on('close', () => {
        console.log('Conexão WebSocket fechada')
        if (userId) {
          groupChatService.removeClient(userId)
          if (groupId) {
            groupChatService.leaveGroup(userId, groupId)
          }
        }
      })
      
      // Lidar com erros
      ws.on('error', (error) => {
        console.error('Erro na conexão WebSocket:', error)
      })
    })
    
    console.log('Servidor WebSocket para grupos iniciado na porta 8081')
  }
  
  return groupWss
}

// GET /api/groups/ws - Informações sobre o WebSocket
export async function GET(request: NextRequest) {
  try {
    // Inicializar servidor WebSocket se não estiver rodando
    const server = initGroupWebSocketServer()
    
    return new Response(JSON.stringify({
      status: 'Group WebSocket server running',
      port: 8081,
      clients: server.clients.size,
      url: 'ws://localhost:8081'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao obter status do WebSocket:', error)
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// POST /api/groups/ws - Enviar mensagem para grupo específico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, message, type = 'broadcast', excludeUserId } = body
    
    if (!groupWss) {
      return new Response(JSON.stringify({
        error: 'WebSocket server não está rodando'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const sentCount = groupChatService.broadcastToGroup(groupId, {
      type,
      message,
      timestamp: new Date().toISOString()
    }, excludeUserId)
    
    return new Response(JSON.stringify({
      success: true,
      clientsSent: sentCount,
      totalClients: groupWss.clients.size
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao enviar mensagem WebSocket:', error)
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}