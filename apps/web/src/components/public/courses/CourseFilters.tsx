'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const categories = [
  { id: 'all', name: 'Todos os Cursos', count: 150 },
  { id: 'autoconhecimento', name: 'Autoconhecimento', count: 32 },
  { id: 'espiritualidade', name: 'Espiritualidade', count: 28 },
  { id: 'meditacao', name: 'Meditação', count: 24 },
  { id: 'tarot', name: 'Tarot', count: 18 },
  { id: 'astrologia', name: 'Astrologia', count: 15 },
  { id: 'cristais', name: 'Cristais', count: 12 },
  { id: 'rituais', name: 'Rituais', count: 10 },
  { id: 'desenvolvimento', name: 'Desenvolvimento Pessoal', count: 11 }
]

const levels = [
  { id: 'all', name: 'Todos os Níveis' },
  { id: 'iniciante', name: 'Iniciante' },
  { id: 'intermediario', name: 'Intermediário' },
  { id: 'avancado', name: 'Avançado' }
]

const durations = [
  { id: 'all', name: 'Qualquer Duração' },
  { id: 'short', name: 'Até 5 horas' },
  { id: 'medium', name: '5-20 horas' },
  { id: 'long', name: 'Mais de 20 horas' }
]

const prices = [
  { id: 'all', name: 'Todos os Preços' },
  { id: 'free', name: 'Gratuitos' },
  { id: 'paid', name: 'Pagos' },
  { id: 'premium', name: 'Premium' }
]

const sortOptions = [
  { id: 'popular', name: 'Mais Populares' },
  { id: 'recent', name: 'Mais Recentes' },
  { id: 'rating', name: 'Melhor Avaliados' },
  { id: 'price-low', name: 'Menor Preço' },
  { id: 'price-high', name: 'Maior Preço' }
]

export function CourseFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedDuration, setSelectedDuration] = useState('all')
  const [selectedPrice, setSelectedPrice] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedLevel !== 'all',
    selectedDuration !== 'all',
    selectedPrice !== 'all'
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSelectedCategory('all')
    setSelectedLevel('all')
    setSelectedDuration('all')
    setSelectedPrice('all')
    setSearchTerm('')
  }

  return (
    <section className="py-12 bg-white border-b">
      <div className="container mx-auto px-4">
        {/* Search and Quick Actions */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Busque por cursos, temas ou instrutores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 text-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-3"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros Avançados
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-1 px-2 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
                <span className="ml-2 text-xs opacity-75">({category.count})</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Level Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nível
                    </label>
                    <div className="relative">
                      <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 appearance-none bg-white"
                      >
                        {levels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Duration Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duração
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 appearance-none bg-white"
                      >
                        {durations.map((duration) => (
                          <option key={duration.id} value={duration.id}>
                            {duration.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPrice}
                        onChange={(e) => setSelectedPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 appearance-none bg-white"
                      >
                        {prices.map((price) => (
                          <option key={price.id} value={price.id}>
                            {price.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sort Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordenar por
                    </label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 appearance-none bg-white"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Mostrando <span className="font-semibold text-gray-900">150 cursos</span> encontrados
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Ordenado por: <span className="font-semibold text-gray-900">{sortOptions.find(opt => opt.id === sortBy)?.name}</span>
          </div>
        </div>
      </div>
    </section>
  )
}