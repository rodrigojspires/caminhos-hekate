import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getCartFromCookie, setCartToCookie, validateAndNormalizeItems, computeTotals } from '@/lib/shop/cart'
import { enrichCartWithDetails } from '@/lib/shop/enrich-cart'
import { nanoid } from 'nanoid'

export async function POST(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        shortDescription: true,
        featuredImage: true,
        price: true,
        comparePrice: true,
        accessModels: true,
        tier: true,
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
    }

    const isFree = course.price == null || (Array.isArray(course.accessModels) && course.accessModels.includes('FREE')) || course.tier === 'FREE'
    if (isFree) {
      // Nada para adicionar ao carrinho; curso gratuito ou incluído na assinatura
      return NextResponse.json({ skipped: true, reason: 'free_or_included' })
    }

    const productSlug = `course-${course.slug}`

    // Reutiliza produto existente ou cria um novo
    let product = await prisma.product.findUnique({ where: { slug: productSlug } })
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: course.title,
          slug: productSlug,
          description: course.shortDescription || course.description || '',
          type: 'DIGITAL' as any,
          active: true,
          featured: false,
          images: course.featuredImage ? [course.featuredImage] : [],
        }
      })
    } else if (!product.active) {
      // Garante que está ativo
      await prisma.product.update({ where: { id: product.id }, data: { active: true } })
    }

    // Busca/Cria variante ativa
    let variant = await prisma.productVariant.findFirst({
      where: { productId: product.id, active: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!variant) {
      const baseSku = `COURSE-${(course.slug || course.id).toUpperCase().replace(/[^A-Z0-9]/g, '-')}`
      let sku = `${baseSku}-${nanoid(6).toUpperCase()}`
      // tenta evitar colisões de SKU
      for (let i = 0; i < 3; i++) {
        const exists = await prisma.productVariant.findUnique({ where: { sku } })
        if (!exists) break
        sku = `${baseSku}-${nanoid(6).toUpperCase()}`
      }
      variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: 'Acesso ao curso',
          sku,
          price: course.price ?? 0,
          comparePrice: course.comparePrice ?? null,
          stock: 999999,
          active: true,
        }
      })
    } else {
      // Mantém preço sincronizado com o curso
      const needsUpdate = (variant.price as any) !== (course.price ?? 0) || (variant.comparePrice ?? null) !== (course.comparePrice ?? null)
      if (needsUpdate) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            price: course.price ?? 0,
            comparePrice: course.comparePrice ?? null,
          },
        })
      }
    }

    // Adiciona ao carrinho
    const cart = getCartFromCookie()
    const existing = cart.items.find((i) => i.variantId === variant!.id)
    if (existing) existing.quantity += 1
    else cart.items.push({ productId: product.id, variantId: variant.id, quantity: 1 })

    cart.items = await validateAndNormalizeItems(cart.items)
    setCartToCookie(cart)

    const totals = await computeTotals(cart)
    const withDetails = await enrichCartWithDetails(cart)

    return NextResponse.json({
      success: true,
      cart: withDetails,
      totals,
      productId: product.id,
      variantId: variant.id,
    })
  } catch (error) {
    console.error('POST /api/courses/[courseId]/add-to-cart error', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0