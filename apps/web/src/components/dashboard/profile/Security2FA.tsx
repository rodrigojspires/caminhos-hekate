"use client"
import { useEffect, useState } from 'react'

export default function Security2FA() {
  const [enabled, setEnabled] = useState<boolean>(false)
  const [secret, setSecret] = useState<string>('')
  const [otpauth, setOtpauth] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [backup, setBackup] = useState<string[]>([])

  useEffect(() => {
    // In a real app, fetch current 2FA status
  }, [])

  const setup = async () => {
    const res = await fetch('/api/user/2fa/setup', { method: 'POST' })
    const data = await res.json()
    setSecret(data.secret)
    setOtpauth(data.otpauth)
  }

  const enable = async () => {
    const res = await fetch('/api/user/2fa/enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, token: code }) })
    if (res.ok) setEnabled(true)
  }

  const disable = async () => {
    const res = await fetch('/api/user/2fa/disable', { method: 'POST' })
    if (res.ok) { setEnabled(false); setSecret(''); setOtpauth(''); setCode('') }
  }

  const generateBackup = async () => {
    const res = await fetch('/api/user/2fa/backup', { method: 'POST' })
    const data = await res.json()
    if (data.codes) setBackup(data.codes)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Autenticação em Duas Etapas (2FA)</div>
          <div className="text-sm text-muted-foreground">Proteja sua conta com um segundo fator</div>
        </div>
        {enabled ? (
          <button onClick={disable} className="px-3 py-2 border rounded">Desativar</button>
        ) : (
          <button onClick={setup} className="px-3 py-2 border rounded">Configurar</button>
        )}
      </div>

      {!enabled && secret && (
        <div className="border rounded p-4 space-y-2">
          <div className="text-sm">Secret: <code>{secret}</code></div>
          <div className="text-sm">Link (otpauth): <a className="underline" href={otpauth}>{otpauth}</a></div>
          <div className="flex items-center gap-2">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código do app" className="px-3 py-2 border rounded" />
            <button onClick={enable} className="px-3 py-2 bg-primary text-white rounded">Ativar</button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="border rounded p-4 space-y-2">
          <div className="font-medium">Códigos de backup</div>
          <button onClick={generateBackup} className="px-3 py-2 border rounded">Gerar</button>
          {backup.length > 0 && (
            <ul className="list-disc pl-6 text-sm">
              {backup.map(c => <li key={c}><code>{c}</code></li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

