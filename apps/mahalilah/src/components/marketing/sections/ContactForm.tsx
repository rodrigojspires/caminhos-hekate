import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export function ContactForm() {
  return (
    <SectionShell>
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeader
          eyebrow="Contato"
          title="Vamos conversar com calma"
          subtitle="Nos conte o contexto da sua jornada. Respondemos em até 2 dias úteis."
        />
        <form className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-6">
          <label className="flex flex-col gap-2 text-sm text-ink">
            Nome
            <input type="text" name="name" placeholder="Seu nome" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-ink">
            E-mail
            <input type="email" name="email" placeholder="voce@email.com" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-ink">
            Assunto
            <input type="text" name="subject" placeholder="Como podemos ajudar?" required />
          </label>
          <label className="flex flex-col gap-2 text-sm text-ink">
            Mensagem
            <textarea name="message" rows={5} placeholder="Descreva sua necessidade" required />
          </label>
          <button type="submit" className="btn-primary w-fit">
            Enviar mensagem
          </button>
        </form>
      </div>
    </SectionShell>
  )
}
