import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Detalhe do Envio de Email',
}

async function getSend(id: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/email/sends/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function EmailSendDetailPage({ params }: { params: { id: string } }) {
  const send = await getSend(params.id)
  if (!send) {
    return <div className="p-6">Envio não encontrado.</div>
  }
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Envio #{send.id}</h1>
        <p className="text-sm text-muted-foreground">Status: {send.status}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Destinatário</h2>
          <div className="text-sm">{send.toName} &lt;{send.toEmail}&gt;</div>
          <div className="text-xs text-muted-foreground mt-1">Enviado: {send.sentAt ? new Date(send.sentAt).toLocaleString() : '-'}</div>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Eventos</h2>
          <ul className="text-sm space-y-1">
            {send.events?.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between">
                <span>{e.type}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
              </li>
            )) || <li className="text-muted-foreground">Sem eventos</li>}
          </ul>
        </div>
      </div>
      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Assunto</h2>
        <div className="text-sm">{send.subject}</div>
      </div>
      <div className="border rounded p-4">
        <h2 className="font-medium mb-2">Preview</h2>
        <iframe className="w-full min-h-[600px] border rounded" srcDoc={send.htmlContent} />
      </div>
    </div>
  )
}

