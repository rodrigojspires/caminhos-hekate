import { z } from 'zod'

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
})

export const ResendVerificationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  callbackUrl: z
    .string()
    .max(2048, 'Callback inválido')
    .optional()
})

export const VerifyResetTokenSchema = z.object({
  token: z
    .string()
    .min(1, 'Token é obrigatório')
})

export const ResetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Token é obrigatório'),
    password: z
      .string()
      .min(1, 'Senha é obrigatória')
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Confirmação de senha é obrigatória')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword']
  })

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>
export type VerifyResetTokenInput = z.infer<typeof VerifyResetTokenSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
