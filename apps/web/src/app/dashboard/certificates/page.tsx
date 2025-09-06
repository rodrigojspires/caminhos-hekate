import { Metadata } from 'next'
import CertificateGallery from '@/components/dashboard/certificates/CertificateGallery'
import CertificateFilters from '@/components/dashboard/certificates/CertificateFilters'
import CertificateStats from '@/components/dashboard/certificates/CertificateStats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Certificados | Dashboard | Caminhos de Hekate',
  description: 'Visualize e gerencie seus certificados conquistados'
}

export default function CertificatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus Certificados</h1>
        <p className="text-muted-foreground">
          Visualize e compartilhe suas conquistas e certificações
        </p>
      </div>

      <CertificateStats 
        totalCertificates={12}
        completedThisMonth={3}
        downloadCount={45}
        averageScore={92}
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
          <CertificateGallery certificates={[]} />
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <CertificateGallery certificates={[]} />
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <CertificateGallery certificates={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}