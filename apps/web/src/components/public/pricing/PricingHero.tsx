'use client'

import { motion } from 'framer-motion'
import { 
  Star, 
  Users, 
  Heart, 
  Shield, 
  Sparkles, 
  CheckCircle,
  Gift,
  Infinity
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const highlights = [
  {
    icon: Gift,
    title: 'Acesso Gratuito',
    description: 'Para sempre, sem pegadinhas'
  },
  {
    icon: Infinity,
    title: 'Conteúdo Ilimitado',
    description: 'Biblioteca sempre crescendo'
  },
  {
    icon: Users,
    title: 'Comunidade Ativa',
    description: '25.000+ membros conectados'
  },
  {
    icon: Shield,
    title: 'Satisfação Garantida',
    description: '30 dias para reembolso'
  }
]

const stats = [
  {
    value: '50.000+',
    label: 'Vidas Transformadas',
    description: 'Pessoas que encontraram seu caminho'
  },
  {
    value: '4.9/5',
    label: 'Avaliação Média',
    description: 'Baseada em mais de 10.000 reviews'
  },
  {
    value: '98%',
    label: 'Taxa de Satisfação',
    description: 'Membros que recomendam nossos serviços'
  },
  {
    value: '24/7',
    label: 'Suporte Disponível',
    description: 'Comunidade sempre ativa para ajudar'
  }
]

const testimonialQuotes = [
  {
    text: "O melhor investimento que já fiz em mim mesma. Transformou completamente minha vida!",
    author: "Marina S.",
    role: "Membro Premium há 2 anos"
  },
  {
    text: "Mesmo o plano gratuito oferece valor incrível. A comunidade é acolhedora e transformadora.",
    author: "Carlos M.",
    role: "Membro Gratuito há 1 ano"
  },
  {
    text: "A mentoria personalizada acelerou meu crescimento de forma impressionante.",
    author: "Ana B.",
    role: "Membro VIP há 6 meses"
  }
]

export function PricingHero() {
  return (
    <section className="relative py-20 bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(100)].map((_, i) => (
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
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              Planos Especiais • Acesso Gratuito Disponível
            </Badge>
          </motion.div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Escolha o Plano
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Ideal para Você
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Comece gratuitamente e evolua no seu ritmo. Cada plano foi cuidadosamente 
            desenhado para apoiar diferentes momentos da sua jornada de crescimento.
          </p>

          {/* Key Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-3xl mx-auto mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-6 h-6 text-pink-400" />
              <span className="text-lg font-semibold text-white">Nossa Promessa</span>
            </div>
            <p className="text-gray-200 leading-relaxed">
              Acreditamos que o crescimento espiritual deve ser acessível a todos. 
              Por isso, oferecemos conteúdo valioso gratuitamente, com opções premium 
              para quem deseja acelerar sua transformação.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-8 py-4 text-lg font-semibold rounded-xl">
              Ver Todos os Planos
            </Button>
            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg rounded-xl">
              Começar Gratuitamente
            </Button>
          </motion.div>
        </motion.div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {highlights.map((highlight, index) => {
            const Icon = highlight.icon
            return (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 group-hover:bg-white/20 transition-colors duration-300">
                  <Icon className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-white font-bold mb-2">
                  {highlight.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {highlight.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.3 + index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-purple-300 mb-2">
                {stat.label}
              </div>
              <div className="text-sm text-gray-400 leading-relaxed">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial Quotes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonialQuotes.map((quote, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.7 + index * 0.1 }}
            >
              <Card className="border-0 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-200 italic leading-relaxed mb-4">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  <div className="border-t border-white/20 pt-4">
                    <div className="font-semibold text-white">{quote.author}</div>
                    <div className="text-sm text-gray-400">{quote.role}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.0 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-lg font-semibold text-white">Garantia de Satisfação</span>
            </div>
            <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Experimente qualquer plano premium por 30 dias. Se não ficar completamente satisfeito, 
              devolvemos 100% do seu investimento, sem perguntas.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}