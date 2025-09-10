"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'

export default function ToolsIndexPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ferramentas</h1>
          <p className="text-muted-foreground">Coleção de utilitários esotéricos e astrológicos.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horas Planetárias</CardTitle>
            <CardDescription>Calcule as 24 horas planetárias (12 diurnas + 12 noturnas) para uma data e local.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/tools/planetary-hours">
              <Button><Wrench className="h-4 w-4 mr-2" /> Abrir</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sigilo (Quadrado Mágico)</CardTitle>
            <CardDescription>Gere um traçado de sigilo sobre o quadrado mágico do planeta escolhido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/tools/magic-square-sigil">
              <Button><Wrench className="h-4 w-4 mr-2" /> Abrir</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}