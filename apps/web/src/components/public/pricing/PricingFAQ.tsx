'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  HelpCircle, 
  Shield, 
  CreditCard, 
  Users, 
  Clock, 
  Star, 
  Gift,
  RefreshCw,
  MessageCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const faqCategories = [
  {
    id: 'planos',
    title: 'Sobre os Planos',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    questions: [
      {
        question: 'Qual a diferença entre os planos disponíveis?',
        answer: 'O **Caminho Livre** oferece acesso básico com cursos introdutórios e comunidade. O **Caminho Iluminado** inclui todos os cursos, workshops ao vivo, certificados e suporte prioritário. O **Caminho Sagrado** adiciona mentoria individual, sessões de cura, kit físico e acesso vitalício.',
        popular: true
      },
      {
        question: 'Posso fazer upgrade ou downgrade do meu plano?',
        answer: 'Sim! Você pode alterar seu plano a qualquer momento. No upgrade, você paga apenas a diferença proporcional. No downgrade, o valor é creditado para o próximo ciclo de cobrança.',
        popular: false
      },
      {
        question: 'O que está incluído no plano gratuito?',
        answer: 'O plano gratuito inclui: 5 cursos introdutórios, acesso à comunidade básica, meditações essenciais, biblioteca de artigos, suporte por email e acesso mobile. É perfeito para conhecer nossa metodologia.',
        popular: true
      },
      {
        question: 'Existe limite de tempo para completar os cursos?',
        answer: 'Não! Todos os planos permitem que você estude no seu próprio ritmo. O conteúdo fica disponível durante toda sua assinatura (ou para sempre no plano VIP).',
        popular: false
      }
    ]
  },
  {
    id: 'pagamento',
    title: 'Pagamento e Cobrança',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    questions: [
      {
        question: 'Quais formas de pagamento são aceitas?',
        answer: 'Aceitamos cartões de crédito (Visa, Mastercard, American Express), PIX, boleto bancário e PayPal. Para planos anuais, oferecemos desconto de 20% no pagamento à vista.',
        popular: true
      },
      {
        question: 'Como funciona a cobrança recorrente?',
        answer: 'A cobrança é feita automaticamente no mesmo dia do mês da sua assinatura. Você recebe um lembrete por email 3 dias antes. Pode cancelar a qualquer momento sem multa.',
        popular: true
      },
      {
        question: 'Posso pagar anualmente e economizar?',
        answer: 'Sim! O pagamento anual oferece 20% de desconto em todos os planos. Por exemplo, o Caminho Iluminado sai de R$ 588/ano por apenas R$ 470/ano.',
        popular: false
      },
      {
        question: 'Há taxa de cancelamento ou multa?',
        answer: 'Não cobramos nenhuma taxa de cancelamento. Você pode cancelar sua assinatura a qualquer momento e continuar usando até o final do período pago.',
        popular: false
      },
      {
        question: 'Como funciona o reembolso?',
        answer: 'Oferecemos garantia de 30 dias para todos os planos pagos. Se não ficar satisfeito, devolvemos 100% do valor pago, sem perguntas ou burocracias.',
        popular: true
      }
    ]
  },
  {
    id: 'acesso',
    title: 'Acesso e Recursos',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    questions: [
      {
        question: 'Posso acessar de qualquer dispositivo?',
        answer: 'Sim! Nossa plataforma funciona perfeitamente em computadores, tablets e smartphones. Você pode baixar conteúdos para assistir offline e sincronizar seu progresso entre dispositivos.',
        popular: true
      },
      {
        question: 'Quantas pessoas podem usar a mesma conta?',
        answer: 'Cada conta é individual e pessoal. Para famílias, oferecemos desconto de 30% na segunda assinatura. Contas compartilhadas podem ser suspensas.',
        popular: false
      },
      {
        question: 'Como funciona o suporte ao cliente?',
        answer: 'Plano gratuito: suporte por email em até 48h. Planos pagos: suporte prioritário em até 12h. Plano VIP: suporte direto via WhatsApp com resposta em até 2h.',
        popular: true
      },
      {
        question: 'Os certificados são reconhecidos?',
        answer: 'Nossos certificados são reconhecidos por diversas instituições de ensino holístico e terapias alternativas. Incluem carga horária, conteúdo programático e QR code de verificação.',
        popular: false
      }
    ]
  },
  {
    id: 'tecnico',
    title: 'Questões Técnicas',
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    questions: [
      {
        question: 'Preciso de internet para acessar o conteúdo?',
        answer: 'Para streaming sim, mas planos pagos permitem download de vídeos e áudios para acesso offline. Ideal para estudar em locais sem internet ou economizar dados móveis.',
        popular: true
      },
      {
        question: 'Meus dados estão seguros?',
        answer: 'Sim! Usamos criptografia SSL, servidores seguros e cumprimos a LGPD. Seus dados pessoais e de pagamento são protegidos com os mais altos padrões de segurança.',
        popular: false
      },
      {
        question: 'E se eu esquecer minha senha?',
        answer: 'Você pode redefinir sua senha a qualquer momento através do link "Esqueci minha senha" na tela de login. O processo é rápido e seguro.',
        popular: false
      },
      {
        question: 'A plataforma funciona em todos os navegadores?',
        answer: 'Sim! Nossa plataforma é compatível com Chrome, Firefox, Safari, Edge e outros navegadores modernos. Também temos apps nativos para iOS e Android.',
        popular: false
      }
    ]
  }
]

const quickStats = {
  totalQuestions: 156,
  avgResponseTime: '2 horas',
  satisfactionRate: 98,
  supportLanguages: 3
}

export function PricingFAQ() {
  const [activeCategory, setActiveCategory] = useState('planos')
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  const currentCategory = faqCategories.find(cat => cat.id === activeCategory)

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-6">
            <HelpCircle className="w-4 h-4 mr-2" />
            FAQ • {quickStats.totalQuestions} Perguntas Respondidas
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Perguntas
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Frequentes
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Encontre respostas para as dúvidas mais comuns sobre nossos planos, 
            pagamentos e funcionalidades.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {quickStats.avgResponseTime}
              </div>
              <div className="text-sm text-gray-600">Tempo de Resposta</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {quickStats.satisfactionRate}%
              </div>
              <div className="text-sm text-gray-600">Satisfação</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                24/7
              </div>
              <div className="text-sm text-gray-600">Disponibilidade</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {quickStats.supportLanguages}
              </div>
              <div className="text-sm text-gray-600">Idiomas</div>
            </div>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {faqCategories.map((category) => {
            const Icon = category.icon
            const isActive = activeCategory === category.id
            
            return (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isActive 
                    ? `${category.bgColor} ${category.color} border-2 border-current` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {category.title}
                <Badge className={`ml-2 ${
                  isActive 
                    ? 'bg-white/20 text-current border-current/20' 
                    : 'bg-gray-200 text-gray-600 border-gray-300'
                }`}>
                  {category.questions.length}
                </Badge>
              </motion.button>
            )
          })}
        </motion.div>

        {/* FAQ Content */}
        <AnimatePresence mode="wait">
          {currentCategory && (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="space-y-4">
                {currentCategory.questions.map((faq, index) => {
                  const isOpen = openQuestion === `${activeCategory}-${index}`
                  
                  return (
                    <motion.div
                      key={`${activeCategory}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <Card className={`border-2 transition-all duration-300 ${
                        isOpen 
                          ? 'border-purple-200 shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <CardContent className="p-0">
                          <button
                            onClick={() => setOpenQuestion(isOpen ? null : `${activeCategory}-${index}`)}
                            className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              {faq.popular && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                                  Popular
                                </Badge>
                              )}
                              <h3 className="text-lg font-semibold text-gray-900 flex-1">
                                {faq.question}
                              </h3>
                            </div>
                            <motion.div
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            </motion.div>
                          </button>
                          
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 pb-6 border-t border-gray-200">
                                  <div className="pt-4">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                      {faq.answer}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Ainda tem dúvidas?</span>
              </div>
              
              <p className="text-gray-700 leading-relaxed mb-6 max-w-2xl mx-auto">
                Nossa equipe de suporte está sempre pronta para ajudar. 
                Entre em contato conosco através dos canais disponíveis.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 mb-3">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Chat ao Vivo</h4>
                  <p className="text-sm text-gray-600">Disponível 24/7 para planos pagos</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mb-3">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Email</h4>
                  <p className="text-sm text-gray-600">Resposta em até 2 horas</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 mb-3">
                    <Gift className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">WhatsApp VIP</h4>
                  <p className="text-sm text-gray-600">Exclusivo para Caminho Sagrado</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com Suporte
                </Button>
                <Button variant="outline" className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Central de Ajuda
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}