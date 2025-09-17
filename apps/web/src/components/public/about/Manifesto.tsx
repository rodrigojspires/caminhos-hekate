"use client"

import { motion } from "framer-motion"
import { TorchIcon, StrophalosIcon } from "@/components/icons/Esoteric"

export function Manifesto() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mystic opacity-40" />
      {/* Aureola dourada sutil */}
      <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full" style={{
        background: 'radial-gradient(circle, rgba(218,165,32,0.20) 0%, rgba(218,165,32,0.08) 25%, transparent 60%)'
      }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hekate-gold/50 to-transparent" />

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Mandala strophalos discreta ao fundo */}
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-[0.06]">
            <StrophalosIcon className="w-[28rem] h-[28rem]" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center justify-center relative">
              <div className="absolute inset-0 -z-10 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(218,165,32,0.25) 0%, rgba(218,165,32,0.10) 35%, transparent 70%)'
              }} />
              <StrophalosIcon className="h-12 w-12 text-hekate-gold animate-glow" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-hekate-pearl hekate-divider">
              Manifesto da Escola
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="mt-10 text-left md:text-center font-serif"
          >
            <p className="text-lg leading-relaxed text-hekate-pearl/90 mb-6">
              Somos templo vivo. Aqui, estudo é rito, palavra é invocação, e presença é
              alquimia. Na encruzilhada da vida, Hekate segura a tocha — e à sua luz o
              caminho se revela.
            </p>
            <p className="text-lg leading-relaxed text-hekate-pearl/80 mb-6">
              Não buscamos o consumo de conteúdos. Guardamos chaves. Abrimos portais.
              Sustentamos jornadas. O que oferecemos não é plataforma, é travessia.
            </p>
            <p className="text-lg leading-relaxed text-hekate-pearl/80 mb-6">
              Nossos ritos começam no silêncio: o respirar, o assentar, o lembrar.
              Nossos símbolos não decoram — consagram: a tocha que guia, a roda que
              gira, a chave que abre, a encruzilhada que chama.
            </p>
            <p className="text-lg leading-relaxed text-hekate-pearl/80">
              Que cada encontro seja passagem, cada ciclo um chamado, cada passo um
              comprometimento com a tua obra. Se te chama, entra. Se entras, permanece.
              Se permaneces, atravessa.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 flex items-center justify-center gap-6 text-hekate-gold/80"
          >
            <TorchIcon className="h-6 w-6" />
            <StrophalosIcon className="h-8 w-8" />
            <TorchIcon className="h-6 w-6" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
