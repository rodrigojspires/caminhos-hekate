import { Metadata } from 'next'
import { CoursesHero } from '@/components/public/courses/CoursesHero'
import { CourseFilters } from '@/components/public/courses/CourseFilters'
import { CourseGrid } from '@/components/public/courses/CourseGrid'
import { CourseStats } from '@/components/public/courses/CourseStats'
import { CTA } from '@/components/public/CTA'

export const metadata: Metadata = {
  title: 'Cursos | Caminhos de Hekate',
  description: 'Descubra nossa coleção completa de cursos de desenvolvimento pessoal, autoconhecimento e espiritualidade. Transforme sua vida com conteúdo de qualidade.',
  keywords: [
    'cursos online',
    'desenvolvimento pessoal',
    'autoconhecimento',
    'espiritualidade',
    'transformação pessoal',
    'crescimento interior',
    'meditação',
    'mindfulness',
    'coaching',
    'terapia'
  ],
  openGraph: {
    title: 'Cursos | Caminhos de Hekate',
    description: 'Descubra nossa coleção completa de cursos de desenvolvimento pessoal e espiritualidade.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cursos | Caminhos de Hekate',
    description: 'Descubra nossa coleção completa de cursos de desenvolvimento pessoal e espiritualidade.',
  },
  alternates: {
    canonical: '/cursos'
  }
}

export default function CoursesPage() {
  return (
    <main className="min-h-screen">
      <CoursesHero />
      <CourseStats />
      <CourseFilters />
      <CourseGrid />
      <CTA />
    </main>
  )
}