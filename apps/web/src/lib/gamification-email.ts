// import { Resend } from 'resend'
import { prisma } from '@hekate/database'
import { emailService } from '@/lib/email'

// const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailNotificationData {
  userId: string
  type: 'ACHIEVEMENT' | 'BADGE' | 'LEVEL_UP' | 'STREAK_MILESTONE' | 'REWARD'
  title: string
  description: string
  metadata?: any
}

/**
 * Email templates for gamification notifications
 */
const EMAIL_TEMPLATES = {
  ACHIEVEMENT: {
    subject: (title: string | number | any) => `🏆 Nova Conquista Desbloqueada: ${title}`,
    html: (data: EmailNotificationData, user: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nova Conquista Desbloqueada</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .achievement-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .achievement-icon { font-size: 48px; text-align: center; margin-bottom: 15px; }
            .achievement-title { font-size: 24px; font-weight: bold; color: #2d3748; margin-bottom: 10px; text-align: center; }
            .achievement-description { color: #718096; text-align: center; margin-bottom: 20px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
            .stat-label { color: #718096; font-size: 14px; }
            .cta-button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Parabéns, ${user.name}!</h1>
            <p>Você desbloqueou uma nova conquista!</p>
          </div>
          <div class="content">
            <div class="achievement-card">
              <div class="achievement-icon">${data.metadata?.icon || '🏆'}</div>
              <div class="achievement-title">${data.title}</div>
              <div class="achievement-description">${data.description}</div>
              ${data.metadata?.rarity ? `<div style="text-align: center;"><span style="background: #ffd700; color: #333; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">${data.metadata.rarity}</span></div>` : ''}
            </div>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-value">${data.metadata?.points || 0}</div>
                <div class="stat-label">Pontos Ganhos</div>
              </div>
              <div class="stat">
                <div class="stat-value">${data.metadata?.totalAchievements || 0}</div>
                <div class="stat-label">Total de Conquistas</div>
              </div>
              <div class="stat">
                <div class="stat-value">${data.metadata?.userLevel || 1}</div>
                <div class="stat-label">Nível Atual</div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/gamification" class="cta-button">
                Ver Todas as Conquistas
              </a>
            </div>
            
            <div class="footer">
              <p>Continue explorando e desbloqueie mais conquistas!</p>
              <p><a href="${process.env.NEXTAUTH_URL}/settings/notifications">Gerenciar Notificações</a></p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  LEVEL_UP: {
    subject: (level: string | number | any) => `🌟 Parabéns! Você subiu para o Nível ${level}`,
    html: (data: EmailNotificationData, user: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Novo Nível Alcançado</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .level-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .level-number { font-size: 72px; font-weight: bold; color: #ffd700; margin: 20px 0; }
            .progress-bar { background: #e2e8f0; height: 10px; border-radius: 5px; margin: 20px 0; overflow: hidden; }
            .progress-fill { background: linear-gradient(90deg, #ffd700, #ffed4e); height: 100%; transition: width 0.3s ease; }
            .cta-button { background: #ffd700; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Nível Alcançado!</h1>
            <p>Parabéns ${user.name}, você subiu de nível!</p>
          </div>
          <div class="content">
            <div class="level-card">
              <div>⭐</div>
              <div class="level-number">${data.metadata?.newLevel || 1}</div>
              <h2>Nível ${data.metadata?.newLevel || 1} Alcançado!</h2>
              <p>${data.description}</p>
              
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.metadata?.progressToNext || 0}%"></div>
              </div>
              <p>Progresso para o próximo nível: ${data.metadata?.progressToNext || 0}%</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/gamification" class="cta-button">
                Ver Seu Progresso
              </a>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  STREAK_MILESTONE: {
    subject: (days: string | number | any) => `🔥 Sequência de ${days} dias mantida!`,
    html: (data: EmailNotificationData, user: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Marco de Sequência Alcançado</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .streak-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .streak-number { font-size: 72px; font-weight: bold; color: #ff6b35; margin: 20px 0; }
            .flame-icon { font-size: 48px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔥 Sequência Incrível!</h1>
            <p>Sua consistência está pagando, ${user.name}!</p>
          </div>
          <div class="content">
            <div class="streak-card">
              <div class="flame-icon">🔥</div>
              <div class="streak-number">${data.metadata?.days || 0}</div>
              <h2>Dias Consecutivos!</h2>
              <p>${data.description}</p>
              <p><strong>Bônus de Sequência:</strong> +${data.metadata?.bonusPoints || 0} pontos</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

/**
 * Send gamification email notification
 */
export async function sendGamificationEmail(data: EmailNotificationData) {
  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        email: true,
        name: true
        // emailNotifications: true
      }
    })

    if (!user || !user.email) {
      console.log('User not found or no email:', data.userId)
      return false
    }

    // Check if user has email notifications enabled
    // if (!user.emailNotifications) {
    //   console.log('Email notifications disabled for user:', data.userId)
    //   return false
    // }

    // Get template
    const template = EMAIL_TEMPLATES[data.type as keyof typeof EMAIL_TEMPLATES]
    if (!template) {
      console.error('Email template not found for type:', data.type)
      return false
    }

    // Generate subject and HTML
    let subject: string
    switch (data.type) {
      case 'ACHIEVEMENT':
        subject = template.subject(data.title)
        break
      case 'LEVEL_UP':
        subject = template.subject(data.metadata?.newLevel || 1)
        break
      case 'STREAK_MILESTONE':
        subject = template.subject(data.metadata?.days || 0)
        break
      default:
        subject = template.subject(data.title)
    }

    const html = template.html(data, user)

    await emailService.sendEmail({
      toEmail: user.email,
      subject,
      htmlContent: html,
      textContent: undefined,
      priority: 'NORMAL'
    })
    return true
  } catch (error) {
    console.error('Error sending gamification email:', error)
    return false
  }
}

/**
 * Send achievement unlock email
 */
export async function sendAchievementEmail(
  userId: string,
  achievement: any,
  userStats: any
) {
  return sendGamificationEmail({
    userId,
    type: 'ACHIEVEMENT',
    title: achievement.title,
    description: achievement.description,
    metadata: {
      icon: achievement.icon,
      rarity: achievement.rarity,
      points: achievement.points,
      totalAchievements: userStats.totalAchievements,
      userLevel: userStats.level
    }
  })
}

/**
 * Send level up email
 */
export async function sendLevelUpEmail(
  userId: string,
  newLevel: number,
  progressToNext: number
) {
  return sendGamificationEmail({
    userId,
    type: 'LEVEL_UP',
    title: `Nível ${newLevel} Alcançado`,
    description: `Parabéns! Você alcançou o nível ${newLevel}. Continue assim para desbloquear mais conquistas!`,
    metadata: {
      newLevel,
      progressToNext
    }
  })
}

/**
 * Send streak milestone email
 */
export async function sendStreakMilestoneEmail(
  userId: string,
  streakType: string,
  days: number,
  bonusPoints: number
) {
  return sendGamificationEmail({
    userId,
    type: 'STREAK_MILESTONE',
    title: `Sequência de ${days} dias`,
    description: `Incrível! Você manteve uma sequência de ${days} dias consecutivos em ${streakType.toLowerCase()}. Continue assim!`,
    metadata: {
      days,
      bonusPoints,
      streakType
    }
  })
}

/**
 * Check if user should receive email for this notification type
 */
export async function shouldSendEmail(
  userId: string,
  notificationType: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        // emailNotifications: true,
        // notificationSettings: true
      }
    })

    if (!user) {
      return false
    }

    // Check specific notification settings if available
    // if (user.notificationSettings) {
    //   const settings = JSON.parse(user.notificationSettings as string)
    //   return settings.email?.[notificationType] !== false
    // }

    // Default to true for important notifications
    const importantTypes = ['ACHIEVEMENT', 'LEVEL_UP', 'STREAK_MILESTONE']
    return importantTypes.includes(notificationType)
  } catch (error) {
    console.error('Error checking email settings:', error)
    return false
  }
}

/**
 * Batch send emails for multiple notifications
 */
export async function sendBatchGamificationEmails(
  notifications: EmailNotificationData[]
) {
  const results = []
  
  for (const notification of notifications) {
    const shouldSend = await shouldSendEmail(notification.userId, notification.type)
    if (shouldSend) {
      const result = await sendGamificationEmail(notification)
      results.push({ notification, sent: result })
    } else {
      results.push({ notification, sent: false, reason: 'disabled' })
    }
  }
  
  return results
}
