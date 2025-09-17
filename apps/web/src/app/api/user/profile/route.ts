import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET() {
  const session = await getServerSession(authOptions as any)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, name: true, phone: true, document: true,
      addresses: { orderBy: { updatedAt: 'desc' }, take: 10 }
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const billing = user.addresses.find(a => a.name?.toLowerCase().includes('cobran')) || user.addresses.find(a => a.isDefault) || user.addresses[0] || null
  const shipping = user.addresses.find(a => a.name?.toLowerCase().includes('entrega')) || user.addresses.find(a => a.isDefault) || user.addresses[0] || null
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      document: user.document,
    },
    billingAddress: billing ? {
      street: billing.street,
      number: billing.number,
      complement: billing.complement,
      neighborhood: billing.neighborhood,
      city: billing.city,
      state: billing.state,
      zipCode: billing.zipCode,
    } : null,
    shippingAddress: shipping ? {
      street: shipping.street,
      number: shipping.number,
      complement: shipping.complement,
      neighborhood: shipping.neighborhood,
      city: shipping.city,
      state: shipping.state,
      zipCode: shipping.zipCode,
    } : null,
  })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions as any)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { name, phone, document, billingAddress, shippingAddress } = body as any

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.user.id }, data: { name, phone, document } })
    if (billingAddress) {
      const ex = await tx.address.findFirst({ where: { userId: session.user.id, name: { contains: 'Cobran', mode: 'insensitive' } } })
      if (ex) {
        await tx.address.update({ where: { id: ex.id }, data: { ...billingAddress } })
      } else {
        await tx.address.create({ data: { userId: session.user.id, name: 'Cobrança', country: 'Brasil', ...billingAddress, isDefault: true } })
      }
    }
    if (shippingAddress) {
      const ex = await tx.address.findFirst({ where: { userId: session.user.id, name: { contains: 'Entrega', mode: 'insensitive' } } })
      if (ex) {
        await tx.address.update({ where: { id: ex.id }, data: { ...shippingAddress } })
      } else {
        await tx.address.create({ data: { userId: session.user.id, name: 'Entrega', country: 'Brasil', ...shippingAddress } })
      }
    }
  })

  return NextResponse.json({ success: true })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

