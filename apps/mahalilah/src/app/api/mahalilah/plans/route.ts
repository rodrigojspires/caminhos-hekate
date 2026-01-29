import { NextResponse } from 'next/server'
import { getPlanConfig } from '@/lib/mahalilah/plans'

export async function GET() {
  return NextResponse.json({ plans: getPlanConfig() })
}
