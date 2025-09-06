'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Star, Users, BookOpen, Heart, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const benefits = [
  {
    icon: BookOpen,
    title: 'Conteúdo Exclusivo',
    description: 'Acesso a cursos e materiais únicos'
  },
  {
    icon: Users,
    title: 'Comunidade Ativa',
    description: 'Conecte-se com pessoas em jornada similar'
  },
  {
    icon: Heart,
    title: 'Suporte Contínuo',
    description: 'Acompanhamento personalizado em sua jornada'
  },
  {
    icon: Sparkles,
    title: 'Transformação Real',
    description: 'Resultados comprovados e duradouros'
  }
]

const testimonialHighlights = [
  {
    text: '"Minha vida mudou completamente após iniciar esta jornada."',
    author: 'Maria Silva',
    rating: 5
  },
  {
    text: '"Encontrei o propósito que tanto buscava."',
    author: 'João Santos',
    rating: 5
  },
  {
    text: '"A comunidade é incrível, me sinto acolhida."',
    author: 'Ana Costa',
    rating: 5
  }
]

export function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl animate-pulse delay-500" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-white/10 text-white border-white/20 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Transforme Sua Vida Hoje
            </Badge>
            
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Sua Jornada de
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Transformação Começa Agora
              </span>
            </h2>
            
            <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
              Junte-se a milhares de pessoas que já descobriram seu verdadeiro potencial 
              através dos Caminhos de Hekate. Sua nova vida está a um clique de distância.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">15.000+</div>
                <div className="text-white/70 text-sm">Vidas Transformadas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">4.9/5</div>
                <div className="text-white/70 text-sm">Avaliação Média</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">98%</div>
                <div className="text-white/70 text-sm">Satisfação</div>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Benefits */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-white mb-8">
                O Que Você Vai Conquistar:
              </h3>
              
              <div className="space-y-6">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon
                  return (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">
                          {benefit.title}
                        </h4>
                        <p className="text-white/70">
                          {benefit.description}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Right Side - CTA Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 border-white/20 bg-white/10 backdrop-blur-lg">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Oferta Especial Ativa
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Comece Sua Transformação
                    </h3>
                    
                    <div className="mb-6">
                      <div className="text-4xl font-bold text-yellow-400 mb-2">
                        GRATUITO
                      </div>
                      <div className="text-white/70 line-through text-lg mb-1">
                        De R$ 197
                      </div>
                      <div className="text-green-400 text-sm font-medium">
                        Por tempo limitado
                      </div>
                    </div>
                  </div>
                  
                  {/* Testimonial Highlights */}
                  <div className="mb-8">
                    <h4 className="text-white font-semibold mb-4 text-center">
                      O Que Nossos Membros Dizem:
                    </h4>
                    <div className="space-y-3">
                      {testimonialHighlights.map((testimonial, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * index }}
                          viewport={{ once: true }}
                          className="bg-white/5 rounded-lg p-3 border border-white/10"
                        >
                          <p className="text-white/90 text-sm mb-2">
                            {testimonial.text}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-white/70 text-xs">
                              - {testimonial.author}
                            </span>
                            <div className="flex items-center gap-1">
                              {[...Array(testimonial.rating)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="space-y-4">
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-lg py-6 rounded-xl shadow-2xl hover:shadow-yellow-400/25 transition-all duration-300"
                    >
                      <a href="/auth/register">
                        <Sparkles className="w-5 h-5 mr-2" />
                        Começar Minha Jornada Agora
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </a>
                    </Button>
                    
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm py-6 rounded-xl"
                    >
                      <a href="/cursos">
                        <BookOpen className="w-5 h-5 mr-2" />
                        Explorar Cursos Gratuitos
                      </a>
                    </Button>
                  </div>
                  
                  {/* Guarantees */}
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/70">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span>Sem compromisso</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span>Cancele quando quiser</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span>Suporte 24/7</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Bottom Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-white/60 text-sm mb-4">
              Junte-se a mais de 15.000 pessoas que já transformaram suas vidas
            </p>
            
            <div className="flex items-center justify-center gap-8 text-white/40 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span>Ambiente 100% Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span>Dados Protegidos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span>Satisfação Garantida</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}