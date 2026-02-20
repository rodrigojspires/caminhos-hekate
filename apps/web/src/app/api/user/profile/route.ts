import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

type SessionWithId = Session & { user: NonNullable<Session['user']> & { id: string } }

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      document: true,
      dateOfBirth: true,
      addresses: {
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          phone: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const billing =
    user.addresses.find((address) => address.name?.toLowerCase().includes('cobran')) ??
    user.addresses.find((address) => address.isDefault) ??
    user.addresses[0] ??
    null

  const shipping =
    user.addresses.find((address) => address.name?.toLowerCase().includes('entrega')) ??
    user.addresses.find((address) => address.isDefault) ??
    user.addresses[0] ??
    null

  const addresses = user.addresses.map((address) => ({
    id: address.id,
    name: address.name,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
    phone: address.phone,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  }))
  const uniqueAddressMap = new Map<string, (typeof addresses)[number]>()
  for (const entry of addresses) {
    const key = [
      entry.street?.trim().toLowerCase() ?? '',
      entry.number?.trim().toLowerCase() ?? '',
      entry.complement?.trim().toLowerCase() ?? '',
      entry.neighborhood?.trim().toLowerCase() ?? '',
      entry.city?.trim().toLowerCase() ?? '',
      entry.state?.trim().toLowerCase() ?? '',
      entry.zipCode?.trim().toLowerCase() ?? '',
    ].join('|')

    if (!uniqueAddressMap.has(key)) {
      uniqueAddressMap.set(key, entry)
    }
  }
  const uniqueAddresses = Array.from(uniqueAddressMap.values())

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      document: user.document,
      dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    },
    addresses: uniqueAddresses,
    billingAddressId: billing?.id ?? null,
    shippingAddressId: shipping?.id ?? null,
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
  const session = (await getServerSession(authOptions)) as SessionWithId | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json()) as {
    name?: string | null
    phone?: string | null
    document?: string | null
    dateOfBirth?: string | null
    billingAddress?: Partial<{
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
      zipCode: string | null
    }> | null
    shippingAddress?: Partial<{
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
      zipCode: string | null
    }> | null
  }
  const { name, phone, document, dateOfBirth, billingAddress, shippingAddress } = body

  type AddressPayload = {
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
  }

  const mapAddressUpdate = (payload?: AddressPayload | null) => {
    if (!payload) return undefined
    const data: Record<string, string | null> = {}
    if (payload.street !== undefined) data.street = payload.street ?? ''
    if (payload.number !== undefined) data.number = payload.number ?? ''
    if (payload.neighborhood !== undefined) data.neighborhood = payload.neighborhood ?? ''
    if (payload.city !== undefined) data.city = payload.city ?? ''
    if (payload.state !== undefined) data.state = payload.state ?? ''
    if (payload.zipCode !== undefined) data.zipCode = payload.zipCode ?? ''
    if (payload.complement !== undefined) data.complement = payload.complement ?? null
    return data
  }

  const mapAddressCreate = (payload: AddressPayload, extra: { userId: string; name: string; isDefault?: boolean }) => ({
    userId: extra.userId,
    name: extra.name,
    country: 'Brasil',
    street: payload.street ?? '',
    number: payload.number ?? '',
    neighborhood: payload.neighborhood ?? '',
    city: payload.city ?? '',
    state: payload.state ?? '',
    zipCode: payload.zipCode ?? '',
    complement: payload.complement ?? null,
    isDefault: extra.isDefault ?? false,
  })

  await prisma.$transaction(async (tx) => {
    const parsedDateOfBirth = (() => {
      if (dateOfBirth === undefined) return undefined
      if (dateOfBirth === null || dateOfBirth === '') return null
      const parsed = new Date(dateOfBirth)
      return Number.isNaN(parsed.getTime()) ? undefined : parsed
    })()

    try {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: name ?? undefined,
          phone: phone ?? undefined,
          document: document ?? undefined,
          dateOfBirth: parsedDateOfBirth,
        },
      })
    } catch {
      await tx.user.update({ where: { id: session.user.id }, data: { name, dateOfBirth: parsedDateOfBirth } })
    }
    const billingData = mapAddressUpdate(billingAddress)
    if (billingData && Object.keys(billingData).length > 0) {
      const ex = await tx.address.findFirst({ where: { userId: session.user.id, name: { contains: 'Cobran', mode: 'insensitive' } } })
      if (ex) {
        await tx.address.update({ where: { id: ex.id }, data: billingData })
      } else {
        await tx.address.create({
          data: mapAddressCreate(billingAddress ?? {}, { userId: session.user.id, name: 'Cobrança', isDefault: true })
        })
      }
    }
    const shippingData = mapAddressUpdate(shippingAddress)
    if (shippingData && Object.keys(shippingData).length > 0) {
      const ex = await tx.address.findFirst({ where: { userId: session.user.id, name: { contains: 'Entrega', mode: 'insensitive' } } })
      if (ex) {
        await tx.address.update({ where: { id: ex.id }, data: shippingData })
      } else {
        await tx.address.create({
          data: mapAddressCreate(shippingAddress ?? {}, { userId: session.user.id, name: 'Entrega' })
        })
      }
    }
  })

  return NextResponse.json({ success: true })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
