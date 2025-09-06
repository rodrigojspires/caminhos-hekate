'use client'

import { motion } from 'framer-motion'
import { 
  Compass, 
  Heart, 
  Shield, 
  Lightbulb, 
  Users, 
  Star,
  Target,
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const missionPoints = [
  {
    icon: Compass,
    title: 'Orientação Personalizada',
    description: 'Cada jornada é única. Oferecemos caminhos personalizados que respeitam seu ritmo e suas necessidades individuais.'
  },
  {
    icon: Heart,
    title: 'Ambiente Acolhedor',
    description: 'Criamos um espaço seguro e livre de julgamentos, onde você pode se expressar autenticamente e crescer com confiança.'
  },
  {
    icon: Shield,
    title: 'Proteção e Cuidado',
    description: 'Sua privacidade e bem-estar são nossa prioridade. Mantemos um ambiente protegido para sua transformação.'
  },
  {
    icon: Lightbulb,
    title: 'Conhecimento Transformador',
    description: 'Compartilhamos sabedoria ancestral e conhecimentos modernos para iluminar seu caminho de autodescoberta.'
  }
]

const visionPoints = [
  {
    icon: Users,
    title: 'Comunidade Global',
    description: 'Conectar pessoas de todo o mundo em uma rede de apoio mútuo e crescimento coletivo.'
  },
  {
    icon: Star,
    title: 'Excelência em Ensino',
    description: 'Ser referência mundial em educação para desenvolvimento pessoal e espiritual.'
  },
  {
    icon: Target,
    title: 'Impacto Positivo',
    description: 'Transformar milhões de vidas através do autoconhecimento e empoderamento pessoal.'
  },
  {
    icon: Sparkles,
    title: 'Inovação Constante',
    description: 'Evoluir continuamente nossas metodologias para oferecer a melhor experiência de aprendizado.'
  }
]

export function Mission() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Mission Section */}
          <div className="mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
                Nossa
                <span className="text-primary"> Missão</span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                Capacitar indivíduos a descobrirem e manifestarem seu potencial mais elevado, 
                oferecendo ferramentas, conhecimentos e uma comunidade de apoio para uma 
                transformação autêntica e duradoura.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {missionPoints.map((point, index) => {
                const Icon = point.icon
                return (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="bg-primary/10 rounded-full p-3 flex-shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-3">
                              {point.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                              {point.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Vision Section */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
                Nossa
                <span className="text-secondary"> Visão</span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                Ser a plataforma global líder em desenvolvimento pessoal e espiritual, 
                criando um mundo onde cada pessoa vive em plena conexão com sua essência 
                e propósito de vida.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {visionPoints.map((point, index) => {
                const Icon = point.icon
                return (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-secondary/20">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="bg-secondary/10 rounded-full p-3 flex-shrink-0">
                            <Icon className="h-6 w-6 text-secondary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-3">
                              {point.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                              {point.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}