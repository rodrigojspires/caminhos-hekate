import { Metadata } from 'next'
import { Hero } from '@/components/public/Hero'
import { Features } from '@/components/public/Features'
import { Testimonials } from '@/components/public/Testimonials'
import { CoursePreview } from '@/components/public/CoursePreview'
import { CTA } from '@/components/public/CTA'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Caminhos de Hekate - Escola Iniciática de Magia & Ocultismo',
  description: 'Desperte sua soberania espiritual. Explore cursos de magia, ocultismo e autoconhecimento na Escola Iniciática Caminhos de Hekate. Uma jornada para quem ouve o chamado da transformação.',
  keywords: 'Hekate, magia, ocultismo, esoterismo, escola iniciática, cursos de magia, espiritualidade, autoconhehecimento, bruxaria, sacerdócio',
  openGraph: {
    title: 'Caminhos de Hekate - Escola Iniciática de Magia & Ocultismo',
    description: 'Desperte sua soberania espiritual. Uma jornada para quem ouve o chamado da transformação.',
    type: 'website',
    images: ['/og-image.jpg'],
  },
}

export default async function HomePage() {
  // Se o usuário estiver logado, redirecionar para o painel adequado
  const session = await getServerSession(authOptions)
  if (session?.user) {
    if (session.user.role === 'ADMIN') {
      redirect('/admin')
    }
    redirect('/dashboard')
  }

  return (
    <main>
      <Hero />
      <Features />
      <CoursePreview />
      <Testimonials />
      <CTA />
    </main>
  )
}
