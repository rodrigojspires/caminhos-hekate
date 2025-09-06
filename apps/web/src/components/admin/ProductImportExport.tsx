'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Download, Upload, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

interface ImportResult {
  success: number
  errors: number
  warnings: number
  details: Array<{
    row: number
    type: 'success' | 'error' | 'warning'
    message: string
    data: any
  }>
}

interface ProductImportExportProps {
  onImportComplete?: () => void
}

export function ProductImportExport({ onImportComplete }: ProductImportExportProps) {
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados para filtros de exportação
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv')
  const [exportFilters, setExportFilters] = useState({
    categoryId: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  })

  const handleExport = async () => {
    try {
      setExportLoading(true)
      
      const params = new URLSearchParams({
        format: exportFormat,
        ...Object.fromEntries(
          Object.entries(exportFilters).filter(([_, value]) => value !== '')
        ),
      })
      
      const response = await fetch(`/api/admin/products/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao exportar produtos')
      }
      
      if (exportFormat === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const { data, filename } = await response.json()
        
        // Criar arquivo Excel
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
        XLSX.writeFile(wb, filename)
      }
      
      toast.success('Produtos exportados com sucesso!')
      setShowExportDialog(false)
      
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar produtos')
    } finally {
      setExportLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processImportData(results.data as any[])
        },
        error: (error) => {
          console.error('Erro ao processar CSV:', error)
          toast.error('Erro ao processar arquivo CSV')
        },
      })
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          processImportData(jsonData as any[])
        } catch (error) {
          console.error('Erro ao processar Excel:', error)
          toast.error('Erro ao processar arquivo Excel')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Formato de arquivo não suportado. Use CSV ou Excel.')
    }
  }

  const processImportData = async (data: any[]) => {
    try {
      setImportLoading(true)
      setImportProgress(0)
      
      // Mapear dados para o formato esperado
      const products = data.map((row) => ({
        name: row.Nome || row.name || '',
        slug: row.Slug || row.slug || '',
        description: row.Descrição || row.description || '',
        type: row.Tipo || row.type || 'PHYSICAL',
        price: parseFloat(row.Preço || row.price || '0'),
        comparePrice: row['Preço Comparativo'] || row.comparePrice ? parseFloat(row['Preço Comparativo'] || row.comparePrice) : undefined,
        sku: row.SKU || row.sku || '',
        status: row.Status || row.status || 'ACTIVE',
        featured: (row['Em Destaque'] || row.featured || '').toString().toLowerCase() === 'sim' || (row['Em Destaque'] || row.featured) === true,
        categorySlug: row.Categoria || row.categorySlug || '',
      }))
      
      setImportProgress(50)
      
      // Primeiro, validar os dados
      const validateResponse = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products,
          validateOnly: true,
        }),
      })
      
      if (!validateResponse.ok) {
        throw new Error('Erro ao validar dados')
      }
      
      const validateResult = await validateResponse.json()
      setImportProgress(75)
      
      // Se houver erros críticos, não prosseguir
      if (validateResult.results.errors > 0) {
        setImportResults(validateResult.results)
        toast.error(`Encontrados ${validateResult.results.errors} erros. Corrija-os antes de importar.`)
        return
      }
      
      // Importar os dados
      const importResponse = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products,
          validateOnly: false,
        }),
      })
      
      if (!importResponse.ok) {
        throw new Error('Erro ao importar produtos')
      }
      
      const importResult = await importResponse.json()
      setImportResults(importResult.results)
      setImportProgress(100)
      
      toast.success(`Importação concluída! ${importResult.results.success} produtos importados.`)
      
      if (onImportComplete) {
        onImportComplete()
      }
      
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error('Erro ao importar produtos')
    } finally {
      setImportLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        Nome: 'Produto Exemplo',
        Slug: 'produto-exemplo',
        Descrição: 'Descrição do produto exemplo',
        Tipo: 'PHYSICAL',
        Preço: 99.99,
        'Preço Comparativo': 129.99,
        SKU: 'PROD-001',
        Status: 'ACTIVE',
        'Em Destaque': 'Não',
        Categoria: 'categoria-exemplo',
      },
    ]
    
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_produtos.xlsx')
    
    toast.success('Template baixado com sucesso!')
  }

  return (
    <div className="flex items-center gap-2">
      {/* Botão de Exportação */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Produtos</DialogTitle>
            <DialogDescription>
              Configure os filtros e formato para exportação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="format">Formato</Label>
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'excel') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={exportFilters.dateFrom}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={exportFilters.dateTo}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            
            <Button onClick={handleExport} disabled={exportLoading} className="w-full">
              {exportLoading ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Botão de Importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Produtos</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo CSV ou Excel com os dados dos produtos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
              <span className="text-sm text-muted-foreground">
                Use o template para garantir o formato correto
              </span>
            </div>
            
            <div>
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={importLoading}
              />
            </div>
            
            {importLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processando...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
            
            {importResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resultados da Importação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                      <div className="text-sm text-muted-foreground">Sucessos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{importResults.warnings}</div>
                      <div className="text-sm text-muted-foreground">Avisos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                      <div className="text-sm text-muted-foreground">Erros</div>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importResults.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded border">
                        {detail.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                        {detail.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                        {detail.type === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Linha {detail.row}</Badge>
                            <Badge variant={detail.type === 'success' ? 'default' : detail.type === 'warning' ? 'secondary' : 'destructive'}>
                              {detail.type === 'success' ? 'Sucesso' : detail.type === 'warning' ? 'Aviso' : 'Erro'}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{detail.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}