import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { GroupMessage } from '../components/groups/types'
// import jwt from 'jsonwebtoken'

// Extend session type to include id
interface ExtendedUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface ExtendedSession {
  user?: ExtendedUser
}

interface TypingUser {
  userId: string
  isTyping: boolean
}

interface UseGroupChatOptions {
  groupId?: string
  autoConnect?: boolean
}

interface UseGroupChatReturn {
  // Estado da conexão
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  
  // Estado do grupo
  currentGroupId: string | null
  isInGroup: boolean
  
  // Mensagens
  messages: GroupMessage[]
  
  // Usuários digitando
  typingUsers: string[]
  
  // Ações
  connect: () => void
  disconnect: () => void
  joinGroup: (groupId: string) => Promise<void>
  leaveGroup: () => void
  sendMessage: (content: string, replyToId?: string, attachments?: string[]) => Promise<void>
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  
  // Utilitários
  clearMessages: () => void
}

export function useGroupChat(options: UseGroupChatOptions = {}): UseGroupChatReturn {
  const { groupId, autoConnect = true } = options
  const { data: session } = useSession() as { data: ExtendedSession | null }
  
  // Estado da conexão
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Estado do grupo
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [isInGroup, setIsInGroup] = useState(false)
  
  // Mensagens e usuários digitando
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  // Referências
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  
  // Constantes
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000
  const TYPING_TIMEOUT = 3000
  
  // Processar mensagens do WebSocket
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('Conectado ao sistema de chat')
        break
        
      case 'authenticated':
        console.log('Autenticado com sucesso')
        break
        
      case 'auth_error':
        setConnectionError('Erro de autenticação')
        toast.error('Erro de autenticação')
        break
        
      case 'joined_group':
        setIsInGroup(true)
        setCurrentGroupId(data.groupId)
        toast.success('Entrou no grupo com sucesso')
        break
        
      case 'left_group':
        setIsInGroup(false)
        setCurrentGroupId(null)
        setMessages([])
        setTypingUsers([])
        break
        
      case 'new_message':
        setMessages(prev => [...prev, data.message])
        break
        
      case 'message_edited':
        setMessages(prev => prev.map(msg => 
          msg.id === data.message.id ? data.message : msg
        ))
        break
        
      case 'message_deleted':
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId))
        break
        
      case 'reaction_added':
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            const existingReactionIndex = msg.reactions.findIndex(
              r => r.emoji === data.reaction.emoji
            )
            
            if (existingReactionIndex >= 0) {
              // Update existing reaction
              const updatedReactions = [...msg.reactions]
              updatedReactions[existingReactionIndex] = {
                ...updatedReactions[existingReactionIndex],
                count: data.reaction.count,
                users: data.reaction.users
              }
              return {
                ...msg,
                reactions: updatedReactions
              }
            } else {
              // Add new reaction
              return {
                ...msg,
                reactions: [...msg.reactions, data.reaction]
              }
            }
          }
          return msg
        }))
        break
        
      case 'reaction_removed':
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return {
              ...msg,
              reactions: msg.reactions.filter(
                r => r.emoji !== data.emoji || r.count > 0
              )
            }
          }
          return msg
        }))
        break
        
      case 'typing_update':
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (!prev.includes(data.userId)) {
              return [...prev, data.userId]
            }
            return prev
          })
        } else {
          setTypingUsers(prev => prev.filter(userId => userId !== data.userId))
        }
        break
        
      case 'user_joined':
        toast.info('Um usuário entrou no grupo')
        break
        
      case 'user_left':
        toast.info('Um usuário saiu do grupo')
        break
        
      case 'error':
        toast.error(data.message || 'Erro no chat')
        break
        
      case 'pong':
        // Resposta ao ping - não fazer nada
        break
        
      default:
        console.log('Tipo de mensagem não reconhecido:', data.type)
    }
  }, [])
  
  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (!session?.user?.id || isConnecting || isConnected) {
      return
    }
    
    setIsConnecting(true)
    setConnectionError(null)
    
    try {
      const ws = new WebSocket('ws://localhost:8081')
      wsRef.current = ws
      
      ws.onopen = async () => {
        console.log('Conectado ao WebSocket de grupos')
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttemptsRef.current = 0
        
        // Autenticar
        if (session?.user?.id) {
          try {
            const resp = await fetch('/api/groups/ws/token')
            const data = await resp.json()
            const token = data?.token
            ws.send(JSON.stringify({ type: 'authenticate', token }))
          } catch (e) {
            console.error('Falha ao obter token WS:', e)
            setConnectionError('Falha ao autenticar no WS')
          }
        }
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error)
        }
      }
      
      ws.onclose = (event) => {
        console.log('Conexão WebSocket fechada:', event.code, event.reason)
        setIsConnected(false)
        setIsInGroup(false)
        setCurrentGroupId(null)
        
        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(`Tentativa de reconexão ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Falha ao reconectar. Tente recarregar a página.')
        }
      }
      
      ws.onerror = (error) => {
        console.error('Erro na conexão WebSocket:', error)
        setConnectionError('Erro na conexão WebSocket')
        setIsConnecting(false)
      }
      
    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error)
      setConnectionError('Erro ao conectar')
      setIsConnecting(false)
    }
  }, [session?.user?.id, isConnecting, isConnected, handleWebSocketMessage])
  
  // Função para desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexão intencional')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setIsConnecting(false)
    setIsInGroup(false)
    setCurrentGroupId(null)
    setMessages([])
    setTypingUsers([])
  }, [])
  
  // Enviar mensagem via WebSocket
  const sendWebSocketMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      throw new Error('WebSocket não está conectado')
    }
  }, [])
  
  // Entrar em um grupo
  const joinGroup = useCallback(async (groupId: string) => {
    if (!isConnected) {
      throw new Error('WebSocket não está conectado')
    }
    
    try {
      sendWebSocketMessage({
        type: 'join_group',
        groupId
      })
    } catch (error) {
      console.error('Erro ao entrar no grupo:', error)
      throw error
    }
  }, [isConnected, sendWebSocketMessage])
  
  // Sair do grupo
  const leaveGroup = useCallback(() => {
    if (isConnected && currentGroupId) {
      sendWebSocketMessage({
        type: 'leave_group'
      })
    }
  }, [isConnected, currentGroupId, sendWebSocketMessage])
  
  // Enviar mensagem
  const sendMessage = useCallback(async (content: string, replyToId?: string, attachments?: string[]) => {
    if (!isConnected || !isInGroup) {
      throw new Error('Não conectado ao grupo')
    }
    
    try {
      sendWebSocketMessage({
        type: 'send_message',
        content,
        replyToId,
        attachments
      })
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }, [isConnected, isInGroup, sendWebSocketMessage])
  
  // Editar mensagem
  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!isConnected) {
      throw new Error('WebSocket não está conectado')
    }
    
    try {
      sendWebSocketMessage({
        type: 'edit_message',
        messageId,
        content
      })
    } catch (error) {
      console.error('Erro ao editar mensagem:', error)
      throw error
    }
  }, [isConnected, sendWebSocketMessage])
  
  // Deletar mensagem
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!isConnected) {
      throw new Error('WebSocket não está conectado')
    }
    
    try {
      sendWebSocketMessage({
        type: 'delete_message',
        messageId
      })
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error)
      throw error
    }
  }, [isConnected, sendWebSocketMessage])
  
  // Adicionar reação
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!isConnected) {
      throw new Error('WebSocket não está conectado')
    }
    
    try {
      sendWebSocketMessage({
        type: 'add_reaction',
        messageId,
        emoji
      })
    } catch (error) {
      console.error('Erro ao adicionar reação:', error)
      throw error
    }
  }, [isConnected, sendWebSocketMessage])
  
  // Remover reação
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!isConnected) {
      throw new Error('WebSocket não está conectado')
    }
    
    try {
      sendWebSocketMessage({
        type: 'remove_reaction',
        messageId,
        emoji
      })
    } catch (error) {
      console.error('Erro ao remover reação:', error)
      throw error
    }
  }, [isConnected, sendWebSocketMessage])
  

  
  // Parar digitação
  const stopTyping = useCallback(() => {
    if (!isConnected || !isInGroup) return
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    
    sendWebSocketMessage({
      type: 'typing_stop'
    })
  }, [isConnected, isInGroup, sendWebSocketMessage])
  
  // Iniciar digitação
  const startTyping = useCallback(() => {
    if (!isConnected || !isInGroup) return
    
    sendWebSocketMessage({
      type: 'typing_start'
    })
    
    // Auto-parar digitação após timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT)
  }, [isConnected, isInGroup, sendWebSocketMessage, stopTyping])
  
  // Limpar mensagens
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])
  
  // Efeito para conectar automaticamente
  useEffect(() => {
    if (autoConnect && session?.user?.id && !isConnected && !isConnecting) {
      connect()
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [session?.user?.id, autoConnect, isConnected, isConnecting, connect])
  
  // Efeito para entrar no grupo automaticamente
  useEffect(() => {
    if (groupId && isConnected && !isInGroup && currentGroupId !== groupId) {
      joinGroup(groupId).catch(console.error)
    }
  }, [groupId, isConnected, isInGroup, currentGroupId, joinGroup])
  
  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])
  
  // Ping periódico para manter conexão viva
  useEffect(() => {
    if (!isConnected) return
    
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Ping a cada 30 segundos
    
    return () => clearInterval(pingInterval)
  }, [isConnected])
  
  return {
    // Estado da conexão
    isConnected,
    isConnecting,
    connectionError,
    
    // Estado do grupo
    currentGroupId,
    isInGroup,
    
    // Mensagens
    messages,
    
    // Usuários digitando
    typingUsers,
    
    // Ações
    connect,
    disconnect,
    joinGroup,
    leaveGroup,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    
    // Utilitários
    clearMessages
  }
}
