"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

type DownloadItem = {
  id: string
  fileName: string
  token: string
  expiresAt: string
  downloadCount: number
  maxDownloads: number
  createdAt: string
}

export default function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/downloads', { cache: 'no-store' })
        if (!res.ok) throw new Error('Falha ao carregar downloads')
        const data = await res.json()
        setItems(data.downloads || [])
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="container mx-auto py-6">Carregando...</div>
  if (error) return <div className="container mx-auto py-6 text-red-600">{error}</div>

  const now = Date.now()
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meus Downloads</h1>
        <p className="text-muted-foreground">Acesse seus arquivos digitais adquiridos</p>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-3">Arquivo</th>
              <th className="text-left p-3">Expira em</th>
              <th className="text-left p-3">Restantes</th>
              <th className="text-right p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const expiresAt = new Date(d.expiresAt).getTime()
              const expired = expiresAt <= now
              const remaining = Math.max(0, d.maxDownloads - d.downloadCount)
              const canDownload = !expired && remaining > 0
              return (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.fileName}</td>
                  <td className="p-3">{new Date(d.expiresAt).toLocaleString('pt-BR')}</td>
                  <td className="p-3">{remaining} / {d.maxDownloads}</td>
                  <td className="p-3 text-right">
                    {canDownload ? (
                      <Link
                        href={`/api/downloads/${d.token}`}
                        className="inline-flex items-center rounded bg-primary text-white px-3 py-2 text-sm"
                      >
                        Baixar
                      </Link>
                    ) : (
                      <button className="inline-flex items-center rounded bg-muted text-muted-foreground px-3 py-2 text-sm" disabled>
                        Indisponível
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                  Nenhum download disponível no momento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

