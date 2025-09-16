"use client"

import { useEffect, useState, useCallback } from 'react'

type Invoice = {
  id: string
  amount: string
  currency: string
  status: string
  provider: string
  paidAt: string | null
  createdAt: string
  subscription?: { id: string; plan: { name: string; tier: string } | null } | null
  orderId?: string | null
  userId?: string | null
}

export default function InvoicesAdminPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')
  const [query, setQuery] = useState<string>('')

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (query) params.set('q', query)
      const res = await fetch(`/api/admin/invoices?${params.toString()}`)
      const data = await res.json()
      if (res.ok) setInvoices(data.invoices || [])
    } finally {
      setLoading(false)
    }
  }, [status, query])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Faturas</h1>
        <p className="text-gray-600 dark:text-gray-400">Relatório de transações de assinaturas</p>
      </div>

      <div className="flex gap-3 items-center">
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
          <option value="">Todos os status</option>
          <option value="COMPLETED">Pago</option>
          <option value="PENDING">Pendente</option>
          <option value="FAILED">Falhou</option>
          <option value="CANCELED">Cancelado</option>
        </select>
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por userId, provider id..." className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100" />
        <button onClick={fetchAll} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Aplicar</button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Usuário</th>
              <th className="px-4 py-2 text-left">Plano</th>
              <th className="px-4 py-2 text-left">Valor</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Pago em</th>
              <th className="px-4 py-2 text-left">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={7}>Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={7}>Nenhuma fatura encontrada</td></tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-2">{inv.id.slice(-8)}</td>
                  <td className="px-4 py-2">{inv.userId || '-'}</td>
                  <td className="px-4 py-2">{inv.subscription?.plan?.name || '-'}</td>
                  <td className="px-4 py-2">R$ {Number(inv.amount).toFixed(2)}</td>
                  <td className="px-4 py-2">{inv.status}</td>
                  <td className="px-4 py-2">{inv.paidAt ? new Date(inv.paidAt).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-4 py-2">{new Date(inv.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

