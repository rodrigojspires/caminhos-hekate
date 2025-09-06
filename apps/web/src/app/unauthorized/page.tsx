"use client"

import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, Home } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600/20 rounded-full mb-6">
          <Shield className="w-10 h-10 text-red-300" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          Acesso Negado
        </h1>
        
        <p className="text-red-200 mb-8 leading-relaxed">
          Você não possui permissões para acessar esta área. 
          Apenas administradores e editores têm acesso ao painel administrativo.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => router.back()}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
          >
            <Home className="w-5 h-5" />
            <span>Ir para Home</span>
          </button>
        </div>
      </div>
    </div>
  )
}