'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Save, Edit3, Trash2, Clock, Tag, Search, Filter, Plus, BookOpen, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  title: string
  content: string
  timestamp: number // video timestamp in seconds
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  tags: string[]
  isImportant: boolean
  createdAt: Date
  updatedAt: Date
}

interface NoteEditorProps {
  notes: Note[]
  currentLessonId?: string
  currentTimestamp?: number
  courseId?: string
  onSaveNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void
  onDeleteNote: (noteId: string) => void
  onJumpToTimestamp?: (timestamp: number) => void
  className?: string
}

export function NoteEditor({
  notes,
  currentLessonId,
  currentTimestamp = 0,
  courseId,
  onSaveNote,
  onUpdateNote,
  onDeleteNote,
  onJumpToTimestamp,
  className
}: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    isImportant: false
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'lesson' | 'importance'>('date')
  const [showOnlyImportant, setShowOnlyImportant] = useState(false)
  const [tagInput, setTagInput] = useState('')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const formatTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getAllTags = () => {
    const tagSet = new Set<string>()
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }

  const filteredNotes = notes
    .filter(note => {
      // Filter by course if specified
      if (courseId && note.courseId !== courseId) return false
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          note.title.toLowerCase().includes(searchLower) ||
          note.content.toLowerCase().includes(searchLower) ||
          note.lessonTitle.toLowerCase().includes(searchLower) ||
          note.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }
      
      // Filter by tag
      if (selectedTag && !note.tags.includes(selectedTag)) return false
      
      // Filter by importance
      if (showOnlyImportant && !note.isImportant) return false
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'lesson':
          return a.lessonTitle.localeCompare(b.lessonTitle)
        case 'importance':
          if (a.isImportant && !b.isImportant) return -1
          if (!a.isImportant && b.isImportant) return 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        default:
          return 0
      }
    })

  const handleSaveNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return
    
    if (!currentLessonId) {
      alert('Selecione uma aula para criar uma anotação')
      return
    }

    // Find lesson and course info (this would come from props in real implementation)
    const lessonTitle = 'Aula Atual' // This should be passed as prop
    const courseTitle = 'Curso Atual' // This should be passed as prop

    onSaveNote({
      title: newNote.title,
      content: newNote.content,
      timestamp: currentTimestamp,
      lessonId: currentLessonId,
      lessonTitle,
      courseId: courseId || '',
      courseTitle,
      tags: newNote.tags,
      isImportant: newNote.isImportant
    })

    // Reset form
    setNewNote({
      title: '',
      content: '',
      tags: [],
      isImportant: false
    })
    setIsEditing(false)
  }

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id)
    setNewNote({
      title: note.title,
      content: note.content,
      tags: note.tags,
      isImportant: note.isImportant
    })
    setIsEditing(true)
  }

  const handleUpdateNote = () => {
    if (!editingNoteId || !newNote.title.trim() || !newNote.content.trim()) return

    onUpdateNote(editingNoteId, {
      title: newNote.title,
      content: newNote.content,
      tags: newNote.tags,
      isImportant: newNote.isImportant,
      updatedAt: new Date()
    })

    setEditingNoteId(null)
    setNewNote({
      title: '',
      content: '',
      tags: [],
      isImportant: false
    })
    setIsEditing(false)
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !newNote.tags.includes(tagInput.trim())) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditingNoteId(null)
    setNewNote({
      title: '',
      content: '',
      tags: [],
      isImportant: false
    })
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Anotações</span>
          </CardTitle>
          <Button
            onClick={() => setIsEditing(true)}
            disabled={!currentLessonId}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Anotação
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* New/Edit Note Form */}
        {isEditing && (
          <Card className="border-2 border-primary">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Título da anotação..."
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              />
              
              <Textarea
                ref={textareaRef}
                placeholder="Escreva sua anotação aqui..."
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
              
              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Adicionar tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1"
                  />
                  <Button onClick={handleAddTag} size="sm" variant="outline">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                
                {newNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newNote.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={newNote.isImportant ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewNote(prev => ({ ...prev, isImportant: !prev.isImportant }))}
                  >
                    <Star className={cn(
                      'w-4 h-4 mr-2',
                      newNote.isImportant && 'fill-current'
                    )} />
                    Importante
                  </Button>
                  
                  {currentTimestamp > 0 && (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(currentTimestamp)}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                  <Button onClick={editingNoteId ? handleUpdateNote : handleSaveNote}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingNoteId ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar anotações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant={showOnlyImportant ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyImportant(!showOnlyImportant)}
            >
              <Star className={cn(
                'w-4 h-4',
                showOnlyImportant && 'fill-current'
              )} />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as tags</SelectItem>
                {getAllTags().map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="lesson">Aula</SelectItem>
                <SelectItem value="importance">Importância</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Notes List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma anotação encontrada</p>
                <p className="text-sm">Crie sua primeira anotação durante a aula</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <Card key={note.id} className={cn(
                  'transition-colors hover:bg-muted/50',
                  note.isImportant && 'border-yellow-200 bg-yellow-50/50'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{note.title}</h4>
                        {note.isImportant && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteNote(note.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-3">
                        <span>{note.lessonTitle}</span>
                        {onJumpToTimestamp && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onJumpToTimestamp(note.timestamp)}
                            className="h-6 px-2 text-xs"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimestamp(note.timestamp)}
                          </Button>
                        )}
                      </div>
                      <span>{formatDate(note.updatedAt)}</span>
                    </div>
                    
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default NoteEditor