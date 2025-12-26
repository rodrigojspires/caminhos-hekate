'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const testimonials = [
  {
    name: 'Juliana S.',
    role: 'Artista & Terapeuta',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20brazilian%20woman%20with%20curly%20hair%20in%20her%2030s%20smiling%20in%20a%20serene%20setting&image_size=square',
    testimonial: 'A Hekate School não foi apenas um curso, foi um rito de passagem. Encontrei uma profundidade em mim mesma que não conhecia. A cada aula, uma nova porta se abria.',
  },
  {
    name: 'Marcos V.',
    role: 'Advogado & Estudante de Ocultismo',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20brazilian%20man%20in%20his%2040s%20with%20a%20short%20beard%20looking%20thoughtful%20in%20a%20library&image_size=square',
    testimonial: 'A seriedade e o respeito com que os ensinamentos são tratados é algo raro. Encontrei um porto seguro para explorar minha espiritualidade sem dogmas.',
  },
  {
    name: 'Beatriz L.',
    role: 'Psicóloga',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20brazilian%20woman%20in%20her%2020s%20with%20glasses%20and%20a%20warm%20smile%20in%20a%20cozy%20office&image_size=square',
    testimonial: 'Integrei as ferramentas que aprendi na minha prática clínica e os resultados são surpreendentes. É uma abordagem que une o ancestral ao contemporâneo de forma magistral.',
  },
  {
    name: 'Ricardo F.',
    role: 'Músico',
    avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20brazilian%20man%20with%20long%20hair%20and%20tattoos%20in%20his%2030s%20in%20a%20music%20studio&image_size=square',
    testimonial: 'Minha criatividade explodiu. Os cursos abriram canais que eu nem sabia que existiam. A arte se tornou, para mim, uma forma de magia.',
  },
]

const stats = [
    { value: 4.9, label: 'Avaliação Média', suffix: '/5' },
    { value: 12000, label: 'Almas Despertas', prefix: '+' },
    { value: 30, label: 'Portais de Sabedoria', prefix: '+' },
    { value: 98, label: 'Índice de Soberania', suffix: '%' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } 
  },
}

type AnimatedStatNumberProps = {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
}

function AnimatedStatNumber({
  value,
  duration = 3,
  decimals = 0,
  prefix,
  suffix,
}: AnimatedStatNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-20% 0px' })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!isInView) return

    let frameId = 0
    const startTime = performance.now()
    const startValue = 0
    const endValue = value

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * eased
      setDisplayValue(currentValue)

      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [duration, isInView, value])

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  )
}

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32 relative">
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
            Vozes da Travessia
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-hekate-pearl/80">
            Ecos daqueles que atravessaram. Ouça as vozes que encontraram sua soberania em nossa jornada.
          </p>
        </motion.div>

        {/* Testimonials Masonry Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mb-24"
        >
          {testimonials.map((testimonial, i) => (
            <motion.div key={i} variants={itemVariants} className="break-inside-avoid">
              <Card className="h-full glass card-hover rounded-xl overflow-hidden">
                <CardContent className="p-8">
                  <Quote className="w-8 h-8 text-hekate-gold/30 mb-4" />
                  <blockquote className="text-hekate-pearl/90 mb-6 italic text-base">
                    &ldquo;{testimonial.testimonial}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-hekate-gold/50">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-hekate-pearl">{testimonial.name}</p>
                      <p className="text-sm text-hekate-pearl/70">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl md:text-5xl font-bold gradient-text-gold mb-2">
                  <AnimatedStatNumber
                    value={stat.value}
                    duration={3}
                    decimals={stat.value % 1 !== 0 ? 1 : 0}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="text-sm text-hekate-pearl/70 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
