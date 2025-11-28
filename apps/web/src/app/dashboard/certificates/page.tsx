import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Certificados | Minha Escola | Caminhos de Hekate',
  description: 'Área de certificados migrada para os cursos'
}

export default function CertificatesPage() {
  redirect('/dashboard/courses')
}
