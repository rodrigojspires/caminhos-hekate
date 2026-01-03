import { z } from 'zod'

// ==========================================
// ENUMS
// ==========================================

export const PostStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'MODERATED'])
export const SubscriptionTierSchema = z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO'])
export const CommunityAccessModelSchema = z.enum(['FREE', 'ONE_TIME', 'SUBSCRIPTION'])

// ==========================================
// COMMUNITY SCHEMAS
// ==========================================

export const CommunitySchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(120, 'Nome deve ter no máximo 120 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional(),
  accessModels: z.array(CommunityAccessModelSchema).min(1, 'Selecione pelo menos um modelo de acesso').default(['FREE']),
  tier: SubscriptionTierSchema.default('FREE'),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0').optional().nullable(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

const validateCommunityAccess = (data: z.infer<typeof CommunitySchema>, ctx: z.RefinementCtx) => {
  const hasSubscription = data.accessModels.includes('SUBSCRIPTION')
  const hasOneTime = data.accessModels.includes('ONE_TIME')

  if (hasSubscription && data.tier === 'FREE') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tier'],
      message: 'Selecione qual plano de assinatura inclui esta comunidade'
    })
  }

  if (!hasSubscription && data.tier !== 'FREE') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tier'],
      message: 'Comunidades fora da assinatura devem permanecer no plano FREE'
    })
  }

  if (hasOneTime && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['price'],
      message: 'Informe um preço válido para comunidades pagas'
    })
  }
}

export const CreateCommunitySchema = CommunitySchema.omit({ id: true, createdAt: true, updatedAt: true })
  .superRefine(validateCommunityAccess)
export const UpdateCommunitySchema = CommunitySchema.partial()
  .omit({ id: true, createdAt: true, updatedAt: true })
  .superRefine((data, ctx) => {
    if (!data.accessModels && data.tier === undefined && data.price === undefined) return
    validateCommunityAccess({
      name: data.name || '',
      slug: data.slug || 'placeholder',
      description: data.description,
      accessModels: data.accessModels || ['FREE'],
      tier: data.tier || 'FREE',
      price: data.price,
      isActive: data.isActive ?? true
    }, ctx)
  })

// ==========================================
// TOPIC SCHEMAS
// ==========================================

export const TopicSchema = z.object({
  id: z.string().cuid().optional(),
  communityId: z.string().cuid('ID da comunidade deve ser válido').optional(),
  communityIds: z.array(z.string().cuid('ID da comunidade deve ser válido')).optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal').optional(),
  order: z.number().int().min(0).default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateTopicSchema = TopicSchema.omit({ id: true, createdAt: true, updatedAt: true })
export const UpdateTopicSchema = TopicSchema.partial().omit({ id: true, createdAt: true, updatedAt: true })

// ==========================================
// POST SCHEMAS
// ==========================================

export const PostSchema = z.object({
  id: z.string().cuid().optional(),
  communityId: z.string().cuid('ID da comunidade deve ser válido').optional(),
  communityIds: z.array(z.string().cuid('ID da comunidade deve ser válido')).optional(),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  excerpt: z.string().max(300, 'Resumo deve ter no máximo 300 caracteres').optional(),
  featuredImage: z.string().url('URL da imagem deve ser válida').optional(),
  authorId: z.string().cuid('ID do autor deve ser válido'),
  topicId: z.string().cuid('ID do tópico deve ser válido').optional(),
  status: PostStatusSchema.default('DRAFT'),
  tier: SubscriptionTierSchema.default('FREE'),
  isPinned: z.boolean().default(false),
  viewCount: z.number().int().min(0).default(0),
  metadata: z.record(z.any()).optional(),
  publishedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreatePostSchema = PostSchema.omit({ 
  id: true, 
  authorId: true, 
  viewCount: true, 
  createdAt: true, 
  updatedAt: true, 
  publishedAt: true 
})

export const UpdatePostSchema = PostSchema.partial().omit({ 
  id: true, 
  authorId: true, 
  createdAt: true, 
  updatedAt: true 
})

// ==========================================
// COMMENT SCHEMAS
// ==========================================

export const CommentSchema = z.object({
  id: z.string().cuid().optional(),
  content: z.string().min(1, 'Conteúdo é obrigatório').max(1000, 'Comentário deve ter no máximo 1000 caracteres'),
  postId: z.string().cuid('ID do post deve ser válido'),
  authorId: z.string().cuid('ID do autor deve ser válido'),
  parentId: z.string().cuid('ID do comentário pai deve ser válido').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const CreateCommentSchema = CommentSchema.omit({ 
  id: true, 
  authorId: true, 
  createdAt: true, 
  updatedAt: true 
})

export const UpdateCommentSchema = CommentSchema.partial().omit({ 
  id: true, 
  authorId: true, 
  postId: true, 
  createdAt: true, 
  updatedAt: true 
})

// ==========================================
// REACTION SCHEMAS
// ==========================================

export const ReactionSchema = z.object({
  id: z.string().cuid().optional(),
  type: z.string().min(1, 'Tipo de reação é obrigatório'),
  userId: z.string().cuid('ID do usuário deve ser válido'),
  postId: z.string().cuid('ID do post deve ser válido').optional(),
  commentId: z.string().cuid('ID do comentário deve ser válido').optional(),
  createdAt: z.date().optional()
})

export const CreateReactionSchema = ReactionSchema.omit({ 
  id: true, 
  userId: true, 
  createdAt: true 
}).refine(
  (data) => data.postId || data.commentId,
  {
    message: 'Deve reagir a um post ou comentário',
    path: ['postId']
  }
)

// ==========================================
// ATTACHMENT SCHEMAS
// ==========================================

export const AttachmentSchema = z.object({
  id: z.string().cuid().optional(),
  postId: z.string().cuid('ID do post deve ser válido'),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  fileUrl: z.string().url('URL do arquivo deve ser válida'),
  fileType: z.string().min(1, 'Tipo do arquivo é obrigatório'),
  fileSize: z.number().int().min(1, 'Tamanho do arquivo deve ser maior que 0'),
  createdAt: z.date().optional()
})

export const CreateAttachmentSchema = AttachmentSchema.omit({ 
  id: true, 
  createdAt: true 
})

// ==========================================
// QUERY SCHEMAS
// ==========================================

export const CommunityFiltersSchema = z.object({
  search: z.string().optional(),
  topicId: z.string().cuid().optional(),
  communityId: z.string().cuid().optional(),
  status: PostStatusSchema.optional(),
  tier: SubscriptionTierSchema.optional(),
  authorId: z.string().cuid().optional(),
  featured: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})


// ==========================================
// TYPE EXPORTS
// ==========================================

export type Topic = z.infer<typeof TopicSchema>
export type CreateTopic = z.infer<typeof CreateTopicSchema>
export type UpdateTopic = z.infer<typeof UpdateTopicSchema>

export type Community = z.infer<typeof CommunitySchema>
export type CreateCommunity = z.infer<typeof CreateCommunitySchema>
export type UpdateCommunity = z.infer<typeof UpdateCommunitySchema>

export type Post = z.infer<typeof PostSchema>
export type CreatePost = z.infer<typeof CreatePostSchema>
export type UpdatePost = z.infer<typeof UpdatePostSchema>

export type Comment = z.infer<typeof CommentSchema>
export type CreateComment = z.infer<typeof CreateCommentSchema>
export type UpdateComment = z.infer<typeof UpdateCommentSchema>


export type Reaction = z.infer<typeof ReactionSchema>
export type CreateReaction = z.infer<typeof CreateReactionSchema>

export type Attachment = z.infer<typeof AttachmentSchema>
export type CreateAttachment = z.infer<typeof CreateAttachmentSchema>

export type CommunityFilters = z.infer<typeof CommunityFiltersSchema>
