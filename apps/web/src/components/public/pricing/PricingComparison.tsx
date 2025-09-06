'use client'

import { motion } from 'framer-motion'
import { 
  Check, 
  X, 
  Star, 
  Crown, 
  Heart, 
  Infinity,
  Users,
  BookOpen,
  Video,
  MessageCircle,
  Calendar,
  Award,
  Headphones,
  Download,
  Shield,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const plans = [
  {
    id: 'gratuito',
    name: 'Caminho Livre',
    price: 'Gratuito',
    period: 'Para sempre',
    icon: Heart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'premium',
    name: 'Caminho Iluminado',
    price: 'R$ 97',
    period: '/mês',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    popular: true
  },
  {
    id: 'vip',
    name: 'Caminho Sagrado',
    price: 'R$ 297',
    period: '/mês',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  }
]

const featureCategories = [
  {
    name: 'Conteúdo e Cursos',
    icon: BookOpen,
    features: [
      {
        name: 'Cursos introdutórios',
        description: 'Acesso aos fundamentos básicos',
        gratuito: '20+ cursos',
        premium: '50+ cursos',
        vip: 'Todos os cursos'
      },
      {
        name: 'Cursos avançados',
        description: 'Práticas e conhecimentos profundos',
        gratuito: false,
        premium: 'Acesso completo',
        vip: 'Acesso completo + Exclusivos'
      },
      {
        name: 'Workshops ao vivo',
        description: 'Sessões interativas mensais',
        gratuito: false,
        premium: 'Mensais',
        vip: 'Semanais + Privados'
      },
      {
        name: 'Biblioteca de meditações',
        description: 'Práticas guiadas para todos os níveis',
        gratuito: 'Básica (50+)',
        premium: 'Completa (200+)',
        vip: 'Premium (300+) + Personalizadas'
      },
      {
        name: 'Rituais e práticas',
        description: 'Guias detalhados para cerimônias',
        gratuito: 'Básicos',
        premium: 'Avançados',
        vip: 'Todos + Personalizados'
      }
    ]
  },
  {
    name: 'Comunidade e Suporte',
    icon: Users,
    features: [
      {
        name: 'Comunidade geral',
        description: 'Acesso ao fórum principal',
        gratuito: true,
        premium: true,
        vip: true
      },
      {
        name: 'Grupo VIP Telegram',
        description: 'Comunidade exclusiva para membros premium',
        gratuito: false,
        premium: true,
        vip: true
      },
      {
        name: 'Grupo privado de mentoria',
        description: 'Acesso direto aos mentores',
        gratuito: false,
        premium: false,
        vip: true
      },
      {
        name: 'Suporte prioritário',
        description: 'Resposta em até 24h',
        gratuito: false,
        premium: true,
        vip: 'WhatsApp direto'
      },
      {
        name: 'Mentoria individual',
        description: 'Sessões 1:1 com especialistas',
        gratuito: false,
        premium: false,
        vip: '1h/mês'
      }
    ]
  },
  {
    name: 'Recursos e Ferramentas',
    icon: Zap,
    features: [
      {
        name: 'Acesso mobile',
        description: 'App para iOS e Android',
        gratuito: true,
        premium: true,
        vip: true
      },
      {
        name: 'Downloads offline',
        description: 'Estude sem conexão',
        gratuito: false,
        premium: true,
        vip: true
      },
      {
        name: 'Certificados',
        description: 'Comprovação de conclusão',
        gratuito: false,
        premium: true,
        vip: true
      },
      {
        name: 'Mapa astral personalizado',
        description: 'Análise completa do seu mapa',
        gratuito: false,
        premium: false,
        vip: true
      },
      {
        name: 'Kit físico de ferramentas',
        description: 'Materiais mágicos enviados por correio',
        gratuito: false,
        premium: false,
        vip: true
      },
      {
        name: 'Sessões de cura energética',
        description: 'Limpeza e harmonização energética',
        gratuito: false,
        premium: false,
        vip: 'Mensais'
      }
    ]
  },
  {
    name: 'Benefícios Especiais',
    icon: Award,
    features: [
      {
        name: 'Acesso antecipado',
        description: 'Novos conteúdos antes de todos',
        gratuito: false,
        premium: true,
        vip: true
      },
      {
        name: 'Desconto em produtos',
        description: 'Livros, cursos externos e eventos',
        gratuito: false,
        premium: '15%',
        vip: '30%'
      },
      {
        name: 'Acesso vitalício',
        description: 'Mantenha acesso mesmo após cancelar',
        gratuito: false,
        premium: false,
        vip: true
      },
      {
        name: 'Planejamento personalizado',
        description: 'Roteiro de estudos sob medida',
        gratuito: false,
        premium: false,
        vip: true
      }
    ]
  }
]

function FeatureValue({ value, planId }: { value: any, planId: string }) {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-500 mx-auto" />
  }
  if (value === false) {
    return <X className="w-5 h-5 text-gray-300 mx-auto" />
  }
  return (
    <span className={`text-sm font-medium ${
      planId === 'gratuito' ? 'text-green-600' :
      planId === 'premium' ? 'text-purple-600' :
      'text-yellow-600'
    }`}>
      {value}
    </span>
  )
}

export function PricingComparison() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-6">
            <Shield className="w-4 h-4 mr-2" />
            Comparação Detalhada
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Compare Todos os
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Recursos e Benefícios
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Veja exatamente o que cada plano oferece para fazer a escolha mais consciente 
            para sua jornada de crescimento espiritual.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <div className="min-w-[800px]">
            {/* Plans Header */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-4">
                {/* Empty space for feature names */}
              </div>
              {plans.map((plan, index) => {
                const Icon = plan.icon
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className={`${plan.borderColor} border-2 ${plan.bgColor} relative`}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-purple-600 text-white border-0">
                            Mais Popular
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pb-4">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${plan.bgColor} mb-3 mx-auto`}>
                          <Icon className={`w-6 h-6 ${plan.color}`} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${plan.color}`}>
                            {plan.price}
                          </span>
                          {plan.period && (
                            <span className="text-gray-600 text-sm ml-1">
                              {plan.period}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Feature Categories */}
            {featureCategories.map((category, categoryIndex) => {
              const CategoryIcon = category.icon
              return (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100">
                      <CategoryIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {category.name}
                    </h3>
                  </div>

                  {/* Features */}
                  <Card className="border border-gray-200">
                    <CardContent className="p-0">
                      {category.features.map((feature, featureIndex) => (
                        <div
                          key={feature.name}
                          className={`grid grid-cols-4 gap-4 p-4 ${
                            featureIndex !== category.features.length - 1 ? 'border-b border-gray-100' : ''
                          } hover:bg-gray-50 transition-colors duration-200`}
                        >
                          {/* Feature Name */}
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 mb-1">
                              {feature.name}
                            </span>
                            <span className="text-sm text-gray-600 leading-relaxed">
                              {feature.description}
                            </span>
                          </div>

                          {/* Plan Values */}
                          <div className="flex items-center justify-center">
                            <FeatureValue value={feature.gratuito} planId="gratuito" />
                          </div>
                          <div className="flex items-center justify-center">
                            <FeatureValue value={feature.premium} planId="premium" />
                          </div>
                          <div className="flex items-center justify-center">
                            <FeatureValue value={feature.vip} planId="vip" />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid grid-cols-4 gap-4 mt-8"
            >
              <div className="p-4">
                {/* Empty space */}
              </div>
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Button 
                    size="lg" 
                    className={`w-full ${
                      plan.id === 'gratuito' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                        : plan.id === 'premium'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                    } text-white border-0 font-semibold`}
                  >
                    {plan.id === 'gratuito' ? 'Começar Grátis' :
                     plan.id === 'premium' ? 'Escolher Plano' :
                     'Transformar Vida'}
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Infinity className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">Flexibilidade Total</span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 max-w-3xl mx-auto">
                Você pode começar com qualquer plano e fazer upgrade ou downgrade a qualquer momento. 
                Nosso objetivo é apoiar sua jornada, independente do momento em que você está.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" size="lg" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  Falar com Especialista
                </Button>
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  Começar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}