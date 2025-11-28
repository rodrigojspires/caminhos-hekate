import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import type { CertificateTemplate } from '@hekate/database'
import PDFDocument from 'pdfkit'
import { resolve as resolvePath } from 'path'
import { withAdminAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

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

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.warn('Falha ao carregar imagem de fundo do certificado', error)
    return null
  }
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
  template?: CertificateTemplate | { backgroundImageUrl?: string | null; layout?: TemplateLayout; description?: string | null } | null
}) {
  return await new Promise<Buffer>(async (resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    try {
      const helveticaPath = resolvePath(require.resolve('pdfkit/js/data/Helvetica.afm'))
      doc.registerFont('Helvetica', helveticaPath)
      doc.font('Helvetica')
    } catch {
      // Se não encontrar o arquivo da fonte, segue com a fonte padrão do PDFKit
    }
    const chunks: Buffer[] = []
    doc.on('data', (d) => chunks.push(d as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const layout = parseLayout((template as any)?.layout) || undefined
    const fields = mergeFields(layout)
    const footerText = layout?.footerText ?? defaultLayout.footerText
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

    const bgUrl = (template as any)?.backgroundImageUrl as string | undefined
    if (bgUrl) {
      const normalizedUrl = bgUrl.startsWith('/uploads/') && process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}${bgUrl}`
        : bgUrl
      const background = await fetchImageBuffer(normalizedUrl)
      if (background) {
        doc.image(background, 0, 0, { width: doc.page.width, height: doc.page.height })
      }
    }

    const valueMap: Record<string, string | undefined> = {
      userName,
      courseTitle,
      hours: hours ? `${hours} horas` : undefined,
      issuedAt: issuedAt.toLocaleDateString('pt-BR'),
      certificateNumber,
      title: 'Certificado de Conclusão',
      customText: (template as any)?.description || undefined
    }

    fields.forEach((field) => {
      const baseValue = field.text ?? valueMap[field.key]
      let value = baseValue

      if (!field.text && field.label) {
        value = baseValue ? `${field.label}: ${baseValue}` : field.label
      }

      if (!value) return

      doc
        .fontSize(field.fontSize || 14)
        .fillColor(field.color || '#111')
        .text(value, doc.page.margins.left + (field.x || 0), doc.page.margins.top + (field.y || 0), {
          width: field.maxWidth ?? pageWidth,
          align: field.align ?? 'center'
        })
    })

    if (footerText) {
      doc
        .fontSize(10)
        .fillColor('#444')
        .text(footerText, doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 30, {
          width: pageWidth,
          align: 'center'
        })
    }

    doc.end()
  })
}

const layoutFieldSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  text: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  maxWidth: z.number().optional()
})

const layoutSchema = z.object({
  fields: z.array(layoutFieldSchema).optional(),
  footerText: z.string().optional()
}).optional()

const bodySchema = z.object({
  templateId: z.string().optional(),
  template: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    backgroundImageUrl: z.string().optional(),
    layout: layoutSchema
  }).optional()
})

export const POST = withAdminAuth(async (_user, req: NextRequest) => {
  try {
    const json = await req.json()
    const body = bodySchema.parse(json)

    let template: CertificateTemplate | null = null

  if (body.templateId) {
    template = await prisma.certificateTemplate.findUnique({
      where: { id: body.templateId }
    })
  } else if (body.template) {
    const normalizedFields = (body.template.layout?.fields || []).map((f) => ({
      ...f,
      x: f.x ?? 0,
      y: f.y ?? 0,
      fontSize: f.fontSize,
      maxWidth: f.maxWidth
    }))

    template = {
      id: 'preview',
      name: body.template.name || 'Pré-visualização',
      description: body.template.description || null,
      backgroundImageUrl: body.template.backgroundImageUrl,
      courseId: null,
      isDefault: false,
      isActive: true,
      layout: {
        ...body.template.layout,
        fields: normalizedFields
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      updatedById: null,
      _count: { certificates: 0 }
      } as any
    }

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    const pdf = await createPdfBuffer({
      userName: 'Aluno Exemplo',
      courseTitle: 'Curso Exemplo',
      hours: 20,
      issuedAt: new Date(),
      certificateNumber: 'TEST-123456',
      template
    })

    const typed = new Uint8Array(pdf.length)
    typed.set(pdf)
    const blob = new Blob([typed], { type: 'application/pdf' })
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=certificado-preview.pdf'
      }
    })
  } catch (error) {
    console.error('Erro ao gerar preview do certificado', error)
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 })
  }
})
