import { Metadata } from 'next'
import { GroupsPage } from '@/components/groups/GroupsPage'

export const metadata: Metadata = {
  title: 'Grupos | Dashboard | Caminhos de Hekate',
  description: 'Gerencie seus grupos privados e participe de comunidades'
}

export default function GruposPage() {
  return <GroupsPage />
}