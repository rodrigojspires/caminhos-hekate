'use client'

import { motion } from 'framer-motion'
import { 
  Users, 
  Heart, 
  Sparkles, 
  Shield, 
  MessageCircle, 
  Calendar,
  Gift,
  Star,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const joinBenefits = [
  {
    icon: Users,
    title: 'Comunidade Acolhedora',
    description: 'Mais de 25.000 membros prontos para apoiar sua jornada',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: MessageCircle,
    title: 'Conversas Diárias',
    description: 'Discussões profundas e significativas todos os dias',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Calendar,
    title: 'Eventos Exclusivos',
    description: 'Lives, workshops e encontros presenciais regulares',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    icon: Gift,
    title: 'Recursos Gratuitos',
    description: 'Biblioteca, materiais e ferramentas sem custo',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: Heart,
    title: 'Suporte Emocional',
    description: 'Rede de apoio ativa 24 horas por dia',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: Sparkles,
    title: 'Crescimento Acelerado',
    description: 'Aprenda mais rápido com mentores experientes',
    color: 'from-yellow-500 to-orange-500'
  }
]

const steps = [
  {
    number: '01',
    title: 'Cadastre-se Gratuitamente',
    description: 'Crie sua conta em menos de 2 minutos',
    icon: Users,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: '02',
    title: 'Complete seu Perfil',
    description: 'Compartilhe seus interesses e objetivos',
    icon: Heart,
    color: 'from-purple-500 to-pink-500'
  },
  {
    number: '03',
    title: 'Encontre sua Tribo',
    description: 'Conecte-se com pessoas afins em grupos temáticos',
    icon: MessageCircle,
    color: 'from-green-500 to-emerald-500'
  },
  {
    number: '04',
    title: 'Comece a Crescer',
    description: 'Participe de discussões e eventos transformadores',
    icon: Sparkles,
    color: 'from-orange-500 to-red-500'
  }
]

const recentMembers = [
  {
    name: 'Ana Silva',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20spiritual%20seeker%20peaceful%20expression%20warm%20smile%20portrait&image_size=square',
    joinedAgo: '2 horas atrás'
  },
  {
    name: 'Carlos Santos',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=man%20meditation%20practitioner%20calm%20expression%20spiritual%20seeker%20portrait&image_size=square',
    joinedAgo: '5 horas atrás'
  },
  {
    name: 'Maria Oliveira',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20tarot%20reader%20mystical%20intuitive%20expression%20spiritual%20portrait&image_size=square',
    joinedAgo: '1 dia atrás'
  },
  {
    name: 'João Ferreira',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=man%20astrology%20student%20thoughtful%20expression%20spiritual%20learner%20portrait&image_size=square',
    joinedAgo: '1 dia atrás'
  },
  {
    name: 'Lucia Costa',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20energy%20healer%20compassionate%20expression%20spiritual%20therapist%20portrait&image_size=square',
    joinedAgo: '2 dias atrás'
  }
]

const guarantees = [
  {
    icon: Shield,
    title: '100% Gratuito',
    description: 'Sem taxas ocultas ou cobranças futuras'
  },
  {
    icon: Heart,
    title: 'Ambiente Seguro',
    description: 'Moderação ativa e diretrizes claras'
  },
  {
    icon: CheckCircle,
    title: 'Acesso Imediato',
    description: 'Entre na comunidade assim que se cadastrar'
  },
  {
    icon: Star,
    title: 'Satisfação Garantida',
    description: '98% dos membros recomendam nossa comunidade'
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

export function CommunityJoin() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Pronto para
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Transformar sua Vida?
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Junte-se a uma comunidade que realmente se importa com seu crescimento. 
            Sua jornada de transformação começa com um simples clique.
          </p>

          {/* Recent Members */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex -space-x-3">
              {recentMembers.map((member, index) => (
                <Avatar key={member.name} className="w-12 h-12 border-4 border-purple-500 hover:scale-110 transition-transform duration-300">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="text-left">
              <div className="text-white font-semibold">+1.247 pessoas</div>
              <div className="text-gray-400 text-sm">se juntaram esta semana</div>
            </div>
          </div>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {joinBenefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <motion.div key={benefit.title} variants={itemVariants}>
                <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="relative mb-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${benefit.color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-r ${benefit.color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-purple-300 transition-colors duration-300">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* How to Join Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Como Participar em 4 Passos Simples
            </h3>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              O processo é rápido, simples e completamente gratuito. Comece sua transformação hoje mesmo.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="text-center relative"
                >
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent z-0" />
                  )}

                  {/* Step Content */}
                  <div className="relative z-10">
                    <div className="relative mb-6">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-gray-900 font-bold text-sm flex items-center justify-center">
                        {step.number}
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3">
                      {step.title}
                    </h4>
                    <p className="text-gray-300 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-16"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Sua Transformação Começa Agora
              </h3>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Não espere mais para começar sua jornada de crescimento. 
                Milhares de pessoas já transformaram suas vidas. Você é o próximo!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 border-0 px-8 py-4 text-lg font-semibold rounded-xl group">
                  Entrar na Comunidade Agora
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg rounded-xl">
                  Conhecer Mais Sobre Nós
                </Button>
              </div>

              <div className="text-purple-100 text-sm">
                ✨ Cadastro gratuito • ⚡ Acesso imediato • 🛡️ 100% seguro
              </div>
            </div>
          </div>
        </motion.div>

        {/* Guarantees */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {guarantees.map((guarantee, index) => {
            const Icon = guarantee.icon
            return (
              <motion.div key={guarantee.title} variants={itemVariants}>
                <div className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm mb-4 group-hover:bg-white/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h4 className="text-white font-semibold mb-2">
                    {guarantee.title}
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {guarantee.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}