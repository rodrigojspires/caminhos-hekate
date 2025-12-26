'use client'

import { motion } from 'framer-motion'
import { TorchIcon, StrophalosIcon, KeyIcon } from '@/components/icons/Esoteric'

const features = [
  {
    icon: TorchIcon,
    title: 'Autoconhecimento',
    subtitle: 'A Chave da Tocha',
    description: 'Ilumine as sombras da sua alma. A Chave da Tocha te convida a olhar para dentro, a desvendar seus próprios mistérios e a encontrar a luz que reside na escuridão.',
  },
  {
    icon: StrophalosIcon,
    title: 'Poder Pessoal',
    subtitle: 'A Chave do Strophalos',
    description: 'Gire a roda do seu destino. A Chave do Strophalos te ensina a dançar com as energias do universo, a manifestar sua vontade e a se tornar o eixo do seu próprio mundo.',
  },
  {
    icon: KeyIcon,
    title: 'Soberania Espiritual',
    subtitle: 'A Chave da Encruzilhada',
    description: 'Reclame seu poder na encruzilhada da vida. A Chave da Encruzilhada te consagra como sacerdote ou sacerdotisa da sua própria existência, mestre do seu caminho.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

export function Features() {
  return (
    <section className="relative py-24 sm:py-32 bg-black">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hekate-gold/30 to-transparent" />
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-hekate-goldLight to-hekate-gold mb-4">
            As Três Chaves de Hekate
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-hekate-pearl/80">
            Sua jornada de soberania se desdobra em três grandes atos, cada um guardado por uma chave sagrada.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="glass rounded-2xl p-8 text-center flex flex-col items-center border border-hekate-gold/20 hover:border-hekate-gold/40 transition-colors duration-300"
              >
                <div className="mb-6 bg-hekate-gold/10 p-4 rounded-full">
                  <Icon className="h-10 w-10 text-hekate-gold" />
                </div>
                <h3 className="text-xl font-bold font-serif text-hekate-goldLight mb-2">{feature.title}</h3>
                <p className="text-sm text-hekate-purple-300 uppercase tracking-widest mb-4">{feature.subtitle}</p>
                <p className="text-hekate-pearl/80 flex-grow">{feature.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
