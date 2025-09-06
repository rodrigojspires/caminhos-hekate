'use client'

import { motion } from 'framer-motion'
import { Users, MessageCircle, Heart, Sparkles, Globe, Calendar, Award, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const stats = [
  {
    icon: Users,
    value: '25.000+',
    label: 'Membros Ativos',
    description: 'Pessoas conectadas em jornada de crescimento',
    color: 'from-blue-500 to-cyan-500',
    growth: '+15% este mês'
  },
  {
    icon: MessageCircle,
    value: '500+',
    label: 'Posts Diários',
    description: 'Conversas significativas todos os dias',
    color: 'from-green-500 to-emerald-500',
    growth: '+23% esta semana'
  },
  {
    icon: Heart,
    value: '50.000+',
    label: 'Conexões Formadas',
    description: 'Relacionamentos autênticos criados',
    color: 'from-pink-500 to-rose-500',
    growth: '+8% este mês'
  },
  {
    icon: Sparkles,
    value: '15.000+',
    label: 'Transformações',
    description: 'Histórias de mudança compartilhadas',
    color: 'from-purple-500 to-indigo-500',
    growth: '+12% este mês'
  },
  {
    icon: Globe,
    value: '150+',
    label: 'Cidades Representadas',
    description: 'Diversidade geográfica e cultural',
    color: 'from-orange-500 to-red-500',
    growth: '+5 novas cidades'
  },
  {
    icon: Calendar,
    value: '200+',
    label: 'Eventos Mensais',
    description: 'Encontros virtuais e presenciais',
    color: 'from-teal-500 to-cyan-500',
    growth: '+30% participação'
  },
  {
    icon: Award,
    value: '98%',
    label: 'Satisfação',
    description: 'Membros que recomendam a comunidade',
    color: 'from-yellow-500 to-orange-500',
    growth: 'Mantido alto'
  },
  {
    icon: TrendingUp,
    value: '4.9/5',
    label: 'Avaliação Média',
    description: 'Qualidade reconhecida pelos membros',
    color: 'from-indigo-500 to-purple-500',
    growth: '+0.2 este trimestre'
  }
]

const highlights = [
  {
    title: 'Comunidade Global',
    description: 'Membros de mais de 150 cidades conectados em uma jornada comum de crescimento pessoal e espiritual.',
    icon: Globe,
    color: 'from-blue-500 to-purple-500'
  },
  {
    title: 'Suporte 24/7',
    description: 'Nossa comunidade nunca dorme. Sempre há alguém online para oferecer apoio e compartilhar experiências.',
    icon: Heart,
    color: 'from-pink-500 to-red-500'
  },
  {
    title: 'Crescimento Constante',
    description: 'Mais de 1.000 novos membros se juntam mensalmente, criando uma energia vibrante e renovada.',
    icon: TrendingUp,
    color: 'from-green-500 to-teal-500'
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

export function CommunityStats() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Uma Comunidade que
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Cresce Junto
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Números que refletem o poder da conexão humana e do crescimento coletivo. 
            Cada estatística representa vidas transformadas e relacionamentos autênticos.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm hover:bg-white">
                  <CardContent className="p-6 text-center">
                    {/* Icon */}
                    <div className="relative mb-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300`} />
                    </div>

                    {/* Value */}
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform duration-300">
                      {stat.value}
                    </div>

                    {/* Label */}
                    <div className="text-lg font-semibold text-gray-800 mb-2">
                      {stat.label}
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-600 leading-relaxed mb-3">
                      {stat.description}
                    </div>

                    {/* Growth */}
                    <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                      {stat.growth}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {highlights.map((highlight, index) => {
            const Icon = highlight.icon
            return (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-r ${highlight.color} mb-4`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className={`absolute inset-0 w-20 h-20 rounded-3xl bg-gradient-to-r ${highlight.color} opacity-20 blur-2xl mx-auto`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {highlight.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {highlight.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-white">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Sua Jornada de Crescimento Começa Aqui
            </h3>
            <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Junte-se a milhares de pessoas que encontraram apoio, inspiração e transformação real 
              em nossa comunidade. Cada dia é uma nova oportunidade de crescer junto.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-6 text-purple-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">25.000+ membros</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  <span className="font-semibold">98% satisfação</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Gratuito para sempre</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}