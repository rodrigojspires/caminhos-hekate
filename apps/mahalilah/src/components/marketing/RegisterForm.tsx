'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

type ApiError = {
  message?: string
  errors?: Array<{ field?: string; message?: string }>
}

export function RegisterForm() {
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl')
  const safeCallback = (() => {
    if (!rawCallback) return '/dashboard'
    if (rawCallback.startsWith('/') && !rawCallback.startsWith('//')) return rawCallback
    try {
      const parsed = new URL(rawCallback)
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
      }
    } catch {}
    return '/dashboard'
  })()
  const loginHref = `/login?callbackUrl=${encodeURIComponent(safeCallback)}`

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, callbackUrl: safeCallback })
      })

      const data: ApiError = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          data.errors && data.errors.length > 0
            ? data.errors.map((item) => item.message).filter(Boolean).join(' • ')
            : data.message || 'Erro ao criar conta.'
        setError(message)
        setLoading(false)
        return
      }

      setSuccess('Conta criada. Verifique seu e-mail para ativar o acesso.')
      setLoading(false)
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-6" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-ink">
        Nome
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </label>
      <label className="flex flex-col gap-2 text-sm text-ink">
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-ink">
        Senha
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </label>
      {error && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {error}
        </div>
      )}
      {success && (
        <div className="notice good">
          {success}{' '}
          <Link href={loginHref} className="text-ink underline">
            Ir para login
          </Link>
        </div>
      )}
      <button type="submit" className="btn-primary w-full sm:w-fit" disabled={loading}>
        {loading ? 'Criando...' : 'Criar conta'}
      </button>
      <p className="text-sm text-ink-muted">
        Já tem conta?{' '}
        <Link href={loginHref} className="text-gold hover:text-gold-soft">
          Entrar
        </Link>
      </p>
    </form>
  )
}
