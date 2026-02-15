'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

const authErrorMessage = (code: string | null) => {
  if (!code) return null
  if (code === 'CredentialsSignin') return 'Email ou senha incorretos.'
  if (code === 'EMAIL_NOT_VERIFIED') return 'Seu email ainda nao foi verificado.'
  if (code === 'AccessDenied') return 'Acesso negado.'
  if (code === 'SessionRequired') return 'Faça login para continuar.'
  return 'Nao foi possivel autenticar. Tente novamente.'
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl')
  const queryError = searchParams.get('error')
  const verifiedStatus = searchParams.get('verified')
  const safeCallback = (() => {
    if (!rawCallback) return '/dashboard'
    if (rawCallback.startsWith('/')) return rawCallback
    try {
      const parsed = new URL(rawCallback)
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
      }
    } catch {}
    return '/dashboard'
  })()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: safeCallback,
      redirect: false
    })

    if (result?.error) {
      setError(authErrorMessage(result.error))
      setLoading(false)
      return
    }

    window.location.href = safeCallback
  }

  return (
    <form className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-6" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-ink">
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-2 text-sm text-ink">
        Senha
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {error}
        </div>
      )}
      {!error && queryError && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {authErrorMessage(queryError)}
        </div>
      )}
      {!error && !queryError && verifiedStatus === 'success' && (
        <div className="notice good">
          E-mail confirmado com sucesso. Você já pode entrar.
        </div>
      )}
      {!error && !queryError && verifiedStatus === 'expired' && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          Link de confirmação expirado. Faça um novo cadastro para receber outro link.
        </div>
      )}
      {!error && !queryError && verifiedStatus === 'invalid' && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          Link de confirmação inválido.
        </div>
      )}
      <button type="submit" className="btn-primary w-full sm:w-fit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      <p className="text-sm text-ink-muted">
        <Link href="/forgot-password" className="text-gold hover:text-gold-soft">
          Esqueci minha senha
        </Link>
      </p>
      <p className="text-sm text-ink-muted">
        Não tem conta?{' '}
        <Link href="/register" className="text-gold hover:text-gold-soft">
          Criar conta
        </Link>
      </p>
    </form>
  )
}
