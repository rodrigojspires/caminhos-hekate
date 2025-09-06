import { NextRequest, NextResponse } from 'next/server'

// GET /api/gamification/events/[id]/scoreboard - Minimal scoreboard (placeholder)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sample = [
    { userId: 'u1', name: 'Athena', points: 1250, rank: 1 },
    { userId: 'u2', name: 'Hermes', points: 990, rank: 2 },
    { userId: 'u3', name: 'Artemis', points: 880, rank: 3 },
  ]
  return NextResponse.json({ eventId: params.id, leaderboard: sample })
}

