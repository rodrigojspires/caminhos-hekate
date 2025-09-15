'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Award, Clock, Users, Star, BookOpen, Target, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const stats = [
  {
    icon: BookOpen,
    value: '150+',
    label: 'Cursos Disponíveis',
    description: 'Conteúdo diversificado para todos os níveis',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    icon: Users,
    value: '25.000+',
    label: 'Estudantes Ativos',
    description: 'Comunidade engajada em crescimento',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Clock,
    value: '2.500+',
    label: 'Horas de Conteúdo',
    description: 'Material premium e exclusivo',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Star,
    value: '4.9/5',
    label: 'Avaliação Média',
    description: 'Qualidade reconhecida pelos alunos',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: Award,
    value: '12.000+',
    label: 'Certificados Emitidos',
    description: 'Reconhecimento do seu progresso',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: TrendingUp,
    value: '95%',
    label: 'Taxa de Conclusão',
    description: 'Metodologia eficaz e envolvente',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    icon: Target,
    value: '89%',
    label: 'Aplicação Prática',
    description: 'Transformação real na vida dos alunos',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: Heart,
    value: '98%',
    label: 'Satisfação Geral',
    description: 'Experiência transformadora garantida',
    color: 'from-rose-500 to-pink-500'
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

export function CourseStats() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Números que
            <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Falam por Si
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Nossa plataforma é reconhecida pela qualidade excepcional e resultados transformadores. 
            Veja os números que comprovam nosso compromisso com sua jornada de crescimento.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900">
                  <CardContent className="p-6 text-center">
                    {/* Icon */}
                    <div className="relative mb-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300`} />
                    </div>

                    {/* Value */}
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:scale-105 transition-transform duration-300">
                      {stat.value}
                    </div>

                    {/* Label */}
                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {stat.label}
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {stat.description}
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
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Faça Parte desta Comunidade Transformadora
            </h3>
            <p className="text-lg text-purple-100 mb-6 max-w-2xl mx-auto">
              Junte-se a milhares de pessoas que já transformaram suas vidas através dos nossos cursos. 
              Sua jornada de crescimento começa aqui.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2 text-purple-100">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">4.9/5 estrelas</span>
                <span>• 15.000+ avaliações</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
