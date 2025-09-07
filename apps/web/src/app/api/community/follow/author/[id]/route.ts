import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ followed: false })
    const prefs = await prisma.userPreferences.findUnique({ where: { userId: session.user.id } })
    const layout = (prefs?.layout as any) || {}
    const followed: string[] = layout?.community?.followedAuthors || []
    return NextResponse.json({ followed: followed.includes(params.id) })
  } catch {
    return NextResponse.json({ followed: false })
  }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const prefs = await prisma.userPreferences.upsert({ where: { userId: session.user.id }, update: {}, create: { userId: session.user.id } })
    const layout = (prefs.layout as any) || {}
    const community = layout.community || {}
    const followed: string[] = Array.isArray(community.followedAuthors) ? community.followedAuthors : []
    if (!followed.includes(params.id)) followed.push(params.id)
    const newLayout = { ...layout, community: { ...community, followedAuthors: followed } }
    await prisma.userPreferences.update({ where: { id: prefs.id }, data: { layout: newLayout as any } })
    return NextResponse.json({ followed: true })
  } catch (error) {
    console.error('Erro ao seguir autor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const prefs = await prisma.userPreferences.findUnique({ where: { userId: session.user.id } })
    if (!prefs) return NextResponse.json({ followed: false })
    const layout = (prefs.layout as any) || {}
    const community = layout.community || {}
    const followed: string[] = Array.isArray(community.followedAuthors) ? community.followedAuthors : []
    const newFollowed = followed.filter((a) => a !== params.id)
    const newLayout = { ...layout, community: { ...community, followedAuthors: newFollowed } }
    await prisma.userPreferences.update({ where: { id: prefs.id }, data: { layout: newLayout as any } })
    return NextResponse.json({ followed: false })
  } catch (error) {
    console.error('Erro ao deixar de seguir autor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

