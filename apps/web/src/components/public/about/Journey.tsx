'use client'

import { motion } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Award, 
  Globe, 
  Heart,
  Sparkles,
  Target
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const milestones = [
  {
    year: '2019',
    title: 'O Despertar',
    description: 'Nasceu a visão de criar um espaço sagrado para o desenvolvimento pessoal, inspirado pela sabedoria de Hekate.',
    icon: Sparkles,
    stats: {
      label: 'Primeira Visão',
      value: '1 Sonho'
    },
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  {
    year: '2020',
    title: 'Primeiros Passos',
    description: 'Lançamento da plataforma com os primeiros cursos de autoconhecimento e desenvolvimento espiritual.',
    icon: BookOpen,
    stats: {
      label: 'Cursos Lançados',
      value: '5 Cursos'
    },
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  {
    year: '2021',
    title: 'Crescimento da Comunidade',
    description: 'Milhares de pessoas se juntaram à nossa jornada, formando uma comunidade vibrante de buscadores.',
    icon: Users,
    stats: {
      label: 'Membros Ativos',
      value: '1.000+'
    },
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  {
    year: '2022',
    title: 'Expansão Global',
    description: 'Alcançamos estudantes em mais de 20 países, espalhando luz e conhecimento pelo mundo.',
    icon: Globe,
    stats: {
      label: 'Países Alcançados',
      value: '20+ Países'
    },
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  },
  {
    year: '2023',
    title: 'Reconhecimento',
    description: 'Recebemos certificações e reconhecimentos por nossa excelência em educação transformacional.',
    icon: Award,
    stats: {
      label: 'Certificados Emitidos',
      value: '2.500+'
    },
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
  },
  {
    year: '2024',
    title: 'Nova Era',
    description: 'Lançamento da plataforma renovada com tecnologia avançada e experiência ainda mais transformadora.',
    icon: Target,
    stats: {
      label: 'Estudantes Ativos',
      value: '10.000+'
    },
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20'
  }
]

export function Journey() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
              Nossa
              <span className="text-primary"> Jornada</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Cada marco em nossa história representa não apenas nosso crescimento, 
              mas as milhares de vidas que foram tocadas e transformadas ao longo do caminho.
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary via-secondary to-primary opacity-20 hidden lg:block" />
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon
                const isEven = index % 2 === 0
                
                return (
                  <motion.div
                    key={milestone.year}
                    initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 * index }}
                    viewport={{ once: true }}
                    className={`flex items-center ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} flex-col lg:space-x-8`}
                  >
                    {/* Content Card */}
                    <div className={`w-full lg:w-5/12 ${isEven ? 'lg:text-right' : 'lg:text-left'} mb-8 lg:mb-0`}>
                      <Card className="hover:shadow-xl transition-all duration-300 group">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="secondary" className="text-sm font-semibold">
                              {milestone.year}
                            </Badge>
                            <div className={`${milestone.bgColor} rounded-full p-2`}>
                              <Icon className={`h-5 w-5 ${milestone.color}`} />
                            </div>
                          </div>
                          
                          <h3 className="text-2xl font-serif font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                            {milestone.title}
                          </h3>
                          
                          <p className="text-muted-foreground leading-relaxed mb-4">
                            {milestone.description}
                          </p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <span className="text-sm text-muted-foreground">
                              {milestone.stats.label}
                            </span>
                            <span className={`font-bold ${milestone.color}`}>
                              {milestone.stats.value}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Timeline Node */}
                    <div className="hidden lg:flex w-2/12 justify-center relative z-10">
                      <div className="bg-background border-4 border-primary rounded-full p-4 shadow-lg">
                        <Icon className={`h-8 w-8 ${milestone.color}`} />
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="w-full lg:w-5/12" />
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Future Vision */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-3xl p-8 md:p-12">
              <Heart className="h-16 w-16 text-primary mx-auto mb-6" />
              
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
                O Futuro que Construímos Juntos
              </h3>
              
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Nossa jornada está apenas começando. Com cada nova alma que se junta aos 
                Caminhos de Hekate, expandimos nossa capacidade de iluminar o mundo com 
                amor, sabedoria e transformação autêntica.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}