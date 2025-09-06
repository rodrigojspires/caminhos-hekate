"use client"

import { Award, Calendar, Download, Trophy } from "lucide-react"

interface CertificateStatsProps {
  totalCertificates: number
  completedThisMonth: number
  downloadCount: number
  averageScore: number
}

export default function CertificateStats({
  totalCertificates,
  completedThisMonth,
  downloadCount,
  averageScore
}: CertificateStatsProps) {
  const stats = [
    {
      title: "Total de Certificados",
      value: totalCertificates,
      icon: Award,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Concluídos este Mês",
      value: completedThisMonth,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Downloads",
      value: downloadCount,
      icon: Download,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Pontuação Média",
      value: `${averageScore}%`,
      icon: Trophy,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}