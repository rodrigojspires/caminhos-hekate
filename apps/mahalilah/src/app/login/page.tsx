'use client'

import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      twoFactorCode: twoFactorCode || undefined,
      callbackUrl,
      redirect: false,
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (result?.url) {
      window.location.href = result.url
    } else {
      window.location.href = callbackUrl
    }
  }

  return (
    <main>
      <div className="grid two" style={{ alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 36, marginBottom: 12 }}>Entrar</h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            Use o mesmo login do Caminhos de Hekate. O acesso às salas requer autenticação.
          </p>
          {error && (
            <div className="notice" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}
        </div>
        <form className="card" onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Senha</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Código 2FA (se aplicável)</span>
            <input type="text" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => signIn('google', { callbackUrl })}
          >
            Entrar com Google
          </button>
        </form>
      </div>
    </main>
  )
}
