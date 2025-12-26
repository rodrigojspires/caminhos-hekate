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
    <footer className="bg-hekate-black/80 backdrop-blur-sm border-t border-hekate-gold/20 relative overflow-hidden mt-16">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hekate-gold/50 to-transparent" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <StrophalosIcon className="w-[40rem] h-[40rem] text-hekate-gold [filter:drop-shadow(0_0_2rem_rgba(255,215,0,0.2))]" />
      </div>
      <div className="container py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <TripleMoonIcon className="h-10 w-10 text-hekate-gold" />
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold gradient-text-gold">
                  Caminhos de Hekate
                </span>
                <span className="text-xs text-hekate-goldLight/80 uppercase tracking-widest">
                  Escola Iniciática
                </span>
              </div>
            </Link>
            <p className="text-sm text-hekate-pearl/70 mb-6 max-w-sm">
              Templo‑escola para ritos, estudos e travessias. Cada ciclo, uma passagem. Cada encontro, um chamado.
            </p>
            <div className="space-y-3 text-sm text-hekate-pearl/60">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-hekate-gold/70" /><span>contato@caminhosdehekate.com</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-hekate-gold/70" /><span>+55 (11) 99999-9999</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-hekate-gold/70" /><span>São Paulo, SP - Brasil</span></div>
            </div>
          </div>

          {/* Link Sections */}
          <div>
            <h3 className="font-serif font-bold text-lg gradient-text-gold mb-4">Templo</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false} href={link.href} className="text-sm text-hekate-pearl/70 hover:text-hekate-gold transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg gradient-text-gold mb-4">Portais</h3>
            <ul className="space-y-3">
              {footerLinks.courses.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false} href={link.href} className="text-sm text-hekate-pearl/70 hover:text-hekate-gold transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg gradient-text-gold mb-4">Egrégora</h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false} href={link.href} className="text-sm text-hekate-pearl/70 hover:text-hekate-gold transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg gradient-text-gold mb-4">Suporte</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link prefetch={false} href={link.href} className="text-sm text-hekate-pearl/70 hover:text-hekate-gold transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-16 pt-10 border-t border-hekate-gold/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-serif text-xl font-bold gradient-text-gold mb-2">O Chamado da Encruzilhada</h3>
              <p className="text-sm text-hekate-pearl/70">
                Inscreva-se e receba sabedoria, notícias sobre ritos, cursos e eventos diretamente em seu refúgio.
              </p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                className="flex-1 bg-hekate-gray-900/50 border-hekate-gray-700 focus:ring-hekate-gold"
                required
              />
              <Button type="submit" variant="outline" className="border-hekate-gold text-hekate-gold hover:bg-hekate-gold hover:text-hekate-black btn-hover">
                Inscrever-se
              </Button>
            </form>
          </div>
        </div>

        {/* Closing mantra */}
        <div className="mt-16 text-center">
          <p className="font-serif text-lg text-hekate-pearl/90 italic">
            “Hekate abre os portais. Permanecer ou atravessar é escolha tua.”
          </p>
        </div>

        {/* Bottom Section */}
        <div className="mt-10 pt-8 border-t border-hekate-gold/20 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-hekate-pearl/60">
            © {new Date().getFullYear()} Caminhos de Hekate. Todos os direitos reservados.
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
            {footerLinks.legal.map((link) => (
              <Link prefetch={false} key={link.name} href={link.href} className="text-xs text-hekate-pearl/60 hover:text-hekate-gold transition-colors">{link.name}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
