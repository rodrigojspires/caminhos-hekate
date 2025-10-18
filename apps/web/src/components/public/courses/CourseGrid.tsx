'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Layers, Play } from 'lucide-react'

const courses = [
  {
    id: 'intro-witchcraft',
    title: 'Introdução à Bruxaria Moderna',
    description: 'Fundamentos, história e práticas contemporâneas da bruxaria.',
    image: '/images/courses/intro-witchcraft.jpg',
    modules: 8,
    lessons: 64,
    duration: 12,
    price: 89.9
  },
  {
    id: 'tarot-advanced',
    title: 'Tarot Avançado: Leitura Intuitiva',
    description: 'Aprofunde-se nas técnicas de leitura do Tarot.',
    image: '/images/courses/tarot-advanced.jpg',
    modules: 6,
    lessons: 48,
    duration: 10,
    price: 99.9
  },
  {
    id: 'herbalism',
    title: 'Herbalismo Mágico: Plantas e Poções',
    description: 'Conheça as propriedades mágicas das plantas e crie poções.',
    image: '/images/courses/herbalism.jpg',
    modules: 7,
    lessons: 52,
    duration: 11,
    price: 79.9
  },
  {
    id: 'moon-rituals',
    title: 'Rituais da Lua: Ciclos e Práticas',
    description: 'Rituais alinhados com as fases da lua para potencializar intenções.',
    image: '/images/courses/moon-rituals.jpg',
    modules: 5,
    lessons: 40,
    duration: 8,
    price: 69.9
  }
]

export function CourseGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {courses.map((course) => (
        <Card key={course.id} className="bg-white/5 border-white/10 backdrop-blur">
          <CardContent className="p-0">
            <Link href={`/cursos/${course.id}`} className="block">
              <div className="relative w-full h-40">
                <Image src={course.image} alt={course.title} fill className="object-cover rounded-t-lg" />
              </div>
              <div className="p-4 space-y-3">
                <h3 className="text-white font-semibold line-clamp-2 min-h-[48px]">{course.title}</h3>
                <p className="text-purple-200 text-sm line-clamp-2">{course.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-purple-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {course.duration}h de conteúdo
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
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
