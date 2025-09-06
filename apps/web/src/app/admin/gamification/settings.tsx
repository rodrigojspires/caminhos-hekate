"use client"

import { CategoriesAdmin } from '@/components/admin/gamification/CategoriesAdmin'
import { NotificationsAdmin } from '@/components/admin/gamification/NotificationsAdmin'

export default function GamificationSettingsPage() {
  return (
    <div className="space-y-6">
      <CategoriesAdmin />
      <NotificationsAdmin />
    </div>
  )
}

