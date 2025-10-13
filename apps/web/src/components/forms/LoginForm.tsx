"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, Loader2, Shield, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginSchema, type LoginInput } from "@/lib/validations/auth"

interface LoginFormProps {
  redirectTo?: string
  showTitle?: boolean
  className?: string
}

export function LoginForm({
  redirectTo = "/dashboard",
  showTitle = true,
  className
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [loginData, setLoginData] = useState<LoginInput | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === "2FA_REQUIRED") {
          setRequires2FA(true)
          setLoginData(data)
          toast.info("Digite o código de verificação do seu app autenticador")
        } else if (result.error === "EMAIL_NOT_VERIFIED") {
          toast.info("Seu email ainda não foi verificado. Você pode reenviar as instruções.")
          router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`)
        } else {
          toast.error("Email ou senha incorretos")
        }
      } else {
        toast.success("Login realizado com sucesso!")
        router.push(redirectTo)
        router.refresh()
      }
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit2FA = async () => {
    if (!loginData || (useBackupCode ? twoFactorCode.length < 8 : twoFactorCode.length !== 6)) return
    
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          token: twoFactorCode,
          isBackupCode: useBackupCode,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Login com 2FA bem-sucedido
        const signInResult = await signIn("credentials", {
          email: loginData.email,
          password: loginData.password,
          twoFactorCode: twoFactorCode,
          redirect: false,
        })

        if (signInResult?.error) {
          toast.error("Erro na verificação 2FA")
        } else {
          toast.success("Login realizado com sucesso!")
          router.push(redirectTo)
          router.refresh()
        }
      } else {
        toast.error(result.error || "Código 2FA inválido")
      }
    } catch (error) {
      toast.error("Erro ao verificar código 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack2FA = () => {
    setRequires2FA(false)
    setTwoFactorCode("")
    setUseBackupCode(false)
    setLoginData(null)
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {requires2FA ? "Verificação 2FA" : "Entrar"}
          </CardTitle>
          <CardDescription className="text-center">
            {requires2FA 
              ? (useBackupCode ? "Digite um dos seus códigos de backup" : "Digite o código de 6 dígitos do seu app autenticador")
              : "Entre com sua conta para continuar"
            }
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {requires2FA ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twoFactorCode">
                {useBackupCode ? "Código de Backup" : "Código de Verificação"}
              </Label>
              <Input
                id="twoFactorCode"
                type="text"
                placeholder={useBackupCode ? "Digite o código de backup" : "000000"}
                maxLength={useBackupCode ? 10 : 6}
                value={twoFactorCode}
                onChange={(e) => {
                  if (useBackupCode) {
                    setTwoFactorCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))
                  } else {
                    setTwoFactorCode(e.target.value.replace(/\D/g, ''))
                  }
                }}
                className={useBackupCode ? "text-center" : "text-center text-lg tracking-widest"}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleBack2FA}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={onSubmit2FA}
                disabled={isLoading || (useBackupCode ? twoFactorCode.length < 8 : twoFactorCode.length !== 6)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>{useBackupCode ? "Tem acesso ao seu app autenticador?" : "Não consegue acessar seu app autenticador?"}</p>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setTwoFactorCode("")
                }}
              >
                {useBackupCode ? "Use o app autenticador" : "Use um código de backup"}
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    {...register("password")}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end -mt-2 mb-2">
              <a
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}
