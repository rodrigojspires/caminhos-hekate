'use client'

import React, { useState } from 'react'
import { Play, CheckCircle, Lock, Clock, FileText, Download, Bookmark, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface Lesson {
  id: string
  title: string
  description?: string
  duration: number // in seconds
  type: 'video' | 'text' | 'quiz' | 'assignment'
  isCompleted: boolean
  isLocked: boolean
  isCurrent?: boolean
  hasResources?: boolean
  resourcesCount?: number
  commentsCount?: number
  videoUrl?: string
  thumbnailUrl?: string
  order: number
}

interface Module {
  id: string
  title: string
  description?: string
  lessons: Lesson[]
  isCompleted: boolean
  completedLessons: number
  totalLessons: number
  duration: number // total duration in seconds
  order: number
}

interface LessonListProps {
  modules: Module[]
  currentLessonId?: string
  onLessonSelect: (lessonId: string) => void
  onToggleBookmark?: (lessonId: string) => void
  showProgress?: boolean
  className?: string
}

export function LessonList({
  modules,
  currentLessonId,
  onLessonSelect,
  onToggleBookmark,
  showProgress = true,
  className
}: LessonListProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const getLessonIcon = (lesson: Lesson) => {
    if (lesson.isCompleted) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (lesson.isLocked) {
      return <Lock className="w-4 h-4 text-muted-foreground" />
    }
    
    switch (lesson.type) {
      case 'video':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'text':
        return <FileText className="w-4 h-4 text-purple-500" />
      case 'quiz':
        return <MessageSquare className="w-4 h-4 text-orange-500" />
      case 'assignment':
        return <Download className="w-4 h-4 text-red-500" />
      default:
        return <Play className="w-4 h-4 text-blue-500" />
    }
  }

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo'
      case 'text':
        return 'Leitura'
      case 'quiz':
        return 'Quiz'
      case 'assignment':
        return 'Tarefa'
      default:
        return type
    }
  }

  const getTotalCourseDuration = () => {
    return modules.reduce((total, module) => total + module.duration, 0)
  }

  const getTotalCompletedLessons = () => {
    return modules.reduce((total, module) => total + module.completedLessons, 0)
  }

  const getTotalLessons = () => {
    return modules.reduce((total, module) => total + module.totalLessons, 0)
  }

  const getOverallProgress = () => {
    const totalLessons = getTotalLessons()
    const completedLessons = getTotalCompletedLessons()
    return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conteúdo do Curso</CardTitle>
          <div className="text-sm text-muted-foreground">
            {formatDuration(getTotalCourseDuration())}
          </div>
        </div>
        
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {getTotalCompletedLessons()} de {getTotalLessons()} aulas concluídas
              </span>
              <span className="font-medium">{Math.round(getOverallProgress())}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="space-y-1">
          {modules.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(module.id)
            const moduleProgress = module.totalLessons > 0 ? (module.completedLessons / module.totalLessons) * 100 : 0

            return (
              <Collapsible key={module.id} open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {moduleIndex + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{module.title}</h3>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                          <span>{module.totalLessons} aulas</span>
                          <span>{formatDuration(module.duration)}</span>
                          {showProgress && (
                            <span>{module.completedLessons} concluídas</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {module.isCompleted && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {showProgress && (
                        <div className="w-16">
                          <Progress value={moduleProgress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="bg-muted/20">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const isCurrentLesson = lesson.id === currentLessonId
                      
                      return (
                        <div key={lesson.id}>
                          <div
                            className={cn(
                              'flex items-center space-x-3 p-4 pl-16 hover:bg-muted/50 cursor-pointer transition-colors',
                              isCurrentLesson && 'bg-primary/10 border-r-2 border-primary',
                              lesson.isLocked && 'opacity-50 cursor-not-allowed'
                            )}
                            onClick={() => !lesson.isLocked && onLessonSelect(lesson.id)}
                          >
                            <div className="flex-shrink-0">
                              {getLessonIcon(lesson)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={cn(
                                  'font-medium text-sm truncate',
                                  isCurrentLesson && 'text-primary'
                                )}>
                                  {lesson.title}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {getLessonTypeLabel(lesson.type)}
                                </Badge>
                              </div>
                              
                              {lesson.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {lesson.description}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(lesson.duration)}</span>
                                </div>
                                
                                {lesson.hasResources && lesson.resourcesCount && (
                                  <div className="flex items-center space-x-1">
                                    <Download className="w-3 h-3" />
                                    <span>{lesson.resourcesCount} recursos</span>
                                  </div>
                                )}
                                
                                {lesson.commentsCount && lesson.commentsCount > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{lesson.commentsCount} comentários</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {onToggleBookmark && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleBookmark(lesson.id)
                                  }}
                                >
                                  <Bookmark className="w-4 h-4" />
                                </Button>
                              )}
                              
                              {isCurrentLesson && (
                                <Badge variant="default" className="text-xs">
                                  Atual
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {lessonIndex < module.lessons.length - 1 && (
                            <Separator className="ml-16" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default LessonList