'use client'

import { motion } from 'framer-motion'
import { 
  MessageCircle, 
  Users, 
  Calendar, 
  BookOpen, 
  Heart, 
  Zap, 
  Shield, 
  Sparkles,
  Video,
  Coffee,
  Gift,
  Star
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

const features = [
  {
    icon: MessageCircle,
    title: 'Fóruns Temáticos',
    description: 'Discussões organizadas por temas específicos como tarot, astrologia, meditação e desenvolvimento pessoal.',
    benefits: ['Conversas focadas', 'Especialistas ativos', 'Conteúdo curado'],
    color: 'from-blue-500 to-cyan-500',
    popular: true
  },
  {
    icon: Users,
    title: 'Círculos de Estudo',
    description: 'Grupos pequenos para aprofundamento em práticas específicas com acompanhamento personalizado.',
    benefits: ['Grupos de 8-12 pessoas', 'Mentoria dedicada', 'Progresso acompanhado'],
    color: 'from-purple-500 to-indigo-500',
    popular: false
  },
  {
    icon: Calendar,
    title: 'Eventos Ao Vivo',
    description: 'Lives semanais, workshops, rituais coletivos e encontros presenciais em diversas cidades.',
    benefits: ['Lives semanais', 'Workshops mensais', 'Encontros presenciais'],
    color: 'from-green-500 to-emerald-500',
    popular: true
  },
  {
    icon: BookOpen,
    title: 'Biblioteca Compartilhada',
    description: 'Acesso a livros, artigos, pesquisas e materiais exclusivos compartilhados pela comunidade.',
    benefits: ['500+ recursos', 'Atualizações semanais', 'Conteúdo exclusivo'],
    color: 'from-orange-500 to-red-500',
    popular: false
  },
  {
    icon: Heart,
    title: 'Rede de Apoio',
    description: 'Sistema de buddy para acompanhamento mútuo e suporte emocional durante a jornada.',
    benefits: ['Parceiros de jornada', 'Suporte 24/7', 'Check-ins regulares'],
    color: 'from-pink-500 to-rose-500',
    popular: true
  },
  {
    icon: Zap,
    title: 'Desafios Mensais',
    description: 'Desafios práticos para aplicar os ensinamentos no dia a dia com recompensas e reconhecimento.',
    benefits: ['Desafios práticos', 'Sistema de pontos', 'Recompensas exclusivas'],
    color: 'from-yellow-500 to-orange-500',
    popular: false
  },
  {
    icon: Shield,
    title: 'Ambiente Seguro',
    description: 'Moderação ativa, diretrizes claras e ambiente respeitoso para compartilhamento autêntico.',
    benefits: ['Moderação 24/7', 'Diretrizes claras', 'Zero tolerância'],
    color: 'from-teal-500 to-cyan-500',
    popular: false
  },
  {
    icon: Sparkles,
    title: 'Mentoria Coletiva',
    description: 'Acesso direto aos instrutores e mentores experientes para orientação personalizada.',
    benefits: ['Instrutores ativos', 'Q&A semanais', 'Orientação personalizada'],
    color: 'from-indigo-500 to-purple-500',
    popular: true
  }
]

const specialFeatures = [
  {
    icon: Video,
    title: 'Salas de Prática',
    description: 'Espaços virtuais para meditação em grupo, rituais coletivos e práticas guiadas.',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20meditation%20room%20with%20candles%20crystals%20peaceful%20atmosphere%20people%20meditating%20together%20online%20spiritual%20space&image_size=landscape_4_3'
  },
  {
    icon: Coffee,
    title: 'Café Virtual',
    description: 'Conversas informais, networking e conexões espontâneas em ambiente descontraído.',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20virtual%20cafe%20space%20people%20chatting%20warm%20lighting%20comfortable%20atmosphere%20online%20community%20gathering&image_size=landscape_4_3'
  },
  {
    icon: Gift,
    title: 'Trocas e Presentes',
    description: 'Sistema de troca de conhecimentos, materiais e presentes simbólicos entre membros.',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=gift%20exchange%20spiritual%20items%20crystals%20books%20handmade%20crafts%20community%20sharing%20warm%20colors&image_size=landscape_4_3'
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

export function CommunityFeatures() {
  return (
    <section className="py-20 bg-white">
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
            Recursos que
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Conectam e Transformam
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Nossa comunidade oferece ferramentas e espaços únicos para apoiar sua jornada 
            de crescimento pessoal e espiritual de forma autêntica e significativa.
          </p>
        </motion.div>

        {/* Main Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 hover:from-white hover:to-white h-full">
                  <CardContent className="p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="relative">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className={`absolute inset-0 w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} opacity-20 blur-lg group-hover:opacity-30 transition-opacity duration-300`} />
                      </div>
                      {feature.popular && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0">
                          <Star className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors duration-300">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 leading-relaxed mb-4 flex-grow">
                      {feature.description}
                    </p>

                    {/* Benefits */}
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.color}`} />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Special Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Experiências Únicas
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Espaços especiais criados para aprofundar conexões e vivenciar práticas transformadoras.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {specialFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 overflow-hidden">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <Image 
                        src={feature.image} 
                        alt={feature.title}
                        width={400}
                        height={192}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <h4 className="text-xl font-bold text-gray-900 mb-3">
                        {feature.title}
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20" />
              <div className="absolute top-0 left-0 w-full h-full">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full opacity-20"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Pronto para Fazer Parte desta Comunidade?
              </h3>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Junte-se a milhares de pessoas em uma jornada de crescimento autêntico. 
                Sua transformação começa com uma simples conexão.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-8 py-3 text-lg font-semibold rounded-xl">
                  Entrar na Comunidade
                </Button>
                <Button variant="outline" size="lg" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-8 py-3 text-lg rounded-xl">
                  Conhecer Mais
                </Button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-6 text-gray-400 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>100% Gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>Ambiente Seguro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>25.000+ Membros</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Acesso Imediato</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}