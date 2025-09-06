'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  Sparkles, 
  Gift, 
  Clock, 
  Shield,
  Star,
  Users,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const benefits = [
  {
    icon: Gift,
    title: 'Acesso Gratuito por 7 dias',
    description: 'Experimente nossa plataforma sem compromisso'
  },
  {
    icon: Clock,
    title: 'Acesso Vitalício',
    description: 'Estude no seu ritmo, quando e onde quiser'
  },
  {
    icon: Shield,
    title: 'Garantia de 30 dias',
    description: '100% do seu dinheiro de volta se não ficar satisfeito'
  },
  {
    icon: Award,
    title: 'Certificado Reconhecido',
    description: 'Comprove seu conhecimento com certificação válida'
  }
]

const urgencyFeatures = [
  '🎯 Mais de 10.000 estudantes já transformaram suas vidas',
  '⭐ Avaliação média de 4.9/5 estrelas',
  '🏆 Certificados reconhecidos nacionalmente',
  '🔒 Ambiente seguro e acolhedor para seu crescimento'
]

export function CTA() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-primary to-secondary p-1">
                  <div className="bg-background rounded-lg p-8 md:p-12">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        viewport={{ once: true }}
                      >
                        <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                      </motion.div>
                      
                      <Badge variant="secondary" className="mb-4 text-sm">
                        🎉 Oferta Especial de Lançamento
                      </Badge>
                      
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4">
                        Sua Jornada de
                        <span className="text-primary block">
                          Transformação Começa Agora
                        </span>
                      </h2>
                      
                      <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        Não deixe para amanhã a transformação que você pode começar hoje. 
                        Junte-se a milhares de pessoas que já descobriram seu potencial interior.
                      </p>
                    </div>

                    {/* Benefits Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      {benefits.map((benefit, index) => {
                        const Icon = benefit.icon
                        return (
                          <motion.div
                            key={benefit.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 * index }}
                            viewport={{ once: true }}
                            className="text-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
                            <h3 className="font-semibold text-foreground mb-2 text-sm">
                              {benefit.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {benefit.description}
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Urgency Features */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      viewport={{ once: true }}
                      className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 mb-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {urgencyFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      viewport={{ once: true }}
                      className="text-center"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                        <Button 
                          size="lg" 
                          className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 group"
                          asChild
                        >
                          <Link href="/cadastro">
                            Começar Jornada Gratuita
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                        
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="text-lg px-8 py-6 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground group"
                          asChild
                        >
                          <Link href="/cursos">
                            Ver Todos os Cursos
                            <Sparkles className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        ✨ Sem compromisso • Cancele quando quiser • Suporte 24/7
                      </p>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8 text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">10.000+ estudantes ativos</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm">4.9/5 de avaliação</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span className="text-sm">5.000+ certificados emitidos</span>
              </div>
            </div>
          </motion.div>

          {/* Final Urgency Message */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground italic">
              &ldquo;O melhor momento para plantar uma árvore foi há 20 anos. 
              O segundo melhor momento é agora.&rdquo; - Provérbio Chinês
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}