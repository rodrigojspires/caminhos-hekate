'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KeyIcon, StrophalosIcon, TorchIcon } from '@/components/icons/Esoteric'

const portais = [
  {
    icon: TorchIcon,
    title: 'Fundamentos 🕯️',
    description: 'Base mágica, rituais de entrada.',
  },
  {
    icon: StrophalosIcon,
    title: 'Travessias 🔮',
    description: 'Jornadas profundas, oráculos, rituais maiores.',
  },
  {
    icon: KeyIcon,
    title: 'Iniciação 🔥',
    description: 'Sacerdócio, liderança espiritual.',
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
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-hekate-gold mb-2">
            Portais da Escola
          </h2>
          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-hekate-gold to-transparent" />
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
                <Card className="h-full group bg-transparent border border-hekate-gold/30 rounded-xl hover:border-hekate-gold/60 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-lg bg-hekate-gold/10 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-7 w-7 text-hekate-gold" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-xl font-semibold text-hekate-gold mb-1">
                          {portal.title}
                        </h3>
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
      </div>
    </section>
  )
}
