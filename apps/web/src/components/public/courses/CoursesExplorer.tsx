'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X, Video, BookOpen, Users, Clock } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CourseStatItem } from './CourseStats'

export interface PublicCourse {
  id: string
  title: string
  slug: string
  description?: string | null
  shortDescription?: string | null
  level: string | null
  duration?: number | null
  price: number | null
  comparePrice: number | null
  featuredImage?: string | null
  introVideo?: string | null
  modules: number
  lessons: number
  students: number
  tags: string[]
}

interface CoursesExplorerProps {
  courses: PublicCourse[]
  categories: string[]
  levels: string[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
}

export function CoursesExplorer({ courses, categories, levels }: CoursesExplorerProps) {
  const formatLevel = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'Iniciante'
      case 'INTERMEDIATE':
        return 'Intermediário'
      case 'ADVANCED':
        return 'Avançado'
      case 'EXPERT':
        return 'Especialista'
      default:
        return level
    }
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')
  const [selectedLevel, setSelectedLevel] = useState('todos')
  const [priceFilter, setPriceFilter] = useState<'todos' | 'free' | 'paid'>('todos')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'price-low' | 'price-high'>('popular')
  const [showFilters, setShowFilters] = useState(false)

  const filteredCourses = useMemo(() => {
    let list = [...courses]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      list = list.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.description?.toLowerCase().includes(term) ||
        course.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    if (selectedCategory !== 'todos') {
      list = list.filter(course => course.tags.includes(selectedCategory))
    }

    if (selectedLevel !== 'todos') {
      list = list.filter(course => (course.level ?? '').toLowerCase() === selectedLevel.toLowerCase())
    }

    if (priceFilter === 'free') {
      list = list.filter(course => (course.price ?? 0) === 0)
    } else if (priceFilter === 'paid') {
      list = list.filter(course => (course.price ?? 0) > 0)
    }

    switch (sortBy) {
      case 'price-low':
        list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
        break
      case 'price-high':
        list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        break
      case 'recent':
        list.sort((a, b) => b.lessons - a.lessons)
        break
      default:
        list.sort((a, b) => b.students - a.students)
    }

    return list
  }, [courses, priceFilter, searchTerm, selectedCategory, selectedLevel, sortBy])

  const activeFilters = [
    selectedCategory !== 'todos',
    selectedLevel !== 'todos',
    priceFilter !== 'todos'
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedCategory('todos')
    setSelectedLevel('todos')
    setPriceFilter('todos')
    setShowFilters(false)
  }

  return (
    <section className="py-16 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 space-y-12">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Busque por cursos, temas ou instrutores"
              className="pl-12 h-12 text-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)} className="h-12 px-4 gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFilters > 0 && (
                <Badge variant="default" className="ml-1 px-2 py-0.5 text-xs">
                  {activeFilters}
                </Badge>
              )}
            </Button>
            {activeFilters > 0 && (
              <Button variant="ghost" className="h-12 gap-2" onClick={clearFilters}>
                <X className="w-4 h-4" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-6 md:grid-cols-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
              >
                <option value="todos">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nível</label>
              <select
                value={selectedLevel}
                onChange={(event) => setSelectedLevel(event.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
              >
                <option value="todos">Todos</option>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {formatLevel(level)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preço</label>
              <select
                value={priceFilter}
                onChange={(event) => setPriceFilter(event.target.value as typeof priceFilter)}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
              >
                <option value="todos">Todos</option>
                <option value="free">Gratuitos</option>
                <option value="paid">Pagos</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenação</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
              >
                <option value="popular">Mais populares</option>
                <option value="recent">Mais recentes</option>
                <option value="price-low">Menor preço</option>
                <option value="price-high">Maior preço</option>
              </select>
            </div>
          </div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredCourses.map((course) => {
            const isFree = (course.price ?? 0) === 0
            const priceLabel = isFree
              ? 'Gratuito'
              : `R$ ${(course.price ?? 0).toFixed(2)}`

            return (
              <motion.div key={course.id} variants={itemVariants}>
                <Card className="group h-full border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
                      {course.featuredImage ? (
                        <Image
                          src={course.featuredImage}
                          alt={course.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center text-6xl text-purple-600">
                          <BookOpen className="w-12 h-12" />
                        </div>
                      )}
                      {course.introVideo && (
                        <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                          <Video className="w-3 h-3" /> Vídeo introdutório
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {course.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="px-2 py-0.5">
                              {tag}
                            </Badge>
                          ))}
                          {course.tags.length > 2 && (
                            <Badge variant="outline" className="px-2 py-0.5">
                              +{course.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                          {course.shortDescription || course.description || 'Curso completo da plataforma Caminhos de Hekate.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {course.students} aluno{course.students === 1 ? '' : 's'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {course.duration ? `${course.duration}h` : 'Duração livre'}
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {course.modules} módulo{course.modules === 1 ? '' : 's'}
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {course.lessons} aula{course.lessons === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                          {formatLevel(course.level ?? 'BEGINNER')}
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {priceLabel}
                          {!isFree && course.comparePrice && course.comparePrice > (course.price ?? 0) && (
                            <span className="ml-2 text-sm text-muted-foreground line-through">
                              R$ {course.comparePrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Button variant="outline" onClick={() => window.location.href = `/cursos/${course.slug}`}>
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {filteredCourses.length === 0 && (
          <div className="text-center text-muted-foreground border border-dashed rounded-xl py-12">
            Nenhum curso encontrado com os filtros aplicados.
          </div>
        )}
      </div>
    </section>
  )
}
