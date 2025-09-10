'use client'

import { motion } from 'framer-motion'
import { 
  Check, 
  Star, 
  Crown, 
  Heart, 
  Users, 
  BookOpen, 
  Video, 
  MessageCircle, 
  Calendar, 
  Award, 
  Infinity, 
  Zap,
  Gift,
  Shield
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useEffect, useMemo, useState } from 'react'

type PlanUI = {
  id: string
  name: string
  description: string
  price: string
  originalPrice: string | null
  period: string
  badge?: { text: string; color: string }
  icon: any
  color: string
  features: string[]
  limitations: string[]
  cta: string
  highlight: boolean
}

const plans = [
  {
    id: 'gratuito',
    name: 'Caminho Livre',
    description: 'Perfeito para começar sua jornada',
    price: 'Gratuito',
    originalPrice: null,
    period: 'Para sempre',
    badge: {
      text: 'Mais Popular',
      color: 'bg-green-500'
    },
    icon: Heart,
    color: 'from-green-500 to-emerald-600',
    features: [
      'Acesso a 20+ cursos introdutórios',
      'Biblioteca de meditações guiadas',
      'Comunidade de apoio',
      'Rituais básicos e práticas',
      'Newsletter semanal',
      'Suporte via comunidade',
      'Acesso mobile completo'
    ],
    limitations: [
      'Cursos avançados limitados',
      'Sem mentoria individual',
      'Sem certificados'
    ],
    cta: 'Começar Gratuitamente',
    highlight: true
  },
  {
    id: 'premium',
    name: 'Caminho Iluminado',
    description: 'Para quem busca crescimento acelerado',
    price: 'R$ 97',
    originalPrice: 'R$ 147',
    period: '/mês',
    badge: {
      text: 'Melhor Custo-Benefício',
      color: 'bg-purple-500'
    },
    icon: Star,
    color: 'from-purple-500 to-indigo-600',
    features: [
      'Tudo do plano gratuito',
      'Acesso completo a todos os cursos',
      'Workshops mensais ao vivo',
      'Biblioteca premium de rituais',
      'Grupo VIP no Telegram',
      'Suporte prioritário',
      'Downloads para estudo offline',
      'Certificados de conclusão',
      'Acesso antecipado a novos conteúdos'
    ],
    limitations: [],
    cta: 'Começar Agora',
    highlight: false
  },
  {
    id: 'vip',
    name: 'Caminho Sagrado',
    description: 'Transformação completa com mentoria',
    price: 'R$ 297',
    originalPrice: 'R$ 497',
    period: '/mês',
    badge: {
      text: 'Transformação Completa',
      color: 'bg-gradient-to-r from-yellow-400 to-orange-500'
    },
    icon: Crown,
    color: 'from-yellow-400 to-orange-500',
    features: [
      'Tudo do plano premium',
      'Mentoria individual mensal (1h)',
      'Acesso a cursos exclusivos VIP',
      'Grupo privado de mentoria',
      'Análise personalizada de mapa astral',
      'Kit físico de ferramentas mágicas',
      'Suporte direto via WhatsApp',
      'Sessões de cura energética',
      'Planejamento personalizado de estudos',
      'Acesso vitalício aos conteúdos'
    ],
    limitations: [],
    cta: 'Transformar Minha Vida',
    highlight: false
  }
]

const annualDiscount = {
  percentage: 40,
  message: 'Economize 40% pagando anualmente'
}

const guarantees = [
  {
    icon: Shield,
    title: '30 Dias de Garantia',
    description: 'Reembolso completo se não ficar satisfeito'
  },
  {
    icon: Infinity,
    title: 'Sem Compromisso',
    description: 'Cancele a qualquer momento'
  },
  {
    icon: Gift,
    title: 'Bônus Exclusivos',
    description: 'Materiais extras para novos membros'
  }
]

export function PricingPlans() {
  const [remotePlans, setRemotePlans] = useState<PlanUI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/payments/plans')
        if (!res.ok) throw new Error('failed to load plans')
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        const fmt = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const mapIcon = (tier?: string) => {
          if (!tier) return Star
          if (/vip|sacer/i.test(tier)) return Crown
          if (/ini|free|grat/i.test(tier)) return Heart
          return Star
        }
        const palette = ['from-purple-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-yellow-400 to-orange-500']
        const ui: PlanUI[] = data.map((p: any, idx: number) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.monthlyPrice || 0) > 0 ? fmt(p.monthlyPrice) : 'Gratuito',
          originalPrice: null,
          period: Number(p.monthlyPrice || 0) > 0 ? '/mês' : 'Para sempre',
          badge: p.isPopular ? { text: 'Mais Popular', color: 'bg-purple-600' } : undefined,
          icon: mapIcon(p.tier),
          color: palette[idx % palette.length],
          features: Array.isArray(p.features) ? p.features : [],
          limitations: [],
          cta: Number(p.monthlyPrice || 0) > 0 ? 'Começar Agora' : 'Começar Gratuitamente',
          highlight: Boolean(p.isPopular)
        }))
        if (!cancelled) setRemotePlans(ui)
      } catch {
        if (!cancelled) setRemotePlans([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const plansToRender = useMemo(() => (remotePlans.length ? remotePlans : plans), [remotePlans])
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
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
            <Zap className="w-4 h-4 mr-2" />
            Planos Especiais • Promoção Limitada
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Escolha Seu
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Caminho de Crescimento
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Cada plano foi cuidadosamente desenvolvido para diferentes momentos da sua jornada. 
            Comece gratuitamente e evolua no seu ritmo.
          </p>

          {/* Annual Discount Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Gift className="w-6 h-6" />
              <span className="text-lg font-bold">Oferta Especial</span>
            </div>
            <p className="text-purple-100">
              {annualDiscount.message} • Válido apenas este mês!
            </p>
          </motion.div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {(loading ? [] : plansToRender).map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative ${plan.highlight ? 'lg:scale-105 lg:-mt-4' : ''}`}
              >
                <Card className={`h-full border-2 transition-all duration-300 hover:shadow-2xl ${
                  plan.highlight 
                    ? 'border-green-200 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50' 
                    : 'border-gray-200 hover:border-purple-200'
                }`}>
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className={`${plan.badge.color} text-white border-0 px-4 py-2 font-semibold`}>
                        {plan.badge.text}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8 pt-8">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${plan.color} mb-6 mx-auto`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-600 mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {plan.originalPrice && (
                          <span className="text-lg text-gray-400 line-through">
                            {plan.originalPrice}
                          </span>
                        )}
                        <span className={`text-4xl font-bold ${
                          plan.id === 'gratuito' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-gray-600">
                            {plan.period}
                          </span>
                        )}
                      </div>
                      {plan.originalPrice && (
                        <div className="text-sm text-green-600 font-semibold">
                          Economize {Math.round(((parseInt(plan.originalPrice.replace(/[^0-9]/g, '')) - parseInt(plan.price.replace(/[^0-9]/g, ''))) / parseInt(plan.originalPrice.replace(/[^0-9]/g, ''))) * 100)}%
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Button 
                      size="lg" 
                      className={`w-full mb-8 ${
                        plan.highlight 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                          : plan.id === 'vip'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      } text-white border-0 font-semibold`}
                    >
                      {plan.cta}
                    </Button>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Features */}
                    <div className="space-y-4 mb-6">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        O que está incluído:
                      </h4>
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 leading-relaxed">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Limitations */}
                    {plan.limitations.length > 0 && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="font-semibold text-gray-600 mb-3">
                          Limitações:
                        </h4>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, limitIndex) => (
                            <li key={limitIndex} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-gray-600 text-sm leading-relaxed">
                                {limitation}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Guarantees */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {guarantees.map((guarantee, index) => {
            const Icon = guarantee.icon
            return (
              <motion.div
                key={guarantee.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 mb-4 group-hover:from-purple-200 group-hover:to-pink-200 transition-colors duration-300">
                  <Icon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {guarantee.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {guarantee.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Heart className="w-6 h-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">Ainda tem dúvidas?</span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 max-w-2xl mx-auto">
                Nossa equipe está aqui para ajudar você a escolher o plano ideal para sua jornada. 
                Entre em contato e tire todas as suas dúvidas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" size="lg" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  Falar com Especialista
                </Button>
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  Ver FAQ Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
