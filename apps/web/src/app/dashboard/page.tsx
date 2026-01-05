import { Metadata } from 'next'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'
import { RitualInProgressCard } from '@/components/dashboard/RitualInProgressCard'
import { RoutineGoalsCard } from '@/components/dashboard/RoutineGoalsCard'
import { AgendaSidebar } from '@/components/dashboard/AgendaSidebar'
import { CoursesHighlightsSidebar } from '@/components/dashboard/CoursesHighlightsSidebar'
import { ProductsHighlightsSidebar } from '@/components/dashboard/ProductsHighlightsSidebar'
import { CommunityPulseSidebar } from '@/components/dashboard/CommunityPulseSidebar'

export const metadata: Metadata = {
  title: 'Grimório | Caminhos de Hekate',
  description: 'Seu grimório pessoal de magia e conhecimento.'
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <WelcomeCard />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        <div className="space-y-8">
          <RitualInProgressCard />
          <RoutineGoalsCard />
          <RecentActivity />
        </div>

        <div className="space-y-8">
          <CoursesHighlightsSidebar />
          <ProductsHighlightsSidebar />
          <CommunityPulseSidebar />
          <AgendaSidebar />
        </div>
      </div>
    </div>
  )
}
