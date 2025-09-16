"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth"

interface ResetPasswordFormProps {
  token: string
  showTitle?: boolean
  className?: string
}

export function ResetPasswordForm({
  token,
  showTitle = true,
  className
}: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const router = useRouter()

  // Local schema for the form (do not require token here; token comes via props)
  const ResetPasswordFormSchema = z.object({
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Pick<ResetPasswordInput, 'password' | 'confirmPassword'>>({
    resolver: zodResolver(ResetPasswordFormSchema),
  })

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false)
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch("/api/auth/verify-reset-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        })

        setIsValidToken(response.ok)
      } catch (error) {
        setIsValidToken(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setResetSuccess(true)
        toast.success("Senha redefinida com sucesso!")
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      } else {
        toast.error(result.message || "Erro ao redefinir senha")
      }
    } catch (error) {
      toast.error("Erro ao redefinir senha. Tente novamente.")
    }
  }

  const handleGoToLogin = () => {
    router.push("/auth/login")
  }

  // Loading state while validating token
  if (isValidating) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando token...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-destructive">
              Token Inválido
            </CardTitle>
            <CardDescription className="text-center">
              O link de recuperação é inválido ou expirou
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              O link de recuperação pode ter expirado ou já foi usado.
              Solicite um novo link de recuperação.
            </p>
            
            <div className="space-y-2">
              <Button
                onClick={() => router.push("/auth/forgot-password")}
                className="w-full"
              >
                Solicitar novo link
              </Button>
              
              <Button
                variant="outline"
                onClick={handleGoToLogin}
                className="w-full"
              >
                Voltar ao login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (resetSuccess) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Senha Redefinida!
            </CardTitle>
            <CardDescription className="text-center">
              Sua senha foi alterada com sucesso
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Você será redirecionado para a página de login em alguns segundos...
            </p>
            
            <Button onClick={handleGoToLogin} className="w-full">
              Ir para login
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Reset password form
  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Nova Senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                {...register("password")}
                className="pl-10 pr-10"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirme sua nova senha"
                {...register("confirmPassword")}
                className="pl-10 pr-10"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redefinindo...
              </>
            ) : (
              "Redefinir senha"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
