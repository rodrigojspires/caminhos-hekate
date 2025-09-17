"use client"
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

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
            {(cart.itemsDetailed || cart.items).map((i: any) => (
              <div key={i.variantId} className="border rounded p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded overflow-hidden bg-muted">
                    {i.product?.images?.[0] && (
                      <Image src={i.product.images[0]} alt={i.product?.name || 'Produto'} fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{i.product?.name || 'Produto'}</div>
                    <div className="text-sm text-muted-foreground">{i.variantName || i.variantId.slice(0, 8)}</div>
                    <div className="text-sm text-muted-foreground">Quantidade</div>
                    <input type="number" min={1} value={i.quantity} onChange={(e) => updateQty(i.variantId, Number(e.target.value))} className="border rounded px-2 py-1 w-24" />
                    <div className="mt-1 text-sm">Preço: {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.price ?? 0)}</div>
                    <div className="mt-1 text-sm font-medium">Subtotal: {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((i.price ?? 0) * i.quantity)}</div>
                  </div>
                </div>
                <Button variant="destructive" onClick={() => removeItem(i.variantId)}>Remover</Button>
              </div>
            ))}
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
