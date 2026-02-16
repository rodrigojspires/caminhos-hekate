import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults(
  {
    title: 'Checkout',
    description:
      'Fluxo interno de pagamento e finalização de compra do Maha Lilah Online.',
    openGraph: {
      title: 'Checkout Maha Lilah Online',
      description:
        'Fluxo interno de pagamento e finalização de compra do Maha Lilah Online.',
      url: '/checkout'
    }
  },
  { noIndex: true }
)

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children
}
