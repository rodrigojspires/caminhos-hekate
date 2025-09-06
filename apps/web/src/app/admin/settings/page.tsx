import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Settings, 
  Mail, 
  Shield, 
  CreditCard, 
  Globe, 
  Bell, 
  Database,
  Search, 
  MoreHorizontal, 
  Edit, 
  Save,
  AlertCircle
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Configurações do Sistema',
  description: 'Gerencie as configurações do sistema'
}

interface SystemSetting {
  id: string
  key: string
  value: string
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  category: 'GENERAL' | 'SECURITY' | 'EMAIL' | 'PAYMENT' | 'NOTIFICATION'
  description: string
  isRequired: boolean
  updatedAt: string
  updatedBy: {
    name: string
  }
}

// Função para buscar configurações da API
async function getSettings(): Promise<SystemSetting[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/settings`, {
      cache: 'no-store' // Sempre buscar dados atualizados
    })
    
    if (!response.ok) {
      throw new Error('Falha ao buscar configurações')
    }
    
    const data = await response.json()
    return data.settings || []
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    // Retorna array vazio em caso de erro
    return []
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'GENERAL':
      return <Globe className="h-4 w-4" />
    case 'SECURITY':
      return <Shield className="h-4 w-4" />
    case 'EMAIL':
      return <Mail className="h-4 w-4" />
    case 'PAYMENT':
      return <CreditCard className="h-4 w-4" />
    case 'NOTIFICATION':
      return <Bell className="h-4 w-4" />
    default:
      return <Settings className="h-4 w-4" />
  }
}

function getCategoryLabel(category: string) {
  const categories = {
    GENERAL: 'Geral',
    SECURITY: 'Segurança',
    EMAIL: 'E-mail',
    PAYMENT: 'Pagamento',
    NOTIFICATION: 'Notificação'
  }
  return categories[category as keyof typeof categories] || category
}

function getTypeColor(type: string) {
  switch (type) {
    case 'STRING':
      return 'bg-blue-100 text-blue-800'
    case 'NUMBER':
      return 'bg-green-100 text-green-800'
    case 'BOOLEAN':
      return 'bg-purple-100 text-purple-800'
    case 'JSON':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default async function SettingsPage() {
  const settings = await getSettings()
  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, SystemSetting[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações globais do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/admin/settings/email">
              <Mail className="mr-2 h-4 w-4" />
              Templates de E-mail
            </Link>
          </Button>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurações Gerais</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settingsByCategory.GENERAL?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              configurações básicas
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segurança</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settingsByCategory.SECURITY?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              configurações de segurança
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">E-mail</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settingsByCategory.EMAIL?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              configurações de e-mail
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settingsByCategory.PAYMENT?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              configurações de pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar configurações específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por chave ou descrição..."
                  className="pl-8"
                />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="security">Segurança</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
                <SelectItem value="notification">Notificação</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="string">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="boolean">Booleano</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações ({settings.length})</CardTitle>
          <CardDescription>
            Lista de todas as configurações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Configuração</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {setting.key}
                        </code>
                        {setting.isRequired && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {setting.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {setting.type === 'BOOLEAN' ? (
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={setting.value === 'true'} 
                          disabled
                        />
                        <Label className="text-sm">
                          {setting.value === 'true' ? 'Ativado' : 'Desativado'}
                        </Label>
                      </div>
                    ) : (
                      <code className="text-sm bg-muted px-2 py-1 rounded block truncate">
                        {setting.value}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(setting.category)}
                      <span className="text-sm">
                        {getCategoryLabel(setting.category)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getTypeColor(setting.type)}`}
                    >
                      {setting.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>{formatDate(setting.updatedAt)}</p>
                      <p className="text-xs">por {setting.updatedBy.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}