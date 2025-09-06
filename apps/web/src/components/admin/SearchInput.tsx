"use client"

import { useState, useEffect } from "react"
import { Search, X, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  debounceMs?: number
  className?: string
  showFilter?: boolean
  onFilterClick?: () => void
  disabled?: boolean
}

export function SearchInput({
  placeholder = "Buscar...",
  value = "",
  onChange,
  onSearch,
  debounceMs = 300,
  className,
  showFilter = false,
  onFilterClick,
  disabled = false
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch && internalValue !== value) {
        onSearch(internalValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [internalValue, debounceMs, onSearch, value])

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  const handleClear = () => {
    setInternalValue("")
    onChange?.("") 
    onSearch?.("") 
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch?.(internalValue)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={cn(
            "h-5 w-5 transition-colors",
            isFocused 
              ? "text-purple-500" 
              : "text-gray-400 dark:text-gray-500"
          )} />
        </div>
        
        <input
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
            "placeholder-gray-500 dark:placeholder-gray-400",
            "focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "transition-all duration-200",
            disabled && "opacity-50 cursor-not-allowed",
            isFocused && "ring-2 ring-purple-500 border-transparent"
          )}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {internalValue && (
            <button
              onClick={handleClear}
              disabled={disabled}
              className={cn(
                "p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "rounded transition-colors",
                disabled && "cursor-not-allowed"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {showFilter && (
            <button
              onClick={onFilterClick}
              disabled={disabled}
              className={cn(
                "p-2 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "rounded transition-colors",
                disabled && "cursor-not-allowed"
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Advanced Search Component with filters
export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'daterange'
  options?: { value: string; label: string }[]
}

export interface AdvancedSearchProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: FilterOption[]
  filterValues?: Record<string, any>
  onFilterChange?: (key: string, value: any) => void
  onApplyFilters?: () => void
  onClearFilters?: () => void
  className?: string
}

export function AdvancedSearch({
  searchValue = "",
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  className
}: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = Object.values(filterValues).some(value => 
    value !== undefined && value !== null && value !== ""
  )

  return (
    <div className={cn("space-y-4", className)}>
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        onSearch={onSearchChange}
        showFilter={filters.length > 0}
        onFilterClick={() => setShowFilters(!showFilters)}
        placeholder="Buscar..."
      />
      
      {showFilters && filters.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {filter.label}
                </label>
                
                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={filterValues[filter.key] || ""}
                    onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                )}
                
                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.key] || ""}
                    onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={filterValues[filter.key] || ""}
                    onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
              className={cn(
                "px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md",
                "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                !hasActiveFilters && "opacity-50 cursor-not-allowed"
              )}
            >
              Limpar
            </button>
            <button
              onClick={onApplyFilters}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}