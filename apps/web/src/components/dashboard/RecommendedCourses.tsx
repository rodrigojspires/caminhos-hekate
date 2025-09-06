'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  Play, 
  Heart,
  TrendingUp,
  Award,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface Course {
  id: number
  title: string
  description: string
  instructor: {
    name: string
    avatar?: string
    rating: number
  }
  thumbnail?: string
  duration: string
  students: number
  rating: number
  price: string
  level: string
  category: string
  tags: string[]
  isNew: boolean
  isTrending: boolean
  matchPercentage: number
  reason?: string
}

interface RecommendedCoursesResponse {
  courses: Course[]
  total: number
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Iniciante':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Intermediário':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'Avançado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

export function RecommendedCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchRecommendedCourses()
  }, [])

  const fetchRecommendedCourses = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const response = await fetch('/api/courses/recommended?limit=6')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar cursos recomendados')
      }
      
      const data: RecommendedCoursesResponse = await response.json()
      setCourses(data.courses)
    } catch (error) {
      console.error('Erro ao buscar cursos recomendados:', error)
      setError('Não foi possível carregar os cursos recomendados')
      toast.error('Erro ao carregar cursos recomendados')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchRecommendedCourses(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-full overflow-hidden">
              <Skeleton className="aspect-video" />
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Cursos Recomendados</h2>
            <p className="text-muted-foreground">Baseado no seu perfil e interesses</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
        
        <Card className="p-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Erro ao carregar cursos</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRefresh}>
              Tentar Novamente
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cursos Recomendados</h2>
          <p className="text-muted-foreground">Baseado no seu perfil e interesses</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {courses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="group"
          >
            <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300">
              {/* Course Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white/80" />
                </div>
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {course.isNew && (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      Novo
                    </Badge>
                  )}
                  {course.isTrending && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                </div>

                {/* Match Percentage */}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-white/90 text-purple-700">
                    {course.matchPercentage}% match
                  </Badge>
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <Button 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Course Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-purple-600 transition-colors">
                      {course.title}
                    </h3>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-purple-100 text-purple-700">
                      {course.instructor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{course.instructor.name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">{course.instructor.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Course Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.students.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{course.rating}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {course.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {course.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{course.tags.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Level and Price */}
                <div className="flex items-center justify-between pt-2">
                  <Badge className={getLevelColor(course.level)}>
                    {course.level}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-lg">{course.price}</p>
                  </div>
                </div>

                {/* Action Button */}
                <Button className="w-full" size="sm">
                  <Award className="h-4 w-4 mr-2" />
                  Inscrever-se
                </Button>
              </CardContent>
            </Card>
          </motion.div>
            ))}
          </div>

          {/* See More */}
          <div className="text-center pt-4">
            <Button variant="outline" size="lg">
              Ver Mais Recomendações
            </Button>
          </div>
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto opacity-50" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Nenhum curso recomendado</h3>
              <p className="text-sm">Complete seu perfil para receber recomendações personalizadas</p>
            </div>
            <Button variant="outline">
              Explorar Cursos
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}