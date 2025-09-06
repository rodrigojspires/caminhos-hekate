import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(request: NextRequest) {
  try {
    // Buscar estatísticas públicas dos grupos
    const [totalGroups, totalMembers] = await Promise.all([
      // Total de grupos
      prisma.group.count(),
      
      // Total de membros ativos
      prisma.groupMember.count({
        where: {
          status: 'ACTIVE'
        }
      })
    ])

    return NextResponse.json({
      totalGroups,
      publicGroups: totalGroups, // Assumindo que todos são públicos por enquanto
      privateGroups: 0,
      totalMembers,
      activeGroups: totalGroups,
      averageMembersPerGroup: totalGroups > 0 ? Math.round(totalMembers / totalGroups) : 0,
      groupsCreatedThisMonth: 0, // Simplificado
      topCategories: []
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos grupos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}