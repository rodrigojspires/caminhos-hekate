import { Metadata } from 'next'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { ProgressOverview } from '@/components/dashboard/ProgressOverview'
import { RecommendedCourses } from '@/components/dashboard/RecommendedCourses'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'

export const metadata: Metadata = {
  title: 'Grimório | Caminhos de Hekate',
  description: 'Seu grimório pessoal de magia e conhecimento.'
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeCard />
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Events */}
      <EventsWidget />
      
      {/* Stats Overview */}
      <DashboardStats />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Progress & Activity */}
        <div className="lg:col-span-2 space-y-8">
          <ProgressOverview />
          <RecentActivity />
        </div>
        
        {/* Right Column - Recommendations */}
        <div className="space-y-8">
          <RecommendedCourses />
        </div>
      </div>
    </div>
  )
}
