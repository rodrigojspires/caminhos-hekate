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
  EyeOff,
  Pin,
  PinOff
} from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  topic: {
    id: string
    name: string
    color: string
  }
  status: 'published' | 'hidden' | 'deleted'
  isPinned: boolean
  commentCount: number
  reactionCount: number
  reportCount: number
  createdAt: string
  updatedAt: string
}

interface PostTableProps {
  posts: Post[]
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: 'published' | 'hidden') => void
  onTogglePin?: (id: string, isPinned: boolean) => void
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

function getAuthorInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function PostTable({ posts, onDelete, onToggleStatus, onTogglePin }: PostTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)

  const handleDeleteClick = (post: Post) => {
    setPostToDelete(post)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (postToDelete && onDelete) {
      onDelete(postToDelete.id)
    }
    setDeleteDialogOpen(false)
    setPostToDelete(null)
  }

  const handleToggleStatus = (post: Post) => {
    if (onToggleStatus) {
      const newStatus = post.status === 'published' ? 'hidden' : 'published'
      onToggleStatus(post.id, newStatus)
    }
  }

  const handleTogglePin = (post: Post) => {
    if (onTogglePin) {
      onTogglePin(post.id, !post.isPinned)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Tópico</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engajamento</TableHead>
              <TableHead>Relatórios</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum post encontrado
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {post.isPinned && (
                          <Pin className="h-4 w-4 text-blue-600" />
                        )}
                        <h4 className="font-medium line-clamp-1" title={post.title}>
                          {post.title}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2" title={post.content}>
                        {post.content}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback className="text-xs">
                          {getAuthorInitials(post.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{post.author.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: post.topic.color }}
                      />
                      <span className="text-sm">{post.topic.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(post.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {post.commentCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {post.reactionCount}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {post.reportCount > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <Flag className="h-4 w-4" />
                        {post.reportCount}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(post.createdAt)}
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
                          <Link href={`/admin/community/posts/${post.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/posts/${post.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleTogglePin(post)}>
                          {post.isPinned ? (
                            <>
                              <PinOff className="mr-2 h-4 w-4" />
                              Desafixar
                            </>
                          ) : (
                            <>
                              <Pin className="mr-2 h-4 w-4" />
                              Fixar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(post)}>
                          {post.status === 'published' ? (
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
                          onClick={() => handleDeleteClick(post)}
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
              Tem certeza que deseja excluir o post &ldquo;{postToDelete?.title}&rdquo;?
              Esta ação não pode ser desfeita e todos os comentários e reações relacionados também serão excluídos.
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