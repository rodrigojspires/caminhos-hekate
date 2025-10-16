'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react'

interface Widget {
  id: string
  name: string
  type: 'chart' | 'metric' | 'table' | 'list'
  visible: boolean
  position: number
  size: 'small' | 'medium' | 'large'
}

interface DashboardCustomizerProps {
  widgets?: Widget[]
  onWidgetToggle?: (widgetId: string, visible: boolean) => void
  onWidgetReorder?: (widgets: Widget[]) => void
  onWidgetResize?: (widgetId: string, size: Widget['size']) => void
}

const defaultWidgets: Widget[] = [
  {
    id: 'overview-metrics',
    name: 'Métricas Gerais',
    type: 'metric',
    visible: true,
    position: 1,
    size: 'large'
  },
  {
    id: 'traffic-chart',
    name: 'Gráfico de Tráfego',
    type: 'chart',
    visible: true,
    position: 2,
    size: 'large'
  },
  {
    id: 'events-table',
    name: 'Tabela de Eventos',
    type: 'table',
    visible: true,
    position: 3,
    size: 'large'
  },
  {
    id: 'top-pages',
    name: 'Páginas Mais Visitadas',
    type: 'list',
    visible: true,
    position: 4,
    size: 'medium'
  },
  {
    id: 'user-activity',
    name: 'Atividade de Usuários',
    type: 'chart',
    visible: false,
    position: 5,
    size: 'medium'
  }
]

const getWidgetTypeColor = (type: Widget['type']) => {
  switch (type) {
    case 'chart':
      return 'bg-blue-100 text-blue-800'
    case 'metric':
      return 'bg-green-100 text-green-800'
    case 'table':
      return 'bg-purple-100 text-purple-800'
    case 'list':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export { DashboardCustomizer }

export default function DashboardCustomizer({
  widgets = defaultWidgets,
  onWidgetToggle,
  onWidgetReorder,
  onWidgetResize
}: DashboardCustomizerProps) {
  const [localWidgets, setLocalWidgets] = useState(widgets)
  const [isOpen, setIsOpen] = useState(false)

  const handleToggleWidget = (widgetId: string, visible: boolean) => {
    const updatedWidgets = localWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible } : widget
    )
    setLocalWidgets(updatedWidgets)
    onWidgetToggle?.(widgetId, visible)
  }

  const handleResizeWidget = (widgetId: string, size: Widget['size']) => {
    const updatedWidgets = localWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, size } : widget
    )
    setLocalWidgets(updatedWidgets)
    onWidgetResize?.(widgetId, size)
  }

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const currentIndex = localWidgets.findIndex(w => w.id === widgetId)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === localWidgets.length - 1)
    ) {
      return
    }

    const newWidgets = [...localWidgets]
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // Swap positions
    const temp = newWidgets[currentIndex]
    newWidgets[currentIndex] = newWidgets[targetIndex]
    newWidgets[targetIndex] = temp
    
    // Update position numbers
    newWidgets.forEach((widget, index) => {
      widget.position = index + 1
    })

    setLocalWidgets(newWidgets)
    onWidgetReorder?.(newWidgets)
  }

  const visibleWidgets = localWidgets.filter(w => w.visible)
  const hiddenWidgets = localWidgets.filter(w => !w.visible)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Personalizar Minha Escola
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Minha Escola</DialogTitle>
          <DialogDescription>
            Configure quais widgets exibir e como organizá-los na sua área &ldquo;Minha Escola&rdquo;.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Widgets Visíveis */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Widgets Visíveis ({visibleWidgets.length})
            </h3>
            <div className="space-y-2">
              {visibleWidgets
                .sort((a, b) => a.position - b.position)
                .map((widget, index) => (
                <Card key={widget.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveWidget(widget.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <GripVertical className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveWidget(widget.id, 'down')}
                          disabled={index === visibleWidgets.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <GripVertical className="h-3 w-3" />
                        </Button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{widget.name}</span>
                          <Badge className={getWidgetTypeColor(widget.type)}>
                            {widget.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Posição: {widget.position}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`size-${widget.id}`} className="text-sm">
                          Tamanho:
                        </Label>
                        <Select
                          value={widget.size}
                          onValueChange={(value: Widget['size']) => 
                            handleResizeWidget(widget.id, value)
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Pequeno</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="large">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`visible-${widget.id}`}
                          checked={widget.visible}
                          onCheckedChange={(checked) => 
                            handleToggleWidget(widget.id, checked)
                          }
                        />
                        <Label htmlFor={`visible-${widget.id}`} className="text-sm">
                          Visível
                        </Label>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Widgets Ocultos */}
          {hiddenWidgets.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <EyeOff className="h-5 w-5" />
                Widgets Ocultos ({hiddenWidgets.length})
              </h3>
              <div className="space-y-2">
                {hiddenWidgets.map((widget) => (
                  <Card key={widget.id} className="p-4 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{widget.name}</span>
                            <Badge className={getWidgetTypeColor(widget.type)}>
                              {widget.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`visible-${widget.id}`}
                          checked={widget.visible}
                          onCheckedChange={(checked) => 
                            handleToggleWidget(widget.id, checked)
                          }
                        />
                        <Label htmlFor={`visible-${widget.id}`} className="text-sm">
                          Visível
                        </Label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
