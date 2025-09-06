"use client"

import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPage?: boolean
  itemsPerPageOptions?: number[]
  className?: string
  disabled?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  itemsPerPageOptions = [10, 25, 50, 100],
  className,
  disabled = false
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return
    }
    onPageChange(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    if (disabled || !onItemsPerPageChange) return
    onItemsPerPageChange(newItemsPerPage)
  }

  if (totalPages <= 1 && !showItemsPerPage) {
    return null
  }

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4",
      "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
      className
    )}>
      {/* Items info and per page selector */}
      <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
        <span>
          Mostrando {startItem} a {endItem} de {totalItems} resultados
        </span>
        
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span>Itens por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              disabled={disabled}
              className={cn(
                "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded",
                "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                "focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={disabled || currentPage === 1}
            className={cn(
              "p-2 rounded-md transition-colors",
              "text-gray-500 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            )}
            title="Primeira página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            className={cn(
              "p-2 rounded-md transition-colors",
              "text-gray-500 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            )}
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getVisiblePages().map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`dots-${index}`}
                    className="px-3 py-2 text-gray-500 dark:text-gray-400"
                  >
                    ...
                  </span>
                )
              }

              const pageNumber = page as number
              const isCurrentPage = pageNumber === currentPage

              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={disabled}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isCurrentPage
                      ? "bg-purple-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {pageNumber}
                </button>
              )
            })}
          </div>

          {/* Next page */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            className={cn(
              "p-2 rounded-md transition-colors",
              "text-gray-500 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            )}
            title="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled || currentPage === totalPages}
            className={cn(
              "p-2 rounded-md transition-colors",
              "text-gray-500 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            )}
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// Simple pagination component for basic use cases
export interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  disabled?: boolean
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  disabled = false
}: SimplePaginationProps) {
  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return
    }
    onPageChange(page)
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className={cn(
          "p-2 rounded-md transition-colors",
          "text-gray-500 dark:text-gray-400",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
        Página {currentPage} de {totalPages}
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className={cn(
          "p-2 rounded-md transition-colors",
          "text-gray-500 dark:text-gray-400",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}