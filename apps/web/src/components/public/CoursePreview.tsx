'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Dados mocados (substituir por dados reais da API no futuro)
const courses = [
  {
    id: 1,
    title: 'Alquimia Interior: A Jornada da Autotransformação',
    description: 'Um curso profundo para quem busca transmutar sombras em luz, medos em poder e limitações em liberdade.',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=mystical%20symbol%20of%20a%20serpent%20eating%20its%20own%20tail%20ouroboros%20with%20alchemical%20symbols%20on%20a%20dark%20background&image_size=landscape_16_9',
    category: 'Alquimia',
    duration: '12 Semanas'
  },
  {
    id: 2,
    title: 'Sacerdócio de Hekate: O Caminho da Tocha',
    description: 'Uma jornada iniciática para devotos que desejam aprofundar sua conexão com a Deusa das Encruzilhadas.',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=a%20torch%20and%20a%20key%20crossed%20in%20front%20of%20a%20mystical%20crossroads%20at%20night%20with%20a%20full%20moon&image_size=landscape_16_9',
    category: 'Sacerdócio',
    duration: '9 Meses'
  },
  {
    id: 3,
    title: 'Oráculos & Divinação: A Arte de Ver o Invisível',
    description: 'Aprenda a conversar com o divino através de tarô, runas e outros espelhos da alma.',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=a%20deck%20of%20tarot%20cards%20spread%20out%20on%20a%20dark%20wooden%20table%20with%20a%20crystal%20ball%20in%20the%20background&image_size=landscape_16_9',
    category: 'Oráculos',
    duration: '8 Semanas'
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

export function CoursePreview() {
  return (
    <section className="py-24 sm:py-32 relative">
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
            Portais para a Sabedoria
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-hekate-pearl/80">
            Cada curso é uma chave, cada aula um passo na jornada. Encontre o portal que ressoa com o seu chamado.
          </p>
        </motion.div>

        {/* Courses Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {courses.map((course) => (
            <motion.div key={course.id} variants={itemVariants}>
              <Card className="h-full glass card-hover rounded-2xl overflow-hidden flex flex-col">
                <CardContent className="p-0 flex flex-col flex-grow">
                  <div className="relative h-48 overflow-hidden">
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <Badge className="absolute top-4 right-4 bg-hekate-gold/20 text-hekate-gold border-hekate-gold/30">{course.category}</Badge>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold font-serif text-hekate-pearl mb-3 flex-grow">{course.title}</h3>
                    <p className="text-hekate-pearl/70 text-sm mb-6">{course.description}</p>
                    
                    <div className="flex justify-between items-center text-sm text-hekate-purple-300">
                      <span><BookOpen className="inline-block h-4 w-4 mr-2" />Sacerdócio</span>
                      <span className="font-mono">{course.duration}</span>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                      <Button asChild className="w-full bg-hekate-gold/10 text-hekate-gold hover:bg-hekate-gold/20 border border-hekate-gold/30">
                        <Link href={`/cursos/${course.id}`}>Explorar Jornada</Link>
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Button asChild size="lg" className="btn-hover-scale">
            <Link href="/cursos">
              Explorar Todos os Portais
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
