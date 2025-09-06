'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  Play, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  Award,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const featuredCourses = [
  {
    id: 1,
    title: 'Despertar da Consciência',
    subtitle: 'Fundamentos do Autoconhecimento',
    description: 'Uma jornada profunda pelos mistérios da consciência humana e os primeiros passos para o despertar espiritual.',
    instructor: 'Mestra Luna',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=mystical%20consciousness%20awakening%20meditation%20spiritual%20journey%20purple%20golden%20light%20serene%20atmosphere&image_size=landscape_4_3',
    duration: '8 semanas',
    lessons: 24,
    students: 2847,
    rating: 4.9,
    reviews: 342,
    level: 'Iniciante',
    price: 'R$ 297',
    originalPrice: 'R$ 497',
    category: 'Espiritualidade',
    highlights: ['Meditações Guiadas', 'Exercícios Práticos', 'Comunidade Exclusiva'],
    isPopular: true
  },
  {
    id: 2,
    title: 'Alquimia Interior',
    subtitle: 'Transformação Pessoal Profunda',
    description: 'Descubra os segredos da alquimia aplicada ao desenvolvimento pessoal e transforme sua vida de dentro para fora.',
    instructor: 'Mestre Hermes',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=inner%20alchemy%20transformation%20golden%20symbols%20mystical%20laboratory%20spiritual%20growth%20ancient%20wisdom&image_size=landscape_4_3',
    duration: '12 semanas',
    lessons: 36,
    students: 1923,
    rating: 4.8,
    reviews: 287,
    level: 'Intermediário',
    price: 'R$ 497',
    originalPrice: 'R$ 797',
    category: 'Desenvolvimento Pessoal',
    highlights: ['Rituais de Transformação', 'Trabalho com Sombra', 'Integração Prática'],
    isNew: true
  },
  {
    id: 3,
    title: 'Cura Ancestral',
    subtitle: 'Reconectando com as Raízes',
    description: 'Explore técnicas milenares de cura e reconecte-se com a sabedoria ancestral para curar traumas geracionais.',
    instructor: 'Xamã Aiyana',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=ancestral%20healing%20shamanic%20journey%20ancient%20wisdom%20tribal%20symbols%20healing%20energy%20nature%20connection&image_size=landscape_4_3',
    duration: '10 semanas',
    lessons: 30,
    students: 1456,
    rating: 4.9,
    reviews: 198,
    level: 'Avançado',
    price: 'R$ 697',
    originalPrice: 'R$ 997',
    category: 'Cura Energética',
    highlights: ['Jornadas Xamânicas', 'Cura de Linhagem', 'Plantas Sagradas'],
    isFeatured: true
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
}

export function CoursePreview() {
  return (
    <section className="py-20 bg-muted/30">
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
            Cursos em Destaque
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Inicie Sua Jornada de
            <span className="text-primary block">
              Transformação Hoje
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Explore nossos cursos mais populares e descubra qual caminho ressoa 
            com sua alma. Cada jornada é única e transformadora.
          </p>
        </motion.div>

        {/* Featured Courses */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16"
        >
          {featuredCourses.map((course, index) => (
            <motion.div key={course.id} variants={itemVariants}>
              <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
                {/* Course Image */}
                <div className="relative overflow-hidden">
                  <Image
                    src={course.image}
                    alt={course.title}
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay Badges */}
                  <div className="absolute top-4 left-4 flex flex-col space-y-2">
                    {course.isPopular && (
                      <Badge className="bg-orange-500 hover:bg-orange-600">
                        🔥 Popular
                      </Badge>
                    )}
                    {course.isNew && (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        ✨ Novo
                      </Badge>
                    )}
                    {course.isFeatured && (
                      <Badge className="bg-purple-500 hover:bg-purple-600">
                        ⭐ Destaque
                      </Badge>
                    )}
                  </div>
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="h-6 w-6 text-primary fill-current" />
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-white/90 text-foreground">
                      {course.category}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Course Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {course.level}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{course.rating}</span>
                        <span className="text-xs text-muted-foreground">({course.reviews})</span>
                      </div>
                    </div>
                    
                    <h3 className="font-serif text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-primary font-medium mb-2">
                      {course.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Course Stats */}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.lessons} aulas</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{course.students.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Instructor */}
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      Por <span className="font-medium text-foreground">{course.instructor}</span>
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-1">
                      {course.highlights.map((highlight, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-primary">
                        {course.price}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {course.originalPrice}
                      </span>
                    </div>
                    <Button size="sm" className="group" asChild>
                      <Link href={`/cursos/${course.id}`}>
                        Ver Curso
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 md:p-12">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              Mais de 50 Cursos Disponíveis
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Explore todo nosso catálogo de cursos e encontre o caminho perfeito 
              para sua jornada de autoconhecimento e crescimento espiritual.
            </p>
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/cursos">
                Ver Todos os Cursos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}