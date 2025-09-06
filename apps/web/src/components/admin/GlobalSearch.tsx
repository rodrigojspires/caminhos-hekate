'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, User, BookOpen, MessageSquare, ShoppingCart, FileText, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchResult {
  id: string
  type: 'user' | 'course' | 'post' | 'comment' | 'order'
  title: string
  description: string
  url: string
  createdAt: string
}

interface SearchResponse {
  query: string
  type: string
  results: SearchResult[]
  total: number
  totalPages: number
}

interface GlobalSearchProps {
  className?: string
  placeholder?: string
}

const typeIcons = {
  user: User,
  course: BookOpen,
  post: FileText,
  comment: MessageSquare,
  order: ShoppingCart
}

const typeLabels = {
  user: 'Usuário',
  course: 'Curso',
  post: 'Post',
  comment: 'Comentário',
  order: 'Pedido'
}

const typeColors = {
  user: 'bg-blue-100 text-blue-800',
  course: 'bg-green-100 text-green-800',
  post: 'bg-purple-100 text-purple-800',
  comment: 'bg-yellow-100 text-yellow-800',
  order: 'bg-orange-100 text-orange-800'
}

export function GlobalSearch({ className = '', placeholder = 'Buscar em todo o sistema...' }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchData = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          query: debouncedQuery,
          type: 'all',
          limit: '10'
        })

        const response = await fetch(`/api/search?${params}`)
        if (!response.ok) throw new Error('Erro na busca')

        const data: SearchResponse = await response.json()
        setResults(data.results)
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Erro na busca:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    searchData()
  }, [debouncedQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultClick(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url)
    setIsOpen(false)
    setQuery('')
    setResults([])
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
        />
        {isLoading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        )}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </div>
            {results.map((result, index) => {
              const Icon = typeIcons[result.type]
              const isSelected = index === selectedIndex
              
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isSelected ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {result.title}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[result.type]}`}>
                          {typeLabels[result.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {result.description}
                      </p>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(result.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isOpen && query && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-1">Tente usar termos diferentes</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalSearch