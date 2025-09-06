'use client'

import React, { useState, useCallback } from 'react'
import { Calendar, Tag, Layers, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { DatePicker } from '@/components/ui/date-picker'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Tipos
interface SearchFilters {
  entityTypes?: string[]
  categories?: string[]
  tags?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  popularity?: {
    min: number
    max: number
  }
}

interface Facets {
  entityTypes: { value: string; count: number }[]
  categories: { value: string; count: number }[]
  tags: { value: string; count: number }[]
}

interface SearchFiltersProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  facets?: Facets
  className?: string
}

// Tipos de entidade disponíveis
const ENTITY_TYPES = [
  { value: 'course', label: 'Cursos', icon: '📚' },
  { value: 'lesson', label: 'Aulas', icon: '🎓' },
  { value: 'post', label: 'Posts', icon: '📝' },
  { value: 'topic', label: 'Tópicos', icon: '💬' },
  { value: 'user', label: 'Usuários', icon: '👤' },
  { value: 'product', label: 'Produtos', icon: '🛍️' }
]

export function SearchFilters({
  filters,
  onChange,
  facets,
  className = ''
}: SearchFiltersProps) {
  // Estados locais
  const [expandedSections, setExpandedSections] = useState({
    entityTypes: true,
    categories: true,
    tags: false,
    dateRange: false,
    popularity: false
  })
  const [customTag, setCustomTag] = useState('')
  const [customCategory, setCustomCategory] = useState('')

  // Handlers
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const handleEntityTypeChange = useCallback((entityType: string, checked: boolean) => {
    const currentTypes = filters.entityTypes || []
    const newTypes = checked
      ? [...currentTypes, entityType]
      : currentTypes.filter(type => type !== entityType)
    
    onChange({
      ...filters,
      entityTypes: newTypes.length > 0 ? newTypes : undefined
    })
  }, [filters, onChange])

  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    const currentCategories = filters.categories || []
    const newCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter(cat => cat !== category)
    
    onChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined
    })
  }, [filters, onChange])

  const handleTagChange = useCallback((tag: string, checked: boolean) => {
    const currentTags = filters.tags || []
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag)
    
    onChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined
    })
  }, [filters, onChange])

  const addCustomTag = useCallback(() => {
    if (!customTag.trim()) return
    
    const currentTags = filters.tags || []
    if (!currentTags.includes(customTag.trim())) {
      onChange({
        ...filters,
        tags: [...currentTags, customTag.trim()]
      })
    }
    setCustomTag('')
  }, [customTag, filters, onChange])

  const addCustomCategory = useCallback(() => {
    if (!customCategory.trim()) return
    
    const currentCategories = filters.categories || []
    if (!currentCategories.includes(customCategory.trim())) {
      onChange({
        ...filters,
        categories: [...currentCategories, customCategory.trim()]
      })
    }
    setCustomCategory('')
  }, [customCategory, filters, onChange])

  const handleDateRangeChange = useCallback((field: 'from' | 'to', date: Date | undefined) => {
    if (!date) {
      if (field === 'from' && filters.dateRange?.to) {
        onChange({
          ...filters,
          dateRange: { from: new Date(), to: filters.dateRange.to }
        })
      } else if (field === 'to' && filters.dateRange?.from) {
        onChange({
          ...filters,
          dateRange: { from: filters.dateRange.from, to: new Date() }
        })
      } else {
        onChange({
          ...filters,
          dateRange: undefined
        })
      }
      return
    }

    const currentRange = filters.dateRange
    const newRange = {
      from: field === 'from' ? date : currentRange?.from || new Date(),
      to: field === 'to' ? date : currentRange?.to || new Date()
    }

    onChange({
      ...filters,
      dateRange: newRange
    })
  }, [filters, onChange])

  const handlePopularityChange = useCallback((values: number[]) => {
    onChange({
      ...filters,
      popularity: {
        min: values[0],
        max: values[1]
      }
    })
  }, [filters, onChange])

  const clearDateRange = useCallback(() => {
    onChange({
      ...filters,
      dateRange: undefined
    })
  }, [filters, onChange])

  const clearPopularity = useCallback(() => {
    onChange({
      ...filters,
      popularity: undefined
    })
  }, [filters, onChange])

  const removeFilter = useCallback((type: string, value: string) => {
    switch (type) {
      case 'entityType':
        handleEntityTypeChange(value, false)
        break
      case 'category':
        handleCategoryChange(value, false)
        break
      case 'tag':
        handleTagChange(value, false)
        break
    }
  }, [handleEntityTypeChange, handleCategoryChange, handleTagChange])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros Ativos */}
        {(filters.entityTypes?.length || filters.categories?.length || filters.tags?.length || filters.dateRange || filters.popularity) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filtros Ativos</Label>
            <div className="flex flex-wrap gap-2">
              {filters.entityTypes?.map(type => {
                const entityType = ENTITY_TYPES.find(et => et.value === type)
                return (
                  <Badge key={type} variant="secondary" className="gap-1">
                    {entityType?.icon} {entityType?.label || type}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilter('entityType', type)}
                      aria-label={`Remover filtro ${entityType?.label || type}`}
                      title={`Remover filtro ${entityType?.label || type}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
              {filters.categories?.map(category => (
                <Badge key={category} variant="secondary" className="gap-1">
                  📂 {category}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter('category', category)}
                    aria-label={`Remover categoria ${category}`}
                    title={`Remover categoria ${category}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {filters.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  🏷️ {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter('tag', tag)}
                    aria-label={`Remover tag ${tag}`}
                    title={`Remover tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {filters.dateRange && (
                <Badge variant="secondary" className="gap-1">
                  📅 {filters.dateRange.from.toLocaleDateString()} - {filters.dateRange.to.toLocaleDateString()}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={clearDateRange}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.popularity && (
                <Badge variant="secondary" className="gap-1">
                  📈 {filters.popularity.min} - {filters.popularity.max}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={clearPopularity}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
            <Separator />
          </div>
        )}

        {/* Tipos de Entidade */}
        <Collapsible open={expandedSections.entityTypes} onOpenChange={() => toggleSection('entityTypes')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <Label className="font-medium cursor-pointer">Tipos de Conteúdo</Label>
              </div>
              {expandedSections.entityTypes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            <div className="grid grid-cols-2 gap-2">
              {ENTITY_TYPES.map(entityType => {
                const facetCount = facets?.entityTypes.find(f => f.value === entityType.value)?.count || 0
                return (
                  <div key={entityType.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`entity-${entityType.value}`}
                      checked={filters.entityTypes?.includes(entityType.value) || false}
                      onCheckedChange={(checked) => handleEntityTypeChange(entityType.value, checked as boolean)}
                    />
                    <Label htmlFor={`entity-${entityType.value}`} className="flex items-center gap-2 cursor-pointer text-sm">
                      <span>{entityType.icon}</span>
                      <span>{entityType.label}</span>
                      {facetCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {facetCount}
                        </Badge>
                      )}
                    </Label>
                  </div>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Categorias */}
        <Collapsible open={expandedSections.categories} onOpenChange={() => toggleSection('categories')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <Label className="font-medium cursor-pointer">Categorias</Label>
              </div>
              {expandedSections.categories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {/* Adicionar categoria personalizada */}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar categoria..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                className="text-sm"
              />
              <Button size="sm" onClick={addCustomCategory} disabled={!customCategory.trim()}>
                +
              </Button>
            </div>
            
            {/* Categorias das facetas */}
            {facets?.categories && facets.categories.length > 0 && (
              <div className="space-y-2">
                {facets.categories.slice(0, 10).map(category => (
                  <div key={category.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.value}`}
                      checked={filters.categories?.includes(category.value) || false}
                      onCheckedChange={(checked) => handleCategoryChange(category.value, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category.value}`} className="flex items-center justify-between w-full cursor-pointer text-sm">
                      <span>{category.value}</span>
                      <Badge variant="outline" className="text-xs">
                        {category.count}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Tags */}
        <Collapsible open={expandedSections.tags} onOpenChange={() => toggleSection('tags')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <Label className="font-medium cursor-pointer">Tags</Label>
              </div>
              {expandedSections.tags ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {/* Adicionar tag personalizada */}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                className="text-sm"
              />
              <Button size="sm" onClick={addCustomTag} disabled={!customTag.trim()}>
                +
              </Button>
            </div>
            
            {/* Tags das facetas */}
            {facets?.tags && facets.tags.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {facets.tags.slice(0, 20).map(tag => (
                  <div key={tag.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.value}`}
                      checked={filters.tags?.includes(tag.value) || false}
                      onCheckedChange={(checked) => handleTagChange(tag.value, checked as boolean)}
                    />
                    <Label htmlFor={`tag-${tag.value}`} className="flex items-center justify-between w-full cursor-pointer text-sm">
                      <span>{tag.value}</span>
                      <Badge variant="outline" className="text-xs">
                        {tag.count}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Período */}
        <Collapsible open={expandedSections.dateRange} onOpenChange={() => toggleSection('dateRange')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Label className="font-medium cursor-pointer">Período</Label>
              </div>
              {expandedSections.dateRange ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">De</Label>
                <DatePicker
                  date={filters.dateRange?.from}
                  onDateChange={(date) => handleDateRangeChange('from', date)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Até</Label>
                <DatePicker
                  date={filters.dateRange?.to}
                  onDateChange={(date) => handleDateRangeChange('to', date)}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Popularidade */}
        <Collapsible open={expandedSections.popularity} onOpenChange={() => toggleSection('popularity')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <Label className="font-medium cursor-pointer">Popularidade</Label>
              </div>
              {expandedSections.popularity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="space-y-4">
              <div className="px-2">
                <Slider
                  value={[filters.popularity?.min || 0, filters.popularity?.max || 100]}
                  onValueChange={handlePopularityChange}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{filters.popularity?.min || 0}</span>
                <span>{filters.popularity?.max || 100}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
