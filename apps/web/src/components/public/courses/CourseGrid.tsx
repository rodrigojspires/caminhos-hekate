'use client'

import { motion } from 'framer-motion'
import { Star, Clock, Users, Play, BookOpen, Award, Heart, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import Image from 'next/image'

const courses = [
  {
    id: 1,
    title: 'Jornada do Autoconhecimento',
    description: 'Descubra quem você realmente é através de práticas ancestrais e técnicas modernas de desenvolvimento pessoal.',
    instructor: {
      name: 'Luna Silveira',
      avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20a%20wise%20spiritual%20teacher%20woman%20with%20long%20dark%20hair%20and%20kind%20eyes%2C%20wearing%20flowing%20clothes%2C%20serene%20expression%2C%20soft%20lighting&image_size=square',
      title: 'Mestra em Autoconhecimento'
    },
    thumbnail: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=mystical%20journey%20of%20self%20discovery%2C%20person%20meditating%20in%20nature%2C%20spiritual%20awakening%2C%20golden%20light%2C%20peaceful%20atmosphere&image_size=landscape_16_9',
    category: 'Autoconhecimento',
    level: 'Iniciante',
    duration: '12 horas',
    lessons: 24,
    students: 3420,
    rating: 4.9,
    reviews: 892,
    price: 297,
    originalPrice: 497,
    isFree: false,
    isPopular: true,
    highlights: ['Certificado Incluso', 'Acesso Vitalício', 'Comunidade Exclusiva'],
    progress: 0
  },
  {
    id: 2,
    title: 'Fundamentos da Meditação',
    description: 'Aprenda técnicas milenares de meditação para encontrar paz interior e clareza mental.',
    instructor: {
      name: 'Marcus Zen',
      avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=peaceful%20meditation%20teacher%20man%20with%20beard%20and%20calm%20expression%2C%20wearing%20simple%20clothes%2C%20serene%20background&image_size=square',
      title: 'Instrutor de Meditação'
    },
    thumbnail: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=serene%20meditation%20scene%2C%20person%20sitting%20in%20lotus%20position%2C%20peaceful%20nature%20setting%2C%20soft%20morning%20light&image_size=landscape_16_9',
    category: 'Meditação',
    level: 'Iniciante',
    duration: '8 horas',
    lessons: 16,
    students: 5680,
    rating: 4.8,
    reviews: 1240,
    price: 0,
    originalPrice: 197,
    isFree: true,
    isPopular: false,
    highlights: ['Curso Gratuito', 'Técnicas Práticas', 'Guias de Áudio'],
    progress: 0
  },
  {
    id: 3,
    title: 'Tarot Intuitivo Completo',
    description: 'Domine a arte do Tarot através da intuição e conexão espiritual profunda.',
    instructor: {
      name: 'Morgana Arcana',
      avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=mystical%20tarot%20reader%20woman%20with%20flowing%20hair%20and%20wise%20eyes%2C%20surrounded%20by%20tarot%20cards%2C%20magical%20atmosphere&image_size=square',
      title: 'Tarologa Profissional'
    },
    thumbnail: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20tarot%20cards%20spread%20on%20mystical%20table%2C%20candles%20and%20crystals%2C%20magical%20atmosphere%2C%20golden%20light&image_size=landscape_16_9',
    category: 'Tarot',
    level: 'Intermediário',
    duration: '20 horas',
    lessons: 40,
    students: 2890,
    rating: 4.9,
    reviews: 654,
    price: 497,
    originalPrice: 797,
    isFree: false,
    isPopular: true,
    highlights: ['Deck Incluso', 'Prática Supervisionada', 'Certificação'],
    progress: 0
  },
  {
    id: 4,
    title: 'Astrologia Essencial',
    description: 'Compreenda os mistérios dos astros e como eles influenciam sua jornada de vida.',
    instructor: {
      name: 'Stella Cosmos',
      avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=wise%20astrologer%20woman%20with%20starry%20eyes%20and%20celestial%20jewelry%2C%20cosmic%20background%2C%20mystical%20appearance&image_size=square',
      title: 'Astróloga Certificada'
    },
    thumbnail: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20astrological%20chart%20with%20zodiac%20symbols%2C%20starry%20night%20sky%2C%20cosmic%20energy%2C%20mystical%20atmosphere&image_size=landscape_16_9',
    category: 'Astrologia',
    level: 'Iniciante',
    duration: '15 horas',
    lessons: 30,
    students: 4120,
    rating: 4.7,
    reviews: 890,
    price: 397,
    originalPrice: 597,
    isFree: false,
    isPopular: false,
    highlights: ['Mapa Natal Incluso', 'Software Gratuito', 'Mentoria Online'],
    progress: 0
  },
  {
    id: 5,
    title: 'Cristais e Energias',
    description: 'Aprenda a trabalhar com cristais para harmonização energética e cura espiritual.',
    instructor: {
      name: 'Ametista Silva',
      avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=crystal%20healer%20woman%20with%20gentle%20smile%20holding%20amethyst%20crystal%2C%20peaceful%20expression%2C%20natural%20lighting&image_size=square',
      title: 'Terapeuta Holística'
    },
    thumbnail: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20collection%20of%20healing%20crystals%20and%20gemstones%2C%20natural%20light%2C%20peaceful%20setting%2C%20spiritual%20energy&image_size=landscape_16_9',
    category: 'Cristais',
    level: 'Iniciante',
    duration: '10 horas',
    lessons: 20,
    students: 2340,
    rating: 4.8,
    reviews: 456,
    price: 247,
    originalPrice: 397,
    isFree: false,
    isPopular: false,
    highlights: ['Kit de Cristais', 'Guia Prático', 'Comunidade Ativa'],
    progress: 0
  },
  {
    id: 6,
    title: 'Rituais Sagrados',
    description: 'Conecte-se com o sagrado através de rituais ancestrais e práticas espirituais.',
    instructor: {
      name: 'Sage Moonlight',
      avatar: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=spiritual%20ritual%20practitioner%20with%20wise%20expression%2C%20surrounded%20by%20candles%20and%20sacred%20objects%2C%20mystical%20atmosphere&image_size=square',
      title: 'Sacerdotisa Iniciada'
    },
    thumbnail: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=sacred%20ritual%20altar%20with%20candles%2C%20incense%2C%20crystals%20and%20sacred%20symbols%2C%20mystical%20lighting%2C%20spiritual%20atmosphere&image_size=landscape_16_9',
    category: 'Rituais',
    level: 'Avançado',
    duration: '18 horas',
    lessons: 36,
    students: 1890,
    rating: 4.9,
    reviews: 321,
    price: 597,
    originalPrice: 897,
    isFree: false,
    isPopular: false,
    highlights: ['Material Ritual', 'Iniciação Guiada', 'Grupo Seleto'],
    progress: 0
  }
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

export function CourseGrid() {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Cursos em
            <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Destaque
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Descubra nossa seleção cuidadosa de cursos transformadores, criados por especialistas renomados.
          </p>
        </motion.div>

        {/* Courses Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {courses.map((course) => (
            <motion.div key={course.id} variants={itemVariants}>
              <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                {/* Thumbnail */}
                <div className="relative overflow-hidden">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button size="sm" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                      <Play className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {course.isFree && (
                      <Badge className="bg-green-500 text-white">
                        Gratuito
                      </Badge>
                    )}
                    {course.isPopular && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        ⭐ Popular
                      </Badge>
                    )}
                  </div>

                  {/* Category */}
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className="bg-white/90 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-white/0 dark:border-gray-700">
                      {course.category}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Title and Description */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-purple-600 transition-colors duration-300">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Instructor */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={course.instructor.avatar} alt={course.instructor.name} />
                      <AvatarFallback>{course.instructor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{course.instructor.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{course.instructor.title}</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.lessons} aulas
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.students.toLocaleString()}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(course.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{course.rating}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">({course.reviews} avaliações)</span>
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.highlights.slice(0, 2).map((highlight) => (
                      <Badge key={highlight} variant="outline" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {course.isFree ? (
                        <span className="text-2xl font-bold text-green-600">Gratuito</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            R$ {course.price}
                          </span>
                          {course.originalPrice > course.price && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                              R$ {course.originalPrice}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      {course.isFree ? 'Começar' : 'Inscrever-se'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Load More */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg" className="px-8 py-3">
            <Eye className="w-4 h-4 mr-2" />
            Ver Todos os Cursos
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
