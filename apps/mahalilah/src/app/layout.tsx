import './globals.css'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata = {
  title: 'Maha Lilah Online',
  description: 'Jogue Maha Lilah Online com acompanhamento terapêutico.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
