'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Play, Star, Flame } from 'lucide-react'
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
  const [inProgress, setInProgress] = useState<number>(0)
  const [avgProgress, setAvgProgress] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [greeting, setGreeting] = useState<string>('Salve')
  const [lastActivity, setLastActivity] = useState<string | null>(null)
  const [nextPortal, setNextPortal] = useState<string | null>(null)
  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite')
  }, [])
  const name = session?.user?.name || 'Iniciado(a)'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [pRes, sRes, aRes] = await Promise.all([
          fetch('/api/user/progress'),
          fetch('/api/gamification/streaks?active=true'),
          fetch('/api/user/activities?limit=1')
        ])
        if (pRes.ok) {
          const p = await pRes.json()
          if (!cancelled) {
            const ip = Number(p?.overview?.inProgressCourses || 0)
            setInProgress(ip)
            const list = Array.isArray(p?.courseProgress) ? p.courseProgress : []
            const avg = list.length ? Math.round(list.reduce((a: number, c: any) => a + (Number(c.progress)||0), 0) / list.length) : 0
            setAvgProgress(avg)
            const next = list.length ? [...list].sort((a: any, b: any) => Number(b.progress || 0) - Number(a.progress || 0))[0] : null
            setNextPortal(next?.courseTitle || null)
          }
        }
        if (sRes.ok) {
          const s = await sRes.json()
          const current = Array.isArray(s) ? Math.max(0, ...s.map((x: any) => Number(x.currentStreak || 0))) : 0
          if (!cancelled) setStreak(Number.isFinite(current) ? current : 0)
        }
        if (aRes.ok) {
          const a = await aRes.json()
          const item = Array.isArray(a?.activities) ? a.activities[0] : null
          if (!cancelled) setLastActivity(item?.description || item?.title || null)
        }
      } catch { /* noop */ }
    }
    load()
    return () => { cancelled = true }
  }, [])
  
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
                <Badge variant="secondary" className="temple-chip w-fit text-xs uppercase tracking-wide">
                  {apply('Bússola do Dia')}
                </Badge>
                <h1 className="text-2xl font-bold temple-heading text-[hsl(var(--temple-text-primary))]">
                  {apply(`${greeting}, ${name}. A egrégora te saúda.`)}
                </h1>
                <p className="text-[hsl(var(--temple-text-secondary))] mt-1">
                  {apply("Hoje é dia de aprofundar a chama ou iniciar um novo ciclo de prática.")}
                </p>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-[hsl(var(--temple-text-secondary))]">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[hsl(var(--temple-accent-violet))]" />
                  <span>{apply(`${inProgress} rituais em andamento`)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[hsl(var(--temple-accent-violet))]" />
                  <span>{apply(`${avgProgress}% de ascensão percorrida`)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="temple-btn-primary"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {apply(inProgress > 0 ? "Continuar trilha" : "Iniciar prática")}
                </Button>
                {streak > 0 && (
                  <Badge variant="secondary" className="temple-chip flex items-center gap-2">
                    <Flame className="h-4 w-4 animate-pulse" />
                    <span>{apply(`Chama do Conhecimento: ${streak} dias`)}</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
                <span>
                  {apply(`Último eco: ${lastActivity || 'Sem registros ainda'}`)}
                </span>
                <span className="text-[hsl(var(--temple-text-secondary))]">•</span>
                <span>
                  {nextPortal
                    ? apply(`Próximo portal: ${nextPortal}`)
                    : apply('Próximo portal: escolha sua trilha')}
                </span>
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
