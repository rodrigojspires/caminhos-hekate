"use client"

import { useState } from "react"
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
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

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onSort,
  onView,
  onEdit,
  onDelete,
  className,
  emptyMessage = "Nenhum dado encontrado"
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedActions, setExpandedActions] = useState<number | null>(null)

  const handleSort = (key: string) => {
    if (!onSort) return
    
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortKey === key && sortDirection === 'asc') {
      direction = 'desc'
    }
    
    setSortKey(key)
    setSortDirection(direction)
    onSort(key, direction)
  }

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="w-4 h-4" />
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  const hasActions = onView || onEdit || onDelete

  if (loading) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", className)}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      {data.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                      column.sortable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600",
                      column.className
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="text-gray-400">
                          {getSortIcon(column.key)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {hasActions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {columns.map((column, colIndex) => {
                    const value = column.key.includes('.') 
                      ? column.key.split('.').reduce((obj, key) => obj?.[key], row)
                      : row[column.key]
                    
                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white",
                          column.className
                        )}
                      >
                        {column.render ? column.render(value, row) : value}
                      </td>
                    )
                  })}
                  {hasActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setExpandedActions(expandedActions === rowIndex ? null : rowIndex)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {expandedActions === rowIndex && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                            <div className="py-1">
                              {onView && (
                                <button
                                  onClick={() => {
                                    onView(row)
                                    setExpandedActions(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualizar
                                </button>
                              )}
                              {onEdit && (
                                <button
                                  onClick={() => {
                                    onEdit(row)
                                    setExpandedActions(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => {
                                    onDelete(row)
                                    setExpandedActions(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}