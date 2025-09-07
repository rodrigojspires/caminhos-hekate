"use client"

import { PaymentStatus } from '@/components/payments/PaymentStatus'

export default function DashboardSubscriptionPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Minha Assinatura</h1>
      <PaymentStatus />
    </div>
  )
}

