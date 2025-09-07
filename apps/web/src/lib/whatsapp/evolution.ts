export interface WhatsAppTemplatePayload {
  to: string
  template: string
  variables?: Record<string, any>
}

function getBase() {
  const base = process.env.WHATSAPP_API_BASE_URL
  const token = process.env.WHATSAPP_API_TOKEN
  const device = process.env.WHATSAPP_DEVICE_ID
  if (!base || !token || !device) throw new Error('Evolution API envs missing')
  return { base, token, device }
}

export async function sendTemplateMessage(payload: WhatsAppTemplatePayload) {
  const { base, token, device } = getBase()
  const url = `${base}/message/sendText/${device}`
  const body = {
    number: payload.to,
    text: renderTemplate(payload.template, payload.variables || {}),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: token,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Evolution API error: ${res.status} ${txt}`)
  }
  return res.json()
}

function renderTemplate(tpl: string, vars: Record<string, any>) {
  return tpl.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, k) => String(vars[String(k).trim()] ?? ''))
}

