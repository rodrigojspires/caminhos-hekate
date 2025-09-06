'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Flag, Edit, Trash2, Pin, Award, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Author {
  id: string
  name: string
  avatar?: string
  role: 'student' | 'instructor' | 'admin' | 'moderator'
  badges?: string[]
  isVerified?: boolean
}

interface Post {
  id: string
  title: string
  content: string
  excerpt?: string
  author: Author
  category: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  likesCount: number
  commentsCount: number
  viewsCount: number
  sharesCount: number
  isLiked: boolean
  isBookmarked: boolean
  isPinned: boolean
  isFeatured: boolean
  attachments?: {
    id: string
    type: 'image' | 'video' | 'document'
    url: string
    name: string
  }[]
  courseId?: string
  courseName?: string
  lessonId?: string
  lessonName?: string
}

interface PostCardProps {
  post: Post
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  showAuthor?: boolean
  showCategory?: boolean
  showStats?: boolean
  currentUserId?: string
  onLike?: (postId: string) => void
  onBookmark?: (postId: string) => void
  onComment?: (postId: string) => void
  onShare?: (postId: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  onReport?: (postId: string) => void
  onPin?: (postId: string) => void
  onViewPost?: (postId: string) => void
  className?: string
}

export function PostCard({
  post,
  variant = 'default',
  showActions = true,
  showAuthor = true,
  showCategory = true,
  showStats = true,
  currentUserId,
  onLike,
  onBookmark,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onReport,
  onPin,
  onViewPost,
  className
}: PostCardProps) {
  const [showFullContent, setShowFullContent] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const isAuthor = currentUserId === post.author.id
  const canModerate = currentUserId && ['admin', 'moderator'].includes(post.author.role)

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes}m atrás`
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) {
        return `${diffInDays}d atrás`
      } else {
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(date)
      }
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'moderator': return 'bg-blue-100 text-blue-800'
      case 'instructor': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'moderator': return 'Moderador'
      case 'instructor': return 'Instrutor'
      default: return 'Estudante'
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt || post.content.substring(0, 100) + '...',
        url: window.location.href
      })
    } else {
      setIsShareDialogOpen(true)
    }
    onShare?.(post.id)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const contentToShow = variant === 'compact' || !showFullContent 
    ? (post.excerpt || post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''))
    : post.content

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      post.isPinned && 'border-yellow-200 bg-yellow-50/30',
      post.isFeatured && 'border-primary bg-primary/5',
      variant === 'compact' && 'p-3',
      className
    )}>
      {/* Pinned/Featured Indicator */}
      {(post.isPinned || post.isFeatured) && (
        <div className="flex items-center space-x-2 px-4 pt-3 pb-1">
          {post.isPinned && (
            <Badge variant="outline" className="text-yellow-700 border-yellow-300">
              <Pin className="w-3 h-3 mr-1" />
              Fixado
            </Badge>
          )}
          {post.isFeatured && (
            <Badge variant="outline" className="text-primary border-primary">
              <Award className="w-3 h-3 mr-1" />
              Destaque
            </Badge>
          )}
        </div>
      )}

      <CardHeader className={cn(
        'pb-3',
        variant === 'compact' && 'p-0 pb-2'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {showAuthor && (
              <Avatar className={cn(
                variant === 'compact' ? 'w-8 h-8' : 'w-10 h-10'
              )}>
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback>
                  {post.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={cn(
                  'font-medium truncate',
                  variant === 'compact' ? 'text-sm' : 'text-base'
                )}>
                  {post.author.name}
                </h4>
                
                {post.author.isVerified && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    ✓
                  </Badge>
                )}
                
                {showAuthor && post.author.role !== 'student' && (
                  <Badge className={cn(
                    'text-xs px-2 py-0',
                    getRoleColor(post.author.role)
                  )}>
                    {getRoleLabel(post.author.role)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{formatDate(post.createdAt)}</span>
                {post.updatedAt > post.createdAt && (
                  <span>• editado</span>
                )}
                {showStats && (
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {formatNumber(post.viewsCount)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthor && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit?.(post.id)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(post.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {canModerate && (
                  <>
                    <DropdownMenuItem onClick={() => onPin?.(post.id)}>
                      <Pin className="w-4 h-4 mr-2" />
                      {post.isPinned ? 'Desafixar' : 'Fixar'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem onClick={() => onReport?.(post.id)}>
                  <Flag className="w-4 h-4 mr-2" />
                  Reportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn(
        'pt-0',
        variant === 'compact' && 'p-0'
      )}>
        {/* Title */}
        <h3 className={cn(
          'font-semibold mb-2 cursor-pointer hover:text-primary transition-colors',
          variant === 'compact' ? 'text-sm' : 'text-lg',
          variant === 'detailed' && 'text-xl'
        )}
        onClick={() => onViewPost?.(post.id)}
        >
          {post.title}
        </h3>

        {/* Category and Course Info */}
        {showCategory && (
          <div className="flex items-center space-x-2 mb-3">
            <Badge variant="outline" className="text-xs">
              {post.category}
            </Badge>
            
            {post.courseName && (
              <Badge variant="secondary" className="text-xs">
                {post.courseName}
                {post.lessonName && ` • ${post.lessonName}`}
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          'prose prose-sm max-w-none mb-4',
          variant === 'compact' && 'text-sm'
        )}>
          <p className="whitespace-pre-wrap">{contentToShow}</p>
          
          {post.content.length > 200 && !showFullContent && variant !== 'compact' && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowFullContent(true)}
              className="p-0 h-auto text-primary"
            >
              Ver mais
            </Button>
          )}
        </div>

        {/* Tags */}
        {post.tags.length > 0 && variant !== 'compact' && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && variant !== 'compact' && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {post.attachments.slice(0, 4).map((attachment) => (
                <div key={attachment.id} className="relative">
                  {attachment.type === 'image' && (
                    <Image
                      src={attachment.url}
                      alt={attachment.name}
                      width={200}
                      height={128}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  )}
                  {attachment.type === 'video' && (
                    <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        📹 {attachment.name}
                      </span>
                    </div>
                  )}
                  {attachment.type === 'document' && (
                    <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        📄 {attachment.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {post.attachments.length > 4 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{post.attachments.length - 4} mais anexos
              </p>
            )}
          </div>
        )}

        {showActions && (
          <>
            <Separator className="mb-3" />
            
            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLike?.(post.id)}
                  className={cn(
                    'h-8 px-2',
                    post.isLiked && 'text-red-500 hover:text-red-600'
                  )}
                >
                  <Heart className={cn(
                    'w-4 h-4 mr-1',
                    post.isLiked && 'fill-current'
                  )} />
                  {showStats && formatNumber(post.likesCount)}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onComment?.(post.id)}
                  className="h-8 px-2"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {showStats && formatNumber(post.commentsCount)}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-8 px-2"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  {showStats && formatNumber(post.sharesCount)}
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBookmark?.(post.id)}
                className={cn(
                  'h-8 w-8 p-0',
                  post.isBookmarked && 'text-primary'
                )}
              >
                <Bookmark className={cn(
                  'w-4 h-4',
                  post.isBookmarked && 'fill-current'
                )} />
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Post</DialogTitle>
            <DialogDescription>
              Compartilhe este post com outros membros da comunidade
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={window.location.href}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={() => copyToClipboard(window.location.href)}
                variant="outline"
              >
                Copiar
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank')
                }}
                variant="outline"
                className="flex-1"
              >
                Twitter
              </Button>
              <Button
                onClick={() => {
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')
                }}
                variant="outline"
                className="flex-1"
              >
                Facebook
              </Button>
              <Button
                onClick={() => {
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')
                }}
                variant="outline"
                className="flex-1"
              >
                LinkedIn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default PostCard