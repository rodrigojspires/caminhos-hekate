import type { ReactNode } from 'react'
import { Footer } from '@/components/marketing/Footer'
import { Navbar } from '@/components/marketing/Navbar'
import { WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { MarketingAnalyticsProvider } from '@/components/marketing/analytics/MarketingAnalyticsProvider'
import { OrganizationJsonLd, ProductJsonLd } from '@/components/marketing/StructuredData'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-shell">
      <OrganizationJsonLd />
      <ProductJsonLd />
      <MarketingAnalyticsProvider />
      <div className="marketing-orb marketing-orb--one" aria-hidden />
      <div className="marketing-orb marketing-orb--two" aria-hidden />
      <div className="marketing-orb marketing-orb--three" aria-hidden />
      <Navbar />
      <main className="marketing-main mx-auto w-full max-w-none p-0">
        {children}
      </main>
      <WhatsAppCta />
      <Footer />
    </div>
  )
}
