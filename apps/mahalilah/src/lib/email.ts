import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export async function sendInviteEmail(params: {
  to: string
  therapistName: string
  roomCode: string
  inviteUrl: string
}) {
  const client = getResendClient()
  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@mahalilahonline.com.br'
  const fromName = process.env.DEFAULT_FROM_NAME || 'Maha Lilah Online'

  const subject = `Convite para Maha Lilah — Sala ${params.roomCode}`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2f">
      <h2>Você foi convidado para uma sala do Maha Lilah Online</h2>
      <p>Terapeuta: <strong>${params.therapistName}</strong></p>
      <p>Sala: <strong>${params.roomCode}</strong></p>
      <p>Para entrar, faça login com este e-mail e clique no botão abaixo:</p>
      <p>
        <a href="${params.inviteUrl}" style="display:inline-block;padding:10px 18px;background:#2f7f6f;color:#fff;border-radius:999px;text-decoration:none;">
          Entrar na sala
        </a>
      </p>
      <p style="font-size:12px;color:#5d6b75;">Se você não esperava este convite, ignore este email.</p>
    </div>
  `

  if (!client) {
    console.warn('RESEND_API_KEY não configurado. Simulando envio de convite:', params)
    return { id: 'simulated', success: false }
  }

  const result = await client.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: params.to,
    subject,
    html,
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { id: result.data?.id || 'unknown', success: true }
}
