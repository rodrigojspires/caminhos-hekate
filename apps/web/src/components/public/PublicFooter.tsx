import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TripleMoonIcon, StrophalosIcon } from '@/components/icons/Esoteric'

const footerLinks = {
  company: [
    { name: 'Manifesto', href: '/sobre' },
  ],
  courses: [
    { name: 'Catálogo de Cursos', href: '/cursos' },
  ],
  community: [
    { name: 'Fórum', href: '/comunidade' },
    { name: 'Eventos', href: '/eventos' },
  ],
  support: [
    { name: 'Contato', href: '/contato' },
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
    <footer className="bg-hekate-black border-t border-hekate-gold/20 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hekate-gold/60 to-transparent" />
      {/* subtle ritual wheel in background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <StrophalosIcon className="w-[36rem] h-[36rem] text-hekate-gold" />
      </div>
      <div className="container py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <TripleMoonIcon className="h-8 w-8 text-hekate-gold" />
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold text-hekate-pearl">
                  Caminhos de Hekate
                </span>
                <span className="text-xs text-hekate-pearl/70 uppercase tracking-wider">
                  Escola Iniciática
                </span>
              </div>
            </Link>
            <p className="text-sm text-hekate-pearl/80 mb-4 max-w-sm">
              Templo‑escola para ritos, estudos e travessias. Cada ciclo, uma passagem. Cada encontro, um chamado.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm text-hekate-pearl/70">
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
            <h3 className="font-semibold text-hekate-pearl mb-4">Templo</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false}
                    href={link.href}
                    className="text-sm text-hekate-pearl/80 hover:text-hekate-gold transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Courses Links */}
          <div>
            <h3 className="font-semibold text-hekate-pearl mb-4">Portais</h3>
            <ul className="space-y-2">
              {footerLinks.courses.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false}
                    href={link.href}
                    className="text-sm text-hekate-pearl/80 hover:text-hekate-gold transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="font-semibold text-hekate-pearl mb-4">Egrégora</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false}
                    href={link.href}
                    className="text-sm text-hekate-pearl/80 hover:text-hekate-gold transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-hekate-pearl mb-4">Suporte</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false}
                    href={link.href}
                    className="text-sm text-hekate-pearl/80 hover:text-hekate-gold transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t border-hekate-gold/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-semibold text-hekate-pearl mb-2">
                Receba novidades e conteúdos exclusivos
              </h3>
              <p className="text-sm text-hekate-pearl/70">
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
              <Button type="submit" className="bg-hekate-gold text-hekate-black hover:bg-hekate-gold/90">
                Inscrever-se
              </Button>
            </div>
          </div>
        </div>

        {/* Closing mantra */}
        <div className="mt-12 text-center">
          <p className="font-serif text-hekate-pearl/90">
            “Hekate abre os portais. Permanecer ou atravessar é escolha tua.”
          </p>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-hekate-gold/20 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-hekate-pearl/80">
            © {new Date().getFullYear()} Caminhos de Hekate. Todos os direitos reservados.
          </div>
          
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center md:justify-end space-x-4">
            {footerLinks.legal.map((link) => (
              <Link prefetch={false}
                key={link.name}
                href={link.href}
                className="text-sm text-hekate-pearl/80 hover:text-hekate-gold transition-colors"
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
