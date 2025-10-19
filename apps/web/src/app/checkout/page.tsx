"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SavedAddress {
  id: string
  name: string | null
  street: string
  number: string | null
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country?: string | null
  phone?: string | null
  isDefault?: boolean
}

type AddressFormState = {
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

const NEW_ADDRESS_OPTION = 'new'

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const [cart, setCart] = useState<any>(null)
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [shippingModalOpen, setShippingModalOpen] = useState(false)
  const [shippingModalLoading, setShippingModalLoading] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    billing: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
    shipping: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [queriedCep, setQueriedCep] = useState<{ billing?: string; shipping?: string }>({})
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string>(NEW_ADDRESS_OPTION)
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string>(NEW_ADDRESS_OPTION)

  const searchParams = useSearchParams()
  const [enrollCourseIds, setEnrollCourseIds] = useState<string[]>([])
  const hasProcessedEnroll = useRef(false)

  useEffect(() => {
    try {
      const ids = searchParams?.getAll('enrollCourseId') || []
      const single = searchParams?.get('enrollCourseId') || null
      if (ids && ids.length > 0) setEnrollCourseIds(ids)
      else if (single) setEnrollCourseIds([single])
    } catch {}
  }, [searchParams])

  // Quando vem de um fluxo de curso, garante item no carrinho
  useEffect(() => {
    if (hasProcessedEnroll.current) return
    if (!enrollCourseIds || enrollCourseIds.length === 0) return
    hasProcessedEnroll.current = true
    ;(async () => {
      try {
        for (const courseId of enrollCourseIds) {
          await fetch(`/api/courses/${courseId}/add-to-cart`, { method: 'POST' })
        }
        await fetchCart()
      } catch {}
    })()
  }, [enrollCourseIds])

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

  const addressToFormState = (address: SavedAddress): AddressFormState => ({
    street: address.street || '',
    number: address.number || '',
    complement: address.complement || '',
    neighborhood: address.neighborhood || '',
    city: address.city || '',
    state: address.state || '',
    zipCode: address.zipCode || '',
  })

  const formatAddressLabel = (address: SavedAddress) => {
    const summary = [
      [address.street, address.number].filter(Boolean).join(', '),
      [address.city, address.state].filter(Boolean).join(' / '),
    ]
      .filter((part) => part && part.trim().length > 0)
      .join(' • ')

    const cep = address.zipCode ? `CEP ${address.zipCode}` : ''
    const name = address.name?.trim() || 'Endereço'
    return [name, summary, cep].filter((part) => part && part.trim().length > 0).join(' | ')
  }

  const applySavedAddressToForm = (kind: 'billing' | 'shipping', address: SavedAddress) => {
    const values = addressToFormState(address)
    setForm((prev) => {
      const updated = kind === 'billing'
        ? { ...prev.billing, ...values }
        : { ...prev.shipping, ...values }
      return {
        ...prev,
        billing: kind === 'billing' ? updated : prev.billing,
        shipping: kind === 'shipping' ? updated : prev.shipping,
      }
    })
  }

  const handleBillingFieldChange = (field: keyof AddressFormState, value: string) => {
    if (selectedBillingAddressId !== NEW_ADDRESS_OPTION) {
      setSelectedBillingAddressId(NEW_ADDRESS_OPTION)
    }
    setForm((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        [field]: value,
      },
    }))
  }

  const handleShippingFieldChange = (field: keyof AddressFormState, value: string) => {
    if (selectedShippingAddressId !== NEW_ADDRESS_OPTION) {
      setSelectedShippingAddressId(NEW_ADDRESS_OPTION)
    }
    setForm((prev) => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        [field]: value,
      },
    }))
  }

  const handleBillingAddressSelect = (value: string) => {
    setSelectedBillingAddressId(value)
    if (value === NEW_ADDRESS_OPTION) return
    const address = savedAddresses.find((entry) => entry.id === value)
    if (address) {
      applySavedAddressToForm('billing', address)
      if (sameAsBilling) {
        applySavedAddressToForm('shipping', address)
        setSelectedShippingAddressId(value)
      }
    }
  }

  const handleShippingAddressSelect = (value: string) => {
    setSelectedShippingAddressId(value)
    if (value === NEW_ADDRESS_OPTION) return
    const address = savedAddresses.find((entry) => entry.id === value)
    if (address) {
      applySavedAddressToForm('shipping', address)
    }
  }

  const resolveCEP = useCallback(async (kind: 'billing' | 'shipping', cepRaw: string) => {
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
  }, [queriedCep])

  const fetchCart = async () => {
    const res = await fetch('/api/shop/cart', { cache: 'no-store' })
    const data = await res.json()
    setCart(data.cart)
    setTotals(data.totals)
    if (data.cart?.shipping?.serviceId) {
      setSelectedShippingId(data.cart.shipping.serviceId)
    }
  }

  useEffect(() => { fetchCart() }, [])
  useEffect(() => {
    if (cart?.shipping?.serviceId) {
      setSelectedShippingId(cart.shipping.serviceId)
    }
  }, [cart?.shipping?.serviceId])
  useEffect(() => {
    if (shippingModalOpen && cart?.shipping?.serviceId) {
      setSelectedShippingId(cart.shipping.serviceId)
    }
  }, [shippingModalOpen, cart?.shipping?.serviceId])

  // Prefill from user profile when logged in
  useEffect(() => {
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const res = await fetch('/api/user/profile', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const addressList: SavedAddress[] = Array.isArray(data.addresses)
          ? data.addresses.map((address: any) => ({
              id: address.id,
              name: address.name ?? null,
              street: address.street ?? '',
              number: address.number ?? null,
              complement: address.complement ?? null,
              neighborhood: address.neighborhood ?? '',
              city: address.city ?? '',
              state: address.state ?? '',
              zipCode: address.zipCode ?? '',
              country: address.country ?? null,
              phone: address.phone ?? null,
              isDefault: Boolean(address.isDefault),
            }))
          : []

        setSavedAddresses(addressList)

        setForm((prev) => ({
          ...prev,
          name: data.user?.name || prev.name || session?.user?.name || '',
          email: data.user?.email || prev.email || session?.user?.email || '',
          phone: data.user?.phone || prev.phone || '',
          document: data.user?.document || prev.document || '',
          billing: data.billingAddress
            ? {
                ...prev.billing,
                street: data.billingAddress.street ?? '',
                number: data.billingAddress.number ?? '',
                complement: data.billingAddress.complement ?? '',
                neighborhood: data.billingAddress.neighborhood ?? '',
                city: data.billingAddress.city ?? '',
                state: data.billingAddress.state ?? '',
                zipCode: data.billingAddress.zipCode ?? '',
              }
            : prev.billing,
          shipping: data.shippingAddress
            ? {
                ...prev.shipping,
                street: data.shippingAddress.street ?? '',
                number: data.shippingAddress.number ?? '',
                complement: data.shippingAddress.complement ?? '',
                neighborhood: data.shippingAddress.neighborhood ?? '',
                city: data.shippingAddress.city ?? '',
                state: data.shippingAddress.state ?? '',
                zipCode: data.shippingAddress.zipCode ?? '',
              }
            : prev.shipping,
        }))
        // If shipping exists and differs from billing, uncheck sameAsBilling
        const b = data.billingAddress, s = data.shippingAddress
        if (b && s) {
          const differs = ['street','number','neighborhood','city','state','zipCode'].some(k => b[k] !== s[k])
          setSameAsBilling(!differs)
        }

        if (data.billingAddressId && addressList.some((addr) => addr.id === data.billingAddressId)) {
          setSelectedBillingAddressId(data.billingAddressId)
        } else if (addressList.length > 0) {
          setSelectedBillingAddressId(addressList[0].id)
        } else {
          setSelectedBillingAddressId(NEW_ADDRESS_OPTION)
        }

        if (data.shippingAddressId && addressList.some((addr) => addr.id === data.shippingAddressId)) {
          setSelectedShippingAddressId(data.shippingAddressId)
        } else if (addressList.length === 0) {
          setSelectedShippingAddressId(NEW_ADDRESS_OPTION)
        }
      } catch {}
    })()
  }, [status, session?.user?.name, session?.user?.email])

  // Keep shipping in sync with billing when checkbox enabled
  useEffect(() => {
    if (!sameAsBilling) return
    setForm((prev) => ({ ...prev, shipping: { ...prev.shipping, ...prev.billing } }))
  }, [sameAsBilling, form.billing.street, form.billing.number, form.billing.neighborhood, form.billing.city, form.billing.state, form.billing.zipCode, form.billing.complement])

  useEffect(() => {
    if (sameAsBilling) {
      setSelectedShippingAddressId(selectedBillingAddressId)
    }
  }, [sameAsBilling, selectedBillingAddressId])

  // CEP autocompletar
  useEffect(() => {
    const t = setTimeout(() => resolveCEP('billing', form.billing.zipCode), 500)
    return () => clearTimeout(t)
  }, [form.billing.zipCode, resolveCEP])
  useEffect(() => {
    if (sameAsBilling) return
    const t = setTimeout(() => resolveCEP('shipping', form.shipping.zipCode), 500)
    return () => clearTimeout(t)
  }, [form.shipping.zipCode, sameAsBilling, resolveCEP])

  const updateShippingOption = async () => {
    if (!cart?.shipping?.cep || !selectedShippingId) return
    setShippingModalLoading(true)
    try {
      const response = await fetch('/api/shop/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: cart.shipping.cep, serviceId: selectedShippingId }),
      })
      if (!response.ok) {
        throw new Error('Falha ao atualizar frete')
      }
      const data = await response.json()
      setCart(data.cart)
      setTotals(data.totals)
      setShippingModalOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar modalidade de frete:', error)
    } finally {
      setShippingModalLoading(false)
    }
  }

  const submit = async () => {
    setLoading(true)
    // If logged in, update profile before creating order
    if (status === 'authenticated') {
      try {
        const profilePayload: any = {
          name: form.name,
          phone: form.phone,
          document: form.document,
        }

        if (selectedBillingAddressId === NEW_ADDRESS_OPTION) {
          profilePayload.billingAddress = form.billing
        }

        if (sameAsBilling) {
          if (selectedBillingAddressId === NEW_ADDRESS_OPTION) {
            profilePayload.shippingAddress = form.billing
          }
        } else if (selectedShippingAddressId === NEW_ADDRESS_OPTION) {
          profilePayload.shippingAddress = form.shipping
        }

        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
        })
      } catch {}
    }

    const billingAddressId = selectedBillingAddressId !== NEW_ADDRESS_OPTION ? selectedBillingAddressId : null
    const shippingAddressId = sameAsBilling
      ? (selectedBillingAddressId !== NEW_ADDRESS_OPTION ? selectedBillingAddressId : null)
      : (selectedShippingAddressId !== NEW_ADDRESS_OPTION ? selectedShippingAddressId : null)

    const orderPayload: any = {
      customer: {
        name: form.name,
        email: (session?.user?.email as string) || form.email,
        phone: form.phone,
        document: form.document,
        userId: session?.user?.id || null,
      },
    }

    if (billingAddressId) {
      orderPayload.billingAddressId = billingAddressId
    } else {
      orderPayload.billingAddress = form.billing
    }

    if (shippingAddressId) {
      orderPayload.shippingAddressId = shippingAddressId
    } else {
      orderPayload.shippingAddress = sameAsBilling ? form.billing : form.shipping
    }

    if (enrollCourseIds.length > 0) {
      orderPayload.enrollCourseIds = enrollCourseIds
    }

    const res = await fetch('/api/shop/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    })
    setLoading(false)
    if (!res.ok) return alert('Erro ao criar pedido')
    const data = await res.json()
    window.location.href = data.paymentUrl
  }

  if (!cart || !totals) return <div className="container mx-auto py-8">Carregando...</div>

  return (
    <>
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
            {savedAddresses.length > 0 && (
              <div className="mb-3 space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Selecionar endereço salvo
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={selectedBillingAddressId}
                  onChange={(event) => handleBillingAddressSelect(event.target.value)}
                >
                  <option value={NEW_ADDRESS_OPTION}>Cadastrar novo endereço</option>
                  {savedAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {formatAddressLabel(address)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="CEP" className="border rounded px-3 py-2" value={form.billing.zipCode} onChange={(e) => handleBillingFieldChange('zipCode', e.target.value)} />
              <input placeholder="Rua" className="border rounded px-3 py-2 md:col-span-2" value={form.billing.street} onChange={(e) => handleBillingFieldChange('street', e.target.value)} />
              <input placeholder="Número" className="border rounded px-3 py-2" value={form.billing.number} onChange={(e) => handleBillingFieldChange('number', e.target.value)} />
              <input placeholder="Complemento" className="border rounded px-3 py-2 md:col-span-2" value={form.billing.complement} onChange={(e) => handleBillingFieldChange('complement', e.target.value)} />
              <input placeholder="Bairro" className="border rounded px-3 py-2" value={form.billing.neighborhood} onChange={(e) => handleBillingFieldChange('neighborhood', e.target.value)} />
              <input placeholder="Cidade" className="border rounded px-3 py-2" value={form.billing.city} onChange={(e) => handleBillingFieldChange('city', e.target.value)} />
              <input placeholder="Estado" className="border rounded px-3 py-2" value={form.billing.state} onChange={(e) => handleBillingFieldChange('state', e.target.value)} />
            </div>
          </section>
          <section className="border rounded p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold mb-3">Endereço de entrega</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => {
                    setSameAsBilling(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedShippingAddressId(NEW_ADDRESS_OPTION)
                    }
                  }}
                />
                Usar endereço de cobrança
              </label>
            </div>
            {savedAddresses.length > 0 && (
              <div className="mb-3 space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Selecionar endereço salvo
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={selectedShippingAddressId}
                  onChange={(event) => handleShippingAddressSelect(event.target.value)}
                  disabled={sameAsBilling}
                >
                  <option value={NEW_ADDRESS_OPTION}>Cadastrar novo endereço</option>
                  {savedAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {formatAddressLabel(address)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${sameAsBilling ? 'opacity-60 pointer-events-none select-none' : ''}`}>
              <input placeholder="CEP" className="border rounded px-3 py-2" value={form.shipping.zipCode} onChange={(e) => handleShippingFieldChange('zipCode', e.target.value)} />
              <input placeholder="Rua" className="border rounded px-3 py-2 md:col-span-2" value={form.shipping.street} onChange={(e) => handleShippingFieldChange('street', e.target.value)} />
              <input placeholder="Número" className="border rounded px-3 py-2" value={form.shipping.number} onChange={(e) => handleShippingFieldChange('number', e.target.value)} />
              <input placeholder="Complemento" className="border rounded px-3 py-2 md:col-span-2" value={form.shipping.complement} onChange={(e) => handleShippingFieldChange('complement', e.target.value)} />
              <input placeholder="Bairro" className="border rounded px-3 py-2" value={form.shipping.neighborhood} onChange={(e) => handleShippingFieldChange('neighborhood', e.target.value)} />
              <input placeholder="Cidade" className="border rounded px-3 py-2" value={form.shipping.city} onChange={(e) => handleShippingFieldChange('city', e.target.value)} />
              <input placeholder="Estado" className="border rounded px-3 py-2" value={form.shipping.state} onChange={(e) => handleShippingFieldChange('state', e.target.value)} />
            </div>
          </section>
        </div>
        <div className="border rounded p-4 h-fit">
          <h2 className="font-semibold mb-3">Resumo</h2>
          <div className="flex justify-between"><span>Subtotal</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-red-400 font-medium">Desconto</span><span className="text-red-400 font-medium">- {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.discount)}</span></div>
          <div className="mt-3 rounded border border-dashed border-muted-foreground/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-medium block">Frete</span>
                {cart?.shipping ? (
                  <div className="text-xs text-muted-foreground space-y-1 mt-1">
                    <div>{cart.shipping.service}{cart.shipping.carrier ? ` • ${cart.shipping.carrier}` : ''}</div>
                    {typeof cart.shipping.deliveryDays === 'number' && (
                      <div>
                        Prazo estimado: {cart.shipping.deliveryDays}{' '}
                        {cart.shipping.deliveryDays === 1 ? 'dia útil' : 'dias úteis'}
                      </div>
                    )}
                    <div>Destino: CEP {cart.shipping.cep}</div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground block mt-1">
                    Informe o CEP para calcular o frete.
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.shipping)}
                </div>
                {cart?.shipping?.options?.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShippingModalOpen(true)}
                    className="mt-1 text-xs text-hekate-gold hover:underline transition"
                  >
                    Alterar
                  </button>
                )}
              </div>
            </div>
          </div>
          {cart.couponCode && (
            <div className="flex justify-between mt-2 text-sm items-center">
              <span className="text-hekate-pearl/80">Cupom</span>
              <span className="px-2 py-0.5 rounded border border-hekate-gold text-hekate-gold bg-hekate-gold/10 uppercase tracking-wide">
                {String(cart.couponCode)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold mt-2"><span>Total</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span></div>
          <button disabled={loading || status !== 'authenticated'} onClick={submit} className="mt-4 w-full btn-mystic-enhanced disabled:opacity-60">{loading ? 'Criando pedido...' : 'Pagar com Mercado Pago'}</button>
        </div>
      </div>
    </div>
    <Dialog open={shippingModalOpen} onOpenChange={setShippingModalOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Escolher modalidade de frete</DialogTitle>
          <DialogDescription>
            Selecione a opção de envio que deseja utilizar para este pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {cart?.shipping?.options?.length ? (
            cart.shipping.options.map((option: any) => {
              const isSelected = selectedShippingId === option.id
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded border p-3 transition ${isSelected ? 'border-hekate-gold bg-hekate-gold/5' : 'border-muted-foreground/30 hover:border-hekate-gold/60'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shipping-option"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedShippingId(option.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{option.service}{option.carrier ? ` • ${option.carrier}` : ''}</div>
                      {typeof option.deliveryDays === 'number' && (
                        <div className="text-xs text-muted-foreground">
                          Prazo estimado: {option.deliveryDays}{' '}
                          {option.deliveryDays === 1 ? 'dia útil' : 'dias úteis'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(option.price)}
                  </div>
                </label>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma opção de frete disponível. Verifique os itens do carrinho ou informe um CEP válido.
            </p>
          )}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShippingModalOpen(false)}
            className="px-4 py-2 border rounded"
            disabled={shippingModalLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={updateShippingOption}
            className="px-4 py-2 btn-mystic-enhanced disabled:opacity-60"
            disabled={shippingModalLoading || !selectedShippingId || !cart?.shipping?.options?.length}
          >
            {shippingModalLoading ? 'Atualizando...' : 'Confirmar frete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
