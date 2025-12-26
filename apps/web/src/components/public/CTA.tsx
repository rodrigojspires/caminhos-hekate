'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { KeyIcon } from '@/components/icons/Esoteric'

export function CTA() {
  return (
    <section className="relative py-32 sm:py-40 mt-24 sm:mt-32">
      {/* Background Image & Overlays */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{ 
          backgroundImage: `url('https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20cinematic%20art%20of%20the%20goddess%20hekate%20at%20a%20crossroads%20holding%20two%20torches%20and%20a%20key%20dark%20mystical%20and%20powerful%20purple%20and%20gold%20lighting&image_size=landscape_16_9')`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 z-10 bg-gradient-to-t from-black via-transparent" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hekate-gold/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-hekate-gold/30 to-transparent" />


      <div className="container relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center"
        >
          <KeyIcon className="h-16 w-16 text-hekate-gold mx-auto mb-6 animate-glow" />
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-hekate-gold via-hekate-goldLight to-white mb-6 leading-tight [text-shadow:0_2px_20px_rgba(255,215,0,0.4)]">
            A Encruzilhada está Diante de Você.
          </h2>
          
          <p className="text-lg md:text-xl text-hekate-pearl/80 mb-12 max-w-3xl mx-auto">
            O conhecimento foi compartilhado. As vozes ecoaram. A tocha está em suas mãos. Você vai permanecer na sombra ou caminhará em direção à sua própria luz?
          </p>

          <Button 
            size="lg"
            className="text-lg h-14 px-10 bg-hekate-gold text-hekate-black hover:bg-hekate-gold/90 shadow-2xl shadow-hekate-gold/30 rounded-full btn-hover-scale"
            asChild
          >
            <Link href="/auth/register">
              Atravessar o Portal. Iniciar sua Jornada.
            </Link>
          </Button>
          
        </motion.div>
      </div>
    </section>
  )
}
