'use client'

import { motion } from 'framer-motion'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Send, 
  Instagram, 
  Youtube, 
  Facebook,
  Twitter,
  Globe,
  Shield,
  Heart,
  Users,
  Star,
  CheckCircle,
  Zap,
  Calendar
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const contactChannels = [
  {
    id: 'email',
    title: 'Email Principal',
    value: 'contato@caminhosdehekate.com.br',
    description: 'Para dúvidas gerais e suporte',
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    action: 'mailto:contato@caminhosdehekate.com.br',
    actionText: 'Enviar Email',
    responseTime: '24h'
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp VIP',
    value: '+55 (11) 99999-9999',
    description: 'Atendimento exclusivo para membros premium',
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    action: 'https://wa.me/5511999999999',
    actionText: 'Abrir WhatsApp',
    responseTime: '2h',
    premium: true
  },
  {
    id: 'telegram',
    title: 'Canal Telegram',
    value: '@caminhosdehekate',
    description: 'Novidades, dicas e conteúdo exclusivo',
    icon: Send,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    action: 'https://t.me/caminhosdehekate',
    actionText: 'Seguir Canal',
    responseTime: 'Instantâneo'
  }
]

const socialMedia = [
  {
    name: 'Instagram',
    handle: '@caminhosdehekate',
    followers: '25.8K',
    icon: Instagram,
    color: 'text-pink-600',
    url: 'https://instagram.com/caminhosdehekate'
  },
  {
    name: 'YouTube',
    handle: 'Caminhos de Hekate',
    followers: '12.3K',
    icon: Youtube,
    color: 'text-red-600',
    url: 'https://youtube.com/@caminhosdehekate'
  },
  {
    name: 'Facebook',
    handle: 'Caminhos de Hekate',
    followers: '8.9K',
    icon: Facebook,
    color: 'text-blue-600',
    url: 'https://facebook.com/caminhosdehekate'
  },
  {
    name: 'Twitter',
    handle: '@caminhosdehekate',
    followers: '5.2K',
    icon: Twitter,
    color: 'text-sky-600',
    url: 'https://twitter.com/caminhosdehekate'
  }
]

const businessHours = [
  { day: 'Segunda a Sexta', hours: '09:00 - 18:00', available: true },
  { day: 'Sábado', hours: '09:00 - 14:00', available: true },
  { day: 'Domingo', hours: 'Fechado', available: false },
  { day: 'Feriados', hours: 'Consulte agenda', available: false }
]

const supportStats = [
  {
    label: 'Tempo Médio de Resposta',
    value: '4.2h',
    icon: Clock,
    color: 'text-blue-600'
  },
  {
    label: 'Taxa de Satisfação',
    value: '98.5%',
    icon: Star,
    color: 'text-yellow-600'
  },
  {
    label: 'Tickets Resolvidos',
    value: '2.847',
    icon: CheckCircle,
    color: 'text-green-600'
  },
  {
    label: 'Suporte Ativo',
    value: '24/7',
    icon: Zap,
    color: 'text-purple-600'
  }
]

const officeInfo = {
  address: 'Rua das Estrelas, 108 - Sala 42',
  neighborhood: 'Vila Madalena',
  city: 'São Paulo - SP',
  zipCode: '05435-040',
  country: 'Brasil',
  coordinates: {
    lat: -23.5505,
    lng: -46.6333
  }
}

export function ContactInfo() {
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
            <Users className="w-4 h-4 mr-2" />
            Canais de Comunicação
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Múltiplas Formas de
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Nos Conectarmos
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Escolha o canal que mais se adequa ao seu estilo de comunicação. 
            Estamos aqui para apoiar sua jornada de transformação.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Contact Channels */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                Canais de Atendimento
              </h3>
              
              <div className="grid gap-6">
                {contactChannels.map((channel, index) => {
                  const Icon = channel.icon
                  return (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      viewport={{ once: true }}
                    >
                      <Card className={`border-2 ${channel.borderColor} hover:shadow-lg transition-all duration-300 group`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-3 rounded-xl ${channel.bgColor}`}>
                                <Icon className={`w-6 h-6 ${channel.color}`} />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900">
                                    {channel.title}
                                  </h4>
                                  {channel.premium && (
                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                      <Star className="w-3 h-3 mr-1" />
                                      VIP
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className={`text-lg font-semibold ${channel.color} mb-2`}>
                                  {channel.value}
                                </p>
                                
                                <p className="text-gray-600 mb-4">
                                  {channel.description}
                                </p>
                                
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Clock className="w-4 h-4" />
                                    <span>Resposta em até {channel.responseTime}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              asChild
                              className={`${channel.bgColor} ${channel.color} border-2 ${channel.borderColor} hover:bg-opacity-80 transition-all duration-300`}
                            >
                              <a href={channel.action} target="_blank" rel="noopener noreferrer">
                                {channel.actionText}
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Social Media */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                Redes Sociais
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {socialMedia.map((social, index) => {
                  const Icon = social.icon
                  return (
                    <motion.a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="block"
                    >
                      <Card className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 ${social.color}`} />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {social.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {social.handle}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {social.followers}
                              </p>
                              <p className="text-xs text-gray-500">
                                seguidores
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.a>
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-8">
            {/* Business Hours */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Horário de Atendimento
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {businessHours.map((schedule, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {schedule.day}
                        </span>
                        <span className={`text-sm font-semibold ${
                          schedule.available ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {schedule.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        Atendimento Online Disponível
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Support Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Estatísticas do Suporte
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {supportStats.map((stat, index) => {
                      const Icon = stat.icon
                      return (
                        <div key={index} className="text-center">
                          <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                          <p className={`text-lg font-bold ${stat.color}`}>
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-600 leading-tight">
                            {stat.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Office Location */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-pink-100">
                      <MapPin className="w-5 h-5 text-pink-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Localização
                    </h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>{officeInfo.address}</p>
                    <p>{officeInfo.neighborhood}</p>
                    <p>{officeInfo.city}</p>
                    <p>{officeInfo.zipCode}</p>
                    <p className="font-semibold">{officeInfo.country}</p>
                  </div>
                  
                  <Button
                    asChild
                    className="w-full mt-6 bg-pink-100 text-pink-700 border-2 border-pink-200 hover:bg-pink-200"
                  >
                    <a 
                      href={`https://maps.google.com/?q=${officeInfo.coordinates.lat},${officeInfo.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Ver no Mapa
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Emergency Contact */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-100">
                      <Phone className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-900">
                      Suporte de Emergência
                    </h3>
                  </div>
                  
                  <p className="text-sm text-red-700 mb-4">
                    Para questões urgentes relacionadas à segurança da conta ou problemas críticos de acesso.
                  </p>
                  
                  <Button
                    asChild
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <a href="tel:+5511999999999">
                      <Phone className="w-4 h-4 mr-2" />
                      Ligar Agora
                    </a>
                  </Button>
                  
                  <p className="text-xs text-red-600 text-center mt-3">
                    Disponível 24h para membros premium
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Heart className="w-6 h-6 text-purple-600" />
                <h3 className="text-2xl font-bold text-gray-900">
                  Estamos Aqui Para Você
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Nossa equipe está comprometida em oferecer o melhor suporte possível. 
                Cada interação é uma oportunidade de fortalecer nossa conexão e apoiar sua jornada.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <a href="#contact-form">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar Mensagem
                  </a>
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <a href="/comunidade">
                    <Users className="w-4 h-4 mr-2" />
                    Participar da Comunidade
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}