'use client'

import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Users, 
  Award, 
  Play, 
  MessageCircle, 
  Sparkles,
  Shield,
  Clock,
  Target
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const features = [
  {
    icon: BookOpen,
    title: 'Cursos Exclusivos',
    description: 'Conteúdo único desenvolvido por especialistas em desenvolvimento pessoal e espiritualidade.',
    highlight: 'Mais de 50 cursos',
    color: 'text-blue-500'
  },
  {
    icon: Users,
    title: 'Comunidade Ativa',
    description: 'Conecte-se com pessoas que compartilham da mesma jornada de autoconhecimento.',
    highlight: '10.000+ membros',
    color: 'text-green-500'
  },
  {
    icon: Award,
    title: 'Certificações',
    description: 'Receba certificados reconhecidos ao completar os cursos e trilhas de aprendizado.',
    highlight: 'Certificado válido',
    color: 'text-yellow-500'
  },
  {
    icon: Play,
    title: 'Aulas Interativas',
    description: 'Vídeos de alta qualidade com exercícios práticos e materiais complementares.',
    highlight: 'HD & 4K',
    color: 'text-purple-500'
  },
  {
    icon: MessageCircle,
    title: 'Mentoria Personalizada',
    description: 'Acesso direto aos instrutores e sessões de mentoria para acelerar seu crescimento.',
    highlight: 'Suporte 1:1',
    color: 'text-pink-500'
  },
  {
    icon: Sparkles,
    title: 'Gamificação',
    description: 'Sistema de pontos, conquistas e níveis para tornar sua jornada mais engajante.',
    highlight: 'XP & Badges',
    color: 'text-orange-500'
  },
  {
    icon: Shield,
    title: 'Ambiente Seguro',
    description: 'Espaço protegido e acolhedor para compartilhar experiências e crescer em comunidade.',
    highlight: '100% Seguro',
    color: 'text-emerald-500'
  },
  {
    icon: Clock,
    title: 'Acesso Vitalício',
    description: 'Estude no seu ritmo com acesso permanente a todo o conteúdo adquirido.',
    highlight: 'Para sempre',
    color: 'text-indigo-500'
  },
  {
    icon: Target,
    title: 'Trilhas Personalizadas',
    description: 'Caminhos de aprendizado adaptados aos seus objetivos e nível de conhecimento.',
    highlight: 'Sob medida',
    color: 'text-red-500'
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
}

export function Features() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4">
            Por que escolher Caminhos de Hekate?
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Uma Experiência Completa de
            <span className="text-primary block">
              Transformação Pessoal
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Nossa plataforma oferece tudo que você precisa para uma jornada profunda 
            de autoconhecimento, crescimento espiritual e desenvolvimento pessoal.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg bg-muted group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {feature.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {feature.highlight}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              Pronto para Transformar Sua Vida?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Junte-se a milhares de pessoas que já iniciaram sua jornada de autoconhecimento 
              e descoberta do potencial interior.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Começar Agora
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border border-primary text-primary px-8 py-3 rounded-lg font-medium hover:bg-primary/10 transition-colors"
              >
                Ver Demonstração
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}