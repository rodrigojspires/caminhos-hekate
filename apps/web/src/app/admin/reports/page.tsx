"use client"
import { useEffect, useState } from "react"

export default function AdminReportsPage() {
  const [sales, setSales] = useState<any>(null)
  const [subs, setSubs] = useState<any>(null)
  const [courses, setCourses] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [s1, s2, s3] = await Promise.all([
          fetch("/api/admin/orders/reports").then(r => r.json()),
          fetch("/api/admin/reports/subscriptions").then(r => r.json()),
          fetch("/api/admin/reports/courses").then(r => r.json()),
        ])
        setSales(s1)
        setSubs(s2)
        setCourses(s3)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="p-6">Carregando relatórios…</div>

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <section className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Vendas</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(sales, null, 2)}</pre>
      </section>

      <section className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Assinaturas</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(subs, null, 2)}</pre>
      </section>

      <section className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Cursos</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(courses, null, 2)}</pre>
      </section>
    </div>
  )
}
