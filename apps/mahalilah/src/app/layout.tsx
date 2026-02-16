import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'
import {
  DEFAULT_OG_IMAGE_URL,
  MAHA_LILAH_SITE_NAME,
  MAHA_LILAH_SITE_URL
} from '@/lib/marketing/seo'

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

const siteDescription =
  'Maha Lilah Online: plataforma para jornadas terapêuticas ao vivo com tabuleiro de autoconhecimento, registro por jogada, deck randômico e assistência por IA.'

export const metadata: Metadata = {
  metadataBase: new URL(MAHA_LILAH_SITE_URL),
  applicationName: MAHA_LILAH_SITE_NAME,
  title: {
    default: MAHA_LILAH_SITE_NAME,
    template: '%s | Maha Lilah Online'
  },
  description: siteDescription,
  alternates: {
    canonical: '/'
  },
  keywords: [
    'maha lilah',
    'maha lilah online',
    'tabuleiro de autoconhecimento',
    'jogo terapêutico online',
    'jornada terapêutica',
    'terapeuta integrativo',
    'sala terapêutica ao vivo'
  ],
  category: 'Saúde e bem-estar',
  authors: [{ name: MAHA_LILAH_SITE_NAME, url: MAHA_LILAH_SITE_URL }],
  creator: MAHA_LILAH_SITE_NAME,
  publisher: MAHA_LILAH_SITE_NAME,
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
  },
  robots: {
    index: true,
    follow: true
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false
  },
  openGraph: {
    title: MAHA_LILAH_SITE_NAME,
    description: siteDescription,
    url: '/',
    siteName: MAHA_LILAH_SITE_NAME,
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: MAHA_LILAH_SITE_NAME
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: MAHA_LILAH_SITE_NAME,
    description: siteDescription,
    images: [DEFAULT_OG_IMAGE_URL]
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
