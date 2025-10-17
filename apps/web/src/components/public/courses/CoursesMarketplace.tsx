'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Search,
  Flame,
  SlidersHorizontal,
  Filter,
  Star,
  Users,
  Clock,
  Layers,
  Sparkles,
  Play,
  Bookmark,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react'
import { PublicCourse } from '@/components/public/courses/CoursesExplorer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

interface CoursesMarketplaceProps {
  courses: PublicCourse[]
}

interface CategoryFilterOption {
  value: string
  label: string
}

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return null
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

const levelLabels: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  EXPERT: 'Especialista'
}

export function CoursesMarketplace({ courses }: CoursesMarketplaceProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')
  const [selectedLevel, setSelectedLevel] = useState('todos')
  const [priceFilter, setPriceFilter] = useState<'todos' | 'free' | 'paid'>('todos')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'price-low' | 'price-high'>('popular')

  const catalogMetrics = useMemo(() => {
    const totalHours = courses.reduce((sum, course) => sum + (course.duration ?? 0), 0)
    const totalLessons = courses.reduce((sum, course) => sum + course.lessons, 0)
    const totalStudents = courses.reduce((sum, course) => sum + course.students, 0)

    return {
      totalCourses: courses.length,
      totalHours,
      totalLessons,
      totalStudents
    }
  }, [courses])

  const categories = useMemo<CategoryFilterOption[]>(() => {
    const map = new Map<string, string>()
    courses.forEach((course) => {
      const name = course.categoryName?.trim()
      if (!name) return
      const key = course.categoryId || course.categorySlug || name
      if (!map.has(key)) {
        map.set(key, name)
      }
    })
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [courses])

  const levels = useMemo(() => {
    const all = new Set<string>()
    courses.forEach((course) => {
      if (course.level) all.add(course.level)
    })
    return Array.from(all)
  }, [courses])

  const trendingCourses = useMemo(() => {
    const sorted = [...courses].sort((a, b) => {
      const scoreA = a.students * 3 + a.lessons * 2 + (a.price ?? 0)
      const scoreB = b.students * 3 + b.lessons * 2 + (b.price ?? 0)
      return scoreB - scoreA
    })
    return sorted.slice(0, 5)
  }, [courses])

  const filteredCourses = useMemo(() => {
    let list = [...courses]

    const term = searchTerm.trim().toLowerCase()
    if (term) {
      list = list.filter((course) => {
        const haystack = [course.title, course.description, course.shortDescription, course.categoryName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const tagHit = course.tags.some((tag) => tag.toLowerCase().includes(term))
        return haystack.includes(term) || tagHit
      })
    }

    if (selectedCategory !== 'todos') {
      list = list.filter((course) => {
        const key = course.categoryId || course.categorySlug || course.categoryName || ''
        return key === selectedCategory
      })
    }

    if (selectedLevel !== 'todos') {
      list = list.filter((course) => (course.level ?? '').toLowerCase() === selectedLevel.toLowerCase())
    }

    if (priceFilter === 'free') {
      list = list.filter((course) => (course.price ?? 0) === 0)
    } else if (priceFilter === 'paid') {
      list = list.filter((course) => (course.price ?? 0) > 0)
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

  return (
    <div className="bg-gradient-to-b from-gray-950 via-gray-930 to-gray-900 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[520px] h-[520px] rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute bottom-[-120px] right-[-120px] w-[620px] h-[620px] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.35),_transparent_55%)]" />
        </div>

        <div className="relative container mx-auto px-4 py-16 lg:py-24 space-y-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            <div className="space-y-6 max-w-3xl">
              <Badge variant="outline" className="bg-purple-500/15 border-purple-400/30 text-purple-100 gap-2">
                <Sparkles className="w-4 h-4" /> Marketplace de cursos Hekate
              </Badge>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white">
                  Explore conhecimentos exclusivos para{' '}
                  <span className="text-purple-300">expandir sua jornada</span>
                </h1>
                <p className="text-lg md:text-xl text-purple-100/80 max-w-2xl">
                  Aprenda com especialistas, no seu ritmo, com conteúdos profundos sobre espiritualidade, autoconhecimento
                  e práticas ancestrais.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-purple-200 uppercase tracking-wide">Cursos</p>
                    <p className="text-2xl font-semibold text-white">{catalogMetrics.totalCourses}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-200 uppercase tracking-wide">Horas de conteúdo</p>
                    <p className="text-2xl font-semibold text-white">{catalogMetrics.totalHours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-200 uppercase tracking-wide">Aulas</p>
                    <p className="text-2xl font-semibold text-white">{catalogMetrics.totalLessons}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-200 uppercase tracking-wide">Estudantes</p>
                    <p className="text-2xl font-semibold text-white">
                      {catalogMetrics.totalStudents.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl space-y-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-200 w-5 h-5" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Busque por um curso, tema ou instrutor"
                  className="pl-12 pr-4 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus-visible:ring-purple-300"
                />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-purple-200" />
                  <p className="text-sm text-purple-100">Categorias em destaque</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    key="todos"
                    size="sm"
                    variant={selectedCategory === 'todos' ? 'default' : 'outline'}
                    className={
                      selectedCategory === 'todos'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'border-white/20 text-purple-100 hover:bg-white/10'
                    }
                    onClick={() => setSelectedCategory('todos')}
                  >
                    Todas
                  </Button>
                  {categories.slice(0, 6).map((category) => (
                    <Button
                      key={category.value}
                      size="sm"
                      variant={selectedCategory === category.value ? 'default' : 'outline'}
                      className={
                        selectedCategory === category.value
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'border-white/20 text-purple-100 hover:bg-white/10'
                      }
                      onClick={() => setSelectedCategory(category.value)}
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!!trendingCourses.length && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 border-orange-400/30">
                    <Flame className="w-4 h-4 mr-1" /> Em alta
                  </Badge>
                  <p className="text-sm text-purple-100/80">Cursos que os iniciados estão amando agora</p>
                </div>
                <Button variant="ghost" size="sm" className="text-purple-200 hover:text-white">
                  Ver todos
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-700/60">
                {trendingCourses.map((course) => {
                  const priceLabel =
                    course.price == null || course.price === 0 ? 'Gratuito' : formatCurrency(course.price)

                  return (
                    <Link key={course.id} href={`/cursos/${course.slug}`} className="group min-w-[260px]">
                      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-transform duration-300 group-hover:-translate-y-2">
                        <div className="relative aspect-video">
                          {course.featuredImage ? (
                            <Image src={course.featuredImage} alt={course.title} fill className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/20 flex flex-col items-center justify-center gap-3">
                              <Play className="w-12 h-12 text-purple-100" />
                              <span className="text-sm text-purple-100/80">Curso digital</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-purple-200">
                            <Star className="w-3.5 h-3.5" /> Destaque da semana
                          </div>
                          <h3 className="font-semibold text-white line-clamp-2 min-h-[48px]">{course.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-purple-200">
                            <Users className="w-4 h-4" /> {course.students.toLocaleString('pt-BR')} alunos
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-200">{course.lessons} aulas</span>
                            <span className="text-base font-semibold text-white">{priceLabel}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.15),_transparent_55%)]" />
        <div className="relative container mx-auto px-4">
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-10">
            {/* Filters */}
            <aside className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-200 uppercase tracking-wide">Filtrar catálogo</p>
                  <h2 className="text-xl font-semibold text-white">Refine sua busca</h2>
                </div>
                <SlidersHorizontal className="w-5 h-5 text-purple-200" />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-purple-100 uppercase tracking-wide">Preço</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'todos', label: 'Todos os valores' },
                    { id: 'free', label: 'Gratuitos' },
                    { id: 'paid', label: 'Pagos' }
                  ].map((option) => (
                    <Button
                      key={option.id}
                      variant={priceFilter === option.id ? 'default' : 'outline'}
                      className={`justify-start ${
                        priceFilter === option.id
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-transparent border-white/20 text-purple-100 hover:bg-white/10'
                      }`}
                      onClick={() => setPriceFilter(option.id as typeof priceFilter)}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 mr-2 ${priceFilter === option.id ? 'opacity-100' : 'opacity-40'}`}
                      />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {!!levels.length && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-purple-100 uppercase tracking-wide">Nível</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={selectedLevel === 'todos' ? 'default' : 'outline'}
                      className={`justify-start ${
                        selectedLevel === 'todos'
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-transparent border-white/20 text-purple-100 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedLevel('todos')}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 mr-2 ${selectedLevel === 'todos' ? 'opacity-100' : 'opacity-40'}`}
                      />
                      Todos os níveis
                    </Button>
                    {levels.map((level) => (
                      <Button
                        key={level}
                        variant={selectedLevel === level ? 'default' : 'outline'}
                        className={`justify-start ${
                          selectedLevel === level
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-transparent border-white/20 text-purple-100 hover:bg-white/10'
                        }`}
                        onClick={() => setSelectedLevel(level)}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 mr-2 ${selectedLevel === level ? 'opacity-100' : 'opacity-40'}`}
                        />
                        {levelLabels[level] ?? level}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!!categories.length && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-purple-100 uppercase tracking-wide">Categorias</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const isActive = selectedCategory === category.value
                      return (
                        <Badge
                          key={category.value}
                          onClick={() =>
                            setSelectedCategory((prev) => (prev === category.value ? 'todos' : category.value))
                          }
                          className={`cursor-pointer px-3 py-1.5 border ${
                            isActive
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-transparent border-white/20 text-purple-100 hover:bg-white/10'
                          }`}
                        >
                          {category.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-purple-100 uppercase tracking-wide">Ordenar por</p>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-purple-100"
                >
                  <option value="popular">Mais populares</option>
                  <option value="recent">Mais conteúdos</option>
                  <option value="price-low">Menor preço</option>
                  <option value="price-high">Maior preço</option>
                </select>
              </div>
            </aside>

            {/* Catalog */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Catálogo completo</h2>
                  <p className="text-sm text-purple-100/80">{filteredCourses.length} cursos encontrados</p>
                </div>
                <Button
                  variant="outline"
                  className="border-white/20 bg-transparent text-purple-100 hover:bg-white/10"
                  onClick={() => {
                    setSelectedCategory('todos')
                    setSelectedLevel('todos')
                    setPriceFilter('todos')
                    setSortBy('popular')
                    setSearchTerm('')
                  }}
                >
                  Limpar filtros
                </Button>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center space-y-3">
                  <Bookmark className="w-10 h-10 mx-auto text-purple-200" />
                  <p className="text-lg font-semibold text-white">Nenhum curso encontrado</p>
                  <p className="text-sm text-purple-100/80 max-w-lg mx-auto">
                    Ajuste os filtros ou explore outras categorias para encontrar conteúdos que combinam com o seu
                    momento.
                  </p>
                </div>
              ) : (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => {
                    const priceBRL = formatCurrency(course.price)
                    const compareBRL = formatCurrency(course.comparePrice)
                    const isFree = !course.price || course.price === 0

                    return (
                      <motion.div key={course.id} layout>
                        <Link href={`/cursos/${course.slug}`}>
                          <Card className="h-full bg-white/5 border border-white/10 overflow-hidden flex flex-col group hover:bg-white/8 transition-colors">
                            <CardHeader className="p-0">
                              <div className="relative aspect-video overflow-hidden">
                                {course.featuredImage ? (
                                  <Image
                                    src={course.featuredImage}
                                    alt={course.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-br from-purple-700/30 to-indigo-700/30 flex flex-col items-center justify-center gap-2 text-purple-100">
                                    <Layers className="w-10 h-10" />
                                    <span className="text-sm">Conteúdo exclusivo</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80" />
                                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                                  {isFree ? (
                                    <Badge className="bg-emerald-500/90 text-white border-emerald-400/60">Gratuito</Badge>
                                  ) : (
                                    <Badge className="bg-purple-600/90 text-white border-purple-500/60">Premium</Badge>
                                  )}
                                  {course.level && (
                                    <Badge className="bg-white/10 text-white border-white/30">
                                      {levelLabels[course.level] ?? course.level}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-6 space-y-4">
                              <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-white line-clamp-2">{course.title}</h3>
                                {course.shortDescription && (
                                  <p className="text-sm text-purple-100/80 line-clamp-3">{course.shortDescription}</p>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm text-purple-200">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {course.students.toLocaleString('pt-BR')} alunos
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {course.duration ?? 0}h de conteúdo
                                </div>
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4" />
                                  {course.modules} módulos
                                </div>
                                <div className="flex items-center gap-2">
                                  <Play className="w-4 h-4" />
                                  {course.lessons} aulas
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="p-6 pt-0 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-lg font-semibold text-white">
                                  {isFree ? 'Acesso gratuito' : priceBRL}
                                </span>
                                {!isFree && compareBRL && (
                                  <span className="text-sm text-purple-200/70 line-through">{compareBRL}</span>
                                )}
                              </div>
                              <Button variant="ghost" className="text-purple-200 hover:text-white">
                                Explorar
                                <ArrowUpRight className="w-4 h-4 ml-2" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </Link>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-transparent to-indigo-900/40" />
        <div className="relative container mx-auto px-4">
          <Card className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 md:p-12 space-y-6">
                <Badge className="bg-purple-600 text-white w-fit">Pronto para começar?</Badge>
                <h2 className="text-3xl font-semibold text-white leading-tight">
                  Assine a plataforma e tenha acesso prioritário aos novos lançamentos
                </h2>
                <p className="text-purple-100/80">
                  Receba notificações de novos cursos, aulas bônus e materiais exclusivos em primeira mão. Monte sua
                  trilha personalizada e desbloqueie conquistas ao avançar.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-purple-600 hover:bg-purple-500 text-white">Ver planos</Button>
                  <Button variant="outline" className="border-white/20 text-purple-100 hover:bg-white/10">
                    Falar com especialista
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-700/30 to-indigo-600/20 opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full border border-white/20 p-12 text-purple-100/80 bg-white/5">
                    <Sparkles className="w-10 h-10" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_60%)]" />
                <div className="h-full w-full" />
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default CoursesMarketplace
