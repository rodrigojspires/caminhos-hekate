import { Metadata } from 'next'

// Disable static generation to prevent build timeouts
export const dynamic = 'force-dynamic'
import CertificateGallery from '@/components/dashboard/certificates/CertificateGallery'
import CertificateFilters from '@/components/dashboard/certificates/CertificateFilters'
import CertificateStats from '@/components/dashboard/certificates/CertificateStats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Certificados | Dashboard | Caminhos de Hekate',
  description: 'Visualize e gerencie seus certificados conquistados'
}

async function fetchCertificateData() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  try {
    const [statsRes, certificatesRes] = await Promise.all([
      fetch(`${baseUrl}/api/user/certificates/stats`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/user/certificates`, { cache: 'no-store' })
    ])

    const stats = statsRes.ok ? await statsRes.json() : { totalCertificates: 0, completedThisMonth: 0, downloadCount: 0, averageScore: 0 }
    const certificates = certificatesRes.ok ? await certificatesRes.json() : []

    return { stats, certificates }
  } catch (error) {
    console.error('Erro ao buscar dados de certificados:', error)
    return {
      stats: { totalCertificates: 0, completedThisMonth: 0, downloadCount: 0, averageScore: 0 },
      certificates: []
    }
  }
}

export default async function CertificatesPage() {
  const { stats, certificates } = await fetchCertificateData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus Certificados</h1>
        <p className="text-muted-foreground">
          Visualize e compartilhe suas conquistas e certificações
        </p>
      </div>

      <CertificateStats 
        totalCertificates={stats.totalCertificates}
        completedThisMonth={stats.completedThisMonth}
        downloadCount={stats.downloadCount}
        averageScore={stats.averageScore}
      />

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
          <TabsTrigger value="favorites">Favoritos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <CertificateFilters 
            onSearchChange={() => {}}
            onStatusChange={() => {}}
            onDateRangeChange={() => {}}
          />
          <CertificateGallery certificates={certificates} />
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <CertificateGallery certificates={certificates.slice(0, 6)} />
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <CertificateGallery certificates={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
