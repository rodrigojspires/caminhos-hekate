import { prisma } from '@hekate/database'

function randomToken(length = 48) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let t = ''
  for (let i = 0; i < length; i++) t += chars[Math.floor(Math.random() * chars.length)]
  return t
}

type VariantAttributes = {
  digitalFileUrl?: string
  fileUrl?: string
  digitalFileName?: string
  fileName?: string
  downloadLimit?: number
  expiresInDays?: number
}

export async function createDownloadsForOrder(orderId: string): Promise<number> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      user: true,
    },
  })

  if (!order) return 0

  const now = new Date()
  let created = 0

  for (const item of order.items) {
    if (!item.product || item.product.type !== 'DIGITAL') continue

    const attrs = (item.variant?.attributes || {}) as VariantAttributes
    const fileUrl = attrs.digitalFileUrl || attrs.fileUrl
    if (!fileUrl) {
      console.warn(`No digital file URL for product ${item.productId} / variant ${item.variantId}`)
      continue
    }

    const fileName = attrs.digitalFileName || attrs.fileName || item.name
    const maxDownloads = typeof attrs.downloadLimit === 'number' ? attrs.downloadLimit : 5
    const expiresInDays = typeof attrs.expiresInDays === 'number' ? attrs.expiresInDays : 7

    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiresInDays))

    const qty = Math.max(1, item.quantity)

    for (let i = 0; i < qty; i++) {
      // ensure unique token
      let token = randomToken(48)
      // naive retry to avoid unique collision
      for (let tries = 0; tries < 3; tries++) {
        try {
          await prisma.download.create({
            data: ({
              userId: order.userId || (order.user?.id as any) || undefined,
              productId: item.productId,
              fileName,
              fileUrl,
              token,
              expiresAt,
              maxDownloads,
              source: 'ORDER',
              sourceRefId: orderId,
            } as any),
          })
          created++
          break
        } catch (e: any) {
          if (String(e?.message || '').includes('Unique') || String(e).includes('unique')) {
            token = randomToken(48)
            continue
          }
          throw e
        }
      }
    }
  }

  return created
}

export async function createDownloadsForSubscription(userId: string, planId: string): Promise<{ created: number, skipped: number }> {
  // Convention: plan.features or plan.metadata may include downloadProductIds and defaults
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan) return { created: 0, skipped: 0 }

  let features: any = {}
  try { features = (plan.features as any) || {} } catch { features = {} }
  const meta: any = (plan as any).metadata || {}
  const productIds: string[] = (features.downloadProductIds as string[]) || (meta.downloads?.products as string[]) || []
  const defaultLimit: number = (features.downloadLimit as number) || (meta.downloads?.downloadLimit as number) || plan.maxDownloads || 5
  const defaultExpiryDays: number = (features.expiresInDays as number) || (meta.downloads?.expiresInDays as number) || 7

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { created: 0, skipped: 0 }
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, type: 'DIGITAL' },
    include: { variants: true },
  })

  let created = 0, skipped = 0
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + Math.max(1, defaultExpiryDays))

  for (const p of products) {
    const variant = p.variants.find(v => v.active)
    if (!variant) { skipped++; continue }
    const attrs = (variant.attributes || {}) as VariantAttributes
    const fileUrl = attrs.digitalFileUrl || attrs.fileUrl
    if (!fileUrl) { skipped++; continue }
    const fileName = attrs.digitalFileName || attrs.fileName || `${p.name}`
    const maxDownloads = typeof attrs.downloadLimit === 'number' ? attrs.downloadLimit : defaultLimit

    // Avoid duplicating an active link for the same product
    const existing = await prisma.download.findFirst({
      where: { userId, productId: p.id, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) { skipped++; continue }

    // ensure unique token with light retry
    let token = randomToken(48)
    for (let tries = 0; tries < 3; tries++) {
      try {
        await prisma.download.create({
          data: ({
            userId,
            productId: p.id,
            fileName,
            fileUrl,
            token,
            expiresAt,
            maxDownloads,
            source: 'SUBSCRIPTION',
            sourceRefId: planId,
          } as any),
        })
        created++
        break
      } catch (e: any) {
        if (String(e?.message || '').includes('Unique') || String(e).includes('unique')) {
          token = randomToken(48)
          continue
        }
        throw e
      }
    }
  }

  return { created, skipped }
}

export async function revokeSubscriptionDownloads(userId: string, planId: string): Promise<number> {
  const now = new Date()
  const res = await prisma.download.updateMany({
    where: ({
      userId,
      source: 'SUBSCRIPTION',
      sourceRefId: planId,
      expiresAt: { gt: now },
    } as any),
    data: ({
      expiresAt: now,
    } as any),
  })
  return res.count
}
