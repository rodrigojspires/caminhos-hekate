'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KeyIcon, CrossroadsIcon, StrophalosIcon, TorchIcon } from '@/components/icons/Esoteric'

const portais = [
  {
    icon: KeyIcon,
    title: 'Fundamentos',
    description: 'As chaves do Templo: ética, ritos básicos, proteção e preparo. Onde a tocha é acesa e o caminho é traçado.',
    marker: 'Porta I',
  },
  {
    icon: CrossroadsIcon,
    title: 'Travessias',
    description: 'Ciclos e encruzilhadas: práticas, jornadas guiadas e mistérios que se abrem a cada passo consciente.',
    marker: 'Porta II',
  },
  {
    icon: StrophalosIcon,
    title: 'Iniciação',
    description: 'A roda gira: integração de saberes, consagrações e o chamado à presença. Do rito, nasce a obra.',
    marker: 'Porta III',
  },
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

export function Features() {
  return (
    <section id="portais" className="py-20 bg-transparent">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4">
            Portais da Escola
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4 hekate-divider">
            O Templo se abre em três passagens
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Fundamentos, Travessias, Iniciação — caminhos que evocam, sustentam e consagram a tua obra.
          </p>
        </motion.div>

        {/* Portais Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {portais.map((portal, index) => {
            const Icon = portal.icon
            return (
              <motion.div key={portal.title} variants={itemVariants}>
                <Card className="card-mystic-3d h-full group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-hekate-gold/10 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-7 w-7 text-hekate-gold" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-serif text-xl font-semibold text-hekate-pearl group-hover:text-hekate-gold transition-colors">
                            {portal.title}
                          </h3>
                          <Badge variant="outline" className="text-xs border-hekate-gold/40 text-hekate-gold">
                            {portal.marker}
                          </Badge>
                        </div>
                        <p className="text-sm text-hekate-pearl/80 leading-relaxed">
                          {portal.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-hekate-purple-900/40 to-hekate-purple-950/60 border border-hekate-gold/20 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-hekate-pearl mb-4">
              Que portal te chama hoje?
            </h3>
            <p className="text-hekate-pearl/80 mb-6 max-w-2xl mx-auto">
              Atravessar é decisão. Permanecer, também. A presença é teu primeiro rito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/cursos"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-mystic-enhanced"
              >
                Ver Trilhas e Ritos
              </motion.a>
              <motion.a
                href="/sobre"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border border-hekate-gold text-hekate-gold px-8 py-3 rounded-lg font-medium hover:bg-hekate-gold/10 transition-colors"
              >
                Ler o Manifesto
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
