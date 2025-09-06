import Link from 'next/link'
import { Moon, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const footerLinks = {
  company: [
    { name: 'Sobre Nós', href: '/sobre' },
    { name: 'Nossa Missão', href: '/sobre#missao' },
    { name: 'Equipe', href: '/sobre#equipe' },
    { name: 'Carreiras', href: '/carreiras' },
  ],
  courses: [
    { name: 'Catálogo de Cursos', href: '/cursos' },
    { name: 'Cursos Gratuitos', href: '/cursos?filter=free' },
    { name: 'Certificações', href: '/certificacoes' },
    { name: 'Trilhas de Aprendizado', href: '/trilhas' },
  ],
  community: [
    { name: 'Fórum', href: '/comunidade' },
    { name: 'Eventos', href: '/eventos' },
    { name: 'Blog', href: '/blog' },
    { name: 'Podcast', href: '/podcast' },
  ],
  support: [
    { name: 'Central de Ajuda', href: '/ajuda' },
    { name: 'Contato', href: '/contato' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Status do Sistema', href: '/status' },
  ],
  legal: [
    { name: 'Termos de Uso', href: '/termos' },
    { name: 'Política de Privacidade', href: '/privacidade' },
    { name: 'Política de Cookies', href: '/cookies' },
    { name: 'LGPD', href: '/lgpd' },
  ],
}

export function PublicFooter() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Moon className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold text-foreground">
                  Caminhos de Hekate
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Escola Iniciática
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Transforme sua vida através do autoconhecimento. Descubra cursos exclusivos 
              de desenvolvimento pessoal e espiritualidade.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>contato@caminhosdehekate.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+55 (11) 99999-9999</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>São Paulo, SP - Brasil</span>
              </div>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Empresa</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Courses Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Cursos</h3>
            <ul className="space-y-2">
              {footerLinks.courses.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Comunidade</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Suporte</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Receba novidades e conteúdos exclusivos
              </h3>
              <p className="text-sm text-muted-foreground">
                Inscreva-se em nossa newsletter e seja o primeiro a saber sobre novos cursos, 
                eventos e conteúdos especiais.
              </p>
            </div>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                className="flex-1"
              />
              <Button type="submit">
                Inscrever-se
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Caminhos de Hekate. Todos os direitos reservados.
          </div>
          
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center md:justify-end space-x-4">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}