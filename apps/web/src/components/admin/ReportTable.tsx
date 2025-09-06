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
  Eye,
  Check,
  X,
  MessageSquare,
  FileText,
  Flag
} from 'lucide-react'

interface Report {
  id: string
  reason: string
  description?: string
  status: 'pending' | 'resolved' | 'rejected'
  type: 'post' | 'comment'
  content: {
    id: string
    title?: string
    content: string
    author: {
      id: string
      name: string
      avatar?: string
    }
  }
  reporter: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  resolvedAt?: string
  resolvedBy?: {
    id: string
    name: string
  }
}

interface ReportTableProps {
  reports: Report[]
  onResolve?: (id: string) => void
  onReject?: (id: string) => void
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
    case 'pending':
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Pendente
        </Badge>
      )
    case 'resolved':
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Resolvido
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          Rejeitado
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

function getTypeBadge(type: string) {
  switch (type) {
    case 'post':
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <FileText className="mr-1 h-3 w-3" />
          Post
        </Badge>
      )
    case 'comment':
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-600">
          <MessageSquare className="mr-1 h-3 w-3" />
          Comentário
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-600">
          {type}
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

export function ReportTable({ reports, onResolve, onReject }: ReportTableProps) {
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [reportToAction, setReportToAction] = useState<Report | null>(null)

  const handleResolveClick = (report: Report) => {
    setReportToAction(report)
    setResolveDialogOpen(true)
  }

  const handleRejectClick = (report: Report) => {
    setReportToAction(report)
    setRejectDialogOpen(true)
  }

  const handleResolveConfirm = () => {
    if (reportToAction && onResolve) {
      onResolve(reportToAction.id)
    }
    setResolveDialogOpen(false)
    setReportToAction(null)
  }

  const handleRejectConfirm = () => {
    if (reportToAction && onReject) {
      onReject(reportToAction.id)
    }
    setRejectDialogOpen(false)
    setReportToAction(null)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conteúdo Reportado</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Reportado por</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum relatório encontrado
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="max-w-sm">
                    <div className="space-y-2">
                      {report.content.title && (
                        <p className="text-sm font-medium line-clamp-1" title={report.content.title}>
                          {report.content.title}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2" title={report.content.content}>
                        {report.content.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={report.content.author.avatar} />
                          <AvatarFallback className="text-xs">
                            {getAuthorInitials(report.content.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          por {report.content.author.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{report.reason}</p>
                      {report.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2" title={report.description}>
                          {report.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(report.type)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={report.reporter.avatar} />
                        <AvatarFallback className="text-xs">
                          {getAuthorInitials(report.reporter.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{report.reporter.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(report.status)}
                      {report.resolvedAt && report.resolvedBy && (
                        <p className="text-xs text-muted-foreground">
                          por {report.resolvedBy.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(report.createdAt)}
                      </p>
                      {report.resolvedAt && (
                        <p className="text-xs text-muted-foreground">
                          Resolvido: {formatDate(report.resolvedAt)}
                        </p>
                      )}
                    </div>
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
                          <Link href={`/admin/community/reports/${report.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link 
                            href={`/admin/community/${report.type}s/${report.content.id}`}
                          >
                            <Flag className="mr-2 h-4 w-4" />
                            Ver Conteúdo
                          </Link>
                        </DropdownMenuItem>
                        {report.status === 'pending' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-green-600"
                              onClick={() => handleResolveClick(report)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Resolver
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleRejectClick(report)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Rejeitar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolver relatório</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este relatório como resolvido?
              Esta ação indica que o conteúdo reportado foi analisado e as medidas apropriadas foram tomadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResolveConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              Resolver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar relatório</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja rejeitar este relatório?
              Esta ação indica que o conteúdo reportado não viola as diretrizes da comunidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}