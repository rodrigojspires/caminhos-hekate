'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  RotateCcw,
  AlertTriangle,
  Info,
  Settings,
  Mail,
  Shield,
  Palette,
  Database
} from 'lucide-react'
import { toast } from 'sonner'

interface SystemSetting {
  id: string
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'text'
  category: 'general' | 'email' | 'security' | 'appearance' | 'advanced'
  name: string
  description?: string
  isRequired: boolean
  isPublic: boolean
  defaultValue?: string
  validationRules?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
}

interface SettingsFormProps {
  settings: SystemSetting[]
  onSave?: (settings: { key: string; value: string }[]) => void
  onReset?: (key: string) => void
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'general':
      return <Settings className="h-4 w-4" />
    case 'email':
      return <Mail className="h-4 w-4" />
    case 'security':
      return <Shield className="h-4 w-4" />
    case 'appearance':
      return <Palette className="h-4 w-4" />
    case 'advanced':
      return <Database className="h-4 w-4" />
    default:
      return <Settings className="h-4 w-4" />
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'general':
      return 'Geral'
    case 'email':
      return 'E-mail'
    case 'security':
      return 'Segurança'
    case 'appearance':
      return 'Aparência'
    case 'advanced':
      return 'Avançado'
    default:
      return category
  }
}

function getTypeBadge(type: string) {
  const colors = {
    string: 'bg-blue-100 text-blue-800',
    number: 'bg-green-100 text-green-800',
    boolean: 'bg-purple-100 text-purple-800',
    json: 'bg-orange-100 text-orange-800',
    text: 'bg-gray-100 text-gray-800'
  }
  
  return (
    <Badge variant="outline" className={colors[type as keyof typeof colors] || colors.string}>
      {type}
    </Badge>
  )
}

function validateValue(setting: SystemSetting, value: string): string | null {
  const rules = setting.validationRules
  
  if (setting.isRequired && !value.trim()) {
    return 'Este campo é obrigatório'
  }
  
  if (setting.type === 'number') {
    const num = parseFloat(value)
    if (isNaN(num)) {
      return 'Deve ser um número válido'
    }
    if (rules?.min !== undefined && num < rules.min) {
      return `Valor mínimo: ${rules.min}`
    }
    if (rules?.max !== undefined && num > rules.max) {
      return `Valor máximo: ${rules.max}`
    }
  }
  
  if (setting.type === 'json') {
    try {
      JSON.parse(value)
    } catch {
      return 'JSON inválido'
    }
  }
  
  if (rules?.pattern) {
    const regex = new RegExp(rules.pattern)
    if (!regex.test(value)) {
      return 'Formato inválido'
    }
  }
  
  if (rules?.options && !rules.options.includes(value)) {
    return `Deve ser um dos valores: ${rules.options.join(', ')}`
  }
  
  return null
}

export function SettingsForm({ settings, onSave, onReset }: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)
  )
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const handleValueChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setChangedKeys(prev => new Set([...prev, key]))
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const handleReset = (setting: SystemSetting) => {
    if (setting.defaultValue !== undefined) {
      setValues(prev => ({ ...prev, [setting.key]: setting.defaultValue! }))
      setChangedKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(setting.key)
        return newSet
      })
      
      if (onReset) {
        onReset(setting.key)
      }
      
      toast.success(`Configuração "${setting.name}" foi restaurada para o valor padrão`)
    }
  }

  const handleSave = async () => {
    // Validate all changed settings
    const newErrors: Record<string, string> = {}
    const changedSettings: { key: string; value: string }[] = []
    
    for (const key of changedKeys) {
      const setting = settings.find(s => s.key === key)
      if (setting) {
        const error = validateValue(setting, values[key])
        if (error) {
          newErrors[key] = error
        } else {
          changedSettings.push({ key, value: values[key] })
        }
      }
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      toast.error('Corrija os erros antes de salvar')
      return
    }
    
    if (changedSettings.length === 0) {
      toast.info('Nenhuma alteração para salvar')
      return
    }
    
    setIsSaving(true)
    
    try {
      if (onSave) {
        await onSave(changedSettings)
      }
      
      setChangedKeys(new Set())
      toast.success(`${changedSettings.length} configuração(ões) salva(s) com sucesso`)
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const renderInput = (setting: SystemSetting) => {
    const value = values[setting.key] || ''
    const hasError = !!errors[setting.key]
    const hasChanged = changedKeys.has(setting.key)
    
    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.key}
              checked={value === 'true'}
              onCheckedChange={(checked) => 
                handleValueChange(setting.key, checked.toString())
              }
            />
            <Label htmlFor={setting.key} className="text-sm">
              {value === 'true' ? 'Ativado' : 'Desativado'}
            </Label>
          </div>
        )
      
      case 'text':
      case 'json':
        return (
          <Textarea
            id={setting.key}
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className={hasError ? 'border-red-500' : ''}
            rows={setting.type === 'json' ? 6 : 4}
            placeholder={setting.defaultValue}
          />
        )
      
      case 'number':
        return (
          <Input
            id={setting.key}
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className={hasError ? 'border-red-500' : ''}
            placeholder={setting.defaultValue}
            min={setting.validationRules?.min}
            max={setting.validationRules?.max}
          />
        )
      
      default:
        if (setting.validationRules?.options) {
          return (
            <Select
              value={value}
              onValueChange={(newValue) => handleValueChange(setting.key, newValue)}
            >
              <SelectTrigger className={hasError ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                {setting.validationRules.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        
        return (
          <Input
            id={setting.key}
            type="text"
            value={value}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className={hasError ? 'border-red-500' : ''}
            placeholder={setting.defaultValue}
          />
        )
    }
  }

  // Group settings by category
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, SystemSetting[]>)

  const hasChanges = changedKeys.size > 0

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {changedKeys.size} alteração(ões) pendente(s)
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setValues(settings.reduce((acc, setting) => {
                acc[setting.key] = setting.value
                return acc
              }, {} as Record<string, string>))
              setChangedKeys(new Set())
              setErrors({})
            }}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar Alterações
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Settings by category */}
      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {getCategoryLabel(category)}
            </CardTitle>
            <CardDescription>
              Configurações da categoria {getCategoryLabel(category).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {categorySettings.map((setting, index) => {
              const hasError = !!errors[setting.key]
              const hasChanged = changedKeys.has(setting.key)
              
              return (
                <div key={setting.key}>
                  {index > 0 && <Separator className="mb-6" />}
                  
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={setting.key} className="text-sm font-medium">
                            {setting.name}
                            {setting.isRequired && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {hasChanged && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                              Alterado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getTypeBadge(setting.type)}
                          {!setting.isPublic && (
                            <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                              Privado
                            </Badge>
                          )}
                        </div>
                        
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">
                            {setting.description}
                          </p>
                        )}
                      </div>
                      
                      {setting.defaultValue !== undefined && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReset(setting)}
                          disabled={values[setting.key] === setting.defaultValue}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {renderInput(setting)}
                    
                    {hasError && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        {errors[setting.key]}
                      </div>
                    )}
                    
                    {setting.defaultValue && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        Valor padrão: {setting.defaultValue}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}