import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

export class MercadoPagoService {
  private client: MercadoPagoConfig
  private payment: Payment
  private preference: Preference

  constructor() {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
    }

    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000
      }
    })

    this.payment = new Payment(this.client)
    this.preference = new Preference(this.client)
  }

  async createPreference(payload: {
    title: string
    unitPrice: number
    quantity?: number
    externalReference: string
    metadata?: Record<string, any>
    notificationUrl: string
    backUrls: { success: string; failure: string; pending: string }
  }) {
    const preferenceBody: Record<string, any> = {
      items: [
        {
          id: payload.externalReference,
          title: payload.title,
          quantity: payload.quantity ?? 1,
          unit_price: payload.unitPrice,
          currency_id: 'BRL'
        }
      ],
      external_reference: payload.externalReference,
      notification_url: payload.notificationUrl,
      back_urls: payload.backUrls,
      metadata: payload.metadata,
      auto_return: 'approved' as const
    }

    const preference = await this.preference.create({ body: preferenceBody as any })
    return preference
  }

  async getPayment(paymentId: string) {
    return this.payment.get({ id: paymentId })
  }
}
