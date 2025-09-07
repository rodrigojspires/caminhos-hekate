import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  try {
    const { authenticator } = await import('otplib')
    const secret = authenticator.generateSecret()
    const issuer = 'Caminhos de Hekate'
    const otpauth = authenticator.keyuri('user', issuer, secret)
    return NextResponse.json({ secret, otpauth })
  } catch (e) {
    console.error('2FA setup error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

