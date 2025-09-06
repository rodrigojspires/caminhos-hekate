'use client'

import * as React from 'react'
import { Search, X, Clock, TrendingUp, User, BookOpen, MessageSquare, FileText, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

export interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'user' | 'course' | 'post' | 'comment' | 'order'
  url: string
  category?: string
  thumbnail?: string
}

export interface SearchSuggestion {
  id: string
  query: string
  type: 'recent' | 'trending'
}

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onResultSelect?: (result: SearchResult) => void
  className?: string
  showSuggestions?: boolean
  maxResults?: number
}

// API response interface
interface SearchApiResponse {
  results: {
    users: Array<{ id: string; name: string; email: string }>
    courses: Array<{ id: string; title: string; description: string }>
    posts: Array<{ id: string; title: string; content: string }>
    comments: Array<{ id: string; content: string; postId: string }>
    orders: Array<{ id: string; status: string; total: number }>
  }
  total: number
}

function getTypeIcon(type: SearchResult['type']) {
  switch (type) {
    case 'user':
      return <User className="h-4 w-4" />
    case 'course':
      return <BookOpen className="h-4 w-4" />
    case 'post':
      return <FileText className="h-4 w-4" />
    case 'comment':
      return <MessageSquare className="h-4 w-4" />
    case 'order':
      return <ShoppingCart className="h-4 w-4" />
    default:
      return <Search className="h-4 w-4" />
  }
}

function getTypeLabel(type: SearchResult['type']): string {
  switch (type) {
    case 'user':
      return 'Usuário'
    case 'course':
      return 'Curso'
    case 'post':
      return 'Post'
    case 'comment':
      return 'Comentário'
    case 'order':
      return 'Pedido'
    default:
      return 'Resultado'
  }
}

export function SearchBar({
  placeholder = 'Buscar usuários, cursos, posts...',
  onSearch,
  onResultSelect,
  className,
  showSuggestions = true,
  maxResults = 8
}: SearchBarProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [suggestions] = React.useState<SearchSuggestion[]>([
    { id: '1', query: 'tarot iniciantes', type: 'recent' },
    { id: '2', query: 'numerologia', type: 'recent' },
    { id: '3', query: 'meditação', type: 'trending' },
    { id: '4', query: 'astrologia', type: 'trending' }
  ])

  const debouncedQuery = useDebounce(query, 300)

  // Search API call
  const searchData = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=${maxResults}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Erro na busca')
      }

      const data: SearchApiResponse = await response.json()
      const searchResults: SearchResult[] = []

      // Transform API results to SearchResult format
      data.results.users?.forEach(user => {
        searchResults.push({
          id: user.id,
          title: user.name,
          description: user.email,
          type: 'user',
          url: `/admin/users/${user.id}`
        })
      })

      data.results.courses?.forEach(course => {
        searchResults.push({
          id: course.id,
          title: course.title,
          description: course.description,
          type: 'course',
          url: `/admin/courses/${course.id}`
        })
      })

      data.results.posts?.forEach(post => {
        searchResults.push({
          id: post.id,
          title: post.title,
          description: post.content.substring(0, 100) + '...',
          type: 'post',
          url: `/admin/community/posts/${post.id}`
        })
      })

      data.results.comments?.forEach(comment => {
        searchResults.push({
          id: comment.id,
          title: 'Comentário',
          description: comment.content.substring(0, 100) + '...',
          type: 'comment',
          url: `/admin/community/comments/${comment.id}`
        })
      })

      data.results.orders?.forEach(order => {
        searchResults.push({
          id: order.id,
          title: `Pedido #${order.id}`,
          description: `Status: ${order.status} - Total: R$ ${order.total}`,
          type: 'order',
          url: `/admin/orders/${order.id}`
        })
      })

      setResults(searchResults)
    } catch (error) {
      console.error('Erro na busca:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [maxResults])

  // Effect for debounced search
  React.useEffect(() => {
    if (debouncedQuery) {
      searchData(debouncedQuery)
    } else {
      setResults([])
    }
  }, [debouncedQuery, searchData])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    onSearch?.(searchQuery)
  }

  const handleResultSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    onResultSelect?.(result)
    // Navigate to result URL
    window.location.href = result.url
  }

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.query)
    handleSearch(suggestion.query)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
  }

  const recentSuggestions = suggestions.filter(s => s.type === 'recent')
  const trendingSuggestions = suggestions.filter(s => s.type === 'trending')

  return (
    <div className={cn('relative w-full max-w-sm', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              className="pl-9 pr-9"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={handleSearch}
            />
            <CommandList>
              {isLoading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Buscando...
                </div>
              )}
              
              {!isLoading && query && results.length === 0 && (
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              )}
              
              {!isLoading && results.length > 0 && (
                <CommandGroup heading="Resultados">
                  {results.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.title}
                      onSelect={() => handleResultSelect(result)}
                      className="flex items-start space-x-3 p-3"
                    >
                      <div className="flex-shrink-0">
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{result.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {result.description}
                          </p>
                        )}
                        {result.category && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.category}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {!query && showSuggestions && (
                <>
                  {recentSuggestions.length > 0 && (
                    <CommandGroup heading="Buscas recentes">
                      {recentSuggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion.id}
                          value={suggestion.query}
                          onSelect={() => handleSuggestionSelect(suggestion)}
                          className="flex items-center space-x-2"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{suggestion.query}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {trendingSuggestions.length > 0 && (
                    <>
                      {recentSuggestions.length > 0 && <CommandSeparator />}
                      <CommandGroup heading="Em alta">
                        {trendingSuggestions.map((suggestion) => (
                          <CommandItem
                            key={suggestion.id}
                            value={suggestion.query}
                            onSelect={() => handleSuggestionSelect(suggestion)}
                            className="flex items-center space-x-2"
                          >
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span>{suggestion.query}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}