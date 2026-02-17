export type GamificationPointSection =
  | 'orders'
  | 'commerce'
  | 'events_courses'
  | 'communities'
  | 'activities'
  | 'streaks'
  | 'points_milestones'
  | 'level_milestones'

export type GamificationPointSetting = {
  key: string
  field: string
  label: string
  description: string
  defaultValue: number
  section: GamificationPointSection
}

export const GAMIFICATION_POINT_SECTIONS: Record<GamificationPointSection, string> = {
  orders: 'Pedidos',
  commerce: 'Compras',
  events_courses: 'Cursos e eventos',
  communities: 'Comunidades',
  activities: 'Atividades',
  streaks: 'Sequencias',
  points_milestones: 'Marcos de pontos',
  level_milestones: 'Marcos de nivel'
}

export const GAMIFICATION_POINT_SETTINGS: GamificationPointSetting[] = [
  {
    key: 'GAMIFICATION_ORDER_CREATED_POINTS',
    field: 'orderCreatedPoints',
    label: 'Pedido criado',
    description: 'Pontos ao criar um pedido na loja.',
    defaultValue: 0,
    section: 'orders'
  },
  {
    key: 'GAMIFICATION_ORDER_PAID_POINTS',
    field: 'orderPaidPoints',
    label: 'Pedido pago',
    description: 'Pontos ao confirmar pagamento do pedido.',
    defaultValue: 30,
    section: 'orders'
  },
  {
    key: 'GAMIFICATION_ORDER_COMPLETED_POINTS',
    field: 'orderCompletedPoints',
    label: 'Pedido concluido',
    description: 'Pontos ao marcar pedido como entregue.',
    defaultValue: 80,
    section: 'orders'
  },
  {
    key: 'GAMIFICATION_ORDER_ACHIEVEMENT_1_POINTS',
    field: 'orderAchievement1Points',
    label: 'Conquista 1 pedido',
    description: 'Pontos ao concluir o primeiro pedido.',
    defaultValue: 100,
    section: 'orders'
  },
  {
    key: 'GAMIFICATION_ORDER_ACHIEVEMENT_5_POINTS',
    field: 'orderAchievement5Points',
    label: 'Conquista 5 pedidos',
    description: 'Pontos ao concluir cinco pedidos.',
    defaultValue: 250,
    section: 'orders'
  },
  {
    key: 'GAMIFICATION_ORDER_ACHIEVEMENT_10_POINTS',
    field: 'orderAchievement10Points',
    label: 'Conquista 10 pedidos',
    description: 'Pontos ao concluir dez pedidos.',
    defaultValue: 500,
    section: 'orders'
  },
  {
    key: 'GAMIFICATION_COURSE_PURCHASE_POINTS',
    field: 'coursePurchasePoints',
    label: 'Compra de curso',
    description: 'Pontos ao confirmar compra de curso.',
    defaultValue: 120,
    section: 'commerce'
  },
  {
    key: 'GAMIFICATION_COMMUNITY_PURCHASE_POINTS',
    field: 'communityPurchasePoints',
    label: 'Compra de comunidade',
    description: 'Pontos ao confirmar pagamento de comunidade.',
    defaultValue: 40,
    section: 'commerce'
  },
  {
    key: 'GAMIFICATION_MAHALILAH_ROOM_PURCHASE_POINTS',
    field: 'mahalilahRoomPurchasePoints',
    label: 'Compra de sala Maha Lilah',
    description: 'Pontos ao confirmar pagamento de sessão avulsa no Maha Lilah.',
    defaultValue: 120,
    section: 'commerce'
  },
  {
    key: 'GAMIFICATION_MAHALILAH_SUBSCRIPTION_SIGNUP_POINTS',
    field: 'mahalilahSubscriptionSignupPoints',
    label: 'Assinatura Maha Lilah (inicial)',
    description: 'Pontos ao confirmar a primeira assinatura do Maha Lilah.',
    defaultValue: 200,
    section: 'commerce'
  },
  {
    key: 'GAMIFICATION_MAHALILAH_SUBSCRIPTION_RENEWAL_POINTS',
    field: 'mahalilahSubscriptionRenewalPoints',
    label: 'Assinatura Maha Lilah (renovação)',
    description: 'Pontos ao confirmar renovação de assinatura no Maha Lilah.',
    defaultValue: 80,
    section: 'commerce'
  },
  {
    key: 'GAMIFICATION_PAID_EVENT_ENROLL_POINTS',
    field: 'paidEventEnrollPoints',
    label: 'Inscricao em evento pago',
    description: 'Pontos ao confirmar inscricao em evento pago.',
    defaultValue: 40,
    section: 'events_courses'
  },
  {
    key: 'GAMIFICATION_FREE_EVENT_ENROLL_POINTS',
    field: 'freeEventEnrollPoints',
    label: 'Inscricao em evento gratuito',
    description: 'Pontos ao confirmar inscricao em evento gratuito.',
    defaultValue: 10,
    section: 'events_courses'
  },
  {
    key: 'GAMIFICATION_PAID_COURSE_ENROLL_POINTS',
    field: 'paidCourseEnrollPoints',
    label: 'Inscricao em curso pago',
    description: 'Pontos ao inscrever manualmente em curso pago.',
    defaultValue: 80,
    section: 'events_courses'
  },
  {
    key: 'GAMIFICATION_FREE_COURSE_ENROLL_POINTS',
    field: 'freeCourseEnrollPoints',
    label: 'Inscricao em curso gratuito',
    description: 'Pontos ao inscrever manualmente em curso gratuito.',
    defaultValue: 10,
    section: 'events_courses'
  },
  {
    key: 'GAMIFICATION_COMMUNITY_COMMENT_POINTS',
    field: 'communityCommentPoints',
    label: 'Comentario em post',
    description: 'Pontos por comentar em posts da comunidade.',
    defaultValue: 10,
    section: 'communities'
  },
  {
    key: 'GAMIFICATION_COMMUNITY_LEADERBOARD_TOP1_POINTS',
    field: 'communityLeaderboardTop1Points',
    label: 'Ranking comunidade Top 1',
    description: 'Pontos para o primeiro lugar do ranking mensal.',
    defaultValue: 300,
    section: 'communities'
  },
  {
    key: 'GAMIFICATION_COMMUNITY_LEADERBOARD_TOP2_POINTS',
    field: 'communityLeaderboardTop2Points',
    label: 'Ranking comunidade Top 2',
    description: 'Pontos para o segundo lugar do ranking mensal.',
    defaultValue: 200,
    section: 'communities'
  },
  {
    key: 'GAMIFICATION_COMMUNITY_LEADERBOARD_TOP3_POINTS',
    field: 'communityLeaderboardTop3Points',
    label: 'Ranking comunidade Top 3',
    description: 'Pontos para o terceiro lugar do ranking mensal.',
    defaultValue: 100,
    section: 'communities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_LOGIN_POINTS',
    field: 'activityLoginPoints',
    label: 'Login',
    description: 'Pontos ao fazer login.',
    defaultValue: 5,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_PROFILE_UPDATE_POINTS',
    field: 'activityProfileUpdatePoints',
    label: 'Atualizacao de perfil',
    description: 'Pontos ao atualizar dados do perfil.',
    defaultValue: 10,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_AVATAR_UPDATE_POINTS',
    field: 'activityAvatarUpdatePoints',
    label: 'Atualizacao de avatar',
    description: 'Pontos ao atualizar o avatar.',
    defaultValue: 15,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_PROFILE_COMPLETE_POINTS',
    field: 'activityProfileCompletePoints',
    label: 'Perfil completo',
    description: 'Pontos ao completar o perfil.',
    defaultValue: 50,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_FIRST_PURCHASE_POINTS',
    field: 'activityFirstPurchasePoints',
    label: 'Primeira compra',
    description: 'Pontos ao realizar a primeira compra.',
    defaultValue: 100,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_PURCHASE_COMPLETE_POINTS',
    field: 'activityPurchaseCompletePoints',
    label: 'Compra finalizada',
    description: 'Pontos ao concluir uma compra.',
    defaultValue: 200,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_COURSE_COMPLETE_POINTS',
    field: 'activityCourseCompletePoints',
    label: 'Curso completo',
    description: 'Pontos ao completar um curso.',
    defaultValue: 200,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_LESSON_COMPLETE_POINTS',
    field: 'activityLessonCompletePoints',
    label: 'Licao completa',
    description: 'Pontos ao completar uma licao.',
    defaultValue: 25,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_QUIZ_COMPLETE_POINTS',
    field: 'activityQuizCompletePoints',
    label: 'Quiz completo',
    description: 'Pontos ao concluir um quiz.',
    defaultValue: 30,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_COMMENT_POST_POINTS',
    field: 'activityCommentPostPoints',
    label: 'Comentario',
    description: 'Pontos ao comentar.',
    defaultValue: 10,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_SHARE_CONTENT_POINTS',
    field: 'activityShareContentPoints',
    label: 'Compartilhar conteudo',
    description: 'Pontos ao compartilhar conteudo.',
    defaultValue: 15,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_INVITE_FRIEND_POINTS',
    field: 'activityInviteFriendPoints',
    label: 'Convidar amigo',
    description: 'Pontos ao convidar um amigo.',
    defaultValue: 75,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_STREAK_MILESTONE_POINTS',
    field: 'activityStreakMilestonePoints',
    label: 'Marco de sequencia',
    description: 'Pontos por marco de sequencia.',
    defaultValue: 50,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_GROUP_JOIN_POINTS',
    field: 'activityGroupJoinPoints',
    label: 'Entrar em grupo',
    description: 'Pontos ao entrar em grupo.',
    defaultValue: 25,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_GROUP_POST_POINTS',
    field: 'activityGroupPostPoints',
    label: 'Post em grupo',
    description: 'Pontos ao criar post em grupo.',
    defaultValue: 20,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_ACTIVITY_REVIEW_SUBMIT_POINTS',
    field: 'activityReviewSubmitPoints',
    label: 'Enviar avaliacao',
    description: 'Pontos ao enviar avaliacao.',
    defaultValue: 40,
    section: 'activities'
  },
  {
    key: 'GAMIFICATION_STREAK_3_POINTS',
    field: 'streak3Points',
    label: 'Sequencia 3 dias',
    description: 'Pontos ao atingir sequencia de 3 dias.',
    defaultValue: 30,
    section: 'streaks'
  },
  {
    key: 'GAMIFICATION_STREAK_7_POINTS',
    field: 'streak7Points',
    label: 'Sequencia 7 dias',
    description: 'Pontos ao atingir sequencia de 7 dias.',
    defaultValue: 70,
    section: 'streaks'
  },
  {
    key: 'GAMIFICATION_STREAK_14_POINTS',
    field: 'streak14Points',
    label: 'Sequencia 14 dias',
    description: 'Pontos ao atingir sequencia de 14 dias.',
    defaultValue: 140,
    section: 'streaks'
  },
  {
    key: 'GAMIFICATION_STREAK_30_POINTS',
    field: 'streak30Points',
    label: 'Sequencia 30 dias',
    description: 'Pontos ao atingir sequencia de 30 dias.',
    defaultValue: 300,
    section: 'streaks'
  },
  {
    key: 'GAMIFICATION_STREAK_60_POINTS',
    field: 'streak60Points',
    label: 'Sequencia 60 dias',
    description: 'Pontos ao atingir sequencia de 60 dias.',
    defaultValue: 600,
    section: 'streaks'
  },
  {
    key: 'GAMIFICATION_STREAK_100_POINTS',
    field: 'streak100Points',
    label: 'Sequencia 100 dias',
    description: 'Pontos ao atingir sequencia de 100 dias.',
    defaultValue: 1000,
    section: 'streaks'
  },
  {
    key: 'GAMIFICATION_POINTS_MILESTONE_100_BONUS',
    field: 'pointsMilestone100Bonus',
    label: 'Marco 100 pontos',
    description: 'Bonus ao atingir 100 pontos totais.',
    defaultValue: 5,
    section: 'points_milestones'
  },
  {
    key: 'GAMIFICATION_POINTS_MILESTONE_500_BONUS',
    field: 'pointsMilestone500Bonus',
    label: 'Marco 500 pontos',
    description: 'Bonus ao atingir 500 pontos totais.',
    defaultValue: 25,
    section: 'points_milestones'
  },
  {
    key: 'GAMIFICATION_POINTS_MILESTONE_1000_BONUS',
    field: 'pointsMilestone1000Bonus',
    label: 'Marco 1000 pontos',
    description: 'Bonus ao atingir 1000 pontos totais.',
    defaultValue: 50,
    section: 'points_milestones'
  },
  {
    key: 'GAMIFICATION_POINTS_MILESTONE_2500_BONUS',
    field: 'pointsMilestone2500Bonus',
    label: 'Marco 2500 pontos',
    description: 'Bonus ao atingir 2500 pontos totais.',
    defaultValue: 125,
    section: 'points_milestones'
  },
  {
    key: 'GAMIFICATION_POINTS_MILESTONE_5000_BONUS',
    field: 'pointsMilestone5000Bonus',
    label: 'Marco 5000 pontos',
    description: 'Bonus ao atingir 5000 pontos totais.',
    defaultValue: 250,
    section: 'points_milestones'
  },
  {
    key: 'GAMIFICATION_POINTS_MILESTONE_10000_BONUS',
    field: 'pointsMilestone10000Bonus',
    label: 'Marco 10000 pontos',
    description: 'Bonus ao atingir 10000 pontos totais.',
    defaultValue: 500,
    section: 'points_milestones'
  },
  {
    key: 'GAMIFICATION_LEVEL_MILESTONE_5_BONUS',
    field: 'levelMilestone5Bonus',
    label: 'Nivel 5',
    description: 'Bonus ao atingir nivel 5.',
    defaultValue: 50,
    section: 'level_milestones'
  },
  {
    key: 'GAMIFICATION_LEVEL_MILESTONE_10_BONUS',
    field: 'levelMilestone10Bonus',
    label: 'Nivel 10',
    description: 'Bonus ao atingir nivel 10.',
    defaultValue: 100,
    section: 'level_milestones'
  },
  {
    key: 'GAMIFICATION_LEVEL_MILESTONE_20_BONUS',
    field: 'levelMilestone20Bonus',
    label: 'Nivel 20',
    description: 'Bonus ao atingir nivel 20.',
    defaultValue: 200,
    section: 'level_milestones'
  },
  {
    key: 'GAMIFICATION_LEVEL_MILESTONE_30_BONUS',
    field: 'levelMilestone30Bonus',
    label: 'Nivel 30',
    description: 'Bonus ao atingir nivel 30.',
    defaultValue: 300,
    section: 'level_milestones'
  },
  {
    key: 'GAMIFICATION_LEVEL_MILESTONE_50_BONUS',
    field: 'levelMilestone50Bonus',
    label: 'Nivel 50',
    description: 'Bonus ao atingir nivel 50.',
    defaultValue: 500,
    section: 'level_milestones'
  },
  {
    key: 'GAMIFICATION_LEVEL_MILESTONE_100_BONUS',
    field: 'levelMilestone100Bonus',
    label: 'Nivel 100',
    description: 'Bonus ao atingir nivel 100.',
    defaultValue: 1000,
    section: 'level_milestones'
  }
]

export type GamificationPointField = (typeof GAMIFICATION_POINT_SETTINGS)[number]['field']

export const GAMIFICATION_POINT_DEFAULTS = GAMIFICATION_POINT_SETTINGS.reduce(
  (acc, setting) => {
    acc[setting.field] = setting.defaultValue
    return acc
  },
  {} as Record<GamificationPointField, number>
)
