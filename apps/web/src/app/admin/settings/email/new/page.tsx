'use client'

import { useRouter } from 'next/navigation'
import { EmailTemplateEditor } from '@/components/email/EmailTemplateEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function NewEmailTemplatePage() {
  const router = useRouter()

  const handleSave = async (data: any) => {
    try {
      const res = await fetch('/api/admin/settings/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          subject: data.subject,
          htmlContent: data.htmlContent,
          textContent: data.textContent,
          variables: data.variables || []
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao criar template')
      }
      const template = await res.json()
      toast.success('Template criado com sucesso')
      router.push(`/admin/settings/email/${template.id}`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar template')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Template de E-mail</CardTitle>
      </CardHeader>
      <CardContent>
        <EmailTemplateEditor onSave={handleSave} />
      </CardContent>
    </Card>
  )
}

