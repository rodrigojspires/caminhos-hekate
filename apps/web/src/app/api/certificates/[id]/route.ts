import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import type { CertificateTemplate } from '@hekate/database'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type TemplateField = {
  key: string
  label?: string
  text?: string
  x: number
  y: number
  fontSize?: number
  color?: string
  align?: 'left' | 'center' | 'right'
  maxWidth?: number
}

type TemplateLayout = {
  fields?: TemplateField[]
  footerText?: string
}

const defaultLayout: TemplateLayout = {
  fields: [
    { key: 'customText', text: 'Escola Iniciática Caminhos de Hekate', x: 50, y: 60, fontSize: 16, align: 'center', maxWidth: 495 },
    { key: 'title', text: 'Certificado de Conclusão', x: 50, y: 100, fontSize: 26, align: 'center', maxWidth: 495 },
    { key: 'userName', label: 'Concedido a', x: 50, y: 170, fontSize: 22, align: 'center', maxWidth: 495 },
    { key: 'courseTitle', label: 'Pela conclusão do curso', x: 50, y: 215, fontSize: 18, align: 'center', maxWidth: 495 },
    { key: 'hours', label: 'Carga horária', x: 50, y: 260, fontSize: 12, align: 'center', maxWidth: 495 },
    { key: 'issuedAt', label: 'Emitido em', x: 50, y: 300, fontSize: 11, align: 'center', maxWidth: 495 },
    { key: 'certificateNumber', label: 'Número do certificado', x: 50, y: 320, fontSize: 11, align: 'center', maxWidth: 495 }
  ],
  footerText: 'Valide a autenticidade em caminhosdehekate.com/certificados'
}

function generateCertificateNumber() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `HEK-${y}${m}-${rand}`
}

function parseLayout(rawLayout: any): TemplateLayout | undefined {
  if (!rawLayout || typeof rawLayout !== 'object') return undefined
  const layout = rawLayout as TemplateLayout
  return {
    footerText: layout.footerText,
    fields: Array.isArray(layout.fields)
      ? layout.fields.map((field) => ({
          ...field,
          x: Number(field.x) || 0,
          y: Number(field.y) || 0,
          fontSize: field.fontSize ? Number(field.fontSize) : undefined,
          maxWidth: field.maxWidth ? Number(field.maxWidth) : undefined
        }))
      : undefined
  }
}

function mergeFields(layout?: TemplateLayout): TemplateField[] {
  const defaults = defaultLayout.fields ?? []
  const customFields = Array.isArray(layout?.fields) ? layout!.fields : []

  const merged = defaults.map((field) => {
    const override = customFields.find((f) => f.key === field.key)
    return override ? { ...field, ...override } : field
  })

  const extras = customFields.filter(
    (field) => !defaults.some((defaultField) => defaultField.key === field.key)
  )

  return [...merged, ...extras]
}

async function fetchImageBuffer(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch {
    return null
  }
}

async function findTemplateForCourse(courseId: string) {
  const courseTemplate = await prisma.certificateTemplate.findFirst({
    where: { isActive: true, courseId },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
  })
  if (courseTemplate) return courseTemplate

  return prisma.certificateTemplate.findFirst({
    where: { isActive: true, courseId: null },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
  })
}

function rgbFromHex(hex: string) {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16)
    const g = parseInt(normalized[1] + normalized[1], 16)
    const b = parseInt(normalized[2] + normalized[2], 16)
    return rgb(r / 255, g / 255, b / 255)
  }
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return rgb(r / 255, g / 255, b / 255)
}

async function createPdfBuffer({
  userName,
  courseTitle,
  hours,
  issuedAt,
  certificateNumber,
  template,
}: {
  userName: string
  courseTitle: string
  hours: number
  issuedAt: Date
  certificateNumber: string
  template?: CertificateTemplate | null
}) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([842, 595]) // A4 landscape
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const marginLeft = 50
  const marginTop = 50

  const layout = parseLayout(template?.layout) || undefined
  const fields = mergeFields(layout)
  const footerText = layout?.footerText ?? defaultLayout.footerText

  const bgUrl = template?.backgroundImageUrl || undefined
  if (bgUrl) {
    const normalizedUrl = bgUrl.startsWith('/uploads/') && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}${bgUrl}`
      : bgUrl
    const background = await fetchImageBuffer(normalizedUrl)
    if (background) {
      const isPng = background[0] === 0x89 && background[1] === 0x50
      const embedded = isPng ? await pdfDoc.embedPng(background) : await pdfDoc.embedJpg(background)
      const scale = Math.min(width / embedded.width, height / embedded.height)
      const drawWidth = embedded.width * scale
      const drawHeight = embedded.height * scale
      page.drawImage(embedded, {
        x: 0,
        y: height - drawHeight,
        width: drawWidth,
        height: drawHeight
      })
    }
  }

  const valueMap: Record<string, string | undefined> = {
    userName,
    courseTitle,
    hours: hours ? `${hours} horas` : undefined,
    issuedAt: issuedAt.toLocaleDateString('pt-BR'),
    certificateNumber,
    title: 'Certificado de Conclusão',
    customText: template?.description || undefined
  }

  fields.forEach((field) => {
    const baseValue = field.text ?? valueMap[field.key]
    let value = baseValue

    if (!field.text && field.label) {
      value = baseValue ? `${field.label}: ${baseValue}` : field.label
    }

    if (!value) return

    const font = field.fontSize && field.fontSize > 18 ? helveticaBold : helvetica
    const size = field.fontSize || 14
    const maxWidth = field.maxWidth ?? (width - marginLeft * 2)
    const textWidth = font.widthOfTextAtSize(value, size)
    let x = marginLeft + (field.x || 0)
    if (field.align === 'center') {
      x = marginLeft + (field.x || 0) + Math.max(0, (maxWidth - textWidth) / 2)
    } else if (field.align === 'right') {
      x = marginLeft + (field.x || 0) + Math.max(0, maxWidth - textWidth)
    }
    const y = height - marginTop - (field.y || 0) - size

    page.drawText(value, {
      x,
      y,
      size,
      font,
      color: rgbFromHex(field.color || '#111')
    })
  })

  if (footerText) {
    const size = 10
    const font = helvetica
    const textWidth = font.widthOfTextAtSize(footerText, size)
    const x = marginLeft + Math.max(0, (width - marginLeft * 2 - textWidth) / 2)
    const y = marginTop
    page.drawText(footerText, { x, y, size, font, color: rgb(0.26, 0.26, 0.26) })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = session.user.id
    const id = params.id

    let certificate = await prisma.certificate.findFirst({
      where: { id, userId },
      include: { course: true, user: true, template: true }
    })

    if (!certificate) {
      const course = await prisma.course.findUnique({
        where: { id },
        include: { modules: { select: { id: true } } }
      })
      if (!course) {
        return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
      }

      const moduleIds = course.modules.map((m) => m.id)
      const totalLessons = moduleIds.length
        ? await prisma.lesson.count({ where: { moduleId: { in: moduleIds } } })
        : 0

      const completedLessons = await prisma.progress.count({
        where: { userId, completed: true, lesson: { module: { courseId: id } } }
      })

      if (totalLessons === 0 || completedLessons < totalLessons) {
        return NextResponse.json({ error: 'Curso não concluído' }, { status: 400 })
      }

      const template = await findTemplateForCourse(id)

      certificate = await prisma.certificate.create({
        data: {
          userId,
          courseId: id,
          certificateNumber: generateCertificateNumber(),
          templateId: template?.id
        },
        include: { course: true, user: true, template: true }
      })
    } else if (!certificate.templateId) {
      const template = await findTemplateForCourse(certificate.courseId)
      if (template) {
        certificate = await prisma.certificate.update({
          where: { id: certificate.id },
          data: { templateId: template.id },
          include: { course: true, user: true, template: true }
        })
      }
    }

    const template = certificate.template ?? (await findTemplateForCourse(certificate.courseId))
    const hours = certificate.course.duration ? Math.round((certificate.course.duration || 0) / 60) : 0

    const pdf = await createPdfBuffer({
      userName: certificate.user.name || 'Aluno(a)',
      courseTitle: certificate.course.title,
      hours,
      issuedAt: certificate.issuedAt,
      certificateNumber: certificate.certificateNumber,
      template
    })

    const typed = new Uint8Array(pdf.length)
    typed.set(pdf)
    const blob = new Blob([typed], { type: 'application/pdf' })
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=certificado-${certificate.course.title.replace(/\s+/g, '-').toLowerCase()}.pdf`
      }
    })
  } catch (error) {
    console.error('Erro ao gerar certificado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
