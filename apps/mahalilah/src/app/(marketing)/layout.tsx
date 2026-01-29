import type { ReactNode } from 'react'
import { Footer } from '@/components/marketing/Footer'
import { Navbar } from '@/components/marketing/Navbar'
import { OrganizationJsonLd, ProductJsonLd } from '@/components/marketing/StructuredData'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <OrganizationJsonLd />
      <ProductJsonLd />
      <Navbar />
      <main className="mx-auto w-full max-w-none p-0">
        {children}
      </main>
      <Footer />
    </div>
  )
}
