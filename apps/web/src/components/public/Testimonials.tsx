'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StrophalosIcon, TorchLeft, TorchRight } from '@/components/icons/Esoteric'

const testimonials = [
  {
    id: 1,
    name: 'Ana Carolina Silva',
    role: 'Terapeuta Holística',
    location: 'São Paulo, SP',
    avatar: '/avatars/ana.jpg',
    rating: 5,
    course: 'Despertar da Consciência',
    testimonial: 'Os cursos da Hekate transformaram completamente minha visão sobre espiritualidade. O conteúdo é profundo, bem estruturado e os instrutores são excepcionais. Recomendo para todos que buscam crescimento genuíno.',
    highlight: 'Transformação completa',
    completedCourses: 8,
    joinedDate: '2023'
  },
  {
    id: 2,
    name: 'Roberto Mendes',
    role: 'Coach de Vida',
    location: 'Rio de Janeiro, RJ',
    avatar: '/avatars/roberto.jpg',
    rating: 5,
    course: 'Alquimia Interior',
    testimonial: 'Nunca imaginei que um curso online pudesse ser tão impactante. A metodologia é única e os exercícios práticos realmente funcionam. Minha vida mudou 180 graus após iniciar esta jornada.',
    highlight: 'Metodologia única',
    completedCourses: 12,
    joinedDate: '2022'
  },
  {
    id: 3,
    name: 'Mariana Costa',
    role: 'Psicóloga',
    location: 'Belo Horizonte, MG',
    avatar: '/avatars/mariana.jpg',
    rating: 5,
    course: 'Cura Ancestral',
    testimonial: 'A qualidade do conteúdo é impressionante. Cada aula é uma descoberta e a comunidade é muito acolhedora. Consegui integrar os ensinamentos na minha prática profissional com resultados incríveis.',
    highlight: 'Qualidade impressionante',
    completedCourses: 6,
    joinedDate: '2023'
  },
  {
    id: 4,
    name: 'Carlos Eduardo',
    role: 'Empresário',
    location: 'Porto Alegre, RS',
    avatar: '/avatars/carlos.jpg',
    rating: 5,
    course: 'Liderança Consciente',
    testimonial: 'Como empresário, sempre busquei formas de liderar com mais consciência. Os cursos me deram ferramentas práticas que aplico diariamente no meu negócio e na vida pessoal. Resultados surpreendentes!',
    highlight: 'Ferramentas práticas',
    completedCourses: 10,
    joinedDate: '2022'
  },
  {
    id: 5,
    name: 'Juliana Santos',
    role: 'Artista',
    location: 'Salvador, BA',
    avatar: '/avatars/juliana.jpg',
    rating: 5,
    course: 'Criatividade Sagrada',
    testimonial: 'Minha criatividade floresceu de uma forma que nunca imaginei possível. Os ensinamentos sobre arte sagrada e expressão criativa mudaram completamente minha abordagem artística. Gratidão infinita!',
    highlight: 'Criatividade floresceu',
    completedCourses: 7,
    joinedDate: '2023'
  },
  {
    id: 6,
    name: 'Fernando Lima',
    role: 'Professor',
    location: 'Recife, PE',
    avatar: '/avatars/fernando.jpg',
    rating: 5,
    course: 'Sabedoria Ancestral',
    testimonial: 'A profundidade dos ensinamentos é extraordinária. Cada curso é uma jornada de autodescoberta. A plataforma é intuitiva e o suporte é excepcional. Melhor investimento que já fiz em mim mesmo.',
    highlight: 'Profundidade extraordinária',
    completedCourses: 15,
    joinedDate: '2021'
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

export function Testimonials() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Subtle purple glow background */}
      <div className="absolute inset-0 bg-gradient-radial from-hekate-purple-950/40 via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 bg-gradient-conic from-hekate-purple-900/15 via-transparent to-transparent" />
      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-3">
            Ecos da Travessia
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-hekate-gold mb-2">
            Vozes que atravessaram
          </h2>
          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-hekate-gold to-transparent" />
          <p className="text-lg text-hekate-pearl/80 max-w-3xl mx-auto">
            Depoimentos de quem atravessou portais, acendeu tochas e fez do rito um caminho.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {testimonials.map((testimonial) => (
            <motion.div key={testimonial.id} variants={itemVariants}>
              <Card className="card-mystic-ultimate h-full transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
                <CardContent className="p-6">
                  {/* Ritual frame */}
                  <div className="absolute -top-3 left-4 opacity-70 text-hekate-gold"><TorchLeft size={16} /></div>
                  <div className="absolute -top-3 right-4 opacity-70 text-hekate-gold"><TorchRight size={16} /></div>
                  <div className="absolute -bottom-3 left-4 opacity-70 text-hekate-gold"><TorchLeft size={16} /></div>
                  <div className="absolute -bottom-3 right-4 opacity-70 text-hekate-gold"><TorchRight size={16} /></div>

                  {/* Symbol */}
                  <div className="flex justify-between items-start mb-4">
                    <StrophalosIcon className="h-8 w-8 text-hekate-gold/30 group-hover:text-hekate-gold/60 transition-colors" />
                    <Badge variant="outline" className="text-xs border-hekate-gold/40 text-hekate-gold">
                      {testimonial.highlight}
                    </Badge>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-hekate-gold text-hekate-gold" />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">
                      {testimonial.rating}.0
                    </span>
                  </div>

                  {/* Testimonial Text */}
                  <blockquote className="text-sm text-hekate-pearl/80 mb-6 leading-relaxed">
                    &ldquo;{testimonial.testimonial}&rdquo;
                  </blockquote>

                  {/* Course Info */}
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-xs">
                      📚 {testimonial.course}
                    </Badge>
                  </div>

                  {/* Author Info */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-hekate-pearl text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-hekate-pearl/70">
                        {testimonial.role} • {testimonial.location}
                      </div>
                      <div className="text-xs text-hekate-pearl/60 mt-1">
                        {testimonial.completedCourses} cursos • Desde {testimonial.joinedDate}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-hekate-purple-900/40 to-hekate-purple-950/60 border border-hekate-gold/20 rounded-2xl p-8 md:p-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-hekate-pearl">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-hekate-gold mb-2">
                4.9/5
              </div>
              <div className="text-sm text-hekate-pearl/70">
                Avaliação Média
              </div>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-hekate-gold text-hekate-gold" />
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-3xl md:text-4xl font-bold text-hekate-gold mb-2">
                10.000+
              </div>
              <div className="text-sm text-hekate-pearl/70">
                Estudantes Ativos
              </div>
            </div>
            
            <div>
              <div className="text-3xl md:text-4xl font-bold text-hekate-gold mb-2">
                5.000+
              </div>
              <div className="text-sm text-hekate-pearl/70">
                Certificados Emitidos
              </div>
            </div>
            
            <div>
              <div className="text-3xl md:text-4xl font-bold text-hekate-gold mb-2">
                98%
              </div>
              <div className="text-sm text-hekate-pearl/70">
                Taxa de Satisfação
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
