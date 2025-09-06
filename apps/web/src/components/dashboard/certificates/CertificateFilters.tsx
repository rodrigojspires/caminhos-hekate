"use client"

import { useState } from "react"
import { Search, Filter, Calendar } from "lucide-react"

interface CertificateFiltersProps {
  onSearchChange: (search: string) => void
  onStatusChange: (status: string) => void
  onDateRangeChange: (dateRange: string) => void
}

export default function CertificateFilters({
  onSearchChange,
  onStatusChange,
  onDateRangeChange
}: CertificateFiltersProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [dateRange, setDateRange] = useState("all")

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    onStatusChange(value)
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    onDateRangeChange(value)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar certificados..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="min-w-[200px]">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídos</option>
              <option value="pending">Pendentes</option>
              <option value="expired">Expirados</option>
            </select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="min-w-[200px]">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Todos os Períodos</option>
              <option value="last-week">Última Semana</option>
              <option value="last-month">Último Mês</option>
              <option value="last-3-months">Últimos 3 Meses</option>
              <option value="last-year">Último Ano</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}