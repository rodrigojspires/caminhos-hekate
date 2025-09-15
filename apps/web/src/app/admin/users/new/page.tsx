"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { UserForm } from '@/components/admin/UserForm'
import { toast } from 'sonner'

interface UserFormData {
  name: string
  email: string
  role: 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VISITOR'
  subscriptionTier: 'FREE' | 'INICIADO' | 'ADEPTO' | 'SACERDOCIO'
}

export default function NewUserPage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  // Criar novo usuário
  const handleCreate = async (formData: UserFormData) => {
    try {
      setCreating(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar usuário')
      }

      const newUser = await response.json()
      toast.success('Usuário criado com sucesso')
      router.push(`/admin/users/${newUser.id}`)
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar usuário')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Usuário</h1>
            <p className="text-gray-600 dark:text-gray-400">Criar uma nova conta de usuário</p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Informações do Usuário
          </h2>
          
          <UserForm
            onSave={handleCreate}
            loading={creating}
            isCreating={true}
          />
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="max-w-2xl">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            Informações importantes:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• O usuário receberá um email de boas-vindas após a criação</li>
            <li>• A senha inicial será gerada automaticamente e enviada por email</li>
            <li>• O usuário poderá alterar a senha no primeiro login</li>
            <li>• Usuários com função &ldquo;Admin&rdquo; terão acesso ao painel administrativo</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
