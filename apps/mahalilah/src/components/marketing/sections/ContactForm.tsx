'use client'

import { useState, type FormEvent } from 'react'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

const CONTACT_EMAIL = 'contato@mahalilahonline.com.br'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const composedSubject = `[Maha Lilah] ${subject || 'Contato institucional'}`
    const composedBody = [
      `Nome: ${name}`,
      `E-mail: ${email}`,
      '',
      message
    ].join('\n')

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(composedSubject)}&body=${encodeURIComponent(composedBody)}`
    setSent(true)
  }

  return (
    <SectionShell>
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeader
          eyebrow="Contato"
          title="Converse com o time que cuida da experiência"
          subtitle="Descreva seu contexto, tamanho de grupo e objetivo. Nossa equipe retorna em até 2 dias úteis."
        />
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
          {sent && (
            <p className="notice good">
              Abrimos seu app de e-mail com a mensagem pronta. Se preferir, envie direto para {CONTACT_EMAIL}.
            </p>
          )}
          <button type="submit" className="btn-primary w-full sm:w-fit">
            Enviar mensagem
          </button>
        </form>
      </div>
    </SectionShell>
  )
}
