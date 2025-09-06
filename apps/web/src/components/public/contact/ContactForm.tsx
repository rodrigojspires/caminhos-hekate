'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Send, 
  User, 
  Mail, 
  MessageSquare, 
  Phone, 
  MapPin, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
  Star,
  HelpCircle,
  CreditCard,
  BookOpen,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const contactReasons = [
  {
    id: 'duvidas',
    title: 'Dúvidas Gerais',
    icon: HelpCircle,
    description: 'Perguntas sobre cursos, plataforma ou metodologia',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'suporte',
    title: 'Suporte Técnico',
    icon: AlertCircle,
    description: 'Problemas com acesso, login ou funcionalidades',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'pagamento',
    title: 'Pagamentos',
    icon: CreditCard,
    description: 'Questões sobre cobrança, planos ou reembolsos',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'cursos',
    title: 'Cursos e Conteúdo',
    icon: BookOpen,
    description: 'Informações sobre cursos específicos ou certificados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'comunidade',
    title: 'Comunidade',
    icon: Users,
    description: 'Questões sobre grupos, eventos ou interações',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  },
  {
    id: 'feedback',
    title: 'Feedback',
    icon: Star,
    description: 'Sugestões, elogios ou relatos de experiência',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  }
]

const formFields = [
  {
    id: 'name',
    label: 'Nome Completo',
    type: 'text',
    placeholder: 'Digite seu nome completo',
    icon: User,
    required: true
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'seu@email.com',
    icon: Mail,
    required: true
  },
  {
    id: 'phone',
    label: 'Telefone (Opcional)',
    type: 'tel',
    placeholder: '(11) 99999-9999',
    icon: Phone,
    required: false
  }
]

const responseTimeInfo = {
  free: {
    time: '48 horas',
    description: 'Para usuários do plano gratuito',
    color: 'text-gray-600'
  },
  premium: {
    time: '12 horas',
    description: 'Para membros dos planos pagos',
    color: 'text-purple-600'
  },
  vip: {
    time: '2 horas',
    description: 'Para membros do Caminho Sagrado',
    color: 'text-yellow-600'
  }
}

export function ContactForm() {
  const [selectedReason, setSelectedReason] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setSubmitStatus('success')
    
    // Reset form after success
    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
      setSelectedReason('')
      setSubmitStatus('idle')
    }, 3000)
  }

  const isFormValid = formData.name && formData.email && formData.message && selectedReason

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-6">
            <MessageSquare className="w-4 h-4 mr-2" />
            Formulário de Contato
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Como Podemos
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ajudar Você?
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Preencha o formulário abaixo e nossa equipe entrará em contato o mais breve possível. 
            Sua jornada é importante para nós.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          {/* Contact Reasons */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Qual o motivo do contato?
            </h3>
            
            <div className="space-y-3">
              {contactReasons.map((reason, index) => {
                const Icon = reason.icon
                const isSelected = selectedReason === reason.id
                
                return (
                  <motion.button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                      isSelected 
                        ? `${reason.bgColor} ${reason.color} border-current shadow-lg` 
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-1 ${
                        isSelected ? reason.color : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-1 ${
                          isSelected ? reason.color : 'text-gray-900'
                        }`}>
                          {reason.title}
                        </h4>
                        <p className={`text-sm ${
                          isSelected ? reason.color.replace('600', '700') : 'text-gray-600'
                        }`}>
                          {reason.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className={`w-5 h-5 ${reason.color}`} />
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Response Time Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              viewport={{ once: true }}
              className="mt-8"
            >
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Tempo de Resposta
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(responseTimeInfo).map(([key, info]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {info.description}
                        </span>
                        <span className={`text-sm font-semibold ${info.color}`}>
                          {info.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardContent className="p-8">
                {submitStatus === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Mensagem Enviada com Sucesso!
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      Recebemos sua mensagem e nossa equipe entrará em contato em breve. 
                      Obrigado por fazer parte da nossa comunidade!
                    </p>
                    <div className="flex items-center justify-center gap-2 text-purple-600">
                      <Heart className="w-5 h-5" />
                      <span className="font-semibold">Gratidão e Luz!</span>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Preencha seus dados
                      </h3>
                      <p className="text-gray-600">
                        Todas as informações são tratadas com confidencialidade
                      </p>
                    </div>

                    {/* Form Fields */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {formFields.map((field, index) => {
                        const Icon = field.icon
                        return (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 * index }}
                            viewport={{ once: true }}
                            className={field.id === 'name' ? 'md:col-span-2' : ''}
                          >
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="relative">
                              <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={formData[field.id as keyof typeof formData]}
                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                required={field.required}
                                className="pl-12 h-12 border-2 border-gray-200 focus:border-purple-500 rounded-xl"
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Subject */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      viewport={{ once: true }}
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Assunto <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Resuma o motivo do seu contato"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        required
                        className="h-12 border-2 border-gray-200 focus:border-purple-500 rounded-xl"
                      />
                    </motion.div>

                    {/* Message */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      viewport={{ once: true }}
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mensagem <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        placeholder="Descreva detalhadamente sua dúvida, problema ou feedback. Quanto mais informações, melhor poderemos ajudar!"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        required
                        rows={6}
                        className="w-full p-4 border-2 border-gray-200 focus:border-purple-500 rounded-xl resize-none focus:outline-none focus:ring-0"
                      />
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                      viewport={{ once: true }}
                      className="pt-4"
                    >
                      <Button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-14 text-lg font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Enviando mensagem...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-3" />
                            Enviar Mensagem
                          </>
                        )}
                      </Button>
                      
                      <p className="text-sm text-gray-500 text-center mt-4">
                        Ao enviar, você concorda com nossa política de privacidade
                      </p>
                    </motion.div>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}