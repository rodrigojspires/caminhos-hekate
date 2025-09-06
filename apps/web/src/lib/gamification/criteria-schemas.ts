import { z } from 'zod'

// Common enums
export const OperatorEnum = z.enum(['eq', 'gte', 'lte', 'gt', 'lt']).default('gte')
export const TimeframeEnum = z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('all_time')

// Achievement criteria schema (discriminated by type)
export const AchievementCriteriaSchema = z.discriminatedUnion('type', [
  // First login has no extra fields
  z.object({
    type: z.literal('first_login'),
    timeframe: TimeframeEnum.optional(),
  }),

  // Login streak requires a value and optional operator
  z.object({
    type: z.literal('login_streak'),
    value: z.number().int().positive(),
    operator: OperatorEnum.optional(),
    timeframe: TimeframeEnum.optional(),
  }),

  // Course completion count
  z.object({
    type: z.literal('course_completion_count'),
    value: z.number().int().positive(),
    operator: OperatorEnum.optional(),
    timeframe: TimeframeEnum.optional(),
  }),

  // Total points
  z.object({
    type: z.literal('total_points'),
    value: z.number().int().nonnegative(),
    operator: OperatorEnum.optional(),
    timeframe: TimeframeEnum.optional(),
  }),

  // Achievement count
  z.object({
    type: z.literal('achievement_count'),
    value: z.number().int().nonnegative(),
    operator: OperatorEnum.optional(),
    timeframe: TimeframeEnum.optional(),
  }),

  // Group participation with optional conditions
  z.object({
    type: z.literal('group_participation'),
    conditions: z.record(z.any()).optional(),
    timeframe: TimeframeEnum.optional(),
  }),

  // Quiz perfect score has no extra fields
  z.object({
    type: z.literal('quiz_perfect_score'),
    timeframe: TimeframeEnum.optional(),
  }),

  // Early adopter with a date
  z.object({
    type: z.literal('early_adopter'),
    conditions: z.object({ before: z.string().datetime().or(z.string()) }).refine((v) => !!v.before, {
      message: 'conditions.before é obrigatório',
    }),
    timeframe: TimeframeEnum.optional(),
  }),
])

export type AchievementCriteria = z.infer<typeof AchievementCriteriaSchema>

// Badge criteria schema
export const BadgeCriteriaSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('achievement_count'),
    value: z.number().int().nonnegative(),
    operator: OperatorEnum.optional(),
  }),
  z.object({
    type: z.literal('streak_days'),
    value: z.number().int().positive(),
    operator: OperatorEnum.optional(),
  }),
  z.object({
    type: z.literal('total_points'),
    value: z.number().int().nonnegative(),
    operator: OperatorEnum.optional(),
  }),
  z.object({
    type: z.literal('registration_date'),
    conditions: z.object({ before: z.string().datetime().or(z.string()) }),
  }),
  z.object({
    type: z.literal('course_category_master'),
    conditions: z.object({ category: z.string() }),
    value: z.number().int().positive().default(5),
  }),
])

export type BadgeCriteria = z.infer<typeof BadgeCriteriaSchema>

export function validateAchievementCriteriaJSON(json: unknown) {
  const parsed = AchievementCriteriaSchema.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'criteria'}: ${i.message}`)
    throw new Error(`Criteria inválido: ${issues.join('; ')}`)
  }
  return parsed.data
}

