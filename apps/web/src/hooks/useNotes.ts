'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'

interface Note {
  id: string
  courseId: string
  lessonId: string
  userId: string
  title: string
  content: string
  timestamp?: number // Video timestamp in seconds (optional for general notes)
  createdAt: Date
  updatedAt: Date
  tags: string[]
  color?: string
  isImportant: boolean
  isPublic: boolean
  category?: 'general' | 'question' | 'summary' | 'todo' | 'insight' | 'custom'
  attachments?: {
    id: string
    name: string
    type: string
    url: string
    size: number
  }[]
}

interface NoteTemplate {
  id: string
  name: string
  content: string
  category: Note['category']
  tags: string[]
  isDefault: boolean
}

interface NoteFilters {
  courseId?: string
  lessonId?: string
  category?: Note['category']
  tags?: string[]
  searchQuery?: string
  isImportant?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  hasTimestamp?: boolean
}

interface UseNotesReturn {
  notes: Note[]
  templates: NoteTemplate[]
  isLoading: boolean
  error: string | null
  addNote: (note: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  getNote: (id: string) => Note | null
  getNotesByLesson: (courseId: string, lessonId: string) => Note[]
  getNotesByCourse: (courseId: string) => Note[]
  searchNotes: (query: string) => Note[]
  filterNotes: (filters: NoteFilters) => Note[]
  duplicateNote: (id: string) => Promise<string>
  createTemplate: (template: Omit<NoteTemplate, 'id'>) => Promise<string>
  updateTemplate: (id: string, updates: Partial<NoteTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  createNoteFromTemplate: (templateId: string, courseId: string, lessonId: string) => Promise<string>
  exportNotes: (format?: 'json' | 'markdown' | 'txt') => string
  importNotes: (data: string, format?: 'json' | 'markdown') => Promise<void>
  getNotesAtTime: (courseId: string, lessonId: string, timestamp: number, tolerance?: number) => Note[]
  getNearbyNotes: (courseId: string, lessonId: string, timestamp: number, range?: number) => Note[]
  getPopularTags: () => string[]
  getNotesStats: () => {
    total: number
    byCategory: Record<string, number>
    byMonth: Record<string, number>
    averagePerLesson: number
    totalWords: number
    importantNotes: number
  }
  syncWithBookmarks: (bookmarks: any[]) => void
}

const STORAGE_KEY = 'notes'
const TEMPLATES_STORAGE_KEY = 'note_templates'

const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'general-note',
    name: 'Anotação Geral',
    content: '# Título da Anotação\n\n## Pontos Principais\n- \n- \n- \n\n## Observações\n',
    category: 'general',
    tags: [],
    isDefault: true
  },
  {
    id: 'question-note',
    name: 'Pergunta/Dúvida',
    content: '# Pergunta\n\n**Contexto:** \n\n**Pergunta:** \n\n**Possível Resposta:** \n\n**Status:** [ ] Respondida\n',
    category: 'question',
    tags: ['dúvida'],
    isDefault: true
  },
  {
    id: 'summary-note',
    name: 'Resumo da Aula',
    content: '# Resumo - [Nome da Aula]\n\n## Conceitos Principais\n- \n\n## Exemplos Importantes\n- \n\n## Para Revisar\n- \n\n## Próximos Passos\n- \n',
    category: 'summary',
    tags: ['resumo'],
    isDefault: true
  },
  {
    id: 'todo-note',
    name: 'Lista de Tarefas',
    content: '# Tarefas - [Nome da Aula]\n\n## Para Fazer\n- [ ] \n- [ ] \n- [ ] \n\n## Em Progresso\n- [ ] \n\n## Concluído\n- [x] \n',
    category: 'todo',
    tags: ['tarefa'],
    isDefault: true
  },
  {
    id: 'insight-note',
    name: 'Insight/Descoberta',
    content: '# 💡 Insight\n\n**Descoberta:** \n\n**Como Aplicar:** \n\n**Conexões:** \n- \n\n**Impacto:** \n',
    category: 'insight',
    tags: ['insight', 'descoberta'],
    isDefault: true
  }
]

export function useNotes(): UseNotesReturn {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [templates, setTemplates] = useState<NoteTemplate[]>(DEFAULT_TEMPLATES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load notes from localStorage
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const savedNotes = localStorage.getItem(`${STORAGE_KEY}_${user.id}`)
      const savedTemplates = localStorage.getItem(`${TEMPLATES_STORAGE_KEY}_${user.id}`)
      
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes)
        // Convert date strings back to Date objects
        const notesWithDates = parsed.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }))
        setNotes(notesWithDates)
      }
      
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates)
        setTemplates([...DEFAULT_TEMPLATES, ...parsed.filter((t: NoteTemplate) => !t.isDefault)])
      }
    } catch (err) {
      console.error('Error loading notes:', err)
      setError('Erro ao carregar anotações')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Save notes to localStorage
  const saveNotes = useCallback((newNotes: Note[]) => {
    if (!user) return
    
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newNotes))
    } catch (err) {
      console.error('Error saving notes:', err)
      setError('Erro ao salvar anotações')
    }
  }, [user])

  // Save templates to localStorage
  const saveTemplates = useCallback((newTemplates: NoteTemplate[]) => {
    if (!user) return
    
    try {
      const customTemplates = newTemplates.filter(t => !t.isDefault)
      localStorage.setItem(`${TEMPLATES_STORAGE_KEY}_${user.id}`, JSON.stringify(customTemplates))
    } catch (err) {
      console.error('Error saving note templates:', err)
      setError('Erro ao salvar modelos de anotação')
    }
  }, [user])

  // Generate unique ID
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add note
  const addNote = useCallback(async (
    noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (!user) {
      setError('Usuário não autenticado')
      throw new Error('User not authenticated')
    }

    try {
      const now = new Date()
      const newNote: Note = {
        ...noteData,
        id: generateId(),
        userId: user.id,
        createdAt: now,
        updatedAt: now
      }

      const updatedNotes = [...notes, newNote]
      setNotes(updatedNotes)
      saveNotes(updatedNotes)
      setError(null)
      
      return newNote.id
    } catch (err) {
      console.error('Error adding note:', err)
      setError('Erro ao adicionar anotação')
      throw err
    }
  }, [user, notes, saveNotes, generateId])

  // Update note
  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      const updatedNotes = notes.map(note => 
        note.id === id 
          ? { ...note, ...updates, updatedAt: new Date() }
          : note
      )
      
      setNotes(updatedNotes)
      saveNotes(updatedNotes)
      setError(null)
    } catch (err) {
      console.error('Error updating note:', err)
      setError('Erro ao atualizar anotação')
    }
  }, [notes, saveNotes])

  // Delete note
  const deleteNote = useCallback(async (id: string) => {
    try {
      const updatedNotes = notes.filter(note => note.id !== id)
      setNotes(updatedNotes)
      saveNotes(updatedNotes)
      setError(null)
    } catch (err) {
      console.error('Error deleting note:', err)
      setError('Erro ao excluir anotação')
    }
  }, [notes, saveNotes])

  // Get note by ID
  const getNote = useCallback((id: string): Note | null => {
    return notes.find(note => note.id === id) || null
  }, [notes])

  // Get notes by lesson
  const getNotesByLesson = useCallback((courseId: string, lessonId: string): Note[] => {
    return notes
      .filter(note => note.courseId === courseId && note.lessonId === lessonId)
      .sort((a, b) => {
        // Sort by timestamp first (if available), then by creation date
        if (a.timestamp !== undefined && b.timestamp !== undefined) {
          return a.timestamp - b.timestamp
        }
        if (a.timestamp !== undefined) return -1
        if (b.timestamp !== undefined) return 1
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
  }, [notes])

  // Get notes by course
  const getNotesByCourse = useCallback((courseId: string): Note[] => {
    return notes
      .filter(note => note.courseId === courseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [notes])

  // Search notes
  const searchNotes = useCallback((query: string): Note[] => {
    if (!query.trim()) return notes
    
    const lowercaseQuery = query.toLowerCase()
    return notes.filter(note => 
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.content.toLowerCase().includes(lowercaseQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }, [notes])

  // Filter notes
  const filterNotes = useCallback((filters: NoteFilters): Note[] => {
    let filtered = [...notes]

    if (filters.courseId) {
      filtered = filtered.filter(note => note.courseId === filters.courseId)
    }

    if (filters.lessonId) {
      filtered = filtered.filter(note => note.lessonId === filters.lessonId)
    }

    if (filters.category) {
      filtered = filtered.filter(note => note.category === filters.category)
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(note => 
        filters.tags!.some(tag => note.tags.includes(tag))
      )
    }

    if (filters.searchQuery) {
      filtered = searchNotes(filters.searchQuery)
    }

    if (filters.isImportant !== undefined) {
      filtered = filtered.filter(note => note.isImportant === filters.isImportant)
    }

    if (filters.hasTimestamp !== undefined) {
      filtered = filtered.filter(note => 
        filters.hasTimestamp ? note.timestamp !== undefined : note.timestamp === undefined
      )
    }

    if (filters.dateRange) {
      filtered = filtered.filter(note => 
        note.createdAt >= filters.dateRange!.start &&
        note.createdAt <= filters.dateRange!.end
      )
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [notes, searchNotes])

  // Duplicate note
  const duplicateNote = useCallback(async (id: string): Promise<string> => {
    const originalNote = getNote(id)
    if (!originalNote) {
      throw new Error('Note not found')
    }

    const duplicatedNote = {
      ...originalNote,
      title: `${originalNote.title} (Cópia)`,
      isPublic: false // Reset public status for duplicated notes
    }

    delete (duplicatedNote as any).id
    delete (duplicatedNote as any).userId
    delete (duplicatedNote as any).createdAt
    delete (duplicatedNote as any).updatedAt

    return await addNote(duplicatedNote)
  }, [getNote, addNote])

  // Create template
  const createTemplate = useCallback(async (
    templateData: Omit<NoteTemplate, 'id'>
  ): Promise<string> => {
    try {
      const newTemplate: NoteTemplate = {
        ...templateData,
        id: generateId()
      }

      const updatedTemplates = [...templates, newTemplate]
      setTemplates(updatedTemplates)
      saveTemplates(updatedTemplates)
      setError(null)
      
      return newTemplate.id
    } catch (err) {
      console.error('Error creating template:', err)
      setError('Erro ao criar modelo')
      throw err
    }
  }, [templates, saveTemplates, generateId])

  // Update template
  const updateTemplate = useCallback(async (id: string, updates: Partial<NoteTemplate>) => {
    try {
      const updatedTemplates = templates.map(template => 
        template.id === id && !template.isDefault
          ? { ...template, ...updates }
          : template
      )
      
      setTemplates(updatedTemplates)
      saveTemplates(updatedTemplates)
      setError(null)
    } catch (err) {
      console.error('Error updating template:', err)
      setError('Erro ao atualizar modelo')
    }
  }, [templates, saveTemplates])

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const updatedTemplates = templates.filter(template => 
        template.id !== id || template.isDefault
      )
      setTemplates(updatedTemplates)
      saveTemplates(updatedTemplates)
      setError(null)
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Erro ao excluir modelo')
    }
  }, [templates, saveTemplates])

  // Create note from template
  const createNoteFromTemplate = useCallback(async (
    templateId: string, 
    courseId: string, 
    lessonId: string
  ): Promise<string> => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    const noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      courseId,
      lessonId,
      title: template.name,
      content: template.content,
      tags: [...template.tags],
      category: template.category,
      isImportant: false,
      isPublic: false
    }

    return await addNote(noteData)
  }, [templates, addNote])

  // Get notes at specific time
  const getNotesAtTime = useCallback((
    courseId: string, 
    lessonId: string, 
    timestamp: number, 
    tolerance: number = 5
  ): Note[] => {
    const lessonNotes = getNotesByLesson(courseId, lessonId)
    return lessonNotes.filter(note => 
      note.timestamp !== undefined && 
      Math.abs(note.timestamp - timestamp) <= tolerance
    )
  }, [getNotesByLesson])

  // Get nearby notes
  const getNearbyNotes = useCallback((
    courseId: string, 
    lessonId: string, 
    timestamp: number, 
    range: number = 30
  ): Note[] => {
    const lessonNotes = getNotesByLesson(courseId, lessonId)
    return lessonNotes.filter(note => 
      note.timestamp !== undefined && 
      Math.abs(note.timestamp - timestamp) <= range
    )
  }, [getNotesByLesson])

  // Get popular tags
  const getPopularTags = useCallback((): string[] => {
    const tagCounts: Record<string, number> = {}
    
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag]) => tag)
  }, [notes])

  // Get notes statistics
  const getNotesStats = useCallback(() => {
    const total = notes.length
    const importantNotes = notes.filter(note => note.isImportant).length
    
    const byCategory: Record<string, number> = {}
    const byMonth: Record<string, number> = {}
    let totalWords = 0
    
    notes.forEach(note => {
      // Category stats
      const category = note.category || 'custom'
      byCategory[category] = (byCategory[category] || 0) + 1
      
      // Monthly stats
      const monthKey = note.createdAt.toISOString().slice(0, 7) // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1
      
      // Word count
      const wordCount = note.content.split(/\s+/).filter(word => word.length > 0).length
      totalWords += wordCount
    })
    
    // Calculate average per lesson
    const uniqueLessons = new Set(notes.map(n => `${n.courseId}-${n.lessonId}`))
    const averagePerLesson = uniqueLessons.size > 0 ? total / uniqueLessons.size : 0
    
    return {
      total,
      byCategory,
      byMonth,
      averagePerLesson,
      totalWords,
      importantNotes
    }
  }, [notes])

  // Export notes
  const exportNotes = useCallback((format: 'json' | 'markdown' | 'txt' = 'json'): string => {
    if (format === 'json') {
      return JSON.stringify({
        notes,
        templates: templates.filter(t => !t.isDefault),
        exportedAt: new Date().toISOString(),
        userId: user?.id
      }, null, 2)
    } else if (format === 'markdown') {
      let markdown = '# Minhas Anotações\n\n'
      
      const notesByCourse = notes.reduce((acc, note) => {
        if (!acc[note.courseId]) acc[note.courseId] = []
        acc[note.courseId].push(note)
        return acc
      }, {} as Record<string, Note[]>)
      
      Object.entries(notesByCourse).forEach(([courseId, courseNotes]) => {
        markdown += `## Curso: ${courseId}\n\n`
        
        courseNotes.forEach(note => {
          markdown += `### ${note.title}\n\n`
          if (note.timestamp !== undefined) {
            markdown += `**Timestamp:** ${Math.floor(note.timestamp / 60)}:${String(Math.floor(note.timestamp % 60)).padStart(2, '0')}\n\n`
          }
          markdown += `${note.content}\n\n`
          if (note.tags.length > 0) {
            markdown += `**Tags:** ${note.tags.join(', ')}\n\n`
          }
          markdown += `---\n\n`
        })
      })
      
      return markdown
    } else {
      // Plain text format
      return notes.map(note => {
        let text = `${note.title}\n${'='.repeat(note.title.length)}\n\n`
        if (note.timestamp !== undefined) {
          text += `Timestamp: ${Math.floor(note.timestamp / 60)}:${String(Math.floor(note.timestamp % 60)).padStart(2, '0')}\n\n`
        }
        text += `${note.content}\n\n`
        if (note.tags.length > 0) {
          text += `Tags: ${note.tags.join(', ')}\n\n`
        }
        text += `Created: ${note.createdAt.toLocaleString()}\n\n`
        text += '-'.repeat(50) + '\n\n'
        return text
      }).join('')
    }
  }, [notes, templates, user])

  // Import notes
  const importNotes = useCallback(async (data: string, format: 'json' | 'markdown' = 'json') => {
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
        const notesWithDates = parsed.notes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }))
        
        const customTemplates = parsed.templates || []

        setNotes(notesWithDates)
        setTemplates([...DEFAULT_TEMPLATES, ...customTemplates])
        saveNotes(notesWithDates)
        saveTemplates([...DEFAULT_TEMPLATES, ...customTemplates])
      } else {
        // Markdown format - simplified implementation
        const lines = data.split('\n')
        const importedNotes: Note[] = []
        
        let currentNote: Partial<Note> | null = null
        let currentContent = ''
        
        lines.forEach(line => {
          if (line.startsWith('### ')) {
            // Save previous note
            if (currentNote) {
              importedNotes.push({
                ...currentNote,
                id: generateId(),
                userId: user.id,
                content: currentContent.trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: (currentNote as any)?.tags || [],
                isImportant: false,
                isPublic: false
              } as Note)
            }
            
            // Start new note
            currentNote = {
              title: line.substring(4),
              courseId: 'imported',
              lessonId: 'imported',
              category: 'general'
            }
            currentContent = ''
          } else if (line.startsWith('**Tags:**')) {
            if (currentNote) {
              currentNote.tags = line.substring(9).split(',').map(tag => tag.trim())
            }
          } else if (!line.startsWith('**') && !line.startsWith('---') && line.trim()) {
            currentContent += line + '\n'
          }
        })
        
        // Save last note
        if (currentNote) {
          importedNotes.push({
            ...(currentNote as Partial<Note>),
            id: generateId(),
            userId: user.id,
            content: currentContent.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: (currentNote as any)?.tags || [],
            isImportant: false,
            isPublic: false
          } as Note)
        }
        
        setNotes([...notes, ...importedNotes])
        saveNotes([...notes, ...importedNotes])
      }
      
      setError(null)
    } catch (err) {
      console.error('Error importing notes:', err)
      setError('Erro ao importar anotações')
    }
  }, [user, notes, saveNotes, saveTemplates, generateId])

  // Sync with bookmarks
  const syncWithBookmarks = useCallback((bookmarks: any[]) => {
    // Create notes from bookmarks that don't have corresponding notes
    const bookmarkNotes = bookmarks.map(bookmark => {
      const existingNote = notes.find(note => 
        note.courseId === bookmark.courseId &&
        note.lessonId === bookmark.lessonId &&
        note.timestamp === bookmark.timestamp
      )
      
      if (!existingNote) {
        return {
          courseId: bookmark.courseId,
          lessonId: bookmark.lessonId,
          title: bookmark.title,
          content: bookmark.description || '',
          timestamp: bookmark.timestamp,
          tags: bookmark.tags || [],
          category: 'general' as const,
          isImportant: false,
          isPublic: false
        }
      }
      
      return null
    }).filter(Boolean)
    
    // Add new notes from bookmarks
    bookmarkNotes.forEach(async (noteData) => {
      if (noteData) {
        await addNote(noteData)
      }
    })
  }, [notes, addNote])

  return {
    notes,
    templates,
    isLoading,
    error,
    addNote,
    updateNote,
    deleteNote,
    getNote,
    getNotesByLesson,
    getNotesByCourse,
    searchNotes,
    filterNotes,
    duplicateNote,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createNoteFromTemplate,
    exportNotes,
    importNotes,
    getNotesAtTime,
    getNearbyNotes,
    getPopularTags,
    getNotesStats,
    syncWithBookmarks
  }
}

export default useNotes