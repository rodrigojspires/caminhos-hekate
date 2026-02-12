import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { blogPosts } from '@/lib/marketing/blog'

type PageProps = {
  params: { slug: string }
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = blogPosts.find((item) => item.slug === params.slug)
  if (!post) {
    return {
      title: 'Post não encontrado'
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`
    }
  }
}

const faqItems = [
  {
    question: 'Posso compartilhar este artigo?',
    answer: 'Sim. Compartilhe com quem possa se beneficiar do conteúdo.'
  },
  {
    question: 'Como levo o tema para uma sala?',
    answer: 'Crie uma sala e use o deck randômico ou o modo terapia como apoio.'
  },
  {
    question: 'A IA resume as sessões automaticamente?',
    answer: 'A síntese final aparece por botão, dentro dos limites do plano.'
  }
]

export default function BlogPostPage({ params }: PageProps) {
  const post = blogPosts.find((item) => item.slug === params.slug)
  if (!post) {
    notFound()
  }

  return (
    <div>
      <SectionShell className="pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <span>{post.category}</span>
              <span>{post.date}</span>
              <span>{post.readTime}</span>
            </div>
            <h1 className="font-serif text-4xl text-ink sm:text-5xl">{post.title}</h1>
            <p className="text-base text-ink-muted">{post.excerpt}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Criar sala
              </Link>
              <Link href="/blog" className="btn-secondary">
                Voltar ao blog
              </Link>
            </div>
          </div>
          <MediaPlaceholder variant="vertical" label={post.coverLabel} />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Resumo"
          title="Pontos principais"
          subtitle="Uma visão rápida antes de aprofundar."
        />
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
          {post.summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionShell>

      {post.content.map((section) => (
        <SectionShell key={section.heading}>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-ink">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>
            <MediaPlaceholder variant="horizontal" label="Imagem complementar do artigo" />
          </div>
        </SectionShell>
      ))}

      <FAQ
        eyebrow="FAQ"
        title="Perguntas relacionadas"
        items={faqItems}
        ctaLabel="Ver planos"
        ctaHref="/planos"
      />

      <CTA
        title="Leve o aprendizado para a sala"
        subtitle="Crie uma sala ao vivo e registre os insights com clareza."
        primaryCta={{ label: 'Criar sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        badges={['Aplicação imediata', 'Fluxo em tempo real']}
      />
    </div>
  )
}
