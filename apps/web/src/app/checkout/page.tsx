"use client"
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const [cart, setCart] = useState<any>(null)
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    billing: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
    shipping: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)

  const fetchCart = async () => {
    const res = await fetch('/api/shop/cart', { cache: 'no-store' })
    const data = await res.json()
    setCart(data.cart)
    setTotals(data.totals)
  }

  useEffect(() => { fetchCart() }, [])

  // Prefill from user profile when logged in
  useEffect(() => {
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const res = await fetch('/api/user/profile', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setForm((prev) => ({
          ...prev,
          name: data.user?.name || prev.name || session?.user?.name || '',
          email: data.user?.email || prev.email || session?.user?.email || '',
          phone: data.user?.phone || prev.phone || '',
          document: data.user?.document || prev.document || '',
          billing: data.billingAddress ? { ...prev.billing, ...data.billingAddress } : prev.billing,
          shipping: data.shippingAddress ? { ...prev.shipping, ...data.shippingAddress } : prev.shipping,
        }))
        // If shipping exists and differs from billing, uncheck sameAsBilling
        const b = data.billingAddress, s = data.shippingAddress
        if (b && s) {
          const differs = ['street','number','neighborhood','city','state','zipCode'].some(k => b[k] !== s[k])
          setSameAsBilling(!differs)
        }
      } catch {}
    })()
  }, [status])

  // Keep shipping in sync with billing when checkbox enabled
  useEffect(() => {
    if (!sameAsBilling) return
    setForm((prev) => ({ ...prev, shipping: { ...prev.shipping, ...prev.billing } }))
  }, [sameAsBilling, form.billing.street, form.billing.number, form.billing.neighborhood, form.billing.city, form.billing.state, form.billing.zipCode])

  const submit = async () => {
    setLoading(true)
    // If logged in, update profile before creating order
    if (status === 'authenticated') {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            document: form.document,
            billingAddress: form.billing,
            shippingAddress: form.shipping,
          }),
        })
      } catch {}
    }

    const res = await fetch('/api/shop/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: form.name, email: form.email, phone: form.phone, document: form.document, userId: session?.user?.id || null },
        billingAddress: form.billing,
        shippingAddress: sameAsBilling ? form.billing : form.shipping,
      }),
    })
    setLoading(false)
    if (!res.ok) return alert('Erro ao criar pedido')
    const data = await res.json()
    window.location.href = data.paymentUrl
  }

  if (!cart || !totals) return <div className="container mx-auto py-8">Carregando...</div>

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      {status !== 'authenticated' && (
        <div className="mb-6 p-4 border rounded bg-muted/30">
          <p className="mb-2">Para concluir a compra, entre na sua conta ou cadastre-se.</p>
          <div className="flex gap-2">
            <Link className="px-4 py-2 border rounded" href={`/auth/login?next=/checkout`}>Entrar</Link>
            <Link className="px-4 py-2 border rounded" href={`/auth/register?next=/checkout`}>Cadastrar</Link>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-3">Dados do cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Nome completo" className="border rounded px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="E-mail" className="border rounded px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Telefone" className="border rounded px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input placeholder="CPF/CNPJ" className="border rounded px-3 py-2" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            </div>
          </section>
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-3">Endereço de cobrança</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="CEP" className="border rounded px-3 py-2" value={form.billing.zipCode} onChange={(e) => setForm({ ...form, billing: { ...form.billing, zipCode: e.target.value } })} />
              <input placeholder="Rua" className="border rounded px-3 py-2 md:col-span-2" value={form.billing.street} onChange={(e) => setForm({ ...form, billing: { ...form.billing, street: e.target.value } })} />
              <input placeholder="Número" className="border rounded px-3 py-2" value={form.billing.number} onChange={(e) => setForm({ ...form, billing: { ...form.billing, number: e.target.value } })} />
              <input placeholder="Bairro" className="border rounded px-3 py-2" value={form.billing.neighborhood} onChange={(e) => setForm({ ...form, billing: { ...form.billing, neighborhood: e.target.value } })} />
              <input placeholder="Cidade" className="border rounded px-3 py-2" value={form.billing.city} onChange={(e) => setForm({ ...form, billing: { ...form.billing, city: e.target.value } })} />
              <input placeholder="Estado" className="border rounded px-3 py-2" value={form.billing.state} onChange={(e) => setForm({ ...form, billing: { ...form.billing, state: e.target.value } })} />
            </div>
          </section>
          <section className="border rounded p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold mb-3">Endereço de entrega</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} />
                Usar endereço de cobrança
              </label>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${sameAsBilling ? 'opacity-60 pointer-events-none select-none' : ''}`}>
              <input placeholder="CEP" className="border rounded px-3 py-2" value={form.shipping.zipCode} onChange={(e) => setForm({ ...form, shipping: { ...form.shipping, zipCode: e.target.value } })} />
              <input placeholder="Rua" className="border rounded px-3 py-2 md:col-span-2" value={form.shipping.street} onChange={(e) => setForm({ ...form, shipping: { ...form.shipping, street: e.target.value } })} />
              <input placeholder="Número" className="border rounded px-3 py-2" value={form.shipping.number} onChange={(e) => setForm({ ...form, shipping: { ...form.shipping, number: e.target.value } })} />
              <input placeholder="Bairro" className="border rounded px-3 py-2" value={form.shipping.neighborhood} onChange={(e) => setForm({ ...form, shipping: { ...form.shipping, neighborhood: e.target.value } })} />
              <input placeholder="Cidade" className="border rounded px-3 py-2" value={form.shipping.city} onChange={(e) => setForm({ ...form, shipping: { ...form.shipping, city: e.target.value } })} />
              <input placeholder="Estado" className="border rounded px-3 py-2" value={form.shipping.state} onChange={(e) => setForm({ ...form, shipping: { ...form.shipping, state: e.target.value } })} />
            </div>
          </section>
        </div>
        <div className="border rounded p-4 h-fit">
          <h2 className="font-semibold mb-3">Resumo</h2>
          <div className="flex justify-between"><span>Subtotal</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>- {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.discount)}</span></div>
          <div className="flex justify-between"><span>Frete</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.shipping)}</span></div>
          <div className="flex justify-between font-bold mt-2"><span>Total</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span></div>
          <button disabled={loading || status !== 'authenticated'} onClick={submit} className="mt-4 w-full bg-primary text-white rounded px-4 py-2 disabled:opacity-60">{loading ? 'Criando pedido...' : 'Pagar com Mercado Pago'}</button>
        </div>
      </div>
    </div>
  )
}
