"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Moon, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  
  const error = searchParams?.get('error')
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Handle OAuth errors
    if (error) {
      setStatus('error')
      
      switch (error) {
        case 'OAuthSignin':
          setErrorMessage('Erro ao iniciar autenticação com o provedor')
          break
        case 'OAuthCallback':
          setErrorMessage('Erro no callback do provedor de autenticação')
          break
        case 'OAuthCreateAccount':
          setErrorMessage('Não foi possível criar a conta')
          break
        case 'EmailCreateAccount':
          setErrorMessage('Não foi possível criar a conta com este email')
          break
        case 'Callback':
          setErrorMessage('Erro no processo de autenticação')
          break
        case 'OAuthAccountNotLinked':
          setErrorMessage('Este email já está associado a outra conta. Faça login com o método original.')
          break
        case 'EmailSignin':
          setErrorMessage('Erro ao enviar email de verificação')
          break
        case 'CredentialsSignin':
          setErrorMessage('Credenciais inválidas')
          break
        case 'SessionRequired':
          setErrorMessage('Acesso negado. Login necessário.')
          break
        default:
          setErrorMessage('Erro desconhecido na autenticação')
      }
      
      toast.error(errorMessage || 'Erro na autenticação')
      return
    }

    // Handle successful authentication
    if (sessionStatus === 'authenticated' && session) {
      setStatus('success')
      toast.success('Login realizado com sucesso!')
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(callbackUrl)
      }, 2000)
      return
    }

    // Handle unauthenticated state
    if (sessionStatus === 'unauthenticated') {
      setStatus('error')
      setErrorMessage('Falha na autenticação')
      toast.error('Falha na autenticação')
      return
    }

    // Keep loading while session is being determined
    if (sessionStatus === 'loading') {
      setStatus('loading')
    }
  }, [error, session, sessionStatus, router, callbackUrl, errorMessage])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/images/mystical-bg.jpg')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mb-4 mx-auto">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Autenticando...
              </CardTitle>
              <CardDescription className="text-purple-200">
                Aguarde enquanto processamos seu login
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <p className="text-purple-200 text-sm">
                Isso pode levar alguns segundos...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
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
                Login realizado!
              </CardTitle>
              <CardDescription className="text-purple-200">
                Bem-vindo de volta
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-center">
              <div className="space-y-4">
                <p className="text-purple-200">
                  Olá, <span className="text-white font-medium">{session?.user?.name}</span>!
                </p>
                
                <p className="text-sm text-purple-300">
                  Você será redirecionado em alguns segundos...
                </p>
              </div>

              <Button
                onClick={() => router.push(callbackUrl)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
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
              Erro na autenticação
            </CardTitle>
            <CardDescription className="text-purple-200">
              Não foi possível completar o login
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <p className="text-purple-200">
                {errorMessage || 'Ocorreu um erro durante o processo de autenticação.'}
              </p>
              
              <p className="text-sm text-purple-300">
                Por favor, tente novamente ou entre em contato com o suporte se o problema persistir.
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/auth/login">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                  Tentar novamente
                </Button>
              </Link>
              
              <Link href="/">
                <Button 
                  variant="ghost" 
                  className="w-full text-purple-300 hover:text-white hover:bg-white/10"
                >
                  Voltar ao início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}