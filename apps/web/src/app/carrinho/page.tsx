"use client"
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { broadcastCartUpdate } from '@/lib/shop/client/cartEvents'

export default function CartPage() {
  const [cart, setCart] = useState<any>(null)
  const [totals, setTotals] = useState<any>(null)
  const [coupon, setCoupon] = useState<string>('')
  const [cep, setCep] = useState<string>('')
  const [clearing, setClearing] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [requiresShipping, setRequiresShipping] = useState(false)

  const hydrateCart = useCallback((data: { cart: any; totals: any }) => {
    const cartData = data.cart
    const totalsData = data.totals
    setCart(cartData)
    setTotals(totalsData)
    setCoupon(cartData?.couponCode || '')
    setCep(cartData?.shipping?.cep || '')
    setSelectedShippingId(cartData?.shipping?.serviceId || null)

    const detailedItems = Array.isArray(cartData?.itemsDetailed)
      ? cartData.itemsDetailed
      : cartData?.items || []
    const hasPhysical = detailedItems.some((item: any) => item?.product?.type === 'PHYSICAL')
    setRequiresShipping(hasPhysical)

    broadcastCartUpdate(cartData)
  }, [])

  const fetchCart = useCallback(async () => {
    const res = await fetch('/api/shop/cart', { cache: 'no-store' })
    const data = await res.json()
    hydrateCart(data)
  }, [hydrateCart])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const removeItem = async (variantId: string) => {
    await fetch('/api/shop/cart', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId }) })
    fetchCart()
  }

  const updateQty = async (variantId: string, quantity: number) => {
    const items = cart.items.map((i: any) => (i.variantId === variantId ? { ...i, quantity } : i))
    await fetch('/api/shop/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
    fetchCart()
  }

  const applyCoupon = async () => {
    if (!coupon) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/shop/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(data?.error || 'Não foi possível aplicar o cupom.')
        return
      }
      if (!data) {
        window.alert('Resposta inválida do servidor ao aplicar o cupom.')
        return
      }
      hydrateCart(data)
    } finally {
      setCouponLoading(false)
    }
  }

  const requestShipping = async (serviceId: string | null): Promise<boolean> => {
    if (!cep) {
      window.alert('Informe o CEP para calcular o frete.')
      return false
    }
    setShippingLoading(true)
    try {
      const res = await fetch('/api/shop/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep, serviceId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(data?.error || 'Não foi possível calcular o frete.')
        return false
      }
      if (!data) {
        window.alert('Resposta inválida do servidor ao calcular o frete.')
        return false
      }
      hydrateCart(data)
      return true
    } finally {
      setShippingLoading(false)
    }
  }

  const calcShipping = async () => {
    await requestShipping(selectedShippingId)
  }

  const selectShippingOption = async (serviceId: string) => {
    if (serviceId === selectedShippingId) return
    const previous = selectedShippingId
    setSelectedShippingId(serviceId)
    const success = await requestShipping(serviceId)
    if (!success) {
      setSelectedShippingId(previous)
    }
  }

  const formatCurrency = (value: number) =>
    Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const clearCart = async () => {
    if (!cart?.items?.length || clearing) return
    const confirmed = window.confirm('Tem certeza que deseja esvaziar o carrinho?')
    if (!confirmed) return
    setClearing(true)
    await fetch('/api/shop/cart', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clear: true }) })
    setClearing(false)
    fetchCart()
  }

  if (!cart || !totals) return <div className="container mx-auto py-8">Carregando...</div>

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Carrinho</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/loja" className="text-blue-600 hover:underline flex items-center gap-1">
            <span aria-hidden>←</span>
            Continuar comprando
          </Link>
          {cart.items.length > 0 && (
            <button
              onClick={clearCart}
              disabled={clearing}
              className="text-red-500 hover:underline disabled:opacity-60"
            >
              Esvaziar carrinho
            </button>
          )}
        </div>
      </div>
      {cart.items.length === 0 ? (
        <div className="border rounded p-6 text-center space-y-2">
          <p>Seu carrinho está vazio.</p>
          <Link href="/loja" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
            Voltar para a loja
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {(cart.itemsDetailed || cart.items).map((i: any) => {
              const price = Number(i.price || 0)
              const compare = i.comparePrice != null ? Number(i.comparePrice) : null
              const hasDiscount = compare != null && compare > price
              const discountPct = hasDiscount ? Math.round(((compare - price) / compare) * 100) : 0
              const dec = () => updateQty(i.variantId, Math.max(1, Number(i.quantity) - 1))
              const inc = () => updateQty(i.variantId, Math.max(1, Math.min((i.stock ?? 9999), Number(i.quantity) + 1)))

              return (
                <div key={i.variantId} className="border rounded p-4 flex items-center justify-between gap-4">
                  {/* Left: checkbox + thumbnail + info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {i.product?.images?.[0] ? (
                      i.product?.slug ? (
                        <Link href={`/loja/${i.product.slug}`} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0">
                          <div className="relative h-20 w-20 rounded overflow-hidden bg-muted">
                            <Image src={i.product.images[0]} alt={i.product?.name || 'Produto'} fill sizes="80px" className="object-cover" />
                          </div>
                        </Link>
                      ) : (
                        <div className="relative h-20 w-20 rounded overflow-hidden bg-muted flex-shrink-0">
                          <Image src={i.product.images[0]} alt={i.product?.name || 'Produto'} fill sizes="80px" className="object-cover" />
                        </div>
                      )
                    ) : (
                      <div className="relative h-20 w-20 rounded overflow-hidden bg-muted flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-lg">
                        {i.product?.slug ? (
                          <Link href={`/loja/${i.product.slug}`} className="hover:underline">
                            {i.product?.name || 'Produto'}
                          </Link>
                        ) : (
                          i.product?.name || 'Produto'
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{i.variantName || i.variantId.slice(0, 8)}</div>
                      <button className="text-sm text-blue-600 hover:underline" onClick={() => removeItem(i.variantId)}>Excluir</button>
                    </div>
                  </div>

                  {/* Middle: quantity stepper + availability */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center border rounded-lg px-3 py-1.5 gap-6">
                      <button className="text-xl" onClick={dec} aria-label="Diminuir">−</button>
                      <div className="w-6 text-center select-none">{i.quantity}</div>
                      <button className="text-xl text-primary" onClick={inc} aria-label="Aumentar">+</button>
                    </div>
                    {typeof i.stock === 'number' && (
                      <div className="text-sm text-muted-foreground">+{i.stock} disponíveis</div>
                    )}
                    <div className="text-sm text-muted-foreground">Subtotal: {formatCurrency(price * Number(i.quantity || 1))}</div>
                  </div>

                  {/* Right: price */}
                  <div className="text-right w-40">
                    {hasDiscount && (
                      <div className="text-sm text-green-600">-{discountPct}% <span className="text-muted-foreground line-through">{formatCurrency(compare!)}</span></div>
                    )}
                    <div className="text-2xl font-semibold">{formatCurrency(price)}</div>
                  </div>
                </div>
              )
            })}
            <div className="border rounded p-4 flex gap-2">
              <input placeholder="Cupom" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="border rounded px-3 py-2 flex-1" />
              <Button onClick={applyCoupon} disabled={couponLoading} className="min-w-[110px] justify-center">
                {couponLoading ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aplicando...
                  </span>
                ) : (
                  'Aplicar'
                )}
              </Button>
            </div>
            {cart.couponCode && (
              <div className="text-sm text-hekate-gold flex items-center gap-2 border border-hekate-gold/50 rounded px-3 py-2 bg-hekate-gold/5 uppercase tracking-wide">
                Cupom aplicado: <span className="font-semibold">{cart.couponCode}</span>
              </div>
            )}
            <div className="border rounded p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  placeholder="CEP"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="border rounded px-3 py-2 flex-1"
                  maxLength={9}
                />
                <Button onClick={calcShipping} disabled={shippingLoading} className="min-w-[140px] justify-center">
                  {shippingLoading ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculando...
                    </span>
                  ) : (
                    'Calcular frete'
                  )}
                </Button>
              </div>

              {requiresShipping && cart.shipping?.options?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selecione a modalidade de entrega:</p>
                  <div className="space-y-2">
                    {cart.shipping.options.map((option: any) => {
                      const isSelected = selectedShippingId === option.id
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between rounded border px-3 py-2 text-sm transition ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-muted'
                          } ${shippingLoading ? 'opacity-70' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping-option"
                              value={option.id}
                              checked={isSelected}
                              onChange={() => selectShippingOption(option.id)}
                              disabled={shippingLoading}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium text-sm">{option.service}</div>
                              {option.deliveryDays ? (
                                <div className="text-xs text-muted-foreground">
                                  Prazo estimado: {option.deliveryDays} dia(s)
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(Number(option.price) || 0)}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {requiresShipping && (!cart.shipping?.options || cart.shipping.options.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Informe o CEP para visualizar as opções de entrega disponíveis.
                </p>
              )}

              {cart.shipping?.cep && (
                <div className="text-sm border rounded px-3 py-2 bg-muted/50">
                  <div>
                    CEP salvo: <span className="font-semibold">{cart.shipping.cep}</span>
                  </div>
                  {cart.shipping.service && (
                    <div className="text-muted-foreground">
                      Modalidade selecionada: {cart.shipping.service} · {formatCurrency(Number(cart.shipping.price) || 0)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="border rounded p-4 h-fit space-y-2">
            <h2 className="font-semibold mb-3">Resumo</h2>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-red-400 font-medium">
              <span>Desconto</span>
              <span>- {formatCurrency(totals.discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frete</span>
              <span>{formatCurrency(totals.shipping)}</span>
            </div>
            {cart.shipping?.service && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Modalidade</span>
                <span>{cart.shipping.service}</span>
              </div>
            )}
            {cart.couponCode && (
              <div className="flex justify-between mt-2 text-sm items-center">
                <span className="text-hekate-pearl/80">Cupom</span>
                <span className="px-2 py-0.5 rounded border border-hekate-gold text-hekate-gold bg-hekate-gold/10 uppercase tracking-wide">
                  {String(cart.couponCode)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
            <Link href="/checkout" className="mt-2 block">
              <Button
                className="w-full"
                disabled={requiresShipping && (!selectedShippingId || shippingLoading)}
              >
                Ir para o checkout
              </Button>
            </Link>
            {requiresShipping && !selectedShippingId && (
              <p className="mt-1 text-xs text-red-500">
                Informe o CEP e selecione uma modalidade de entrega antes de prosseguir.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
