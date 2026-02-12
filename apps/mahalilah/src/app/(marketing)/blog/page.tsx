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
  description:
    'Artigos práticos para terapeutas e facilitadores sobre condução de grupos, presença e segurança emocional.',
  openGraph: {
    title: 'Blog Maha Lilah Online',
    description:
      'Artigos práticos para terapeutas e facilitadores sobre condução de grupos, presença e segurança emocional.',
    url: '/blog'
  }
}

export default function BlogPage() {
  const faqItems = [
    {
      question: 'Posso usar os artigos em sessão?',
      answer: 'Sim. Use os conteúdos como inspiração para perguntas abertas e fechamento.'
    },
    {
      question: 'Como escolher um tema para estudar agora?',
      answer: 'Comece pela categoria que conversa com seu desafio atual de condução.'
    },
    {
      question: 'Vocês publicam com frequência?',
      answer: 'Sim. Atualizamos o blog regularmente com conteúdos práticos.'
    }
  ]

  return (
    <div>
      <Hero
        eyebrow="Blog"
        title="Conteúdo para conduzir com mais profundidade e leveza"
        subtitle="Leituras rápidas e aplicáveis para terapeutas, facilitadores e quem conduz jornadas em grupo."
        primaryCta={{ label: 'Criar sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Biblioteca de artigos e conteúdo aplicado"
        highlights={['Leitura prática', 'Aplicação imediata', 'Atualização contínua']}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="Categorias"
          title="Explore por tema"
          subtitle="Filtre pelos assuntos mais úteis para seu momento profissional."
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
              <article
                key={post.slug}
                className="rounded-3xl border border-border/70 bg-surface/75 p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-gold/30"
              >
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
                  Ler artigo completo →
                </Link>
              </article>
            ))}
          </div>
          <div className="flex flex-col gap-6">
            <MediaPlaceholder variant="vertical" label="Destaque editorial da semana" />
            <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
              <p>
                Cada artigo foi escrito para ser útil no mundo real: menos teoria solta e mais sugestões de
                aplicação prática em sessões e grupos.
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
        title="Quer transformar leitura em prática?"
        subtitle="Crie uma sala ao vivo e teste os insights do blog na sua próxima jornada."
        primaryCta={{ label: 'Criar sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        badges={['Conteúdo aplicado', 'Jornada contínua']}
      />
    </div>
  )
}
