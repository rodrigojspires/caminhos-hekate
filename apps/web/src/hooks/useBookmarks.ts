'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'

interface Bookmark {
  id: string
  courseId: string
  lessonId: string
  userId: string
  title: string
  description?: string
  timestamp: number // Video timestamp in seconds
  createdAt: Date
  updatedAt: Date
  tags: string[]
  color?: string
  isPublic: boolean
  category?: 'important' | 'question' | 'note' | 'review' | 'custom'
}

interface BookmarkGroup {
  id: string
  name: string
  description?: string
  color: string
  bookmarks: string[] // Bookmark IDs
  createdAt: Date
  updatedAt: Date
}

interface BookmarkFilters {
  courseId?: string
  lessonId?: string
  category?: Bookmark['category']
  tags?: string[]
  searchQuery?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

interface UseBookmarksReturn {
  bookmarks: Bookmark[]
  groups: BookmarkGroup[]
  isLoading: boolean
  error: string | null
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  getBookmark: (id: string) => Bookmark | null
  getBookmarksByLesson: (courseId: string, lessonId: string) => Bookmark[]
  getBookmarksByCourse: (courseId: string) => Bookmark[]
  searchBookmarks: (query: string) => Bookmark[]
  filterBookmarks: (filters: BookmarkFilters) => Bookmark[]
  createGroup: (group: Omit<BookmarkGroup, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateGroup: (id: string, updates: Partial<BookmarkGroup>) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  addBookmarkToGroup: (bookmarkId: string, groupId: string) => Promise<void>
  removeBookmarkFromGroup: (bookmarkId: string, groupId: string) => Promise<void>
  exportBookmarks: (format?: 'json' | 'csv') => string
  importBookmarks: (data: string, format?: 'json' | 'csv') => Promise<void>
  getBookmarkAtTime: (courseId: string, lessonId: string, timestamp: number, tolerance?: number) => Bookmark | null
  getNearbyBookmarks: (courseId: string, lessonId: string, timestamp: number, range?: number) => Bookmark[]
  getPopularTags: () => string[]
  getBookmarkStats: () => {
    total: number
    byCategory: Record<string, number>
    byMonth: Record<string, number>
    averagePerLesson: number
  }
}

const STORAGE_KEY = 'bookmarks'
const GROUPS_STORAGE_KEY = 'bookmark_groups'

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

export function useBookmarks(): UseBookmarksReturn {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [groups, setGroups] = useState<BookmarkGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load bookmarks from localStorage
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const savedBookmarks = localStorage.getItem(`${STORAGE_KEY}_${user.id}`)
      const savedGroups = localStorage.getItem(`${GROUPS_STORAGE_KEY}_${user.id}`)
      
      if (savedBookmarks) {
        const parsed = JSON.parse(savedBookmarks)
        // Convert date strings back to Date objects
        const bookmarksWithDates = parsed.map((bookmark: any) => ({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt)
        }))
        setBookmarks(bookmarksWithDates)
      }
      
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups)
        const groupsWithDates = parsed.map((group: any) => ({
          ...group,
          createdAt: new Date(group.createdAt),
          updatedAt: new Date(group.updatedAt)
        }))
        setGroups(groupsWithDates)
      }
    } catch (err) {
      console.error('Error loading bookmarks:', err)
      setError('Erro ao carregar marcadores')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Save bookmarks to localStorage
  const saveBookmarks = useCallback((newBookmarks: Bookmark[]) => {
    if (!user) return
    
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newBookmarks))
    } catch (err) {
      console.error('Error saving bookmarks:', err)
      setError('Erro ao salvar marcadores')
    }
  }, [user])

  // Save groups to localStorage
  const saveGroups = useCallback((newGroups: BookmarkGroup[]) => {
    if (!user) return
    
    try {
      localStorage.setItem(`${GROUPS_STORAGE_KEY}_${user.id}`, JSON.stringify(newGroups))
    } catch (err) {
      console.error('Error saving bookmark groups:', err)
      setError('Erro ao salvar grupos de marcadores')
    }
  }, [user])

  // Generate unique ID
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add bookmark
  const addBookmark = useCallback(async (
    bookmarkData: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (!user) {
      setError('Usuário não autenticado')
      throw new Error('User not authenticated')
    }

    try {
      const now = new Date()
      const newBookmark: Bookmark = {
        ...bookmarkData,
        id: generateId(),
        userId: user.id,
        createdAt: now,
        updatedAt: now
      }

      const updatedBookmarks = [...bookmarks, newBookmark]
      setBookmarks(updatedBookmarks)
      saveBookmarks(updatedBookmarks)
      setError(null)
      
      return newBookmark.id
    } catch (err) {
      console.error('Error adding bookmark:', err)
      setError('Erro ao adicionar marcador')
      throw err
    }
  }, [user, bookmarks, saveBookmarks, generateId])

  // Update bookmark
  const updateBookmark = useCallback(async (id: string, updates: Partial<Bookmark>) => {
    try {
      const updatedBookmarks = bookmarks.map(bookmark => 
        bookmark.id === id 
          ? { ...bookmark, ...updates, updatedAt: new Date() }
          : bookmark
      )
      
      setBookmarks(updatedBookmarks)
      saveBookmarks(updatedBookmarks)
      setError(null)
    } catch (err) {
      console.error('Error updating bookmark:', err)
      setError('Erro ao atualizar marcador')
    }
  }, [bookmarks, saveBookmarks])

  // Delete bookmark
  const deleteBookmark = useCallback(async (id: string) => {
    try {
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== id)
      setBookmarks(updatedBookmarks)
      saveBookmarks(updatedBookmarks)
      
      // Remove from groups
      const updatedGroups = groups.map(group => ({
        ...group,
        bookmarks: group.bookmarks.filter(bookmarkId => bookmarkId !== id),
        updatedAt: new Date()
      }))
      setGroups(updatedGroups)
      saveGroups(updatedGroups)
      
      setError(null)
    } catch (err) {
      console.error('Error deleting bookmark:', err)
      setError('Erro ao excluir marcador')
    }
  }, [bookmarks, groups, saveBookmarks, saveGroups])

  // Get bookmark by ID
  const getBookmark = useCallback((id: string): Bookmark | null => {
    return bookmarks.find(bookmark => bookmark.id === id) || null
  }, [bookmarks])

  // Get bookmarks by lesson
  const getBookmarksByLesson = useCallback((courseId: string, lessonId: string): Bookmark[] => {
    return bookmarks
      .filter(bookmark => bookmark.courseId === courseId && bookmark.lessonId === lessonId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [bookmarks])

  // Get bookmarks by course
  const getBookmarksByCourse = useCallback((courseId: string): Bookmark[] => {
    return bookmarks
      .filter(bookmark => bookmark.courseId === courseId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [bookmarks])

  // Search bookmarks
  const searchBookmarks = useCallback((query: string): Bookmark[] => {
    if (!query.trim()) return bookmarks
    
    const lowercaseQuery = query.toLowerCase()
    return bookmarks.filter(bookmark => 
      bookmark.title.toLowerCase().includes(lowercaseQuery) ||
      bookmark.description?.toLowerCase().includes(lowercaseQuery) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }, [bookmarks])

  // Filter bookmarks
  const filterBookmarks = useCallback((filters: BookmarkFilters): Bookmark[] => {
    let filtered = [...bookmarks]

    if (filters.courseId) {
      filtered = filtered.filter(bookmark => bookmark.courseId === filters.courseId)
    }

    if (filters.lessonId) {
      filtered = filtered.filter(bookmark => bookmark.lessonId === filters.lessonId)
    }

    if (filters.category) {
      filtered = filtered.filter(bookmark => bookmark.category === filters.category)
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(bookmark => 
        filters.tags!.some(tag => bookmark.tags.includes(tag))
      )
    }

    if (filters.searchQuery) {
      filtered = searchBookmarks(filters.searchQuery)
    }

    if (filters.dateRange) {
      filtered = filtered.filter(bookmark => 
        bookmark.createdAt >= filters.dateRange!.start &&
        bookmark.createdAt <= filters.dateRange!.end
      )
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [bookmarks, searchBookmarks])

  // Create group
  const createGroup = useCallback(async (
    groupData: Omit<BookmarkGroup, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      const now = new Date()
      const newGroup: BookmarkGroup = {
        ...groupData,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      }

      const updatedGroups = [...groups, newGroup]
      setGroups(updatedGroups)
      saveGroups(updatedGroups)
      setError(null)
      
      return newGroup.id
    } catch (err) {
      console.error('Error creating group:', err)
      setError('Erro ao criar grupo')
      throw err
    }
  }, [groups, saveGroups, generateId])

  // Update group
  const updateGroup = useCallback(async (id: string, updates: Partial<BookmarkGroup>) => {
    try {
      const updatedGroups = groups.map(group => 
        group.id === id 
          ? { ...group, ...updates, updatedAt: new Date() }
          : group
      )
      
      setGroups(updatedGroups)
      saveGroups(updatedGroups)
      setError(null)
    } catch (err) {
      console.error('Error updating group:', err)
      setError('Erro ao atualizar grupo')
    }
  }, [groups, saveGroups])

  // Delete group
  const deleteGroup = useCallback(async (id: string) => {
    try {
      const updatedGroups = groups.filter(group => group.id !== id)
      setGroups(updatedGroups)
      saveGroups(updatedGroups)
      setError(null)
    } catch (err) {
      console.error('Error deleting group:', err)
      setError('Erro ao excluir grupo')
    }
  }, [groups, saveGroups])

  // Add bookmark to group
  const addBookmarkToGroup = useCallback(async (bookmarkId: string, groupId: string) => {
    try {
      const updatedGroups = groups.map(group => 
        group.id === groupId && !group.bookmarks.includes(bookmarkId)
          ? { 
              ...group, 
              bookmarks: [...group.bookmarks, bookmarkId],
              updatedAt: new Date()
            }
          : group
      )
      
      setGroups(updatedGroups)
      saveGroups(updatedGroups)
      setError(null)
    } catch (err) {
      console.error('Error adding bookmark to group:', err)
      setError('Erro ao adicionar marcador ao grupo')
    }
  }, [groups, saveGroups])

  // Remove bookmark from group
  const removeBookmarkFromGroup = useCallback(async (bookmarkId: string, groupId: string) => {
    try {
      const updatedGroups = groups.map(group => 
        group.id === groupId
          ? { 
              ...group, 
              bookmarks: group.bookmarks.filter(id => id !== bookmarkId),
              updatedAt: new Date()
            }
          : group
      )
      
      setGroups(updatedGroups)
      saveGroups(updatedGroups)
      setError(null)
    } catch (err) {
      console.error('Error removing bookmark from group:', err)
      setError('Erro ao remover marcador do grupo')
    }
  }, [groups, saveGroups])

  // Get bookmark at specific time
  const getBookmarkAtTime = useCallback((
    courseId: string, 
    lessonId: string, 
    timestamp: number, 
    tolerance: number = 5
  ): Bookmark | null => {
    const lessonBookmarks = getBookmarksByLesson(courseId, lessonId)
    return lessonBookmarks.find(bookmark => 
      Math.abs(bookmark.timestamp - timestamp) <= tolerance
    ) || null
  }, [getBookmarksByLesson])

  // Get nearby bookmarks
  const getNearbyBookmarks = useCallback((
    courseId: string, 
    lessonId: string, 
    timestamp: number, 
    range: number = 30
  ): Bookmark[] => {
    const lessonBookmarks = getBookmarksByLesson(courseId, lessonId)
    return lessonBookmarks.filter(bookmark => 
      Math.abs(bookmark.timestamp - timestamp) <= range
    )
  }, [getBookmarksByLesson])

  // Get popular tags
  const getPopularTags = useCallback((): string[] => {
    const tagCounts: Record<string, number> = {}
    
    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag]) => tag)
  }, [bookmarks])

  // Get bookmark statistics
  const getBookmarkStats = useCallback(() => {
    const total = bookmarks.length
    
    const byCategory: Record<string, number> = {}
    const byMonth: Record<string, number> = {}
    
    bookmarks.forEach(bookmark => {
      // Category stats
      const category = bookmark.category || 'custom'
      byCategory[category] = (byCategory[category] || 0) + 1
      
      // Monthly stats
      const monthKey = bookmark.createdAt.toISOString().slice(0, 7) // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1
    })
    
    // Calculate average per lesson
    const uniqueLessons = new Set(bookmarks.map(b => `${b.courseId}-${b.lessonId}`))
    const averagePerLesson = uniqueLessons.size > 0 ? total / uniqueLessons.size : 0
    
    return {
      total,
      byCategory,
      byMonth,
      averagePerLesson
    }
  }, [bookmarks])

  // Export bookmarks
  const exportBookmarks = useCallback((format: 'json' | 'csv' = 'json'): string => {
    if (format === 'json') {
      return JSON.stringify({
        bookmarks,
        groups,
        exportedAt: new Date().toISOString(),
        userId: user?.id
      }, null, 2)
    } else {
      // CSV format
      const headers = ['ID', 'Title', 'Description', 'Course ID', 'Lesson ID', 'Timestamp', 'Category', 'Tags', 'Created At']
      const rows = bookmarks.map(bookmark => [
        bookmark.id,
        bookmark.title,
        bookmark.description || '',
        bookmark.courseId,
        bookmark.lessonId,
        bookmark.timestamp.toString(),
        bookmark.category || '',
        bookmark.tags.join(';'),
        bookmark.createdAt.toISOString()
      ])
      
      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')
    }
  }, [bookmarks, groups, user])

  // Import bookmarks
  const importBookmarks = useCallback(async (data: string, format: 'json' | 'csv' = 'json') => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    try {
      if (format === 'json') {
        const parsed = JSON.parse(data)
        
        if (parsed.userId && parsed.userId !== user.id) {
          setError('Os dados importados pertencem a outro usuário')
          return
        }

        // Convert date strings back to Date objects
        const bookmarksWithDates = parsed.bookmarks.map((bookmark: any) => ({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt)
        }))
        
        const groupsWithDates = (parsed.groups || []).map((group: any) => ({
          ...group,
          createdAt: new Date(group.createdAt),
          updatedAt: new Date(group.updatedAt)
        }))

        setBookmarks(bookmarksWithDates)
        setGroups(groupsWithDates)
        saveBookmarks(bookmarksWithDates)
        saveGroups(groupsWithDates)
      } else {
        // CSV format - simplified implementation
        const lines = data.split('\n')
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))
        
        const importedBookmarks: Bookmark[] = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, ''))
            return {
              id: values[0] || generateId(),
              title: values[1] || 'Imported Bookmark',
              description: values[2] || undefined,
              courseId: values[3] || '',
              lessonId: values[4] || '',
              timestamp: parseFloat(values[5]) || 0,
              category: (values[6] as Bookmark['category']) || 'custom',
              tags: values[7] ? values[7].split(';') : [],
              createdAt: values[8] ? new Date(values[8]) : new Date(),
              updatedAt: new Date(),
              userId: user.id,
              isPublic: false
            }
          })
        
        setBookmarks(importedBookmarks)
        saveBookmarks(importedBookmarks)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error importing bookmarks:', err)
      setError('Erro ao importar marcadores')
    }
  }, [user, saveBookmarks, saveGroups, generateId])

  return {
    bookmarks,
    groups,
    isLoading,
    error,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    getBookmark,
    getBookmarksByLesson,
    getBookmarksByCourse,
    searchBookmarks,
    filterBookmarks,
    createGroup,
    updateGroup,
    deleteGroup,
    addBookmarkToGroup,
    removeBookmarkFromGroup,
    exportBookmarks,
    importBookmarks,
    getBookmarkAtTime,
    getNearbyBookmarks,
    getPopularTags,
    getBookmarkStats
  }
}

export default useBookmarks