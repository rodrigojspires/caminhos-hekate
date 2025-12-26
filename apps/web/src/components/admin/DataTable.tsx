'use client'

import { useState } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onView?: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  className?: string
  emptyMessage?: string
}

// --- Skeleton Loader Component ---
const DataTableSkeleton = ({ columns, hasActions }: { columns: Column<any>[], hasActions: boolean }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {columns.map((col) => (
          <TableHead key={col.key} className={col.className}>
            {col.label}
          </TableHead>
        ))}
        {hasActions && <TableHead className="text-right">Ações</TableHead>}
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          {columns.map((col) => (
            <TableCell key={col.key} className={col.className}>
              <Skeleton className="h-5 w-full bg-white/5" />
            </TableCell>
          ))}
          {hasActions && (
            <TableCell className="text-right">
              <Skeleton className="h-5 w-10 ml-auto bg-white/5" />
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// --- Empty State Component ---
const EmptyState = ({ message }: { message: string }) => (
  <div className="bg-card rounded-lg border border-hekate-gold/20 p-8 text-center">
    <div className="flex flex-col items-center justify-center space-y-4">
      <Archive className="w-12 h-12 text-hekate-pearl/20" strokeWidth={1}/>
      <p className="text-hekate-pearl/60">{message}</p>
    </div>
  </div>
);

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onSort,
  onView,
  onEdit,
  onDelete,
  className,
  emptyMessage = "Nenhum registro encontrado"
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedActions, setExpandedActions] = useState<number | null>(null)

  const hasActions = !!(onView || onEdit || onDelete)

  const handleSort = (key: string) => {
    if (!onSort) return
    const direction: 'asc' | 'desc' = (sortKey === key && sortDirection === 'asc') ? 'desc' : 'asc'
    setSortKey(key)
    setSortDirection(direction)
    onSort(key, direction)
  }

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="w-4 h-4 text-hekate-pearl/40" />
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-hekate-gold" />
      : <ChevronDown className="w-4 h-4 text-hekate-gold" />
  }

  if (loading) {
    return <DataTableSkeleton columns={columns} hasActions={hasActions} />
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(column.className, column.sortable && "cursor-pointer")}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-2">
                  <span>{column.label}</span>
                  {column.sortable && <span>{getSortIcon(column.key)}</span>}
                </div>
              </TableHead>
            ))}
            {hasActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => {
                const value = column.key.includes('.') 
                  ? column.key.split('.').reduce((obj, key) => obj?.[key], row)
                  : row[column.key]
                return (
                  <TableCell key={column.key} className={column.className}>
                    {column.render ? column.render(value, row) : value}
                  </TableCell>
                )
              })}
              {hasActions && (
                <TableCell className="text-right">
                  <div className="relative">
                    <button
                      onClick={() => setExpandedActions(expandedActions === rowIndex ? null : rowIndex)}
                      className="text-hekate-pearl/50 hover:text-hekate-gold transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    {expandedActions === rowIndex && (
                      <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg z-10 border border-hekate-gold/20">
                        <div className="p-1">
                          {onView && (
                            <button
                              onClick={() => { onView(row); setExpandedActions(null) }}
                              className="flex items-center w-full px-3 py-2 text-sm text-hekate-pearl/80 hover:bg-white/5 rounded-md"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => { onEdit(row); setExpandedActions(null) }}
                              className="flex items-center w-full px-3 py-2 text-sm text-hekate-pearl/80 hover:bg-white/5 rounded-md"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => { onDelete(row); setExpandedActions(null) }}
                              className="flex items-center w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
