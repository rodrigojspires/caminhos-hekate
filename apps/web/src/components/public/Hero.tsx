'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2, 
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <section className="relative h-[90vh] min-h-[700px] max-h-[900px] w-full overflow-hidden flex items-center justify-center text-center">
      {/* Background Image & Overlays */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center brightness-50 contrast-125"
        style={{ 
          backgroundImage: `url('https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20cinematic%20art%20of%20the%20goddess%20hekate%20at%20a%20crossroads%20holding%20two%20torches%20and%20a%20key%20dark%20mystical%20and%20powerful%20purple%20and%20gold%20lighting&image_size=landscape_16_9')`, 
        }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 z-10 bg-black/30" />

      {/* Content */}
      <div className="relative z-20 container px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants}>
            <Sparkles className="h-12 w-12 text-hekate-gold mx-auto mb-6 animate-glow" />
          </motion.div>

          <motion.h1 
            variants={itemVariants} 
            className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-br from-hekate-gold via-hekate-goldLight to-white mb-6 leading-tight [text-shadow:0_2px_20px_rgba(255,215,0,0.4)]"
          >
            A Soberania te Chama pelo Nome.
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="max-w-2xl mx-auto text-lg text-hekate-pearl/80 md:text-xl leading-relaxed"
          >
            Somos uma escola iniciática para quem sente o chamado da travessia. Aqui, o conhecimento é chave, o estudo é rito e a transformação é o caminho.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button 
              asChild 
              size="lg"
              className="w-full sm:w-auto bg-hekate-gold text-hekate-black hover:bg-hekate-gold/90 shadow-lg shadow-hekate-gold/20 btn-hover"
            >
              <Link href="/cursos">
                Explorar os Portais
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              asChild 
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-hekate-gold/50 text-hekate-pearl hover:bg-hekate-gold/10 hover:text-white"
            >
              <Link href="/sobre">
                Ler o Manifesto
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
