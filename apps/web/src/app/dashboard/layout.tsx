import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Minha Escola | Caminhos de Hekate',
    template: '%s | Minha Escola | Caminhos de Hekate'
  },
  description: 'Área do usuário para perfis, progresso e configurações'
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
