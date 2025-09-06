import { Metadata } from 'next'
import { AdvancedSearch } from '@/components/search'

export const metadata: Metadata = {
  title: 'Busca Avançada | Caminhos de Hekate',
  description: 'Sistema de busca avançada com filtros inteligentes e resultados categorizados'
}

export default function SearchPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Busca Avançada</h1>
        <p className="text-muted-foreground">
          Encontre conteúdos, cursos, lições e muito mais com nossa busca inteligente
        </p>
      </div>
      
      <AdvancedSearch />
    </div>
  )
}