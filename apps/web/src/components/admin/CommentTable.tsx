'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  MessageSquare,
  Heart,
  Flag,
  Reply,
  EyeOff
} from 'lucide-react'

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  post: {
    id: string
    title: string
    topic: {
      name: string
      color: string
    }
  }
  parentComment?: {
    id: string
    author: {
      name: string
    }
  }
  status: 'published' | 'hidden' | 'deleted'
  replyCount: number
  reactionCount: number
  reportCount: number
  createdAt: string
  updatedAt: string
}

interface CommentTableProps {
  comments: Comment[]
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: 'published' | 'hidden') => void
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Publicado
        </Badge>
      )
    case 'hidden':
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Oculto
        </Badge>
      )
    case 'deleted':
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          Excluído
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-600">
          {status}
        </Badge>
      )
  }
}

function getTypeBadge(parentComment?: Comment['parentComment']) {
  if (parentComment) {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-600">
        <Reply className="mr-1 h-3 w-3" />
        Resposta
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-purple-600 border-purple-600">
      <MessageSquare className="mr-1 h-3 w-3" />
      Comentário
    </Badge>
  )
}

function getAuthorInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function CommentTable({ comments, onDelete, onToggleStatus }: CommentTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)

  const handleDeleteClick = (comment: Comment) => {
    setCommentToDelete(comment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (commentToDelete && onDelete) {
      onDelete(commentToDelete.id)
    }
    setDeleteDialogOpen(false)
    setCommentToDelete(null)
  }

  const handleToggleStatus = (comment: Comment) => {
    if (onToggleStatus) {
      const newStatus = comment.status === 'published' ? 'hidden' : 'published'
      onToggleStatus(comment.id, newStatus)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comentário</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engajamento</TableHead>
              <TableHead>Relatórios</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum comentário encontrado
                </TableCell>
              </TableRow>
            ) : (
              comments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-sm line-clamp-3" title={comment.content}>
                        {comment.content}
                      </p>
                      {comment.parentComment && (
                        <p className="text-xs text-muted-foreground">
                          Em resposta a {comment.parentComment.author.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback className="text-xs">
                          {getAuthorInitials(comment.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{comment.author.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: comment.post.topic.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {comment.post.topic.name}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-1" title={comment.post.title}>
                        {comment.post.title}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(comment.parentComment)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(comment.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Reply className="h-4 w-4" />
                        {comment.replyCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {comment.reactionCount}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {comment.reportCount > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <Flag className="h-4 w-4" />
                        {comment.reportCount}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/comments/${comment.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/posts/${comment.post.id}`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Ver Post
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/comments/${comment.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(comment)}>
                          {comment.status === 'published' ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Publicar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteClick(comment)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário?
              Esta ação não pode ser desfeita e todas as respostas relacionadas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}