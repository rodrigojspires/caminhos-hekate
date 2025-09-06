import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'

const schema = z.object({
  templateId: z.string().optional(),
  templateSlug: z.string().optional(),
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  variables: z.record(z.any()).optional(),
  device: z.enum(['desktop', 'mobile', 'tablet']).optional().default('desktop'),
  screenshots: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = schema.parse(body)

    let subject = input.subject || ''
    let html = input.htmlContent || ''
    let text = input.textContent

    if (input.templateId) {
      const preview = await emailService.previewTemplate(input.templateId, input.variables || {})
      subject = preview.subject
      html = preview.htmlContent
      text = preview.textContent
    } else if (input.templateSlug) {
      const tpl = await emailService.getTemplateBySlug(input.templateSlug)
      if (!tpl) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
      const processed = (emailService as any).processTemplate
        ? (emailService as any).processTemplate(tpl, input.variables || {})
        : { subject: tpl.subject, htmlContent: tpl.htmlContent, textContent: tpl.textContent }
      subject = processed.subject
      html = processed.htmlContent
      text = processed.textContent
    } else if (input.htmlContent) {
      // Inline processing with simple variable interpolation
      const replaceVars = (content: string) =>
        content.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key) => {
          const path = String(key).trim()
          const parts = path.split('.')
          let cur: any = input.variables || {}
          for (const p of parts) cur = cur?.[p]
          return cur !== undefined && cur !== null ? String(cur) : `{{ ${path} }}`
        })
      subject = replaceVars(subject)
      html = replaceVars(html)
      text = text ? replaceVars(text) : undefined
    } else {
      return NextResponse.json({ error: 'Defina templateId, templateSlug ou htmlContent' }, { status: 400 })
    }

    // Basic device tweaks (no screenshots yet)
    const wrapped = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1">` +
      (input.device === 'mobile' ? '<style>body{max-width:420px;margin:0 auto}</style>' : '') +
      `</head><body>${html}</body></html>`

    return NextResponse.json({ subject, html: wrapped, text, device: input.device, screenshots: null })
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json({ error: 'Parâmetros inválidos', details: (error as any).issues }, { status: 400 })
    }
    console.error('Erro no preview de template:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

