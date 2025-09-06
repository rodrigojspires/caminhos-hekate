import { z } from 'zod'

// ==========================================
// ENUMS
// ==========================================

export const PostStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'MODERATED'])
export const ReportStatusSchema = z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'])
export const ReportTypeSchema = z.enum(['SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'COPYRIGHT', 'OTHER'])
export const SubscriptionTierSchema = z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO'])

// ==========================================
// TOPIC SCHEMAS
// ==========================================

export const TopicSchema = z.object({
  id: z.string().cuid().optional(),
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
// REPORT SCHEMAS
// ==========================================

export const ReportSchema = z.object({
  id: z.string().cuid().optional(),
  type: ReportTypeSchema,
  reason: z.string().min(1, 'Motivo é obrigatório').max(100, 'Motivo deve ter no máximo 100 caracteres'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  status: ReportStatusSchema.default('PENDING'),
  postId: z.string().cuid('ID do post deve ser válido').optional(),
  commentId: z.string().cuid('ID do comentário deve ser válido').optional(),
  reporterId: z.string().cuid('ID do denunciante deve ser válido'),
  reviewerId: z.string().cuid('ID do revisor deve ser válido').optional(),
  reviewedAt: z.date().optional(),
  actionTaken: z.string().max(200, 'Ação tomada deve ter no máximo 200 caracteres').optional(),
  notes: z.string().max(1000, 'Notas devem ter no máximo 1000 caracteres').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

// Validação para garantir que pelo menos um conteúdo seja reportado
export const CreateReportSchema = ReportSchema.omit({ 
  id: true, 
  reporterId: true, 
  reviewerId: true, 
  reviewedAt: true, 
  actionTaken: true, 
  notes: true, 
  createdAt: true, 
  updatedAt: true 
}).refine(
  (data) => data.postId || data.commentId,
  {
    message: 'Deve reportar um post ou comentário',
    path: ['postId']
  }
)

export const UpdateReportSchema = z.object({
  status: ReportStatusSchema.optional(),
  actionTaken: z.string().max(200, 'Ação tomada deve ter no máximo 200 caracteres').optional(),
  notes: z.string().max(1000, 'Notas devem ter no máximo 1000 caracteres').optional()
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
  status: PostStatusSchema.optional(),
  tier: SubscriptionTierSchema.optional(),
  authorId: z.string().cuid().optional(),
  featured: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const ReportFiltersSchema = z.object({
  search: z.string().optional(),
  type: ReportTypeSchema.optional(),
  status: ReportStatusSchema.optional(),
  reporterId: z.string().cuid().optional(),
  reviewerId: z.string().cuid().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'type', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// ==========================================
// TYPE EXPORTS
// ==========================================

export type Topic = z.infer<typeof TopicSchema>
export type CreateTopic = z.infer<typeof CreateTopicSchema>
export type UpdateTopic = z.infer<typeof UpdateTopicSchema>

export type Post = z.infer<typeof PostSchema>
export type CreatePost = z.infer<typeof CreatePostSchema>
export type UpdatePost = z.infer<typeof UpdatePostSchema>

export type Comment = z.infer<typeof CommentSchema>
export type CreateComment = z.infer<typeof CreateCommentSchema>
export type UpdateComment = z.infer<typeof UpdateCommentSchema>

export type Report = z.infer<typeof ReportSchema>
export type CreateReport = z.infer<typeof CreateReportSchema>
export type UpdateReport = z.infer<typeof UpdateReportSchema>

export type Reaction = z.infer<typeof ReactionSchema>
export type CreateReaction = z.infer<typeof CreateReactionSchema>

export type Attachment = z.infer<typeof AttachmentSchema>
export type CreateAttachment = z.infer<typeof CreateAttachmentSchema>

export type CommunityFilters = z.infer<typeof CommunityFiltersSchema>
export type ReportFilters = z.infer<typeof ReportFiltersSchema>