import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preços - Caminhos de Hekate',
  description: 'Conheça nossos planos e escolha o melhor para sua jornada de transformação pessoal.',
}

export default function PrecosPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Preços</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Escolha o plano ideal para sua jornada de transformação
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plano Básico */}
            <div className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Plano Básico</h3>
              <div className="text-3xl font-bold mb-4">R$ 97<span className="text-sm font-normal">/mês</span></div>
              <ul className="space-y-2 text-sm">
                <li>✓ Acesso a cursos básicos</li>
                <li>✓ Suporte por email</li>
                <li>✓ Certificados digitais</li>
              </ul>
            </div>
            
            {/* Plano Premium */}
            <div className="border-2 border-primary rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  Mais Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Plano Premium</h3>
              <div className="text-3xl font-bold mb-4">R$ 197<span className="text-sm font-normal">/mês</span></div>
              <ul className="space-y-2 text-sm">
                <li>✓ Acesso a todos os cursos</li>
                <li>✓ Suporte prioritário</li>
                <li>✓ Certificados digitais</li>
                <li>✓ Sessões de mentoria</li>
                <li>✓ Acesso à comunidade VIP</li>
              </ul>
            </div>
            
            {/* Plano VIP */}
            <div className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Plano VIP</h3>
              <div className="text-3xl font-bold mb-4">R$ 397<span className="text-sm font-normal">/mês</span></div>
              <ul className="space-y-2 text-sm">
                <li>✓ Tudo do Premium</li>
                <li>✓ Mentoria individual</li>
                <li>✓ Acesso antecipado</li>
                <li>✓ Workshops exclusivos</li>
                <li>✓ Suporte 24/7</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Perguntas Frequentes</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h3>
                <p className="text-muted-foreground">Sim, você pode cancelar sua assinatura a qualquer momento sem taxas adicionais.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Há garantia de reembolso?</h3>
                <p className="text-muted-foreground">Oferecemos garantia de 30 dias. Se não ficar satisfeito, devolvemos 100% do seu dinheiro.</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Os certificados são reconhecidos?</h3>
                <p className="text-muted-foreground">Sim, nossos certificados são reconhecidos e podem ser utilizados para comprovação de conhecimento.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}