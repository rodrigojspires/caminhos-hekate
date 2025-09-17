"use client"
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CartPage() {
  const [cart, setCart] = useState<any>(null)
  const [totals, setTotals] = useState<any>(null)
  const [coupon, setCoupon] = useState<string>('')
  const [cep, setCep] = useState<string>('')

  const fetchCart = async () => {
    const res = await fetch('/api/shop/cart', { cache: 'no-store' })
    const data = await res.json()
    setCart(data.cart)
    setTotals(data.totals)
  }

  useEffect(() => {
    fetchCart()
  }, [])

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
    const res = await fetch('/api/shop/coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: coupon }) })
    if (res.ok) fetchCart()
  }

  const calcShipping = async () => {
    const res = await fetch('/api/shop/shipping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cep }) })
    if (res.ok) fetchCart()
  }

  if (!cart || !totals) return <div className="container mx-auto py-8">Carregando...</div>

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Carrinho</h1>
      {cart.items.length === 0 ? (
        <p>Seu carrinho está vazio.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {(cart.itemsDetailed || cart.items).map((i: any) => {
              const price = Number(i.price || 0)
              const compare = i.comparePrice != null ? Number(i.comparePrice) : null
              const hasDiscount = compare != null && compare > price
              const discountPct = hasDiscount ? Math.round(((compare - price) / compare) * 100) : 0
              const formatBRL = (v: number) => Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
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
                    <div className="text-sm text-muted-foreground">Subtotal: {formatBRL(price * Number(i.quantity || 1))}</div>
                  </div>

                  {/* Right: price */}
                  <div className="text-right w-40">
                    {hasDiscount && (
                      <div className="text-sm text-green-600">-{discountPct}% <span className="text-muted-foreground line-through">{formatBRL(compare!)}</span></div>
                    )}
                    <div className="text-2xl font-semibold">{formatBRL(price)}</div>
                  </div>
                </div>
              )
            })}
            <div className="border rounded p-4 flex gap-2">
              <input placeholder="Cupom" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="border rounded px-3 py-2 flex-1" />
              <Button onClick={applyCoupon}>Aplicar</Button>
            </div>
            <div className="border rounded p-4 flex gap-2">
              <input placeholder="CEP" value={cep} onChange={(e) => setCep(e.target.value)} className="border rounded px-3 py-2 flex-1" />
              <Button onClick={calcShipping}>Calcular frete</Button>
            </div>
          </div>
          <div className="border rounded p-4 h-fit">
            <h2 className="font-semibold mb-3">Resumo</h2>
            <div className="flex justify-between"><span>Subtotal</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Desconto</span><span>- {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.discount)}</span></div>
            <div className="flex justify-between"><span>Frete</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.shipping)}</span></div>
            <div className="flex justify-between font-bold mt-2"><span>Total</span><span>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span></div>
            <a href="/checkout" className="mt-4 block">
              <Button className="w-full">Ir para o checkout</Button>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
