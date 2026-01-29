import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell, Pill } from '@/components/marketing/ui'
import { blogCategories, blogPosts } from '@/lib/marketing/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Artigos sobre prática terapêutica, grupos, segurança emocional e uso consciente da IA.',
  openGraph: {
    title: 'Blog Maha Lilah Online',
    description: 'Artigos sobre prática terapêutica, grupos, segurança emocional e uso consciente da IA.',
    url: '/blog'
  }
}

export default function BlogPage() {
  const faqItems = [
    {
      question: 'Posso usar os artigos em sessão?',
      answer: 'Sim. Use como apoio para perguntas abertas e reflexão.'
    },
    {
      question: 'Como escolho um tema?',
      answer: 'Comece pela categoria que mais conversa com o momento do grupo.'
    },
    {
      question: 'Há novos textos toda semana?',
      answer: 'Publicamos com frequência regular. Acompanhe pelo blog.'
    }
  ]

  return (
    <div>
      <Hero
        eyebrow="Blog"
        title="Reflexões para jornadas terapêuticas"
        subtitle="Conteúdos curtos para apoiar facilitadores, terapeutas e grupos com cuidado e clareza."
        primaryCta={{ label: 'Criar sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Imagem: biblioteca de artigos"
      />

      <SectionShell>
        <SectionHeader
          eyebrow="Categorias"
          title="Encontre o tema certo"
          subtitle="Filtre as leituras que mais combinam com seu momento."
        />
        <div className="flex flex-wrap gap-3">
          {blogCategories.map((category) => (
            <Pill key={category}>{category}</Pill>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-6">
            {blogPosts.map((post) => (
              <article key={post.slug} className="rounded-3xl border border-border/70 bg-surface/70 p-6">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink-muted">
                  <span>{post.category}</span>
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="mt-4 font-serif text-2xl text-ink">
                  <Link href={`/blog/${post.slug}`} className="hover:text-gold">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm text-ink-muted">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm text-gold">
                  Ler artigo
                </Link>
              </article>
            ))}
          </div>
          <div className="flex flex-col gap-6">
            <MediaPlaceholder variant="vertical" label="Imagem: destaque do blog" />
            <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
              <p>
                Cada texto busca apoiar o processo terapêutico com clareza, sem promessas milagrosas.
                Use como inspiração para suas sessões.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre o blog"
        items={faqItems}
        ctaLabel="Falar com a equipe"
        ctaHref="/contato"
      />

      <CTA
        title="Quer levar a conversa para a sala?"
        subtitle="Crie uma sala ao vivo e registre os insights com clareza."
        primaryCta={{ label: 'Criar sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
