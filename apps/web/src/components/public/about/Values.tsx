'use client'

import { motion } from 'framer-motion'
import { 
  Heart, 
  Shield, 
  Users, 
  Lightbulb, 
  Compass, 
  Star,
  Leaf,
  Eye
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const values = [
  {
    icon: Heart,
    title: 'Amor e Compaixão',
    description: 'Acreditamos que o amor é a força transformadora mais poderosa. Cultivamos compaixão por nós mesmos e pelos outros em cada interação.',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20'
  },
  {
    icon: Shield,
    title: 'Integridade',
    description: 'Mantemos os mais altos padrões éticos em tudo que fazemos. Nossa palavra é nossa honra, e agimos sempre com transparência.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  {
    icon: Users,
    title: 'Comunidade',
    description: 'Valorizamos a força da união. Juntos somos mais fortes, e cada membro da nossa comunidade é essencial para o crescimento coletivo.',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  {
    icon: Lightbulb,
    title: 'Sabedoria',
    description: 'Buscamos constantemente o conhecimento que transforma. Combinamos sabedoria ancestral com descobertas modernas.',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
  },
  {
    icon: Compass,
    title: 'Autenticidade',
    description: 'Encorajamos cada pessoa a ser verdadeiramente ela mesma. A autenticidade é o caminho para uma vida plena e significativa.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  {
    icon: Star,
    title: 'Excelência',
    description: 'Comprometemo-nos com a excelência em tudo que oferecemos. Cada curso, cada interação é uma oportunidade de superarmos expectativas.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  },
  {
    icon: Leaf,
    title: 'Crescimento',
    description: 'Acreditamos no potencial infinito de crescimento humano. Cada dia é uma nova oportunidade de evolução e transformação.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20'
  },
  {
    icon: Eye,
    title: 'Consciência',
    description: 'Promovemos o despertar da consciência em todas as suas dimensões. A consciência é a chave para uma vida mais plena e conectada.',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20'
  }
]

export function Values() {
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
              Nossos
              <span className="text-primary"> Valores</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Os princípios que guiam cada decisão, cada curso e cada interação em nossa plataforma. 
              Estes valores são o alicerce sobre o qual construímos uma comunidade de transformação.
            </p>
          </motion.div>

          {/* Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2">
                    <CardContent className="p-6 text-center">
                      <div className={`${value.bgColor} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-8 w-8 ${value.color}`} />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors">
                        {value.title}
                      </h3>
                      
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Quote Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-3xl p-8 md:p-12">
              <blockquote className="text-2xl md:text-3xl font-serif italic text-foreground mb-6 leading-relaxed">
                &ldquo;Quando vivemos alinhados com nossos valores mais profundos, 
                cada passo se torna uma dança sagrada em direção à nossa 
                verdadeira essência.&rdquo;
              </blockquote>
              <cite className="text-muted-foreground font-medium text-lg">
                — Sabedoria dos Caminhos de Hekate
              </cite>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}