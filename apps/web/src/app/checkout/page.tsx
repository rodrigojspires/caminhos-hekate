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
  const [queriedCep, setQueriedCep] = useState<{ billing?: string; shipping?: string }>({})

  // Helpers: masks
  function formatPhoneBR(v: string) {
    // keep numbers only
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
    }
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
  }
  function formatDocumentBR(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 11) {
      // CPF 000.000.000-00
      return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    // CNPJ 00.000.000/0000-00
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  async function resolveCEP(kind: 'billing' | 'shipping', cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      if ((kind === 'billing' && queriedCep.billing === cep) || (kind === 'shipping' && queriedCep.shipping === cep)) return
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data?.erro) return
      const patch = {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        zipCode: cep,
      }
      setForm(prev => ({ ...prev, [kind]: { ...prev[kind], ...patch } }))
      setQueriedCep(q => ({ ...q, [kind]: cep }))
    } catch {}
  }

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

  // CEP autocompletar
  useEffect(() => {
    const t = setTimeout(() => resolveCEP('billing', form.billing.zipCode), 500)
    return () => clearTimeout(t)
  }, [form.billing.zipCode])
  useEffect(() => {
    if (sameAsBilling) return
    const t = setTimeout(() => resolveCEP('shipping', form.shipping.zipCode), 500)
    return () => clearTimeout(t)
  }, [form.shipping.zipCode, sameAsBilling])

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
        customer: { name: form.name, email: (session?.user?.email as string) || form.email, phone: form.phone, document: form.document, userId: session?.user?.id || null },
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
              {status !== 'authenticated' && (
                <input placeholder="E-mail" className="border rounded px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              )}
              <input placeholder="Telefone" className="border rounded px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })} />
              <input placeholder="CPF/CNPJ" className="border rounded px-3 py-2" value={form.document} onChange={(e) => setForm({ ...form, document: formatDocumentBR(e.target.value) })} />
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
          {cart.couponCode && (
            <div className="flex justify-between mt-2 text-sm"><span>Cupom</span><span className="font-medium">{cart.couponCode}</span></div>
          )}
          <div className="flex justify-between font-bold mt-2"><span>Total</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span></div>
          <button disabled={loading || status !== 'authenticated'} onClick={submit} className="mt-4 w-full btn-mystic-enhanced disabled:opacity-60">{loading ? 'Criando pedido...' : 'Pagar com Mercado Pago'}</button>
        </div>
      </div>
    </div>
  )
}
