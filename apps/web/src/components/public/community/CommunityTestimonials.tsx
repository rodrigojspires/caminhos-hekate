'use client'

import { motion } from 'framer-motion'
import { Quote, Star, Heart, MessageCircle, Users, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const testimonials = [
  {
    id: 1,
    name: 'Marina Silva',
    role: 'Terapeuta Holística',
    location: 'São Paulo, SP',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20woman%20therapist%20warm%20smile%20spiritual%20healer%20portrait%20peaceful%20expression&image_size=square',
    rating: 5,
    joinDate: 'Membro há 2 anos',
    testimonial: 'Esta comunidade transformou completamente minha prática profissional. As trocas diárias me inspiram e os círculos de estudo aprofundaram meu conhecimento de forma incrível. Encontrei aqui não apenas colegas, mas verdadeiros amigos de jornada.',
    highlight: 'Crescimento Profissional',
    interactions: {
      posts: 156,
      connections: 89,
      events: 23
    },
    featured: true
  },
  {
    id: 2,
    name: 'Carlos Mendoza',
    role: 'Estudante de Astrologia',
    location: 'Rio de Janeiro, RJ',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=young%20man%20student%20astrology%20books%20thoughtful%20expression%20spiritual%20seeker%20portrait&image_size=square',
    rating: 5,
    joinDate: 'Membro há 1 ano',
    testimonial: 'Como iniciante, me sentia perdido no mundo da astrologia. Aqui encontrei mentores incríveis e um grupo de estudos que me acolheu desde o primeiro dia. Hoje me sinto confiante para fazer minhas primeiras leituras!',
    highlight: 'Suporte para Iniciantes',
    interactions: {
      posts: 78,
      connections: 45,
      events: 12
    },
    featured: false
  },
  {
    id: 3,
    name: 'Ana Beatriz',
    role: 'Praticante de Tarot',
    location: 'Belo Horizonte, MG',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20tarot%20reader%20mystical%20cards%20intuitive%20expression%20spiritual%20practitioner%20portrait&image_size=square',
    rating: 5,
    joinDate: 'Membro há 3 anos',
    testimonial: 'A qualidade das discussões aqui é excepcional. Cada post é uma oportunidade de aprender algo novo. Os eventos ao vivo são transformadores e a rede de apoio me sustentou em momentos difíceis da minha jornada.',
    highlight: 'Qualidade do Conteúdo',
    interactions: {
      posts: 234,
      connections: 127,
      events: 45
    },
    featured: true
  },
  {
    id: 4,
    name: 'Roberto Santos',
    role: 'Instrutor de Meditação',
    location: 'Florianópolis, SC',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=meditation%20teacher%20man%20peaceful%20serene%20expression%20spiritual%20instructor%20calm%20portrait&image_size=square',
    rating: 5,
    joinDate: 'Membro há 4 anos',
    testimonial: 'Participar desta comunidade desde o início foi uma das melhores decisões da minha vida. Ver o crescimento de cada membro, as transformações reais e o impacto positivo que criamos juntos é profundamente gratificante.',
    highlight: 'Impacto Transformador',
    interactions: {
      posts: 312,
      connections: 189,
      events: 67
    },
    featured: false
  },
  {
    id: 5,
    name: 'Lucia Fernandes',
    role: 'Estudante de Numerologia',
    location: 'Porto Alegre, RS',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20numerology%20student%20numbers%20calculations%20focused%20expression%20spiritual%20learner%20portrait&image_size=square',
    rating: 5,
    joinDate: 'Membro há 6 meses',
    testimonial: 'Mesmo sendo nova na comunidade, me sinto completamente acolhida. O sistema de buddy me conectou com uma mentora incrível, e os desafios mensais tornam o aprendizado divertido e prático.',
    highlight: 'Acolhimento Caloroso',
    interactions: {
      posts: 34,
      connections: 28,
      events: 8
    },
    featured: false
  },
  {
    id: 6,
    name: 'Diego Oliveira',
    role: 'Terapeuta Energético',
    location: 'Salvador, BA',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=energy%20healer%20man%20hands%20healing%20light%20spiritual%20therapist%20compassionate%20expression%20portrait&image_size=square',
    rating: 5,
    joinDate: 'Membro há 1.5 anos',
    testimonial: 'A diversidade de conhecimentos compartilhados aqui é impressionante. Cada dia descubro uma nova perspectiva ou técnica que enriquece minha prática. A comunidade realmente vive os valores que prega.',
    highlight: 'Diversidade de Conhecimento',
    interactions: {
      posts: 145,
      connections: 76,
      events: 28
    },
    featured: true
  }
]

const communityStats = [
  {
    icon: MessageCircle,
    value: '15.000+',
    label: 'Conversas Significativas',
    description: 'Posts e comentários que geram transformação'
  },
  {
    icon: Heart,
    value: '98%',
    label: 'Membros Satisfeitos',
    description: 'Recomendam a comunidade para amigos'
  },
  {
    icon: Users,
    value: '2.500+',
    label: 'Conexões Formadas',
    description: 'Relacionamentos autênticos criados mensalmente'
  },
  {
    icon: Calendar,
    value: '200+',
    label: 'Eventos Realizados',
    description: 'Lives, workshops e encontros este ano'
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

export function CommunityTestimonials() {
  const featuredTestimonials = testimonials.filter(t => t.featured)
  const regularTestimonials = testimonials.filter(t => !t.featured)

  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
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
            Histórias de
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Transformação Real
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Cada membro traz uma história única de crescimento, descoberta e transformação. 
            Conheça algumas das jornadas que nos inspiram todos os dias.
          </p>
        </motion.div>

        {/* Featured Testimonials */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {featuredTestimonials.map((testimonial, index) => (
            <motion.div key={testimonial.id} variants={itemVariants}>
              <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white h-full relative overflow-hidden">
                {/* Featured Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                    Destaque
                  </Badge>
                </div>

                <CardContent className="p-8 h-full flex flex-col">
                  {/* Quote Icon */}
                  <div className="relative mb-6">
                    <Quote className="w-12 h-12 text-purple-200 absolute -top-2 -left-2" />
                    <div className="relative z-10">
                      <p className="text-gray-700 leading-relaxed text-lg italic mb-6">
                        &ldquo;{testimonial.testimonial}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Author Info */}
                  <div className="flex items-start gap-4 mb-6">
                    <Avatar className="w-16 h-16 ring-4 ring-purple-100 group-hover:ring-purple-200 transition-all duration-300">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                      <p className="text-purple-600 font-medium">{testimonial.role}</p>
                      <p className="text-gray-500 text-sm">{testimonial.location}</p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">({testimonial.rating}.0)</span>
                  </div>

                  {/* Highlight */}
                  <div className="mb-4">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {testimonial.highlight}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 mt-auto">
                    <div className="text-center">
                      <div className="font-bold text-purple-600">{testimonial.interactions.posts}</div>
                      <div className="text-xs text-gray-500">Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-purple-600">{testimonial.interactions.connections}</div>
                      <div className="text-xs text-gray-500">Conexões</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-purple-600">{testimonial.interactions.events}</div>
                      <div className="text-xs text-gray-500">Eventos</div>
                    </div>
                  </div>

                  {/* Join Date */}
                  <div className="text-center mt-4 text-sm text-gray-500">
                    {testimonial.joinDate}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Regular Testimonials */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          {regularTestimonials.map((testimonial, index) => (
            <motion.div key={testimonial.id} variants={itemVariants}>
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 h-full">
                <CardContent className="p-6 h-full flex flex-col">
                  {/* Quote */}
                  <div className="relative mb-4">
                    <Quote className="w-8 h-8 text-purple-200 absolute -top-1 -left-1" />
                    <div className="relative z-10">
                      <p className="text-gray-700 leading-relaxed italic mb-4">
                        &ldquo;{testimonial.testimonial}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                      <p className="text-purple-600 text-sm font-medium">{testimonial.role}</p>
                    </div>
                  </div>

                  {/* Rating & Highlight */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {testimonial.highlight}
                    </Badge>
                  </div>

                  {/* Join Date */}
                  <div className="text-sm text-gray-500 mt-auto">
                    {testimonial.joinDate}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-xl"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              O Que Nossa Comunidade Alcança Juntos
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Cada número representa conexões reais, transformações autênticas e o poder do crescimento coletivo.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {communityStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-lg font-semibold text-gray-800 mb-2">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.description}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}