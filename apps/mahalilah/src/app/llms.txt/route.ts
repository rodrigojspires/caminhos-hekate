import { MAHA_LILAH_SITE_URL } from '@/lib/marketing/seo'

const body = `# Maha Lilah Online
> Plataforma brasileira para jornadas terapeuticas ao vivo com tabuleiro de autoconhecimento, registro estruturado e assistencia por IA opcional.

Site oficial: ${MAHA_LILAH_SITE_URL}

## Topicos principais
- Maha Lilah
- Maha Lilah Online
- Jogo Maha Lilah online
- Tabuleiro de autoconhecimento
- Jornada terapeutica com IA
- Plataforma para terapeutas e facilitadores

## URLs recomendadas
- Home: ${MAHA_LILAH_SITE_URL}/
- Como funciona: ${MAHA_LILAH_SITE_URL}/como-funciona
- Planos: ${MAHA_LILAH_SITE_URL}/planos
- Recursos: ${MAHA_LILAH_SITE_URL}/recursos
- Para terapeutas: ${MAHA_LILAH_SITE_URL}/para-terapeutas
- Para grupos: ${MAHA_LILAH_SITE_URL}/para-grupos
- FAQ: ${MAHA_LILAH_SITE_URL}/faq
- Blog: ${MAHA_LILAH_SITE_URL}/blog
- Seguranca e privacidade: ${MAHA_LILAH_SITE_URL}/seguranca-privacidade

## Conteudo detalhado para IA
- ${MAHA_LILAH_SITE_URL}/llms-full.txt
`

export function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
