import { MercadoPagoService, getMercadoPagoService } from './mercadopago';
import { AsaasService, getAsaasService } from './asaas';

export { MercadoPagoService, getMercadoPagoService } from './mercadopago';
export { AsaasService, getAsaasService } from './asaas';

export type {
  MercadoPagoPaymentData,
  MercadoPagoPreferenceData,
} from './mercadopago';

export type {
  AsaasCustomerData,
  AsaasPaymentData,
  AsaasSubscriptionData,
} from './asaas';

// Tipos comuns para pagamentos
export interface PaymentProvider {
  name: 'MERCADOPAGO' | 'ASAAS';
  displayName: string;
  supportedMethods: PaymentMethod[];
}

export interface PaymentMethod {
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' | 'PIX';
  displayName: string;
  icon?: string;
}

// Configuração dos provedores de pagamento
export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    name: 'MERCADOPAGO',
    displayName: 'Mercado Pago',
    supportedMethods: [
      { type: 'CREDIT_CARD', displayName: 'Cartão de Crédito' },
      { type: 'DEBIT_CARD', displayName: 'Cartão de Débito' },
      { type: 'BOLETO', displayName: 'Boleto Bancário' },
      { type: 'PIX', displayName: 'PIX' },
    ],
  },
  {
    name: 'ASAAS',
    displayName: 'Asaas',
    supportedMethods: [
      { type: 'CREDIT_CARD', displayName: 'Cartão de Crédito' },
      { type: 'BOLETO', displayName: 'Boleto Bancário' },
      { type: 'PIX', displayName: 'PIX' },
    ],
  },
];

// Função utilitária para obter provedor de pagamento
export function getPaymentProvider(name: 'MERCADOPAGO' | 'ASAAS') {
  switch (name) {
    case 'MERCADOPAGO':
      return getMercadoPagoService();
    case 'ASAAS':
      return getAsaasService();
    default:
      throw new Error(`Provedor de pagamento não suportado: ${name}`);
  }
}

// Função utilitária para validar dados de pagamento
export function validatePaymentData(data: any): boolean {
  if (!data.amount || data.amount <= 0) {
    return false;
  }
  
  if (!data.userId || !data.description) {
    return false;
  }
  
  return true;
}

// Função utilitária para formatar valor monetário
export function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

// Função utilitária para calcular data de vencimento
export function calculateDueDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
