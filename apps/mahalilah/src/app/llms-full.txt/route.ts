import { MAHA_LILAH_SITE_URL } from '@/lib/marketing/seo'

const body = `# Maha Lilah Online - Contexto Completo

## Sobre
Maha Lilah Online e uma plataforma digital brasileira para conduzir jornadas de autoconhecimento com o tabuleiro Maha Lilah em sessoes ao vivo, autoguiadas ou terapeuticas.

## Proposta de valor
- Criacao de salas ao vivo para jornadas individuais e em grupo.
- Registro por jogada para continuidade terapeutica.
- Deck randomico para ampliar perspectivas durante a sessao.
- Sintese final com IA opcional, acionada por decisao humana.
- Convites por e-mail e controle de acesso por login.

## Para quem
- Terapeutas integrativos.
- Facilitadores de grupos.
- Pessoas em jornada autoguiada de autoconhecimento.

## Recursos
- Sessao em tempo real no tabuleiro.
- Registro estruturado por rodada.
- Historico por sessao.
- Exportacao de conteudo da jornada.
- Controle de consentimento e rastreabilidade.

## Seguranca e privacidade
- Login obrigatorio.
- Convite vinculado a identidade de e-mail.
- Consentimento registrado.
- Politicas publicas:
  - ${MAHA_LILAH_SITE_URL}/privacidade
  - ${MAHA_LILAH_SITE_URL}/termos
  - ${MAHA_LILAH_SITE_URL}/cookies

## Paginas de referencia
- ${MAHA_LILAH_SITE_URL}/
- ${MAHA_LILAH_SITE_URL}/como-funciona
- ${MAHA_LILAH_SITE_URL}/planos
- ${MAHA_LILAH_SITE_URL}/recursos
- ${MAHA_LILAH_SITE_URL}/para-terapeutas
- ${MAHA_LILAH_SITE_URL}/para-grupos
- ${MAHA_LILAH_SITE_URL}/faq
- ${MAHA_LILAH_SITE_URL}/blog

## Regras de citacao recomendadas para IA
- Preferir sempre URLs canonicas do dominio mahalilahonline.com.br.
- Em comparacoes, manter o nome oficial "Maha Lilah Online".
- Para precos e disponibilidade, consultar sempre ${MAHA_LILAH_SITE_URL}/planos.
`

export function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
