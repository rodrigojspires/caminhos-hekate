type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

interface StatusEmailParams {
  orderNumber: string
  customerName?: string | null
  trackingInfo?: string | null
}

interface StatusEmailContent {
  subject: string
  htmlContent: string
  textContent: string
}

const statusMessages: Record<OrderStatus, { title: string; description: (params: StatusEmailParams) => { html: string; text: string } }> = {
  PENDING: {
    title: 'pedido aguardando pagamento',
    description: () => ({
      html: 'Recebemos sua solicitação e aguardamos a confirmação do pagamento para continuar com o processamento.',
      text: 'Recebemos sua solicitação e aguardamos a confirmação do pagamento para continuar com o processamento.',
    }),
  },
  PAID: {
    title: 'pagamento confirmado',
    description: () => ({
      html: 'Seu pagamento foi confirmado com sucesso. Em breve, iniciaremos o preparo do seu pedido.',
      text: 'Seu pagamento foi confirmado com sucesso. Em breve, iniciaremos o preparo do seu pedido.',
    }),
  },
  PROCESSING: {
    title: 'pedido em preparação',
    description: () => ({
      html: 'Estamos preparando o seu pedido com carinho. Avisaremos assim que ele for despachado.',
      text: 'Estamos preparando o seu pedido com carinho. Avisaremos assim que ele for despachado.',
    }),
  },
  SHIPPED: {
    title: 'pedido enviado',
    description: () => ({
      html: 'Seu pedido foi despachado e já está a caminho.',
      text: 'Seu pedido foi despachado e já está a caminho.',
    }),
  },
  DELIVERED: {
    title: 'pedido entregue',
    description: () => ({
      html: 'Confirmamos a entrega do seu pedido. Esperamos que você aproveite muito!',
      text: 'Confirmamos a entrega do seu pedido. Esperamos que você aproveite muito!',
    }),
  },
  CANCELLED: {
    title: 'pedido cancelado',
    description: () => ({
      html: 'Seu pedido foi cancelado. Caso tenha dúvidas ou precise de ajuda, fale conosco.',
      text: 'Seu pedido foi cancelado. Caso tenha dúvidas ou precise de ajuda, fale conosco.',
    }),
  },
  REFUNDED: {
    title: 'reembolso realizado',
    description: () => ({
      html: 'O reembolso do seu pedido foi processado. Dependendo do meio de pagamento, ele pode levar alguns dias úteis para aparecer na fatura.',
      text: 'O reembolso do seu pedido foi processado. Dependendo do meio de pagamento, ele pode levar alguns dias úteis para aparecer na fatura.',
    }),
  },
}

export function buildOrderStatusEmail(status: OrderStatus, params: StatusEmailParams): StatusEmailContent | null {
  const template = statusMessages[status]
  if (!template) return null

  const displayName = params.customerName?.trim().split(' ')[0] || 'Olá'
  const introHtml = `<p>${displayName},</p>`
  const introText = `${displayName},`

  const { html: baseHtml, text: baseText } = template.description(params)

  let trackingHtml = ''
  let trackingText = ''
  if (params.trackingInfo) {
    const isLink = params.trackingInfo.startsWith('http')
    if (isLink) {
      trackingHtml = `<p>Você pode acompanhar o envio em <a href="${params.trackingInfo}" target="_blank" rel="noopener noreferrer">${params.trackingInfo}</a>.</p>`
      trackingText = `\nVocê pode acompanhar o envio em ${params.trackingInfo}.`
    } else {
      trackingHtml = `<p>Código de rastreio: <strong>${params.trackingInfo}</strong>.</p>`
      trackingText = `\nCódigo de rastreio: ${params.trackingInfo}.`
    }
  }

  const subject = `Atualização do pedido ${params.orderNumber} • ${template.title}`
  const htmlContent = `${introHtml}
    <p>Atualizamos o status do seu pedido <strong>${params.orderNumber}</strong> para <strong>${template.title}</strong>.</p>
    <p>${baseHtml}</p>
    ${trackingHtml}
    <p>Caso precise de suporte, estamos à disposição.</p>
    <p>Equipe Caminhos de Hekate</p>`

  const textContent = `${introText}

Atualizamos o status do seu pedido ${params.orderNumber} para ${template.title}.
${baseText}${trackingText}

Caso precise de suporte, estamos à disposição.

Equipe Caminhos de Hekate`

  return { subject, htmlContent, textContent }
}

export type { OrderStatus, StatusEmailContent }
