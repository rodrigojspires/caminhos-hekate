'use client'

import { motion } from 'framer-motion'
import { Heart, Users, Target, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const stats = [
  {
    icon: Users,
    value: '10.000+',
    label: 'Vidas Transformadas',
    description: 'Pessoas que encontraram seu caminho'
  },
  {
    icon: Heart,
    value: '5+',
    label: 'Anos de Experiência',
    description: 'Dedicados ao desenvolvimento humano'
  },
  {
    icon: Target,
    value: '50+',
    label: 'Cursos Disponíveis',
    description: 'Conteúdos especializados'
  },
  {
    icon: Sparkles,
    value: '98%',
    label: 'Satisfação',
    description: 'Estudantes recomendam nossos cursos'
  }
]

export function AboutHero() {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="secondary" className="mb-6 text-sm">
              ✨ Nossa História
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
              Iluminando Caminhos de
              <span className="text-primary block">
                Transformação Interior
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              Nascemos da crença de que cada pessoa possui um potencial único e sagrado. 
              Nossa missão é criar um espaço seguro e acolhedor onde você possa descobrir, 
              desenvolver e manifestar sua verdadeira essência.
            </p>
          </motion.div>

          {/* Quote */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 mb-16"
          >
            <blockquote className="text-xl md:text-2xl font-serif italic text-foreground mb-4">
              &ldquo;Hekate, a deusa dos caminhos e das encruzilhadas, nos inspira a guiar 
              cada alma em sua jornada única de autodescoberta e crescimento.&rdquo;
            </blockquote>
            <cite className="text-muted-foreground font-medium">
              — Filosofia Caminhos de Hekate
            </cite>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="text-center group"
                >
                  <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/50 hover:border-primary/30 transition-all duration-300 group-hover:shadow-xl">
                    <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    
                    <div className="text-3xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {stat.value}
                    </div>
                    
                    <div className="font-semibold text-foreground mb-2">
                      {stat.label}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}