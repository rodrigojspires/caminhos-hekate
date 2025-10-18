'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Clock, User, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Enrollment {
  id: string
  userId: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PageProps {
  params: {
    id: string
  }
}

export default function CourseEnrollmentsPage({ params }: PageProps) {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)

  // Estado do formulário manual
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const fetchEnrollments = async (page = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/courses/${params.id}/enrollments?page=${page}&limit=20`)
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao carregar inscrições')
      }
      setEnrollments(json.enrollments)
      setPagination(json.pagination)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar inscrições')
    } finally {
      setLoading(false)
    }
  }

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Informe um email válido')
      return
    }
    try {
      setSubmitting(true)
      const response = await fetch(`/api/admin/courses/${params.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined })
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Falha ao inscrever aluno')
      }
      toast.success(
        json.createdUser
          ? 'Usuário criado e inscrito. Dois e-mails enviados.'
          : 'Aluno inscrito. E-mail de confirmação enviado.'
      )
      setEmail('')
      setName('')
      fetchEnrollments(pagination.page)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Falha ao inscrever aluno')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta inscrição?')) return
    try {
      setDeletingId(enrollmentId)
      const res = await fetch(`/api/admin/courses/${params.id}/enrollments/${enrollmentId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao excluir inscrição')
      }
      toast.success('Inscrição excluída')
      // Atualiza lista local sem refetch completo
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId))
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1), totalPages: Math.max(1, Math.ceil((Math.max(0, p.total - 1)) / p.limit)) }))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir inscrição')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeactivateEnrollment = async (enrollmentId: string) => {
    if (!confirm('Tem certeza que deseja desativar esta inscrição? O aluno perderá acesso, mas o progresso será mantido.')) return
    try {
      setDeactivatingId(enrollmentId)
      const res = await fetch(`/api/admin/courses/${params.id}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao desativar inscrição')
      }
      toast.success('Inscrição desativada')
      setEnrollments((prev) => prev.map((e) => e.id === enrollmentId ? { ...e, status: 'inactive' } : e))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar inscrição')
    } finally {
      setDeactivatingId(null)
    }
  }

  const handleActivateEnrollment = async (enrollmentId: string) => {
    if (!confirm('Tem certeza que deseja ativar esta inscrição? O aluno voltará a ter acesso ao curso.')) return
    try {
      setActivatingId(enrollmentId)
      const res = await fetch(`/api/admin/courses/${params.id}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao ativar inscrição')
      }
      toast.success('Inscrição ativada')
      setEnrollments((prev) => prev.map((e) => e.id === enrollmentId ? { ...e, status: 'active' } : e))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao ativar inscrição')
    } finally {
      setActivatingId(null)
    }
  }

  useEffect(() => {
    fetchEnrollments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Inscrições do Curso</h1>
      </div>

      {/* Formulário de inscrição manual */}
      <Card>
        <CardHeader>
          <CardTitle>Inscrever aluno manualmente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualEnroll} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="email">Email do aluno</Label>
              <Input
                id="email"
                type="email"
                placeholder="aluno@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nome do aluno"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-1">
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processando
                  </span>
                ) : (
                  'Inscrever aluno'
                )}
              </Button>
            </div>
          </form>
          <p className="text-sm text-muted-foreground mt-2">
            • Se o email existir, enviamos apenas o email de inscrição.
            Se não existir, criamos o usuário, enviamos um email com senha temporária e outro confirmando a inscrição.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {pagination.total} inscrição{pagination.total === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando inscrições...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum aluno inscrito neste curso ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border rounded-lg px-4 py-3 bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {enrollment.user?.image ? (
                        <AvatarImage src={enrollment.user.image} alt={enrollment.user.name || enrollment.user.email} />
                      ) : (
                        <AvatarFallback>{enrollment.user?.name?.slice(0, 1) ?? 'A'}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {enrollment.user?.name || 'Aluno sem nome'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                          {enrollment.status === 'active' ? 'Ativo' : enrollment.status === 'inactive' ? 'Inativo' : enrollment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {enrollment.user?.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(enrollment.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    ID do usuário: {enrollment.userId}
                  </div>

                  <div className="flex items-center gap-2">
                    {enrollment.status === 'inactive' ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleActivateEnrollment(enrollment.id)}
                        disabled={activatingId === enrollment.id}
                      >
                        {activatingId === enrollment.id ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-4 h-4 animate-spin" /> Ativando
                          </span>
                        ) : (
                          'Ativar inscrição'
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateEnrollment(enrollment.id)}
                        disabled={deactivatingId === enrollment.id || enrollment.status !== 'active'}
                      >
                        {deactivatingId === enrollment.id ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-4 h-4 animate-spin" /> Desativando
                          </span>
                        ) : (
                          'Desativar inscrição'
                        )}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEnrollment(enrollment.id)}
                      disabled={deletingId === enrollment.id}
                    >
                      {deletingId === enrollment.id ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-4 h-4 animate-spin" /> Excluindo
                        </span>
                      ) : (
                        'Excluir inscrição'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => fetchEnrollments(pagination.page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchEnrollments(pagination.page + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
