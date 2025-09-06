'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Star, Users, BookOpen, Award } from 'lucide-react'
import { motion } from 'framer-motion'

const stats = [
  { icon: Users, label: 'Estudantes', value: '10.000+' },
  { icon: BookOpen, label: 'Cursos', value: '50+' },
  { icon: Award, label: 'Certificados', value: '5.000+' },
  { icon: Star, label: 'Avaliação', value: '4.9/5' },
]

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container relative z-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              ✨ Nova jornada de autoconhecimento
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
              Desperte Seu
              <span className="text-primary block">
                Potencial Interior
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Transforme sua vida através de cursos exclusivos de desenvolvimento pessoal, 
              espiritualidade e autoconhecimento. Junte-se a milhares de pessoas em uma 
              jornada de crescimento e descoberta.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link href="/cadastro">
                  Começar Jornada
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 group" asChild>
                <Link href="/cursos">
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Ver Cursos
                </Link>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="flex justify-center mb-2">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="font-bold text-2xl text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
          
          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-lg">
              {/* Main circle with mystical elements */}
              <div className="relative w-80 h-80 lg:w-96 lg:h-96 mx-auto">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin-slow" />
                
                {/* Middle ring */}
                <div className="absolute inset-4 rounded-full border border-secondary/30 animate-spin-reverse" />
                
                {/* Inner circle with gradient */}
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🌙</div>
                    <div className="font-serif text-lg font-semibold text-foreground">
                      Hekate
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Deusa da Sabedoria
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />
                <div className="absolute bottom-8 left-8 w-2 h-2 bg-secondary rounded-full animate-pulse delay-500" />
                <div className="absolute top-1/3 left-4 w-4 h-4 bg-accent rounded-full animate-pulse delay-1000" />
                <div className="absolute bottom-1/3 right-8 w-2 h-2 bg-primary rounded-full animate-pulse delay-700" />
              </div>
              
              {/* Testimonial card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="absolute -bottom-4 -right-4 bg-card border rounded-lg p-4 shadow-lg max-w-xs"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">5.0</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  &ldquo;Uma experiência transformadora que mudou minha perspectiva de vida.&rdquo;
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-primary/20 rounded-full" />
                  <span className="text-xs font-medium">Maria Silva</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <span className="text-sm">Descubra mais</span>
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-muted-foreground/50 rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}