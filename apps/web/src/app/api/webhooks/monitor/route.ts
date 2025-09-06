import { NextRequest, NextResponse } from 'next/server';
import { WebhookMonitor } from '@/lib/webhook-processors';
import { createWebhookResponse } from '@/lib/webhook-utils';

const monitor = new WebhookMonitor();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || undefined;
    const hours = parseInt(searchParams.get('hours') || '24');
    const action = searchParams.get('action') || 'stats';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validar parâmetros
    if (hours < 1 || hours > 168) { // máximo 7 dias
      return NextResponse.json(
        createWebhookResponse(false, 'Hours parameter must be between 1 and 168'),
        { status: 400 }
      );
    }

    if (provider && !['MERCADOPAGO', 'ASAAS'].includes(provider.toUpperCase())) {
      return NextResponse.json(
        createWebhookResponse(false, 'Invalid provider. Must be MERCADOPAGO or ASAAS'),
        { status: 400 }
      );
    }

    switch (action) {
      case 'stats':
        const statistics = await monitor.getStatistics(provider?.toUpperCase(), hours);
        return NextResponse.json(
          createWebhookResponse(true, 'Statistics retrieved successfully', {
            provider: provider?.toUpperCase() || 'ALL',
            timeframe: `${hours} hours`,
            statistics
          })
        );

      case 'failed':
        const failedWebhooks = await monitor.getFailedWebhooks(provider?.toUpperCase(), limit);
        return NextResponse.json(
          createWebhookResponse(true, 'Failed webhooks retrieved successfully', {
            provider: provider?.toUpperCase() || 'ALL',
            limit,
            failedWebhooks: failedWebhooks.map(webhook => ({
              id: webhook.id,
              provider: webhook.provider,
              eventType: webhook.eventType,
              eventId: webhook.eventId,
              error: webhook.error,
              createdAt: webhook.createdAt,
              processedAt: webhook.processedAt
            }))
          })
        );

      default:
        return NextResponse.json(
          createWebhookResponse(false, 'Invalid action. Must be "stats" or "failed"'),
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Webhook monitor error:', error);
    return NextResponse.json(
      createWebhookResponse(false, 'Internal server error'),
      { status: 500 }
    );
  }
}

// Endpoint para obter informações de saúde dos webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'health_check':
        // Verificar saúde dos webhooks nos últimos 5 minutos
        const recentStats = await monitor.getStatistics(undefined, 0.083); // 5 minutos
        
        const isHealthy = {
          overall: recentStats.total > 0 ? recentStats.successRate > 90 : true,
          mercadopago: true,
          asaas: true
        };

        // Verificar cada provider individualmente
        if (recentStats.total > 0) {
          const mercadopagoStats = await monitor.getStatistics('MERCADOPAGO', 0.083);
          const asaasStats = await monitor.getStatistics('ASAAS', 0.083);

          isHealthy.mercadopago = mercadopagoStats.total > 0 ? mercadopagoStats.successRate > 90 : true;
          isHealthy.asaas = asaasStats.total > 0 ? asaasStats.successRate > 90 : true;
        }

        return NextResponse.json(
          createWebhookResponse(true, 'Health check completed', {
            healthy: isHealthy.overall && isHealthy.mercadopago && isHealthy.asaas,
            details: isHealthy,
            recentActivity: recentStats,
            timestamp: new Date().toISOString()
          })
        );

      default:
        return NextResponse.json(
          createWebhookResponse(false, 'Invalid action'),
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Webhook health check error:', error);
    return NextResponse.json(
      createWebhookResponse(false, 'Internal server error'),
      { status: 500 }
    );
  }
}