'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { MessageCircle, Heart, Reply, MoreHorizontal, Flag, Edit, Trash2, Pin, Award, ChevronDown, ChevronUp, Send, Image as ImageIcon, Smile } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  avatar?: string
  role: 'student' | 'instructor' | 'admin' | 'moderator'
  badges?: string[]
  isOnline?: boolean
}

interface Comment {
  id: string
  content: string
  author: User
  createdAt: Date
  updatedAt?: Date
  likes: number
  isLiked: boolean
  replies: Comment[]
  isPinned?: boolean
  isBestAnswer?: boolean
  isEdited?: boolean
  parentId?: string
  attachments?: {
    id: string
    type: 'image' | 'file'
    url: string
    name: string
  }[]
}

interface CommentThreadProps {
  comments: Comment[]
  currentUser: User
  postId: string
  isLoading?: boolean
  canModerate?: boolean
  allowReplies?: boolean
  maxDepth?: number
  sortBy?: 'newest' | 'oldest' | 'likes' | 'best'
  onAddComment: (content: string, parentId?: string) => Promise<void>
  onEditComment: (commentId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onLikeComment: (commentId: string) => Promise<void>
  onPinComment?: (commentId: string) => Promise<void>
  onMarkBestAnswer?: (commentId: string) => Promise<void>
  onReportComment?: (commentId: string, reason: string) => Promise<void>
  className?: string
}

export function CommentThread({
  comments,
  currentUser,
  postId,
  isLoading = false,
  canModerate = false,
  allowReplies = true,
  maxDepth = 3,
  sortBy = 'newest',
  onAddComment,
  onEditComment,
  onDeleteComment,
  onLikeComment,
  onPinComment,
  onMarkBestAnswer,
  onReportComment,
  className
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [reportingComment, setReportingComment] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [replyingTo])

  useEffect(() => {
    if (editingComment && editTextareaRef.current) {
      editTextareaRef.current.focus()
    }
  }, [editingComment])

  const sortComments = (comments: Comment[]): Comment[] => {
    const sorted = [...comments].sort((a, b) => {
      // Pinned comments always come first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      
      // Best answers come second
      if (a.isBestAnswer && !b.isBestAnswer) return -1
      if (!a.isBestAnswer && b.isBestAnswer) return 1
      
      switch (sortBy) {
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime()
        case 'likes':
          return b.likes - a.likes
        case 'best':
          return b.likes - a.likes // Same as likes for now
        case 'newest':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime()
      }
    })
    
    return sorted.map(comment => ({
      ...comment,
      replies: sortComments(comment.replies)
    }))
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    
    try {
      await onAddComment(newComment, replyingTo || undefined)
      setNewComment('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return
    
    try {
      await onEditComment(commentId, editContent)
      setEditingComment(null)
      setEditContent('')
    } catch (error) {
      console.error('Erro ao editar comentário:', error)
    }
  }

  const handleReportComment = async () => {
    if (!reportingComment || !reportReason.trim()) return
    
    try {
      await onReportComment?.(reportingComment, reportReason)
      setReportingComment(null)
      setReportReason('')
    } catch (error) {
      console.error('Erro ao reportar comentário:', error)
    }
  }

  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500'
      case 'moderator': return 'bg-blue-500'
      case 'instructor': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'moderator': return 'Moderador'
      case 'instructor': return 'Instrutor'
      default: return 'Estudante'
    }
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const isExpanded = expandedComments.has(comment.id)
    const hasReplies = comment.replies.length > 0
    const canReply = allowReplies && depth < maxDepth
    const isAuthor = comment.author.id === currentUser.id
    const canEdit = isAuthor || canModerate
    const canDelete = isAuthor || canModerate
    
    return (
      <div key={comment.id} className={cn(
        'space-y-3',
        depth > 0 && 'ml-6 pl-4 border-l-2 border-muted'
      )}>
        <Card className={cn(
          'transition-colors',
          comment.isPinned && 'border-yellow-200 bg-yellow-50/50',
          comment.isBestAnswer && 'border-green-200 bg-green-50/50'
        )}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                  <AvatarFallback>
                    {comment.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {comment.author.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">{comment.author.name}</span>
                  
                  {comment.author.role !== 'student' && (
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs text-white', getRoleColor(comment.author.role))}
                    >
                      {getRoleName(comment.author.role)}
                    </Badge>
                  )}
                  
                  {comment.isPinned && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Pin className="w-3 h-3 text-yellow-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Comentário fixado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {comment.isBestAnswer && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Award className="w-3 h-3 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Melhor resposta</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(comment.createdAt)}
                    {comment.isEdited && ' (editado)'}
                  </span>
                </div>
                
                {editingComment === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Editar comentário..."
                      rows={3}
                    />
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditComment(comment.id)}
                        disabled={!editContent.trim()}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingComment(null)
                          setEditContent('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {comment.content}
                  </div>
                )}
                
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2">
                        {attachment.type === 'image' ? (
                          <Image 
                            src={attachment.url} 
                            alt={attachment.name}
                            width={300}
                            height={200}
                            className="max-w-xs rounded-lg object-cover"
                          />
                        ) : (
                          <a 
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-blue-600 hover:underline"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>{attachment.name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center space-x-4 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLikeComment(comment.id)}
                    className={cn(
                      'h-8 px-2',
                      comment.isLiked && 'text-red-600'
                    )}
                  >
                    <Heart className={cn(
                      'w-4 h-4 mr-1',
                      comment.isLiked && 'fill-current'
                    )} />
                    {comment.likes > 0 && comment.likes}
                  </Button>
                  
                  {canReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id)
                        setNewComment('')
                      }}
                      className="h-8 px-2"
                    >
                      <Reply className="w-4 h-4 mr-1" />
                      Responder
                    </Button>
                  )}
                  
                  {hasReplies && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCommentExpansion(comment.id)}
                      className="h-8 px-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 mr-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mr-1" />
                      )}
                      {comment.replies.length} {comment.replies.length === 1 ? 'resposta' : 'respostas'}
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingComment(comment.id)
                            setEditContent(comment.content)
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      
                      {canModerate && onPinComment && (
                        <DropdownMenuItem
                          onClick={() => onPinComment(comment.id)}
                        >
                          <Pin className="w-4 h-4 mr-2" />
                          {comment.isPinned ? 'Desafixar' : 'Fixar'}
                        </DropdownMenuItem>
                      )}
                      
                      {canModerate && onMarkBestAnswer && (
                        <DropdownMenuItem
                          onClick={() => onMarkBestAnswer(comment.id)}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          {comment.isBestAnswer ? 'Remover melhor resposta' : 'Marcar como melhor resposta'}
                        </DropdownMenuItem>
                      )}
                      
                      {!isAuthor && onReportComment && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setReportingComment(comment.id)}
                            className="text-red-600"
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Reportar
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir comentário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteComment(comment.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Reply Form */}
        {replyingTo === comment.id && (
          <div className="ml-11">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Textarea
                    ref={textareaRef}
                    placeholder={`Responder para ${comment.author.name}...`}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Smile className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setNewComment('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isLoading}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Responder
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Replies */}
        {hasReplies && (isExpanded || comment.replies.length <= 2) && (
          <div className="space-y-3">
            {sortComments(comment.replies).map(reply => 
              renderComment(reply, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  const sortedComments = sortComments(comments)

  return (
    <div className={cn('space-y-6', className)}>
      {/* New Comment Form */}
      {!replyingTo && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback>
                  {currentUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isLoading}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Comments List */}
      <div className="space-y-4">
        {sortedComments.length > 0 ? (
          sortedComments.map(comment => renderComment(comment))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Ainda não há comentários. Seja o primeiro a comentar!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Report Dialog */}
      <Dialog open={!!reportingComment} onOpenChange={() => setReportingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar comentário</DialogTitle>
            <DialogDescription>
              Por que você está reportando este comentário?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Descreva o motivo do report..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReportingComment(null)
                  setReportReason('')
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReportComment}
                disabled={!reportReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Reportar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CommentThread