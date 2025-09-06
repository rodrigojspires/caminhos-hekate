import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

interface RouteParams {
  params: {
    trackingId: string
  }
}

// GET /api/email/track/[trackingId] - Tracking de abertura (pixel invisível)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url)
    const event = searchParams.get('event') || 'OPENED'
    
    // Capturar informações do request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Registrar evento de tracking
    await emailService.trackEmailEvent(params.trackingId, event, {
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    })
    
    // Retornar pixel transparente 1x1
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Erro no tracking:', error)
    
    // Mesmo com erro, retornar pixel para não quebrar o email
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString()
      }
    })
  }
}

// POST /api/email/track/[trackingId] - Tracking de cliques e outros eventos
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { event, url, data } = body
    
    // Capturar informações do request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Registrar evento de tracking
    await emailService.trackEmailEvent(params.trackingId, event, {
      ...data,
      url,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Evento registrado com sucesso'
    })
  } catch (error) {
    console.error('Erro no tracking de evento:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}