"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

export default function ToolsIndexPage() {
  const { labels } = useDashboardVocabulary()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{labels.pages.toolsTitle}</h1>
          <p className="text-muted-foreground">{labels.pages.toolsSubtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{labels.pages.planetaryTitle}</CardTitle>
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
            <CardTitle>{labels.pages.sigilTitle}</CardTitle>
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
