'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Play, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'

export function WelcomeCard() {
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite'
  
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
                  {greeting}, João! 👋
                </h1>
                <p className="text-purple-100 mt-1">
                  Continue sua jornada de aprendizado
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">3 cursos ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span className="text-sm">68% progresso médio</span>
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
                  Sequência de 7 dias 🔥
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
          
          {/* Progress indicator */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso semanal</span>
              <span>4/7 dias</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '57%' }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}