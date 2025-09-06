import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // dias
    const periodDays = parseInt(period);

    const now = new Date();
    const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    // Estatísticas gerais da comunidade
    const totalMembers = await prisma.user.count({
      where: {
        emailVerified: { not: null }
      }
    });

    const totalPosts = await prisma.post.count();
    const totalComments = await prisma.comment.count();
    const totalTopics = await prisma.topic.count();

    // Estatísticas do período
    const newMembersInPeriod = await prisma.user.count({
      where: {
        createdAt: { gte: startDate },
        emailVerified: { not: null }
      }
    });

    const newPostsInPeriod = await prisma.post.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const newCommentsInPeriod = await prisma.comment.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    // Membros mais ativos (por posts e comentários)
    const mostActiveMembers = await prisma.user.findMany({
      select: {
          id: true,
          name: true,
          image: true,
        _count: {
          select: {
            posts: {
              where: {
                createdAt: { gte: startDate }
              }
            },
            comments: {
              where: {
                createdAt: { gte: startDate }
              }
            }
          }
        }
      },
      orderBy: [
        {
          posts: {
            _count: 'desc'
          }
        },
        {
          comments: {
            _count: 'desc'
          }
        }
      ],
      take: 10
    });

    // Posts mais populares (por likes e comentários)
    const popularPosts = await prisma.post.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        author: {
          select: {
            name: true,
            image: true
          }
        },
        topic: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            comments: true,
            reactions: true
          }
        }
      },
      orderBy: [
        { reactions: { _count: 'desc' } },
        { comments: { _count: 'desc' } }
      ],
      take: 5
    });

    // Tópicos mais ativos
    const activeTopics = await prisma.topic.findMany({
      include: {
        _count: {
          select: {
            posts: {
              where: {
                createdAt: { gte: startDate }
              }
            }
          }
        }
      },
      orderBy: {
        posts: {
          _count: 'desc'
        }
      },
      take: 10
    });

    // Atividade diária (últimos 30 dias)
    const dailyActivity = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayPosts = await prisma.post.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      const dayComments = await prisma.comment.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        posts: dayPosts,
        comments: dayComments,
        total: dayPosts + dayComments
      });
    }

    // Estatísticas de engajamento
    const avgCommentsPerPost = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 100) / 100 : 0;
    
    const totalLikes = await prisma.reaction.count({ where: { type: 'LIKE' } });
    const avgLikesPerPost = totalPosts > 0 ? Math.round((totalLikes / totalPosts) * 100) / 100 : 0;

    // Crescimento mensal (últimos 6 meses)
    const monthlyGrowth = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthlyMembers = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          },
          emailVerified: { not: null }
        }
      });

      const monthlyPosts = await prisma.post.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      monthlyGrowth.push({
        month: monthNames[monthStart.getMonth()],
        members: monthlyMembers,
        posts: monthlyPosts
      });
    }

    const stats = {
      overview: {
        totalMembers,
        totalPosts,
        totalComments,
        totalTopics,
        totalLikes,
        avgCommentsPerPost,
        avgLikesPerPost
      },
      period: {
        days: periodDays,
        newMembers: newMembersInPeriod,
        newPosts: newPostsInPeriod,
        newComments: newCommentsInPeriod
      },
      mostActiveMembers: mostActiveMembers.map(member => ({
        id: member.id,
        name: member.name,
        image: member.image,
        postsCount: member._count.posts,
        commentsCount: member._count.comments,
        totalActivity: member._count.posts + member._count.comments
      })),
      popularPosts: popularPosts.map(post => ({
        id: post.id,
        title: post.title,
        author: post.author.name,
        authorImage: post.author.image,
        topic: post.topic?.name || 'Sem tópico',
        likesCount: post._count.reactions,
        commentsCount: post._count.comments,
        createdAt: post.createdAt
      })),
      activeTopics: activeTopics.map(topic => ({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        postsCount: topic._count.posts,
        color: topic.color
      })),
      dailyActivity,
      monthlyGrowth
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas da comunidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}