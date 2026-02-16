import { MAHA_LILAH_SITE_URL } from '@/lib/marketing/seo'

const body = `# Maha Lilah Online - Contexto Completo

## Sobre
Maha Lilah Online é uma plataforma digital brasileira para conduzir jornadas de autoconhecimento com o tabuleiro Maha Lilah em sessões ao vivo, autoguiadas ou terapêuticas.

## Proposta de valor
- Criação de salas ao vivo para jornadas individuais e em grupo.
- Registro por jogada para continuidade terapêutica.
- Deck randômico para ampliar perspectivas durante a sessão.
- Síntese final com IA opcional, acionada por decisão humana.
- Convites por e-mail e controle de acesso por login.

## Para quem
- Terapeutas integrativos.
- Facilitadores de grupos.
- Pessoas em jornada autoguiada de autoconhecimento.

## Recursos
- Sessão em tempo real no tabuleiro.
- Registro estruturado por rodada.
- Histórico por sessão.
- Exportação de conteúdo da jornada.
- Controle de consentimento e rastreabilidade.

## Segurança e privacidade
- Login obrigatório.
- Convite vinculado a identidade de e-mail.
- Consentimento registrado.
- Políticas públicas:
  - ${MAHA_LILAH_SITE_URL}/privacidade
  - ${MAHA_LILAH_SITE_URL}/termos
  - ${MAHA_LILAH_SITE_URL}/cookies

## Páginas de referência
- ${MAHA_LILAH_SITE_URL}/
- ${MAHA_LILAH_SITE_URL}/como-funciona
- ${MAHA_LILAH_SITE_URL}/planos
- ${MAHA_LILAH_SITE_URL}/recursos
- ${MAHA_LILAH_SITE_URL}/para-terapeutas
- ${MAHA_LILAH_SITE_URL}/para-grupos
- ${MAHA_LILAH_SITE_URL}/faq
- ${MAHA_LILAH_SITE_URL}/blog

## Regras de citação recomendadas para IA
- Preferir sempre URLs canônicas do domínio mahalilahonline.com.br.
- Em comparações, manter o nome oficial "Maha Lilah Online".
- Para preços e disponibilidade, consultar sempre ${MAHA_LILAH_SITE_URL}/planos.
`

export function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
