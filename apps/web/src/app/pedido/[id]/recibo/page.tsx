async function fetchOrder(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shop/orders/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const data = await fetchOrder(params.id)
  if (!data) return <div className="container mx-auto py-8">Pedido não encontrado.</div>
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Recibo do Pedido</h1>
      <div className="text-sm text-muted-foreground mb-6">Número: {data.orderNumber}</div>
      <div className="border rounded p-4 mb-4">
        <div className="flex justify-between"><span>Status</span><span className="font-medium">{data.status}</span></div>
        <div className="flex justify-between"><span>Total</span><span className="font-medium">{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}</span></div>
      </div>
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Itens</h2>
        <div className="space-y-2">
          {data.items.map((it: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>{it.name}</span>
              <span>
                {it.quantity} × {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.price)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

