'use client'

import Link from 'next/link'
import { useState } from 'react'

type ApiError = {
  message?: string
  errors?: Array<{ field?: string; message?: string }>
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data: ApiError = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          data.errors && data.errors.length > 0
            ? data.errors.map((item) => item.message).filter(Boolean).join(' • ')
            : data.message || 'Erro ao enviar email de recuperação.'
        setError(message)
        setLoading(false)
        return
      }

      setSuccess(data.message || 'Se o email existir, você receberá um link de recuperação.')
      setLoading(false)
    } catch {
      setError('Erro ao enviar email de recuperação. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-6" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-ink">
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      {error && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {error}
        </div>
      )}

      {success && <div className="notice good">{success}</div>}

      <button type="submit" className="btn-primary w-fit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>

      <p className="text-sm text-ink-muted">
        <Link href="/login" className="text-gold hover:text-gold-soft">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
