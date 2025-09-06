import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Novo Tópico - Comunidade',
  description: 'Criar um novo tópico para a comunidade'
}

export default function NewTopicPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/community/topics">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Tópico</h1>
          <p className="text-muted-foreground">
            Criar um novo tópico para a comunidade
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Tópico</CardTitle>
              <CardDescription>
                Preencha as informações básicas do tópico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Tópico *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Tarot, Astrologia, Cristais..."
                  required
                />
                <p className="text-sm text-muted-foreground">
                  O nome deve ser único e descritivo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Descreva sobre o que é este tópico e que tipo de discussões ele abrange..."
                  rows={4}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Uma descrição clara ajuda os usuários a entenderem o propósito do tópico
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor do Tópico *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue="#8B5CF6"
                    className="w-20 h-10 p-1 border rounded"
                    required
                  />
                  <Input
                    placeholder="#8B5CF6"
                    className="flex-1"
                    maxLength={7}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  A cor será usada para identificar visualmente o tópico
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="isActive" name="isActive" defaultChecked />
                <Label htmlFor="isActive">Tópico ativo</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Tópicos inativos não aparecerão para os usuários criarem novos posts
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Como o tópico aparecerá para os usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="font-medium">Nome do Tópico</span>
                </div>
                <p className="text-sm text-muted-foreground px-3">
                  A descrição do tópico aparecerá aqui...
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Criar Tópico
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/community/topics">
                  Cancelar
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Dicas */}
          <Card>
            <CardHeader>
              <CardTitle>Dicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Use nomes curtos e descritivos</p>
              <p>• A descrição deve explicar claramente o propósito</p>
              <p>• Escolha cores que contrastem bem com o fundo</p>
              <p>• Tópicos podem ser desativados temporariamente</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}