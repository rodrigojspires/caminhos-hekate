'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { useGroupChat } from '@/hooks/useGroupChat'
import { GroupMessage } from './types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Send,
  MoreVertical,
  Reply,
  Edit,
  Edit2,
  Trash2,
  Smile,
  Paperclip,
  Users,
  Hash,
  X,
  WifiOff,
  Image as ImageIcon
} from 'lucide-react'



interface GroupChatProps {
  groupId: string
  userRole: 'MEMBER' | 'ADMIN' | 'OWNER' | 'MODERATOR'
}

const REACTION_EMOJIS = ['👍', '❤️', '😊', '😮', '😢', '😡']

export function GroupChat({ groupId, userRole }: GroupChatProps) {
  const { data: session } = useSession()
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Hook do chat em tempo real
  const {
    messages,
    typingUsers,
    isConnected,
    isConnecting,
    connectionError,
    isInGroup,
    sendMessage: sendRealtimeMessage,
    editMessage: editRealtimeMessage,
    deleteMessage: deleteRealtimeMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    clearMessages
  } = useGroupChat({ groupId, autoConnect: true })

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Buscar mensagens iniciais do grupo
  const fetchMessages = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setIsLoading(true)
      else setLoadingMore(true)

      const response = await fetch(
        `/api/groups/${groupId}/messages?page=${pageNum}&limit=50&sort=desc`
      )
      const data = await response.json()

      if (data.success) {
        // As mensagens em tempo real serão gerenciadas pelo hook useGroupChat
        // Aqui apenas carregamos as mensagens iniciais se necessário
        if (messages.length === 0) {
          // O hook já gerencia as mensagens, então não precisamos setMessages aqui
        }

        setHasMore(data.data.pagination.hasMore)
      } else {
        toast.error(data.error || 'Erro ao carregar mensagens')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Erro ao carregar mensagens')
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }, [groupId, messages.length])

  // Enviar mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return
    if (isSending) return

    setIsSending(true)
    try {
      await sendRealtimeMessage(
        newMessage.trim(),
        replyingTo?.id,
        attachments.length > 0 ? attachments : undefined
      )
      
      setNewMessage('')
      setReplyingTo(null)
      setAttachments([])
      stopTyping()
      
      toast.success('Mensagem enviada!')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setIsSending(false)
    }
  }

  // Editar mensagem
  const editMessage = async (messageId: string) => {
    if (!editContent.trim()) return

    try {
      await editRealtimeMessage(messageId, editContent.trim())
      
      setEditingMessage(null)
      setEditContent('')
      toast.success('Mensagem editada!')
    } catch (error) {
      console.error('Error editing message:', error)
      toast.error('Erro ao editar mensagem')
    }
  }

  // Deletar mensagem
  const deleteMessage = async (messageId: string) => {
    try {
      await deleteRealtimeMessage(messageId)
      
      toast.success('Mensagem deletada!')
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Erro ao deletar mensagem')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // Adicionar reação
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji)
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Erro ao reagir à mensagem')
    }
  }

  // Remover reação
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await removeReaction(messageId, emoji)
    } catch (error) {
      console.error('Error removing reaction:', error)
      toast.error('Erro ao remover reação')
    }
  }

  // Gerenciar digitação
  const handleInputChange = (value: string) => {
    setNewMessage(value)
    
    // Iniciar indicador de digitação
    if (value.trim() && !typingTimeoutRef.current) {
      startTyping()
    }
    
    // Resetar timeout de digitação
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Parar indicador de digitação após 3 segundos de inatividade
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
      typingTimeoutRef.current = null
    }, 3000)
    
    // Parar imediatamente se campo estiver vazio
    if (!value.trim()) {
      stopTyping()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }

  // Load initial messages
  useEffect(() => {
    if (isInGroup) {
      fetchMessages()
    }
  }, [isInGroup, fetchMessages])
  
  // Cleanup do timeout de digitação
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Handle scroll for loading more messages
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container || loadingMore || !hasMore) return

    if (container.scrollTop === 0) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchMessages(nextPage, true)
    }
  }, [page, loadingMore, hasMore, fetchMessages])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const canEditMessage = (message: GroupMessage) => {
    const isAuthor = message.author.id === session?.user?.id
    const isRecent = Date.now() - message.createdAt.getTime() < 24 * 60 * 60 * 1000 // 24 hours
    return isAuthor && isRecent
  }

  const canDeleteMessage = (message: GroupMessage) => {
    const isAuthor = message.author.id === session?.user?.id
    const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER'
    return isAuthor || isAdmin
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editingMessage) {
        editMessage(editingMessage)
      } else {
        sendMessage()
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status de conexão */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                Conectando...
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Desconectado - Tentando reconectar...
              </>
            )}
          </div>
        </div>
      )}

      {/* Indicador de usuários digitando */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} está digitando...`
                : typingUsers.length === 2
                ? `${typingUsers[0]} e ${typingUsers[1]} estão digitando...`
                : `${typingUsers[0]} e mais ${typingUsers.length - 1} pessoas estão digitando...`
              }
            </span>
          </div>
        </div>
      )}
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {loadingMore && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              Carregando mensagens anteriores...
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">Nenhuma mensagem ainda</div>
            <div className="text-sm text-gray-400">Seja o primeiro a enviar uma mensagem!</div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3 group">
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.author.image} alt={message.author.name || 'Usuário'} />
                <AvatarFallback>
                  {message.author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.author.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(message.createdAt, { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                  {message.isEdited && (
                    <Badge variant="secondary" className="text-xs">
                      editado
                    </Badge>
                  )}
                </div>

                {/* Reply indicator */}
                {message.replyTo && (
                  <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded border-l-2 border-gray-300 dark:border-gray-600">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Respondendo a {message.replyTo.author.name}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {message.replyTo.content}
                    </div>
                  </div>
                )}

                {/* Message content */}
                {editingMessage === message.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Editar mensagem..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => editMessage(message.id)}
                        disabled={!editContent.trim()}
                      >
                        Salvar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingMessage(null)
                          setEditContent('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              <span className="text-sm">{attachment.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Reactions */}
                    {message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.reactions.map((reaction, index) => {
                          const userReacted = reaction.users.some(user => user.id === session?.user?.id)
                          return (
                            <button
                              key={`${reaction.emoji}-${index}`}
                              onClick={() => handleAddReaction(message.id, reaction.emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                userReacted
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Message actions */}
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReplyingTo(message)}
                    className="h-6 px-2"
                  >
                    <Reply className="h-3 w-3" />
                  </Button>
                  
                  {/* Reaction buttons */}
                  {REACTION_EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddReaction(message.id, emoji)}
                      className="h-6 px-1"
                    >
                      {emoji}
                    </Button>
                  ))}

                  {/* More actions */}
                  {(canEditMessage(message) || canDeleteMessage(message)) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditMessage(message) && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingMessage(message.id)
                              setEditContent(message.content)
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDeleteMessage(message) && (
                          <>
                            {canEditMessage(message) && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(message.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Respondendo a {replyingTo.author.name}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-800 dark:text-gray-200 truncate mt-1">
            {replyingTo.content}
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMessage(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          // Handle file upload
          console.log('Files selected:', e.target.files)
        }}
      />
    </div>
  )
}