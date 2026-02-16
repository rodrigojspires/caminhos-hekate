'use client'

import { useState, type FormEvent } from 'react'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

type ApiError = {
  message?: string
  errors?: Array<{ field?: string; message?: string }>
}

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      })

      const data: ApiError = await response.json().catch(() => ({}))

      if (!response.ok) {
        const parsedError =
          data.errors && data.errors.length > 0
            ? data.errors.map((item) => item.message).filter(Boolean).join(' • ')
            : data.message || 'Não foi possível enviar sua mensagem.'
        setError(parsedError)
        setLoading(false)
        return
      }

      setSent(true)
      setLoading(false)
    } catch {
      setError('Não foi possível enviar sua mensagem. Tente novamente em instantes.')
      setLoading(false)
    }
  }

  return (
    <SectionShell>
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeader
          eyebrow="Contato"
          title="Converse com o time que cuida da experiência"
          subtitle="Descreva seu contexto, tamanho de grupo e objetivo. Nossa equipe retorna em até 2 dias úteis."
        />
        {sent ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-gold/30 bg-surface/70 p-5 shadow-soft sm:p-6">
            <p className="text-sm font-semibold text-ink">Mensagem enviada com sucesso.</p>
            <p className="text-sm text-ink-muted">Em breve retornaremos para você.</p>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 shadow-soft sm:p-6"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-2 text-sm text-ink">
              Nome
              <input
                type="text"
                name="name"
                placeholder="Seu nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-ink">
              E-mail
              <input
                type="email"
                name="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-ink">
              Assunto
              <input
                type="text"
                name="subject"
                placeholder="Ex.: Quero aplicar em grupos semanais"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-ink">
              Mensagem
              <textarea
                name="message"
                rows={5}
                placeholder="Conte como você pretende usar o Maha Lilah"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
            </label>
            {error && <p className="notice">{error}</p>}
            <button type="submit" className="btn-primary w-full sm:w-fit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        )}
      </div>
    </SectionShell>
  )
}
