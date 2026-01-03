"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Edit, Eye, EyeOff, MoreHorizontal, Pin, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface PostActionsMenuProps {
  postId: string
  status: "PUBLISHED" | "DRAFT" | "HIDDEN"
  isPinned?: boolean
}

export function PostActionsMenu({ postId, status, isPinned }: PostActionsMenuProps) {
  const router = useRouter()

  const handleUpdate = async (payload: Record<string, any>) => {
    try {
      const res = await fetch(`/api/admin/community/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Erro ao atualizar post")
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar post")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return
    try {
      const res = await fetch(`/api/admin/community/posts/${postId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Erro ao excluir post")
      }
      toast.success("Post excluído")
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "Erro ao excluir post")
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
          <Link href={`/admin/community/posts/${postId}`}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleUpdate({ isPinned: !isPinned })}
        >
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? "Desafixar" : "Fixar"}
        </DropdownMenuItem>
        {status !== "HIDDEN" ? (
          <DropdownMenuItem onClick={() => handleUpdate({ status: "HIDDEN" })}>
            <EyeOff className="mr-2 h-4 w-4" />
            Ocultar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleUpdate({ status: "PUBLISHED" })}>
            <Eye className="mr-2 h-4 w-4" />
            Publicar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/admin/community/posts/${postId}/edit`}>
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
