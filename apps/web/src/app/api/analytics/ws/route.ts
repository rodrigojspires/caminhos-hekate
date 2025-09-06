import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { analyticsService } from '@/lib/analytics'

// Configuração do WebSocket Server
let wss: WebSocketServer | null = null

function initWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 8080 })
    
    wss.on('connection', (ws, request) => {
      console.log('Nova conexão WebSocket para analytics')
      
      // Adicionar cliente ao serviço de analytics
      analyticsService.addWebSocketClient(ws)
      
      // Enviar mensagem de boas-vindas
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Conectado ao sistema de analytics em tempo real',
        timestamp: new Date().toISOString()
      }))
      
      // Lidar com mensagens do cliente
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          console.log('Mensagem recebida do cliente:', data)
          
          // Aqui você pode implementar lógica para lidar com mensagens específicas
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
              break
            case 'subscribe':
              // Implementar lógica de subscrição para categorias específicas
              ws.send(JSON.stringify({ 
                type: 'subscribed', 
                category: data.category,
                timestamp: new Date().toISOString() 
              }))
              break
            default:
              console.log('Tipo de mensagem não reconhecido:', data.type)
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error)
        }
      })
      
      // Lidar com desconexão
      ws.on('close', () => {
        console.log('Conexão WebSocket fechada')
      })
      
      // Lidar com erros
      ws.on('error', (error) => {
        console.error('Erro na conexão WebSocket:', error)
      })
    })
    
    console.log('Servidor WebSocket iniciado na porta 8080')
  }
  
  return wss
}

// GET /api/analytics/ws - Informações sobre o WebSocket
export async function GET(request: NextRequest) {
  try {
    // Inicializar servidor WebSocket se não estiver rodando
    const server = initWebSocketServer()
    
    return new Response(JSON.stringify({
      status: 'WebSocket server running',
      port: 8080,
      clients: server.clients.size,
      url: 'ws://localhost:8080'
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

// POST /api/analytics/ws - Enviar mensagem para todos os clientes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, type = 'broadcast' } = body
    
    if (!wss) {
      return new Response(JSON.stringify({
        error: 'WebSocket server não está rodando'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Enviar mensagem para todos os clientes conectados
    const broadcastMessage = JSON.stringify({
      type,
      message,
      timestamp: new Date().toISOString()
    })
    
    let sentCount = 0
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(broadcastMessage)
        sentCount++
      }
    })
    
    return new Response(JSON.stringify({
      success: true,
      clientsSent: sentCount,
      totalClients: wss.clients.size
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