import { z } from 'zod'

// Schema para login
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

// Schema para registro
export const RegisterSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
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
    .min(1, 'Confirmação de senha é obrigatória'),
  acceptTerms: z
    .boolean()
    .refine(val => val === true, {
      message: 'Você deve aceitar os termos de uso e política de privacidade'
    })
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

// Schema para recuperação de senha
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
})

// Schema para redefinição de senha
export const ResetPasswordSchema = z.object({
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
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

// Schema para verificação de email
export const VerifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Token é obrigatório'),
  email: z
    .string()
    .email('Email inválido')
    .optional(),
})

// Schema para reenvio de verificação de email
export const ResendVerificationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
})

// Schema para mudança de senha (usuário logado)
export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(1, 'Nova senha é obrigatória')
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    ),
  confirmNewPassword: z
    .string()
    .min(1, 'Confirmação da nova senha é obrigatória'),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmNewPassword']
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'A nova senha deve ser diferente da senha atual',
  path: ['newPassword']
})

// Schema para atualização de perfil
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .optional(),
  email: z
    .string()
    .email('Email inválido')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio deve ter no máximo 500 caracteres')
    .optional(),
  avatar: z
    .string()
    .url('URL do avatar inválida')
    .optional(),
})

// Tipos TypeScript derivados dos schemas
export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>