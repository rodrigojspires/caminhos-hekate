"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, Moon, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isResending, setIsResending] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token")
  const email = searchParams?.get("email")

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setIsVerifying(true)
    setIsError(false)

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        setIsError(true)
        setErrorMessage(data.message || "Erro ao verificar email")
        toast.error(data.message || "Erro ao verificar email")
        return
      }

      setIsVerified(true)
      toast.success("Email verificado com sucesso!")
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Erro interno do servidor")
      toast.error("Erro interno do servidor")
    } finally {
      setIsVerifying(false)
    }
  }, [router])

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token, verifyEmail])

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Email não encontrado")
      return
    }

    setIsResending(true)

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || "Erro ao reenviar email")
        return
      }

      toast.success("Email de verificação reenviado!")
    } catch (error) {
      toast.error("Erro interno do servidor")
    } finally {
      setIsResending(false)
    }
  }

  // Verification in progress
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/images/mystical-bg.jpg')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mb-4 mx-auto">
                <div className="w-8 h-8 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></div>
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Verificando email...
              </CardTitle>
              <CardDescription className="text-purple-200">
                Aguarde enquanto verificamos seu email
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Email verified successfully
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/images/mystical-bg.jpg')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4 mx-auto">
                <CheckCircle className="w-8 h-8 text-green-300" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Email verificado!
              </CardTitle>
              <CardDescription className="text-purple-200">
                Sua conta foi ativada com sucesso
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-center">
              <p className="text-purple-200">
                Parabéns! Seu email foi verificado e sua conta está ativa.
                Você será redirecionado para o login em alguns segundos...
              </p>

              <Link href="/auth/login">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                  Ir para login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Verification error
  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/images/mystical-bg.jpg')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mb-4 mx-auto">
                <AlertCircle className="w-8 h-8 text-red-300" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Erro na verificação
              </CardTitle>
              <CardDescription className="text-purple-200">
                Não foi possível verificar seu email
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-center">
              <div className="space-y-4">
                <p className="text-purple-200">
                  {errorMessage || "O link de verificação é inválido ou expirou."}
                </p>
                
                {email && (
                  <p className="text-sm text-purple-300">
                    Email: <span className="text-white font-medium">{email}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {email && (
                  <Button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  >
                    {isResending ? (
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Reenviando...</span>
                      </div>
                    ) : (
                      "Reenviar email de verificação"
                    )}
                  </Button>
                )}
                
                <Link href="/auth/register">
                  <Button 
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Criar nova conta
                  </Button>
                </Link>
                
                <Link href="/auth/login">
                  <Button 
                    variant="ghost" 
                    className="w-full text-purple-300 hover:text-white hover:bg-white/10"
                  >
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Default state - no token provided
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/images/mystical-bg.jpg')] bg-cover bg-center opacity-10"></div>
      
      <div className="relative w-full max-w-md">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mb-4 mx-auto">
              <Mail className="w-8 h-8 text-purple-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Verificar email
            </CardTitle>
            <CardDescription className="text-purple-200">
              Verifique sua caixa de entrada
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <p className="text-purple-200">
                Enviamos um email de verificação para sua caixa de entrada.
                Clique no link do email para ativar sua conta.
              </p>
              
              <p className="text-sm text-purple-300">
                Se você não receber o email em alguns minutos, verifique sua pasta de spam.
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/auth/register">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                  Criar conta
                </Button>
              </Link>
              
              <Link href="/auth/login">
                <Button 
                  variant="ghost" 
                  className="w-full text-purple-300 hover:text-white hover:bg-white/10"
                >
                  Já tenho uma conta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}