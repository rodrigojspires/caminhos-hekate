'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { StrophalosIcon } from '@/components/icons/Esoteric'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Deep mystical background */}
      <div className="absolute inset-0 bg-gradient-mystic" />
      {/* Subtle ritual texture overlays */}
      <div className="absolute inset-0 bg-gradient-radial from-hekate-purple-950/40 via-transparent to-transparent opacity-40" />
      <div className="absolute inset-0 bg-gradient-conic from-hekate-gold/10 via-transparent to-transparent opacity-20" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-hekate-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-hekate-purple-800/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-hekate-purple-950/30 blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container relative z-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              ✨ Escola Iniciática • Templo Vivo
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
              Na encruzilhada da vida,
              <span className="text-gradient-gold block">
                Hekate segura a tocha.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-hekate-pearl/90 mb-10 max-w-2xl mx-auto lg:mx-0">
              A Escola Iniciática Caminhos de Hekate é templo vivo, onde cada encontro é rito,
              cada palavra é invocação, cada ciclo é travessia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-center lg:justify-start">
              <Button size="lg" className="btn-mystic-enhanced" asChild>
                <Link href="/auth/register">
                  Entrar na Escola
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-hekate-gold text-hekate-gold hover:bg-hekate-gold/10" asChild>
                <Link href="#portais">
                  Conhecer os Portais
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-lg">
              {/* Main circle with mystical elements */}
              <div className="relative w-80 h-80 lg:w-96 lg:h-96 mx-auto">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-2 border-hekate-gold/20 animate-spin-slow" />
                {/* Middle ring */}
                <div className="absolute inset-4 rounded-full border border-hekate-gold/30 animate-spin-reverse" />
                {/* Inner circle */}
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-hekate-purple-900/30 to-hekate-purple-950/50 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 flex items-center justify-center">
                      <StrophalosIcon size={92} className="text-hekate-gold animate-glow" />
                    </div>
                    <div className="font-serif text-lg font-semibold text-gradient-gold">
                      Templo‑Escola
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Caminhos de Hekate
                    </div>
                  </div>
                </div>
                {/* Floating embers */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-hekate-gold rounded-full animate-pulse" />
                <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-hekate-gold/80 rounded-full animate-pulse delay-500" />
                <div className="absolute top-1/3 left-4 w-2 h-2 bg-hekate-gold/70 rounded-full animate-pulse delay-1000" />
                <div className="absolute bottom-1/3 right-8 w-1.5 h-1.5 bg-hekate-gold/60 rounded-full animate-pulse delay-700" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <span className="text-sm">Descer aos Portais</span>
          <div className="w-6 h-10 border-2 border-hekate-gold/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-hekate-gold/50 rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
