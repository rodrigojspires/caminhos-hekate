'use client'

import { motion } from 'framer-motion'
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Heart, 
  Users, 
  Star,
  Send,
  Headphones,
  Shield,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const contactStats = [
  {
    icon: MessageCircle,
    value: '2.847',
    label: 'Mensagens Respondidas',
    color: 'text-blue-600'
  },
  {
    icon: Clock,
    value: '2h',
    label: 'Tempo Médio de Resposta',
    color: 'text-green-600'
  },
  {
    icon: Star,
    value: '4.9/5',
    label: 'Avaliação do Atendimento',
    color: 'text-yellow-600'
  },
  {
    icon: Users,
    value: '98%',
    label: 'Taxa de Satisfação',
    color: 'text-purple-600'
  }
]

const quickContacts = [
  {
    icon: MessageCircle,
    title: 'Chat ao Vivo',
    description: 'Disponível 24/7 para membros',
    action: 'Iniciar Chat',
    color: 'bg-blue-500 hover:bg-blue-600',
    available: true
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'Resposta em até 2 horas',
    action: 'Enviar Email',
    color: 'bg-green-500 hover:bg-green-600',
    available: true
  },
  {
    icon: Phone,
    title: 'WhatsApp VIP',
    description: 'Exclusivo para Caminho Sagrado',
    action: 'Chamar no WhatsApp',
    color: 'bg-emerald-500 hover:bg-emerald-600',
    available: false
  }
]

const supportFeatures = [
  {
    icon: Headphones,
    title: 'Suporte Especializado',
    description: 'Equipe treinada em desenvolvimento espiritual'
  },
  {
    icon: Shield,
    title: 'Privacidade Garantida',
    description: 'Suas informações são tratadas com total confidencialidade'
  },
  {
    icon: Zap,
    title: 'Resposta Rápida',
    description: 'Priorizamos o atendimento ágil e eficiente'
  },
  {
    icon: Heart,
    title: 'Atendimento Humanizado',
    description: 'Cada pessoa é única e merece atenção especial'
  }
]

export function ContactHero() {
  return (
    <section className="relative py-20 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="bg-white/20 text-white border-white/30 mb-6">
              <MessageCircle className="w-4 h-4 mr-2" />
              Estamos Aqui Para Você
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Entre em
              <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                Contato
              </span>
            </h1>
            
            <p className="text-xl text-purple-100 leading-relaxed mb-8">
              Nossa equipe está pronta para apoiar sua jornada de crescimento espiritual. 
              Tire suas dúvidas, compartilhe sua experiência ou solicite informações.
            </p>

            {/* Quick Contact Buttons */}
            <div className="space-y-4 mb-8">
              {quickContacts.map((contact, index) => {
                const Icon = contact.icon
                return (
                  <motion.div
                    key={contact.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  >
                    <Button
                      className={`w-full justify-start text-left p-4 h-auto ${contact.color} text-white border-0 ${!contact.available ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={!contact.available}
                    >
                      <Icon className="w-5 h-5 mr-4 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">{contact.title}</div>
                        <div className="text-sm opacity-90">{contact.description}</div>
                      </div>
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )
              })}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 gap-6"
            >
              {contactStats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mb-3">
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-purple-200">
                      {stat.label}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </motion.div>

          {/* Right Content - Support Features */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Por Que Escolher Nosso Suporte?
              </h3>
              <p className="text-purple-200">
                Oferecemos mais do que atendimento, oferecemos cuidado genuíno.
              </p>
            </div>

            {supportFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                >
                  <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {feature.title}
                          </h4>
                          <p className="text-purple-200 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}

            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center"
            >
              <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Shield className="w-6 h-6 text-yellow-300" />
                    <span className="text-lg font-semibold text-white">
                      Atendimento Certificado
                    </span>
                  </div>
                  <p className="text-yellow-200 text-sm">
                    Nossa equipe é certificada em atendimento humanizado e 
                    desenvolvimento espiritual.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </section>
  )
}