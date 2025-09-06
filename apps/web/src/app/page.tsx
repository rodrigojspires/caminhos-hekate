import { Metadata } from 'next'
import { Hero } from '@/components/public/Hero'
import { Features } from '@/components/public/Features'
import { Testimonials } from '@/components/public/Testimonials'
import { CoursePreview } from '@/components/public/CoursePreview'
import { CTA } from '@/components/public/CTA'

export const metadata: Metadata = {
  title: 'Caminhos de Hekate - Transforme sua vida através do autoconhecimento',
  description: 'Descubra cursos exclusivos de desenvolvimento pessoal, espiritualidade e autoconhecimento. Junte-se à nossa comunidade e transforme sua jornada.',
  keywords: 'autoconhecimento, desenvolvimento pessoal, espiritualidade, cursos online, Hekate',
  openGraph: {
    title: 'Caminhos de Hekate',
    description: 'Transforme sua vida através do autoconhecimento',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <CoursePreview />
      <Testimonials />
      <CTA />
    </main>
  )
}
