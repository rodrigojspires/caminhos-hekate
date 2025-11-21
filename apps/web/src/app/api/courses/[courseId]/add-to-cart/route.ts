import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getCartFromCookie, setCartToCookie, validateAndNormalizeItems, computeTotals } from '@/lib/shop/cart'
import { enrichCartWithDetails } from '@/lib/shop/enrich-cart'
import { ensureCourseProduct } from '@/lib/shop/ensure-course-product'

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

    const accessModels = Array.isArray(course.accessModels) ? course.accessModels : []
    const normalizedPrice = course.price != null ? Number(course.price) : null
    const isFree = accessModels.includes('FREE') || (normalizedPrice != null && !Number.isNaN(normalizedPrice) && normalizedPrice === 0)
    if (isFree) {
      // Nada para adicionar ao carrinho; curso gratuito ou incluído na assinatura
      return NextResponse.json({ skipped: true, reason: 'free_or_included' })
    }

    const { product, variant } = await ensureCourseProduct({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      featuredImage: course.featuredImage || undefined,
      price: course.price != null ? Number(course.price) : null,
      comparePrice: course.comparePrice != null ? Number(course.comparePrice) : null
    })

    // Adiciona ao carrinho
    const cart = getCartFromCookie()
    const existing = cart.items.find((i) => i.variantId === variant.id)
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
