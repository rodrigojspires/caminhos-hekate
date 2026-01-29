import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
  display: 'swap'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mahalilahonline.com.br'),
  title: {
    default: 'Maha Lilah Online',
    template: '%s | Maha Lilah Online'
  },
  description: 'Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA.',
  openGraph: {
    title: 'Maha Lilah Online',
    description: 'Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA.',
    url: '/',
    siteName: 'Maha Lilah Online',
    locale: 'pt_BR',
    type: 'website'
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${serif.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
