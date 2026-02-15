async function sendViaSmtp(params: {
  to: string
  subject: string
  html: string
  text?: string
  fromEmail: string
  fromName: string
}) {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD
  const secure = String(port) === '465'

  if (!host || !user || !pass) {
    console.warn('SMTP não configurado. Simulando envio de email.', {
      to: params.to,
      subject: params.subject
    })
    return { id: 'simulated', success: false }
  }

  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  })

  const info = await transporter.sendMail({
    from: `${params.fromName} <${params.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  })

  return { id: info.messageId || 'smtp', success: true }
}

function getMahaLilahBaseUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_MAHALILAH_URL ||
    process.env.NEXTAUTH_URL_MAHALILAH ||
    process.env.NEXTAUTH_URL ||
    'https://mahalilahonline.com.br'
  return baseUrl.replace(/\/$/, '')
}

function getMahaLilahFromAddress() {
  return {
    fromEmail:
      process.env.MAHALILAH_FROM_EMAIL ||
      'mahalilahonline@caminhosdehekate.com.br',
    fromName: process.env.MAHALILAH_FROM_NAME || 'Maha Lilah Online'
  }
}

export async function sendInviteEmail(params: {
  to: string
  therapistName: string
  roomCode: string
  inviteUrl: string
}) {
  const { fromEmail, fromName } = getMahaLilahFromAddress()

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

  return sendViaSmtp({
    to: params.to,
    subject,
    html,
    fromEmail,
    fromName
  })
}

export async function sendRoomCreatedEmail(params: {
  to: string
  recipientName?: string | null
  roomCode: string
}) {
  const { fromEmail, fromName } = getMahaLilahFromAddress()
  const roomUrl = `${getMahaLilahBaseUrl()}/rooms/${params.roomCode}`
  const recipient = params.recipientName || params.to

  const subject = `Sua sala Maha Lilah foi criada (${params.roomCode})`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2f">
      <h2>Sala Maha Lilah criada com sucesso</h2>
      <p>Olá ${recipient},</p>
      <p>Uma nova sala foi criada para você no Maha Lilah Online.</p>
      <p><strong>Código:</strong> ${params.roomCode}</p>
      <p>
        <a href="${roomUrl}" style="display:inline-block;padding:10px 18px;background:#2f7f6f;color:#fff;border-radius:999px;text-decoration:none;">
          Entrar na sala
        </a>
      </p>
      <p style="font-size:12px;color:#5d6b75;">Equipe Maha Lilah Online</p>
      <p style="font-size:12px;color:#5d6b75;">Se você não esperava esta criação, ignore este email.</p>
    </div>
  `

  const text = `Sala Maha Lilah criada.\nCódigo: ${params.roomCode}\nAcesse: ${roomUrl}\n\nEquipe Maha Lilah Online`

  return sendViaSmtp({
    to: params.to,
    subject,
    html,
    text,
    fromEmail,
    fromName
  })
}

export async function sendPasswordResetEmail(params: { to: string; resetToken: string }) {
  const { fromEmail, fromName } = getMahaLilahFromAddress()
  const resetUrl = `${getMahaLilahBaseUrl()}/reset-password?token=${encodeURIComponent(params.resetToken)}`

  const subject = 'Redefinir sua senha - Maha Lilah Online'
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2f">
      <h2>Redefinir senha</h2>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#2f7f6f;color:#fff;border-radius:999px;text-decoration:none;">
          Redefinir senha
        </a>
      </p>
      <p>Este link expira em 1 hora.</p>
      <p style="font-size:12px;color:#5d6b75;">Se você não solicitou essa ação, ignore este email.</p>
    </div>
  `

  const text = `
Redefinir senha - Maha Lilah Online

Recebemos uma solicitação para redefinir sua senha.
Use o link abaixo para criar uma nova senha:
${resetUrl}

Este link expira em 1 hora.

Se você não solicitou essa ação, ignore este email.
  `

  return sendViaSmtp({
    to: params.to,
    subject,
    html,
    text,
    fromEmail,
    fromName
  })
}

export async function sendEmailVerificationEmail(params: { to: string; verificationToken: string }) {
  const { fromEmail, fromName } = getMahaLilahFromAddress()
  const verifyUrl = `${getMahaLilahBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(params.verificationToken)}`

  const subject = 'Confirme seu e-mail - Maha Lilah Online'
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2f">
      <h2>Confirmar e-mail</h2>
      <p>Para ativar sua conta, confirme seu e-mail clicando no botão abaixo:</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#2f7f6f;color:#fff;border-radius:999px;text-decoration:none;">
          Confirmar e-mail
        </a>
      </p>
      <p>Este link expira em 24 horas.</p>
      <p style="font-size:12px;color:#5d6b75;">Se você não criou esta conta, ignore este e-mail.</p>
    </div>
  `

  const text = `
Confirme seu e-mail - Maha Lilah Online

Para ativar sua conta, acesse:
${verifyUrl}

Este link expira em 24 horas.
  `

  return sendViaSmtp({
    to: params.to,
    subject,
    html,
    text,
    fromEmail,
    fromName
  })
}
