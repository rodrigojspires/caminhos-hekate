'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock, 
  Shield, 
  CreditCard, 
  BookOpen, 
  Users, 
  Settings, 
  Search, 
  Star, 
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const faqCategories = [
  {
    id: 'geral',
    title: 'Dúvidas Gerais',
    icon: HelpCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'conta',
    title: 'Conta e Acesso',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'cursos',
    title: 'Cursos e Conteúdo',
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'pagamento',
    title: 'Pagamentos',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'comunidade',
    title: 'Comunidade',
    icon: Users,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  {
    id: 'tecnico',
    title: 'Suporte Técnico',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
]

const faqData = {
  geral: [
    {
      question: 'Como posso começar minha jornada nos Caminhos de Hekate?',
      answer: 'Você pode começar criando uma conta gratuita e explorando nosso conteúdo introdutório. Recomendamos começar com o curso "Primeiros Passos" e participar da nossa comunidade para se conectar com outros praticantes.',
      helpful: 156,
      tags: ['iniciante', 'primeiros-passos']
    },
    {
      question: 'Qual é a diferença entre os planos disponíveis?',
      answer: 'Oferecemos três planos: Caminho Livre (gratuito) com acesso básico, Caminho Iluminado (R$ 47/mês) com cursos completos e comunidade, e Caminho Sagrado (R$ 97/mês) com mentoria personalizada e conteúdo exclusivo.',
      helpful: 203,
      tags: ['planos', 'preços']
    },
    {
      question: 'Os ensinamentos são adequados para iniciantes?',
      answer: 'Sim! Nossa metodologia foi desenvolvida para acolher praticantes de todos os níveis. Temos conteúdo específico para iniciantes, com progressão gradual e suporte contínuo da comunidade.',
      helpful: 189,
      tags: ['iniciante', 'metodologia']
    },
    {
      question: 'Como funciona o sistema de certificação?',
      answer: 'Ao completar nossos cursos, você recebe certificados digitais que validam seu aprendizado. Os certificados incluem carga horária, conteúdo estudado e podem ser compartilhados em redes profissionais.',
      helpful: 142,
      tags: ['certificado', 'conclusão']
    }
  ],
  conta: [
    {
      question: 'Esqueci minha senha, como posso recuperá-la?',
      answer: 'Clique em "Esqueci minha senha" na página de login, digite seu email e você receberá instruções para criar uma nova senha. O link é válido por 24 horas.',
      helpful: 298,
      tags: ['senha', 'recuperação']
    },
    {
      question: 'Posso alterar meu email de cadastro?',
      answer: 'Sim, você pode alterar seu email nas configurações da conta. Por segurança, você receberá uma confirmação no novo email antes da alteração ser efetivada.',
      helpful: 167,
      tags: ['email', 'configurações']
    },
    {
      question: 'Como excluir minha conta permanentemente?',
      answer: 'Entre em contato conosco através do formulário de contato solicitando a exclusão. Por questões de segurança, este processo requer confirmação por email e leva até 48 horas.',
      helpful: 89,
      tags: ['exclusão', 'privacidade']
    },
    {
      question: 'Minha conta foi bloqueada, o que fazer?',
      answer: 'Contas podem ser temporariamente bloqueadas por questões de segurança. Entre em contato conosco imediatamente com detalhes da situação para resolvermos rapidamente.',
      helpful: 134,
      tags: ['bloqueio', 'segurança']
    }
  ],
  cursos: [
    {
      question: 'Por quanto tempo tenho acesso aos cursos?',
      answer: 'O acesso aos cursos é vitalício para membros dos planos pagos. Mesmo se você cancelar sua assinatura, manterá acesso aos cursos que já adquiriu.',
      helpful: 245,
      tags: ['acesso', 'vitalício']
    },
    {
      question: 'Posso baixar os vídeos para assistir offline?',
      answer: 'Sim, membros dos planos pagos podem baixar vídeos através do nosso aplicativo móvel para assistir offline. Esta funcionalidade não está disponível no plano gratuito.',
      helpful: 178,
      tags: ['download', 'offline']
    },
    {
      question: 'Como acompanho meu progresso nos cursos?',
      answer: 'Seu progresso é automaticamente salvo conforme você assiste às aulas. Você pode visualizar estatísticas detalhadas no seu dashboard, incluindo tempo assistido e exercícios completados.',
      helpful: 156,
      tags: ['progresso', 'minha escola']
    },
    {
      question: 'Existe prazo para completar os cursos?',
      answer: 'Não há prazo limite para completar os cursos. Você pode estudar no seu próprio ritmo, pausar e retomar quando desejar. Respeitamos sua jornada individual.',
      helpful: 201,
      tags: ['prazo', 'flexibilidade']
    }
  ],
  pagamento: [
    {
      question: 'Quais formas de pagamento são aceitas?',
      answer: 'Aceitamos cartões de crédito (Visa, Mastercard, Elo), débito, PIX, boleto bancário e PayPal. Para assinaturas, recomendamos cartão de crédito para renovação automática.',
      helpful: 267,
      tags: ['pagamento', 'métodos']
    },
    {
      question: 'Posso cancelar minha assinatura a qualquer momento?',
      answer: 'Sim, você pode cancelar sua assinatura a qualquer momento sem multas ou taxas. O acesso continua até o final do período já pago.',
      helpful: 234,
      tags: ['cancelamento', 'assinatura']
    },
    {
      question: 'Oferecem garantia de reembolso?',
      answer: 'Sim, oferecemos garantia de 30 dias para todos os planos pagos. Se não ficar satisfeito, reembolsamos 100% do valor pago, sem perguntas.',
      helpful: 189,
      tags: ['reembolso', 'garantia']
    },
    {
      question: 'Como funciona a cobrança recorrente?',
      answer: 'A cobrança é feita automaticamente na data de vencimento da sua assinatura. Você recebe um lembrete por email 3 dias antes da cobrança e pode cancelar a qualquer momento.',
      helpful: 145,
      tags: ['cobrança', 'recorrente']
    }
  ],
  comunidade: [
    {
      question: 'Como participar das discussões da comunidade?',
      answer: 'Após criar sua conta, você pode acessar os fóruns, participar de discussões, criar posts e interagir com outros membros. Incentivamos o respeito e a troca construtiva.',
      helpful: 198,
      tags: ['fórum', 'discussões']
    },
    {
      question: 'Existem eventos ao vivo para a comunidade?',
      answer: 'Sim! Realizamos lives mensais, círculos de estudo, meditações em grupo e workshops especiais. Membros premium têm acesso prioritário e conteúdo exclusivo.',
      helpful: 176,
      tags: ['eventos', 'lives']
    },
    {
      question: 'Posso criar grupos privados na comunidade?',
      answer: 'Membros do Caminho Sagrado podem criar grupos privados para estudos específicos ou práticas em grupo. Esta funcionalidade permite maior intimidade e foco.',
      helpful: 87,
      tags: ['grupos', 'privado']
    }
  ],
  tecnico: [
    {
      question: 'O site não está carregando, o que fazer?',
      answer: 'Primeiro, verifique sua conexão com a internet. Tente limpar o cache do navegador, desabilitar extensões ou usar outro navegador. Se persistir, entre em contato conosco.',
      helpful: 234,
      tags: ['carregamento', 'cache']
    },
    {
      question: 'Os vídeos não reproduzem corretamente',
      answer: 'Verifique se seu navegador está atualizado e se o JavaScript está habilitado. Para melhor experiência, recomendamos Chrome, Firefox ou Safari nas versões mais recentes.',
      helpful: 187,
      tags: ['vídeo', 'reprodução']
    },
    {
      question: 'Como usar a plataforma no celular?',
      answer: 'Nossa plataforma é totalmente responsiva e funciona perfeitamente em dispositivos móveis. Para melhor experiência, recomendamos usar nosso aplicativo disponível na App Store e Google Play.',
      helpful: 156,
      tags: ['mobile', 'aplicativo']
    },
    {
      question: 'Posso usar a plataforma em múltiplos dispositivos?',
      answer: 'Sim, você pode acessar sua conta em até 3 dispositivos simultaneamente. Seu progresso é sincronizado automaticamente entre todos os dispositivos.',
      helpful: 198,
      tags: ['dispositivos', 'sincronização']
    }
  ]
}

const quickStats = [
  {
    label: 'Perguntas Respondidas',
    value: '2.847',
    icon: MessageSquare,
    color: 'text-blue-600'
  },
  {
    label: 'Tempo Médio de Resposta',
    value: '2.3h',
    icon: Clock,
    color: 'text-green-600'
  },
  {
    label: 'Taxa de Resolução',
    value: '98.5%',
    icon: CheckCircle,
    color: 'text-purple-600'
  },
  {
    label: 'Satisfação do Suporte',
    value: '4.9/5',
    icon: Star,
    color: 'text-yellow-600'
  }
]

export function ContactFAQ() {
  const [selectedCategory, setSelectedCategory] = useState('geral')
  const [openItems, setOpenItems] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const filteredFAQs = faqData[selectedCategory as keyof typeof faqData].filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-6">
            <HelpCircle className="w-4 h-4 mr-2" />
            Perguntas Frequentes
          </Badge>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Encontre Respostas
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Rápidas e Precisas
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Nossa base de conhecimento foi criada com base nas dúvidas mais comuns da nossa comunidade. 
            Se não encontrar sua resposta aqui, entre em contato conosco.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-4 gap-6 mb-12"
        >
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                viewport={{ once: true }}
              >
                <Card className="border-2 border-gray-200 text-center">
                  <CardContent className="p-6">
                    <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                    <p className={`text-2xl font-bold ${stat.color} mb-1`}>
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-600">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="lg:col-span-1"
            >
              <div className="sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Categorias
                </h3>
                
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar perguntas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  {faqCategories.map((category, index) => {
                    const Icon = category.icon
                    const isSelected = selectedCategory === category.id
                    const categoryCount = faqData[category.id as keyof typeof faqData].length
                    
                    return (
                      <motion.button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                          isSelected 
                            ? `${category.bgColor} ${category.color} ${category.borderColor} shadow-md` 
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${
                            isSelected ? category.color : 'text-gray-400'
                          }`} />
                          <div className="flex-1">
                            <h4 className={`font-semibold ${
                              isSelected ? category.color : 'text-gray-900'
                            }`}>
                              {category.title}
                            </h4>
                            <p className={`text-sm ${
                              isSelected ? category.color.replace('600', '700') : 'text-gray-500'
                            }`}>
                              {categoryCount} perguntas
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* FAQ Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {faqCategories.find(cat => cat.id === selectedCategory)?.title}
                </h3>
                <p className="text-gray-600">
                  {filteredFAQs.length} pergunta{filteredFAQs.length !== 1 ? 's' : ''} encontrada{filteredFAQs.length !== 1 ? 's' : ''}
                  {searchTerm && ` para "${searchTerm}"`}
                </p>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {filteredFAQs.map((faq, index) => {
                    const itemId = `${selectedCategory}-${index}`
                    const isOpen = openItems.includes(itemId)
                    
                    return (
                      <motion.div
                        key={itemId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: 0.05 * index }}
                      >
                        <Card className="border-2 border-gray-200 hover:border-gray-300 transition-all duration-300">
                          <CardContent className="p-0">
                            <button
                              onClick={() => toggleItem(itemId)}
                              className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-xl"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    {faq.question}
                                  </h4>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span>{faq.helpful} pessoas acharam útil</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {faq.tags.slice(0, 2).map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex-shrink-0">
                                  {isOpen ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>
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
                                      <p className="text-gray-700 leading-relaxed mb-4">
                                        {faq.answer}
                                      </p>
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Info className="w-4 h-4 text-blue-600" />
                                          <span className="text-sm text-blue-600 font-medium">
                                            Esta resposta foi útil?
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                          >
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Sim
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                          >
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            Não
                                          </Button>
                                        </div>
                                      </div>
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
                </AnimatePresence>
                
                {filteredFAQs.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Nenhuma pergunta encontrada
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Não encontramos perguntas que correspondam à sua busca.
                    </p>
                    <Button
                      onClick={() => setSearchTerm('')}
                      variant="outline"
                      className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Limpar Busca
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <h3 className="text-2xl font-bold text-gray-900">
                  Não Encontrou Sua Resposta?
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Nossa equipe de suporte está sempre pronta para ajudar. 
                Entre em contato e teremos prazer em esclarecer suas dúvidas.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <a href="#contact-form">
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Pergunta
                  </a>
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  className="border-2 border-green-200 text-green-700 hover:bg-green-50"
                >
                  <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                    <Phone className="w-4 h-4 mr-2" />
                    WhatsApp Direto
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
