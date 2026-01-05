'use client'

import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

// Placeholder for StrophalosIcon if it's not defined elsewhere
const StrophalosIcon = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2a10 10 0 0 0-10 10h2a8 8 0 0 1 8-8V2z"></path>
    <path d="M12 22a10 10 0 0 1-10-10h2a8 8 0 0 0 8 8v2z"></path>
    <path d="M2 12a10 10 0 0 1 10-10v2a8 8 0 0 0-8 8H2z"></path>
    <path d="M22 12a10 10 0 0 0-10-10v2a8 8 0 0 1 8 8h2z"></path>
  </svg>
);

export function WelcomeCard() {
  const { apply } = useDashboardVocabulary()
  const { data: session } = useSession()
  const [greeting, setGreeting] = useState<string>('Salve')
  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite')
  }, [])
  const name = session?.user?.name || 'Iniciado(a)'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden temple-card temple-card-highlight">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold temple-heading text-[hsl(var(--temple-text-primary))]">
                  {apply(`${greeting}, ${name}. A egrégora te saúda.`)}
                </h1>
                <p className="text-[hsl(var(--temple-text-secondary))] mt-1">
                  {apply("Hoje é dia de aprofundar a chama ou iniciar um novo ciclo de prática.")}
                </p>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="hidden md:block relative z-10">
              <div className="w-24 h-24 bg-[hsl(var(--temple-surface-3))] rounded-2xl flex items-center justify-center transform rotate-12">
                <StrophalosIcon className="h-12 w-12 text-[hsl(var(--temple-accent-gold))] opacity-70" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
