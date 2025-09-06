'use client'

import { motion } from 'framer-motion'
import { 
  Star, 
  Quote, 
  Heart, 
  Crown, 
  Users, 
  TrendingUp,
  Award,
  CheckCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const testimonialsByPlan = {
  gratuito: [
    {
      name: 'Maria Silva',
      role: 'Estudante de Psicologia',
      location: 'São Paulo, SP',
      avatar: '/avatars/maria-silva.jpg',
      rating: 5,
      plan: 'Caminho Livre',
      timeUsing: '8 meses',
      testimonial: 'Comecei no plano gratuito sem expectativas altas, mas fiquei impressionada com a qualidade do conteúdo. Os cursos introdutórios me deram uma base sólida e a comunidade é incrivelmente acolhedora. Já aprendi tanto que nem sinto necessidade de fazer upgrade ainda!',
      highlight: 'Qualidade surpreendente no gratuito',
      coursesCompleted: 12,
      favoriteFeature: 'Meditações guiadas'
    },
    {
      name: 'João Santos',
      role: 'Aposentado',
      location: 'Florianópolis, SC',
      avatar: '/avatars/joao-santos.jpg',
      rating: 5,
      plan: 'Caminho Livre',
      timeUsing: '1 ano',
      testimonial: 'Aos 65 anos, descobri um novo mundo através dos Caminhos de Hekate. O plano gratuito me permitiu explorar sem compromisso financeiro, e hoje sou um praticante dedicado. A comunidade me acolheu de braços abertos e encontrei amigos verdadeiros.',
      highlight: 'Transformação sem custo',
      coursesCompleted: 18,
      favoriteFeature: 'Comunidade acolhedora'
    },
    {
      name: 'Ana Costa',
      role: 'Mãe e Empreendedora',
      location: 'Belo Horizonte, MG',
      avatar: '/avatars/ana-costa.jpg',
      rating: 5,
      plan: 'Caminho Livre',
      timeUsing: '6 meses',
      testimonial: 'Como mãe de dois filhos pequenos, o tempo é sempre escasso. O plano gratuito me permite estudar no meu ritmo, sem pressão. Os rituais básicos já trouxeram mais paz para nossa casa, e as meditações me ajudam a manter o equilíbrio emocional.',
      highlight: 'Flexibilidade para mães ocupadas',
      coursesCompleted: 8,
      favoriteFeature: 'Acesso mobile'
    }
  ],
  premium: [
    {
      name: 'Carla Mendes',
      role: 'Terapeuta Holística',
      location: 'Rio de Janeiro, RJ',
      avatar: '/avatars/carla-mendes.jpg',
      rating: 5,
      plan: 'Caminho Iluminado',
      timeUsing: '1 ano e 3 meses',
      testimonial: 'O upgrade para o plano premium foi a melhor decisão que tomei. Os cursos avançados elevaram minha prática profissional a outro nível. Os workshops ao vivo são transformadores e o grupo VIP no Telegram é uma fonte constante de inspiração e aprendizado.',
      highlight: 'Evolução profissional acelerada',
      coursesCompleted: 35,
      favoriteFeature: 'Workshops ao vivo'
    },
    {
      name: 'Roberto Lima',
      role: 'Consultor Empresarial',
      location: 'Brasília, DF',
      avatar: '/avatars/roberto-lima.jpg',
      rating: 5,
      plan: 'Caminho Iluminado',
      timeUsing: '10 meses',
      testimonial: 'Inicialmente cético, o plano premium me conquistou completamente. A biblioteca completa de meditações me ajuda a manter o foco no trabalho, e os certificados agregaram credibilidade ao meu perfil. O suporte prioritário é excepcional.',
      highlight: 'Credibilidade profissional',
      coursesCompleted: 28,
      favoriteFeature: 'Certificados profissionais'
    },
    {
      name: 'Fernanda Oliveira',
      role: 'Professora Universitária',
      location: 'Porto Alegre, RS',
      avatar: '/avatars/fernanda-oliveira.jpg',
      rating: 5,
      plan: 'Caminho Iluminado',
      timeUsing: '2 anos',
      testimonial: 'Como acadêmica, valorizo conteúdo de qualidade. O plano premium oferece profundidade teórica e prática que não encontro em outros lugares. Os downloads offline são perfeitos para estudar durante viagens, e o acesso antecipado me mantém sempre atualizada.',
      highlight: 'Rigor acadêmico e praticidade',
      coursesCompleted: 42,
      favoriteFeature: 'Downloads offline'
    }
  ],
  vip: [
    {
      name: 'Luciana Ferreira',
      role: 'Coach Espiritual',
      location: 'São Paulo, SP',
      avatar: '/avatars/luciana-ferreira.jpg',
      rating: 5,
      plan: 'Caminho Sagrado',
      timeUsing: '8 meses',
      testimonial: 'O plano VIP transformou completamente minha vida e carreira. A mentoria individual me deu direcionamento personalizado, e o mapa astral revelou aspectos que eu desconhecia sobre mim. O kit físico de ferramentas é lindo e potente. Vale cada centavo!',
      highlight: 'Transformação completa de vida',
      coursesCompleted: 48,
      favoriteFeature: 'Mentoria individual'
    },
    {
      name: 'Marcos Andrade',
      role: 'Empresário',
      location: 'Curitiba, PR',
      avatar: '/avatars/marcos-andrade.jpg',
      rating: 5,
      plan: 'Caminho Sagrado',
      timeUsing: '1 ano',
      testimonial: 'Investir no plano VIP foi uma das melhores decisões da minha vida. As sessões de cura energética me ajudaram a superar bloqueios profundos, e o suporte direto via WhatsApp me dá segurança total. O acesso vitalício garante que esse investimento seja para sempre.',
      highlight: 'Investimento para a vida toda',
      coursesCompleted: 52,
      favoriteFeature: 'Sessões de cura energética'
    },
    {
      name: 'Patrícia Rocha',
      role: 'Artista e Escritora',
      location: 'Salvador, BA',
      avatar: '/avatars/patricia-rocha.jpg',
      rating: 5,
      plan: 'Caminho Sagrado',
      timeUsing: '6 meses',
      testimonial: 'Como artista, busco inspiração constante. O plano VIP me conectou com minha essência criativa de forma profunda. O planejamento personalizado de estudos otimizou meu tempo, e o grupo privado de mentoria é um espaço sagrado de crescimento mútuo.',
      highlight: 'Conexão com essência criativa',
      coursesCompleted: 31,
      favoriteFeature: 'Planejamento personalizado'
    }
  ]
}

const overallStats = {
  totalTestimonials: 2847,
  averageRating: 4.9,
  recommendationRate: 98,
  transformationStories: 1250
}

const planStats = [
  {
    plan: 'Caminho Livre',
    icon: Heart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    users: '15.000+',
    satisfaction: '96%',
    avgRating: 4.8,
    topBenefit: 'Acesso sem compromisso'
  },
  {
    plan: 'Caminho Iluminado',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    users: '8.500+',
    satisfaction: '99%',
    avgRating: 4.9,
    topBenefit: 'Crescimento acelerado'
  },
  {
    plan: 'Caminho Sagrado',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    users: '1.200+',
    satisfaction: '100%',
    avgRating: 5.0,
    topBenefit: 'Transformação completa'
  }
]

export function PricingTestimonials() {
  const allTestimonials = [
    ...testimonialsByPlan.gratuito,
    ...testimonialsByPlan.premium,
    ...testimonialsByPlan.vip
  ]

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
            <Users className="w-4 h-4 mr-2" />
            Depoimentos Reais • {overallStats.totalTestimonials.toLocaleString()} Avaliações
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            O Que Nossos
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Membros Dizem
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Histórias reais de transformação de pessoas que escolheram diferentes caminhos 
            para seu crescimento espiritual.
          </p>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {overallStats.averageRating}/5
              </div>
              <div className="text-sm text-gray-600">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {overallStats.recommendationRate}%
              </div>
              <div className="text-sm text-gray-600">Recomendam</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {overallStats.transformationStories.toLocaleString()}+
              </div>
              <div className="text-sm text-gray-600">Transformações</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                24.700+
              </div>
              <div className="text-sm text-gray-600">Membros Ativos</div>
            </div>
          </div>
        </motion.div>

        {/* Plan Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {planStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.plan}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-2 border-gray-200 hover:border-purple-200 transition-colors duration-300">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${stat.bgColor} mb-4`}>
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {stat.plan}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                          {stat.users}
                        </div>
                        <div className="text-gray-600">Usuários</div>
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                          {stat.satisfaction}
                        </div>
                        <div className="text-gray-600">Satisfação</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < Math.floor(stat.avgRating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                        <span className="text-sm font-semibold text-gray-700 ml-2">
                          {stat.avgRating}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {stat.topBenefit}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {allTestimonials.map((testimonial, index) => (
            <motion.div
              key={`${testimonial.name}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border border-gray-200 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-purple-100 text-purple-600 font-semibold">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">
                          {testimonial.name}
                        </h4>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {testimonial.role}
                      </p>
                      <p className="text-xs text-gray-500">
                        {testimonial.location}
                      </p>
                    </div>
                  </div>

                  {/* Plan Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`${
                      testimonial.plan === 'Caminho Livre' ? 'bg-green-100 text-green-700 border-green-200' :
                      testimonial.plan === 'Caminho Iluminado' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}>
                      {testimonial.plan}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Membro há {testimonial.timeUsing}
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${
                            i < testimonial.rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {testimonial.rating}.0
                    </span>
                  </div>

                  {/* Testimonial */}
                  <div className="relative mb-4">
                    <Quote className="w-6 h-6 text-purple-300 mb-2" />
                    <p className="text-gray-700 leading-relaxed italic">
                      &ldquo;{testimonial.testimonial}&rdquo;
                    </p>
                  </div>

                  {/* Highlight */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-700">
                        Destaque:
                      </span>
                    </div>
                    <p className="text-sm text-purple-600">
                      {testimonial.highlight}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center text-sm border-t border-gray-200 pt-4">
                    <div>
                      <div className="font-bold text-purple-600 mb-1">
                        {testimonial.coursesCompleted}
                      </div>
                      <div className="text-gray-600">Cursos Concluídos</div>
                    </div>
                    <div>
                      <div className="font-bold text-purple-600 mb-1">
                        <Award className="w-4 h-4 mx-auto mb-1" />
                      </div>
                      <div className="text-gray-600 text-xs">
                        {testimonial.favoriteFeature}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

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
                <span className="text-xl font-bold text-gray-900">Junte-se a Milhares de Pessoas</span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 max-w-2xl mx-auto">
                Que já transformaram suas vidas através dos nossos ensinamentos. 
                Sua jornada de crescimento espiritual começa com um simples passo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Começar Gratuitamente
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Ver Todos os Planos
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}