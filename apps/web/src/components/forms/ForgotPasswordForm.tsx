"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Loader2, ArrowLeft, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"

interface ForgotPasswordFormProps {
  showTitle?: boolean
  className?: string
  onBackToLogin?: () => void
}

export function ForgotPasswordForm({
  showTitle = true,
  className,
  onBackToLogin
}: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [canResend, setCanResend] = useState(true)
  const [resendCountdown, setResendCountdown] = useState(0)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  })



  const startResendCountdown = () => {
    setCanResend(false)
    setResendCountdown(60)
    
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setEmailSent(true)
        startResendCountdown()
        toast.success("Email de recuperação enviado!")
      } else {
        toast.error(result.error || "Erro ao enviar email")
      }
    } catch (error) {
      toast.error("Erro ao enviar email. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    
    const email = getValues("email")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        startResendCountdown()
        toast.success("Email reenviado com sucesso!")
      } else {
        toast.error("Erro ao reenviar email")
      }
    } catch (error) {
      toast.error("Erro ao reenviar email. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Email Enviado</CardTitle>
            <CardDescription className="text-center">
              Verifique sua caixa de entrada
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Enviamos um link de recuperação para:
              </p>
              <p className="font-medium">{getValues("email")}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e spam. O link expira em 1 hora.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={!canResend || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {canResend ? "Reenviar email" : `Reenviar em ${resendCountdown}s`}
                </>
              )}
            </Button>

            {onBackToLogin && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onBackToLogin}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Esqueceu a Senha?</CardTitle>
          <CardDescription className="text-center">
            Digite seu email para receber um link de recuperação
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>
        </form>

        {onBackToLogin && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackToLogin}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Button>
        )}
      </CardContent>
    </Card>
  )
}