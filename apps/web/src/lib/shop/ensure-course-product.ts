"use server"

import { prisma, ProductType } from '@hekate/database'
import { nanoid } from 'nanoid'

type CourseInput = {
  id: string
  slug: string
  title: string
  description?: string | null
  shortDescription?: string | null
  featuredImage?: string | null
  price?: number | null
  comparePrice?: number | null
}

type EnsureCourseProductOptions = {
  previousCourseSlug?: string | null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function ensureCourseProduct(
  course: CourseInput,
  options: EnsureCourseProductOptions = {}
) {
  const productSlug = `course-${course.slug}`
  const previousSlug = options.previousCourseSlug ? `course-${options.previousCourseSlug}` : null

  const normalizedPrice = toNumberOrNull(course.price) ?? 0
  const normalizedCompare = toNumberOrNull(course.comparePrice)
  const imageArray = course.featuredImage ? [course.featuredImage] : []
  const defaultDescription = course.shortDescription || course.description || ''

  let product =
    previousSlug && previousSlug !== productSlug
      ? await prisma.product.findUnique({ where: { slug: previousSlug } })
      : null

  if (!product) {
    product = await prisma.product.findUnique({ where: { slug: productSlug } })
  }

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: course.title,
        slug: productSlug,
        description: defaultDescription,
        shortDescription: defaultDescription,
        type: ProductType.DIGITAL,
        featured: false,
        active: true,
        images: imageArray
      }
    })
  } else {
    const needsUpdate =
      product.name !== course.title ||
      product.slug !== productSlug ||
      product.description !== defaultDescription ||
      product.shortDescription !== defaultDescription ||
      JSON.stringify(product.images) !== JSON.stringify(imageArray) ||
      !product.active

    if (needsUpdate) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          name: course.title,
          slug: productSlug,
          description: defaultDescription,
          shortDescription: defaultDescription,
          images: imageArray,
          active: true
        }
      })
    }
  }

  let variant = await prisma.productVariant.findFirst({
    where: { productId: product.id, active: true },
    orderBy: { createdAt: 'asc' }
  })

  if (!variant) {
    const baseSku = `COURSE-${course.slug}`.toUpperCase().replace(/[^A-Z0-9]/g, '-')
    let sku = `${baseSku}-${nanoid(6).toUpperCase()}`

    for (let attempt = 0; attempt < 3; attempt++) {
      const exists = await prisma.productVariant.findUnique({ where: { sku } })
      if (!exists) break
      sku = `${baseSku}-${nanoid(6).toUpperCase()}`
    }

    variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: 'Acesso ao curso',
        sku,
        price: normalizedPrice,
        comparePrice: normalizedCompare,
        stock: 999999,
        active: true
      }
    })
  } else {
    const needsVariantUpdate =
      Number(variant.price) !== normalizedPrice ||
      (variant.comparePrice != null ? Number(variant.comparePrice) : null) !== normalizedCompare ||
      variant.name !== 'Acesso ao curso'

    if (needsVariantUpdate) {
      variant = await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          name: 'Acesso ao curso',
          price: normalizedPrice,
          comparePrice: normalizedCompare,
          active: true
        }
      })
    }
  }

  return { product, variant }
}
