"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Play, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export function WelcomeCard() {
  const { data: session } = useSession()
  const [inProgress, setInProgress] = useState<number>(0)
  const [avgProgress, setAvgProgress] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [greeting, setGreeting] = useState<string>('Olá')
  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite')
  }, [])
  const name = session?.user?.name || 'Bem-vindo(a)'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch('/api/user/progress'),
          fetch('/api/gamification/streaks?active=true')
        ])
        if (pRes.ok) {
          const p = await pRes.json()
          if (!cancelled) {
            const ip = Number(p?.overview?.inProgressCourses || 0)
            setInProgress(ip)
            const list = Array.isArray(p?.courseProgress) ? p.courseProgress : []
            const avg = list.length ? Math.round(list.reduce((a: number, c: any) => a + (Number(c.progress)||0), 0) / list.length) : 0
            setAvgProgress(avg)
          }
        }
        if (sRes.ok) {
          const s = await sRes.json()
          const current = Array.isArray(s) ? Math.max(0, ...s.map((x: any) => Number(x.currentStreak || 0))) : 0
          if (!cancelled) setStreak(Number.isFinite(current) ? current : 0)
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
      <Card className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {greeting}, {name}! 👋
                </h1>
                <p className="text-purple-100 mt-1">
                  Continue sua jornada de aprendizado
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">{inProgress} cursos ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span className="text-sm">{avgProgress}% progresso médio</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continuar Estudando
                </Button>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Sequência de {streak} dias 🔥
                </Badge>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="hidden md:block relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute top-8 right-8 w-16 h-16 bg-white/5 rounded-full" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Indicadores adicionais podem ser adicionados aqui com dados reais */}
        </CardContent>
      </Card>
    </motion.div>
  )
}
