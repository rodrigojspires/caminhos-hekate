'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ApiError = {
  message?: string
  errors?: Array<{ field?: string; message?: string }>
}

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false)
        setValidating(false)
        return
      }

      try {
        const response = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        setTokenValid(response.ok)
      } catch {
        setTokenValid(false)
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!passwordPattern.test(password)) {
      setError('A senha deve conter ao menos uma letra minúscula, uma maiúscula e um número.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword })
      })

      const data: ApiError = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          data.errors && data.errors.length > 0
            ? data.errors.map((item) => item.message).filter(Boolean).join(' • ')
            : data.message || 'Erro ao redefinir senha.'
        setError(message)
        setLoading(false)
        return
      }

      setSuccess(data.message || 'Senha redefinida com sucesso. Redirecionando para o login...')
      setLoading(false)

      setTimeout(() => {
        router.push('/login')
      }, 2500)
    } catch {
      setError('Erro ao redefinir senha. Tente novamente.')
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
        Validando link de recuperação...
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-6">
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          O link de recuperação é inválido ou expirou.
        </div>
        <p className="text-sm text-ink-muted">
          <Link href="/forgot-password" className="text-gold hover:text-gold-soft">
            Solicitar novo link
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/70 p-6" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-ink">
        Nova senha
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-ink">
        Confirmar nova senha
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>

      <p className="text-xs text-ink-muted">
        A senha precisa ter pelo menos 8 caracteres, com letra maiúscula, minúscula e número.
      </p>

      {error && (
        <div className="rounded-2xl border border-gold/40 bg-surface/70 p-3 text-sm text-gold-soft">
          {error}
        </div>
      )}

      {success && <div className="notice good">{success}</div>}

      <button type="submit" className="btn-primary w-fit" disabled={loading}>
        {loading ? 'Redefinindo...' : 'Redefinir senha'}
      </button>

      <p className="text-sm text-ink-muted">
        <Link href="/login" className="text-gold hover:text-gold-soft">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
