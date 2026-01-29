import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Segurança e privacidade',
  description: 'Privacidade por padrão com login obrigatório, consentimento e controle de dados.',
  openGraph: {
    title: 'Segurança e privacidade',
    description: 'Privacidade por padrão com login obrigatório, consentimento e controle de dados.',
    url: '/seguranca-privacidade'
  }
}

const faqItems = [
  {
    question: 'O que a IA pode ler?',
    answer: 'Apenas os registros terapêuticos e informações fornecidas na sala, dentro do escopo da sessão.'
  },
  {
    question: 'Posso excluir meus dados?',
    answer: 'Sim. A exclusão segue os termos e pode ser solicitada pelo titular da conta.'
  },
  {
    question: 'Os dados são compartilhados?',
    answer: 'Somente com provedores essenciais, como pagamento e IA, sempre com mínimo necessário.'
  }
]

export default function SegurancaPrivacidadePage() {
  return (
    <div>
      <Hero
        eyebrow="Segurança"
        title="Privacidade por padrão. Controle por você."
        subtitle="Login obrigatório, convites por e-mail e consentimento claro para manter cada sala segura."
        primaryCta={{ label: 'Ver política de privacidade', href: '/privacidade' }}
        secondaryCta={{ label: 'Termos de uso', href: '/termos' }}
        mediaLabel="Imagem: escudo de segurança com luz suave"
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Proteção"
              title="Controle de identidade e acesso"
              subtitle="Cada participante entra com login e convite vinculado ao e-mail." />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Login obrigatório para todas as salas.</li>
              <li>Convites por e-mail com vínculo de identidade.</li>
              <li>Consentimento registrado no início da sessão.</li>
              <li>Retenção: registros ficam salvos até exclusão conforme termos.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Screenshot: controle de acesso" />
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="horizontal" label="Imagem: política de IA" />
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="IA"
              title="O que a IA lê"
              subtitle="A IA processa registros terapêuticos e informações fornecidas, somente quando acionada." />
            <p className="text-sm text-ink-muted">
              O uso da IA é opcional. Cada sessão tem limites por jogador e por plano. O conteúdo é tratado com
              confidencialidade, respeitando nosso compromisso com privacidade.
            </p>
            <p className="text-sm text-ink-muted">
              Evite inserir dados extremamente sensíveis se não desejar que fiquem registrados.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-8 text-sm text-ink-muted">
          <p>
            Para mais detalhes, consulte nossa <Link className="text-gold" href="/privacidade">Política de Privacidade</Link>,
            {' '}os <Link className="text-gold" href="/termos">Termos de Uso</Link> e a página de
            {' '}<Link className="text-gold" href="/cookies">Cookies</Link>.
          </p>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre privacidade"
        items={faqItems}
        ctaLabel="Falar com a equipe"
        ctaHref="/contato"
      />

      <CTA
        title="Segurança em cada sessão"
        subtitle="Crie sua sala com clareza de consentimento e controle total sobre o acesso."
        primaryCta={{ label: 'Criar sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
