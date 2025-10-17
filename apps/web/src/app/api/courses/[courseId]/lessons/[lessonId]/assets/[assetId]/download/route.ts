import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { join } from 'path'
import { readFile, stat } from 'fs/promises'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

interface RouteParams {
  params: {
    courseId: string
    lessonId: string
    assetId: string
  }
}

const tierOrder: Record<string, number> = {
  FREE: 0,
  INICIADO: 1,
  ADEPTO: 2,
  SACERDOCIO: 3,
}

const sanitizeFilename = (value: string) => {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
}

const ensureSafeRelativePath = (value: string) => {
  const sanitized = value.replace(/\\/g, '/')
  if (sanitized.includes('..')) {
    throw new Error('Caminho inválido')
  }
  return sanitized.replace(/^\/+/, '')
}

const addWatermarkToPdf = async (file: Uint8Array, watermark: string) => {
  const document = await PDFDocument.load(file)
  const font = await document.embedFont(StandardFonts.HelveticaBold)

  const watermarkText = `Exclusivo para ${watermark}`

  document.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    const fontSize = Math.max(Math.min(width, height) / 20, 18)
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize)
    const textHeight = font.heightAtSize(fontSize)
    const centerX = (width - textWidth) / 2
    const centerY = (height - textHeight) / 2

    page.drawText(watermarkText, {
      x: centerX,
      y: centerY,
      size: fontSize,
      font,
      color: rgb(0.8, 0.1, 0.1),
      opacity: 0.18,
      rotate: degrees(-30),
    })
  })

  return Buffer.from(await document.save())
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { courseId, lessonId, assetId } = params

    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        lessonId,
        lesson: {
          module: {
            courseId,
          }
        }
      },
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        size: true,
        lesson: {
          select: {
            isFree: true,
            module: {
              select: {
                course: {
                  select: {
                    id: true,
                    tier: true,
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    if (userRole !== 'ADMIN') {
      const [userRecord, enrollment] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { subscriptionTier: true },
        }),
        prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
          select: { id: true },
        })
      ])

      const userTier = userRecord?.subscriptionTier || 'FREE'
      const courseTier = asset.lesson.module.course.tier
      const hasSubscriptionAccess = (tierOrder[userTier] || 0) >= (tierOrder[courseTier] || 0)
      const hasAccess = asset.lesson.isFree || hasSubscriptionAccess || !!enrollment

      if (!hasAccess) {
        return NextResponse.json({ error: 'Você não tem acesso a este material.' }, { status: 403 })
      }
    }

    if (!asset.url) {
      return NextResponse.json({ error: 'URL do material inválida' }, { status: 400 })
    }

    if (asset.url.startsWith('http')) {
      return NextResponse.json({ error: 'Materiais hospedados externamente não suportam marca d\'água personalizada.' }, { status: 400 })
    }

    let relativePath: string
    try {
      relativePath = ensureSafeRelativePath(asset.url)
    } catch {
      return NextResponse.json({ error: 'Caminho de arquivo inválido' }, { status: 400 })
    }

    const fullPath = join(process.cwd(), 'public', relativePath)
    const fileBuffer = await readFile(fullPath)
    const fileInfo = await stat(fullPath)

    const extension = relativePath.includes('.') ? relativePath.split('.').pop() || '' : ''
    const normalizedTitle = asset.title?.trim() || relativePath.split('/').pop() || `material-${asset.id}`
    const baseName = normalizedTitle.replace(/\.[^.]+$/, '')
    const sanitizedBase = sanitizeFilename(baseName || `material-${asset.id}`)
    const sanitizedExtension = sanitizeFilename(extension || '')
    const safeEmail = sanitizeFilename(session.user.email)

    let downloadName = `${sanitizedBase}-${safeEmail}`
    if (sanitizedExtension) {
      downloadName = `${downloadName}.${sanitizedExtension}`
    }

    const isPdf = (sanitizedExtension || '').toLowerCase() === 'pdf'
    const contentType = isPdf
      ? 'application/pdf'
      : (asset.type?.trim() || 'application/octet-stream')

    const payload: Buffer = isPdf
      ? await addWatermarkToPdf(fileBuffer, session.user.email)
      : fileBuffer

    return new NextResponse(payload, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': payload.length.toString(),
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'no-store',
        'X-Asset-Source-Size': fileInfo.size.toString(),
      }
    })
  } catch (error) {
    console.error('Erro ao gerar download do material:', error)
    return NextResponse.json({ error: 'Erro ao processar o download do material.' }, { status: 500 })
  }
}
