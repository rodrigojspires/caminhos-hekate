'use client'

import { motion } from 'framer-motion'
import { Users, Heart, MessageCircle, Sparkles, ArrowRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const communityMembers = [
  {
    name: 'Ana Silva',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20woman%20with%20warm%20smile%20and%20kind%20eyes%2C%20natural%20lighting%2C%20peaceful%20expression&image_size=square',
    location: 'São Paulo, SP'
  },
  {
    name: 'Carlos Santos',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=gentle%20man%20with%20beard%20and%20peaceful%20expression%2C%20natural%20lighting%2C%20spiritual%20aura&image_size=square',
    location: 'Rio de Janeiro, RJ'
  },
  {
    name: 'Marina Costa',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=serene%20woman%20with%20long%20hair%20and%20gentle%20smile%2C%20natural%20lighting%2C%20wise%20expression&image_size=square',
    location: 'Belo Horizonte, MG'
  },
  {
    name: 'Pedro Lima',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=calm%20man%20with%20thoughtful%20expression%20and%20kind%20eyes%2C%20natural%20lighting%2C%20peaceful%20aura&image_size=square',
    location: 'Salvador, BA'
  },
  {
    name: 'Julia Mendes',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=radiant%20woman%20with%20curly%20hair%20and%20bright%20smile%2C%20natural%20lighting%2C%20joyful%20expression&image_size=square',
    location: 'Curitiba, PR'
  }
]

const stats = [
  { label: 'Membros Ativos', value: '25.000+', icon: Users },
  { label: 'Posts Diários', value: '500+', icon: MessageCircle },
  { label: 'Conexões Formadas', value: '50.000+', icon: Heart },
  { label: 'Transformações', value: '15.000+', icon: Sparkles }
]

export function CommunityHero() {
  return (
    <section className="relative py-20 lg:py-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-pink-400/10 to-transparent rounded-full" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6"
              >
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-4 py-2">
                  ✨ Comunidade Vibrante
                </Badge>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
              >
                Conecte-se com
                <span className="block bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
                  Almas Afins
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-purple-100 mb-8 leading-relaxed"
              >
                Faça parte de uma comunidade vibrante de pessoas em jornada de autoconhecimento e crescimento espiritual. Compartilhe experiências, receba apoio e cresça junto.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 mb-8"
              >
                <Button size="lg" className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-4 text-lg">
                  Participar da Comunidade
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg">
                  Explorar Conteúdo
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center justify-center lg:justify-start gap-4 text-purple-100"
              >
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="font-semibold">4.9/5</span>
                <span>• 25.000+ membros ativos</span>
              </motion.div>
            </div>

            {/* Right Content - Community Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Community Members Circle */}
              <div className="relative w-80 h-80 mx-auto">
                {/* Center Avatar */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 p-1">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <Heart className="w-8 h-8 text-pink-500" />
                    </div>
                  </div>
                </div>

                {/* Surrounding Avatars */}
                {communityMembers.map((member, index) => {
                  const angle = (index * 72) * (Math.PI / 180) // 360/5 = 72 degrees
                  const radius = 120
                  const x = Math.cos(angle) * radius
                  const y = Math.sin(angle) * radius
                  
                  return (
                    <motion.div
                      key={member.name}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`
                      }}
                    >
                      <div className="group cursor-pointer">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-1 group-hover:scale-110 transition-transform duration-300">
                          <Avatar className="w-full h-full">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                          {member.name}
                          <div className="text-xs text-gray-300">{member.location}</div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {/* Connecting Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                  {communityMembers.map((_, index) => {
                    const angle1 = (index * 72) * (Math.PI / 180)
                    const angle2 = ((index + 1) % 5 * 72) * (Math.PI / 180)
                    const radius = 120
                    const centerX = 160 // Half of container width
                    const centerY = 160 // Half of container height
                    
                    const x1 = centerX + Math.cos(angle1) * radius
                    const y1 = centerY + Math.sin(angle1) * radius
                    const x2 = centerX + Math.cos(angle2) * radius
                    const y2 = centerY + Math.sin(angle2) * radius
                    
                    return (
                      <motion.line
                        key={index}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.3 }}
                        transition={{ duration: 1, delay: 1 + index * 0.1 }}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="url(#gradient)"
                        strokeWidth="2"
                      />
                    )
                  })}
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-3">
                    <Icon className="w-6 h-6 text-purple-200" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-purple-200">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}