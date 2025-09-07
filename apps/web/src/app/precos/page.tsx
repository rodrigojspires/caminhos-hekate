"use client"

import { useState } from 'react'
import { PlanSelector } from '@/components/payments/PlanSelector'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [billing, setBilling] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const router = useRouter()

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan)
  }

  const handlePaymentSuccess = () => {
    router.push('/dashboard/subscription')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Planos e Preços</h1>
        <p className="text-muted-foreground">Escolha o plano ideal para sua jornada na Escola Iniciática Caminhos de Hekate.</p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex items-center justify-center gap-2">
        <Button variant={billing === 'MONTHLY' ? 'default' : 'outline'} onClick={() => setBilling('MONTHLY')}>Mensal</Button>
        <Button variant={billing === 'YEARLY' ? 'default' : 'outline'} onClick={() => setBilling('YEARLY')}>Anual</Button>
      </div>

      {/* Grade de Planos */}
      <PlanSelector billing={billing} onPlanSelect={handlePlanSelect} selectedPlanId={selectedPlan?.id} />

      {/* Checkout do Plano selecionado */}
      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Assinar {selectedPlan.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm
              plan={selectedPlan}
              onPaymentSuccess={handlePaymentSuccess}
              onCancel={() => setSelectedPlan(null)}
            />
            <p className="text-xs text-muted-foreground mt-3">Ciclo selecionado: {selectedPlan?.interval === 'YEARLY' ? 'anual' : 'mensal'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
