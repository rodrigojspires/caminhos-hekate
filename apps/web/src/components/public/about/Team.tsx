'use client'

import { motion } from 'framer-motion'
import { 
  Heart, 
  Star, 
  BookOpen, 
  Users, 
  Sparkles,
  Award,
  Globe,
  Compass,
  Target
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const teamMembers = [
  {
    name: 'Luna Silveira',
    role: 'Fundadora & Guia Espiritual',
    bio: 'Especialista em desenvolvimento pessoal com mais de 15 anos de experiência. Mestre em Psicologia Transpessoal e praticante de tradições ancestrais.',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20wise%20spiritual%20teacher%20woman%20with%20long%20dark%20hair%20and%20kind%20eyes%20wearing%20elegant%20clothing%20in%20soft%20lighting&image_size=square',
    specialties: ['Autoconhecimento', 'Espiritualidade', 'Liderança'],
    icon: Sparkles,
    color: 'text-purple-500'
  },
  {
    name: 'Marcus Almeida',
    role: 'Diretor de Conteúdo',
    bio: 'PhD em Filosofia e escritor de diversos livros sobre desenvolvimento humano. Especialista em tradições místicas e filosofias orientais.',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20wise%20philosophy%20professor%20man%20with%20beard%20and%20glasses%20wearing%20academic%20attire%20in%20library%20setting&image_size=square',
    specialties: ['Filosofia', 'Meditação', 'Sabedoria Ancestral'],
    icon: BookOpen,
    color: 'text-blue-500'
  },
  {
    name: 'Sofia Mendes',
    role: 'Psicóloga & Terapeuta',
    bio: 'Psicóloga clínica especializada em terapias integrativas. Mestre em Psicologia Positiva e certificada em diversas modalidades terapêuticas.',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20compassionate%20psychologist%20woman%20with%20short%20brown%20hair%20wearing%20professional%20attire%20in%20therapy%20office&image_size=square',
    specialties: ['Psicologia', 'Terapia', 'Bem-estar'],
    icon: Heart,
    color: 'text-red-500'
  },
  {
    name: 'Rafael Santos',
    role: 'Coach de Vida',
    bio: 'Coach certificado internacionalmente com foco em transformação pessoal e profissional. Especialista em PNL e técnicas de empoderamento.',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20confident%20life%20coach%20man%20with%20short%20hair%20wearing%20business%20casual%20attire%20with%20motivational%20background&image_size=square',
    specialties: ['Coaching', 'PNL', 'Liderança'],
    icon: Target,
    color: 'text-green-500'
  },
  {
    name: 'Camila Rodrigues',
    role: 'Especialista em Relacionamentos',
    bio: 'Terapeuta de casais e famílias com mais de 10 anos de experiência. Especializada em comunicação consciente e relacionamentos saudáveis.',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20warm%20relationship%20therapist%20woman%20with%20curly%20hair%20wearing%20soft%20colors%20in%20cozy%20office%20setting&image_size=square',
    specialties: ['Relacionamentos', 'Comunicação', 'Família'],
    icon: Users,
    color: 'text-pink-500'
  },
  {
    name: 'Diego Ferreira',
    role: 'Mentor de Carreira',
    bio: 'Executivo com 20 anos de experiência corporativa. Especialista em transição de carreira e desenvolvimento de liderança autêntica.',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20successful%20business%20mentor%20man%20wearing%20suit%20with%20confident%20expression%20in%20modern%20office&image_size=square',
    specialties: ['Carreira', 'Liderança', 'Negócios'],
    icon: Award,
    color: 'text-orange-500'
  }
]

const stats = [
  {
    icon: Globe,
    value: '50+',
    label: 'Anos de Experiência Coletiva'
  },
  {
    icon: Award,
    value: '25+',
    label: 'Certificações Internacionais'
  },
  {
    icon: BookOpen,
    value: '15+',
    label: 'Livros Publicados'
  },
  {
    icon: Users,
    value: '10.000+',
    label: 'Vidas Transformadas'
  }
]

export function Team() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
              Nossa
              <span className="text-primary"> Equipe</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Conheça os mestres e especialistas que dedicam suas vidas a guiar você 
              em sua jornada de transformação e autodescoberta.
            </p>
          </motion.div>

          {/* Team Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </motion.div>

          {/* Team Members */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => {
              const Icon = member.icon
              return (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2">
                    <CardContent className="p-6 text-center">
                      {/* Avatar */}
                      <div className="relative mb-6">
                        <Avatar className="w-24 h-24 mx-auto border-4 border-primary/20 group-hover:border-primary/40 transition-colors">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback className="text-2xl font-semibold bg-primary/10">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                          <div className="bg-background border-2 border-primary/20 rounded-full p-2">
                            <Icon className={`h-4 w-4 ${member.color}`} />
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <h3 className="text-xl font-serif font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {member.name}
                      </h3>
                      
                      <p className="text-primary font-medium mb-4">
                        {member.role}
                      </p>
                      
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                        {member.bio}
                      </p>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {member.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-3xl p-8 md:p-12">
              <Compass className="h-16 w-16 text-primary mx-auto mb-6" />
              
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
                Sua Jornada, Nossa Dedicação
              </h3>
              
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Cada membro da nossa equipe está comprometido com sua transformação. 
                Juntos, criamos um ambiente de aprendizado seguro, acolhedor e 
                profundamente transformador.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}