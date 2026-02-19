'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

type ApiResponse = {
  message?: string
}

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
    if (rawCallback.startsWith('/') && !rawCallback.startsWith('//')) return rawCallback
    try {
      const parsed = new URL(rawCallback)
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
      }
    } catch {}
    return '/dashboard'
  })()
  const registerHref = `/register?callbackUrl=${encodeURIComponent(safeCallback)}`
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  const showResendVerification =
    errorCode === 'EMAIL_NOT_VERIFIED' ||
    (!error && queryError === 'EMAIL_NOT_VERIFIED')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setErrorCode(null)
    setResendMessage(null)
    setResendError(null)

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: safeCallback,
      redirect: false
    })

    if (result?.error) {
      setErrorCode(result.error)
      setError(authErrorMessage(result.error))
      setLoading(false)
      return
    }

    window.location.href = safeCallback
  }

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setResendError('Informe seu email para reenviar a validação.')
      return
    }

    setResendLoading(true)
    setResendMessage(null)
    setResendError(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          callbackUrl: safeCallback
        })
      })

      const data: ApiResponse = await response.json().catch(() => ({}))

      if (!response.ok) {
        setResendError(data.message || 'Não foi possível reenviar o email de validação.')
        setResendLoading(false)
        return
      }

      setResendMessage(
        data.message ||
          'Se o email existir e ainda não estiver verificado, enviaremos um novo link de confirmação.'
      )
      setResendLoading(false)
    } catch {
      setResendError('Não foi possível reenviar o email de validação.')
      setResendLoading(false)
    }
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
          {showResendVerification && (
            <div className="mt-2">
              <button
                type="button"
                className="text-black underline hover:text-black/80 disabled:opacity-60"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? 'Reenviando...' : 'Reenviar validação'}
              </button>
            </div>
          )}
        </div>
      )}
      {!error && queryError && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {authErrorMessage(queryError)}
          {queryError === 'EMAIL_NOT_VERIFIED' && (
            <div className="mt-2">
              <button
                type="button"
                className="text-black underline hover:text-black/80 disabled:opacity-60"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? 'Reenviando...' : 'Reenviar validação'}
              </button>
            </div>
          )}
        </div>
      )}
      {resendError && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {resendError}
        </div>
      )}
      {resendMessage && (
        <div className="notice good">
          {resendMessage}
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
        <Link href={registerHref} className="text-gold hover:text-gold-soft">
          Criar conta
        </Link>
      </p>
    </form>
  )
}
