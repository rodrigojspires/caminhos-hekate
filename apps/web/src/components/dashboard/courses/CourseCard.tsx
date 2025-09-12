'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users, Star, BookOpen, Play, Bookmark, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    thumbnail: string
    instructor: {
      name: string
      avatar?: string
    }
    duration: number // in minutes
    studentsCount: number
    rating: number
    reviewsCount: number
    price: number
    originalPrice?: number
    level: 'beginner' | 'intermediate' | 'advanced'
    category: string
    tags: string[]
    progress?: number // 0-100 for enrolled courses
    isEnrolled?: boolean
    isFavorite?: boolean
    lastWatched?: Date
    completedLessons?: number
    totalLessons?: number
  }
  variant?: 'default' | 'compact' | 'detailed'
  showProgress?: boolean
  onEnroll?: (courseId: string) => void
  onToggleFavorite?: (courseId: string) => void
  onContinue?: (courseId: string) => void
  className?: string
}

export function CourseCard({
  course,
  variant = 'default',
  showProgress = false,
  onEnroll,
  onToggleFavorite,
  onContinue,
  className
}: CourseCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Iniciante'
      case 'intermediate':
        return 'Intermediário'
      case 'advanced':
        return 'Avançado'
      default:
        return level
    }
  }

  if (variant === 'compact') {
    return (
      <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow', className)}>
        <div className="flex">
          <div className="relative w-32 h-20 flex-shrink-0">
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover"
            />
            {course.isEnrolled && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-sm line-clamp-1">{course.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{course.instructor.name}</p>
                {showProgress && course.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={course.progress} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {course.progress}% concluído
                    </p>
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onToggleFavorite?.(course.id)}>
                    <Bookmark className="w-4 h-4 mr-2" />
                    {course.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow group', className)}>
      <CardHeader className="p-0">
        <div className="relative aspect-video">
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          
          {/* Overlay with play button for enrolled courses */}
          {course.isEnrolled && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
              <Button
                size="lg"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onContinue?.(course.id)}
              >
                <Play className="w-5 h-5 mr-2" />
                Continuar
              </Button>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            <Badge className={getLevelColor(course.level)}>
              {getLevelText(course.level)}
            </Badge>
            {course.originalPrice && course.originalPrice > course.price && (
              <Badge variant="destructive">Promoção</Badge>
            )}
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 h-8 w-8 p-0 bg-card/80 hover:bg-card"
            onClick={() => onToggleFavorite?.(course.id)}
          >
            <Bookmark 
              className={cn(
                'w-4 h-4',
                course.isFavorite ? 'fill-current text-yellow-500' : 'text-muted-foreground'
              )} 
            />
          </Button>

          {/* Duration */}
          <div className="absolute bottom-3 right-3 bg-black/80 text-white px-2 py-1 rounded text-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(course.duration)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and description */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 mb-1">{course.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          </div>

          {/* Instructor */}
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={course.instructor.avatar} />
              <AvatarFallback className="text-xs">
                {course.instructor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{course.instructor.name}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{course.studentsCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-current text-yellow-500" />
                <span>{course.rating}</span>
                <span>({course.reviewsCount})</span>
              </div>
              {course.totalLessons && (
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.totalLessons} aulas</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress for enrolled courses */}
          {showProgress && course.isEnrolled && course.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-2" />
              {course.completedLessons && course.totalLessons && (
                <p className="text-xs text-muted-foreground">
                  {course.completedLessons} de {course.totalLessons} aulas concluídas
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {course.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {course.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{course.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="flex items-center justify-between w-full">
          {/* Price */}
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-primary">
              {course.price === 0 ? 'Gratuito' : formatPrice(course.price)}
            </span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(course.originalPrice)}
              </span>
            )}
          </div>

          {/* Action button */}
          {course.isEnrolled ? (
            <Button onClick={() => onContinue?.(course.id)}>
              <Play className="w-4 h-4 mr-2" />
              Continuar
            </Button>
          ) : (
            <Button onClick={() => onEnroll?.(course.id)}>
              Inscrever-se
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

export default CourseCard