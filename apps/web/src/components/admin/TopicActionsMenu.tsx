'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Edit, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface TopicActionsMenuProps {
  topicId: string
}

export function TopicActionsMenu({ topicId }: TopicActionsMenuProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    try {
      const res = await fetch(`/api/admin/community/topics/${topicId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Erro ao excluir categoria')
      }
      toast.success('Categoria excluída')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir categoria')
    }
  }

  return (
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
          <Link href={`/admin/community/topics/${topicId}`}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/community/topics/${topicId}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
