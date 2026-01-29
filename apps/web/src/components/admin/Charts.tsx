"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

// Simple Line Chart Component
export interface LineChartData {
  label: string
  value: number
}

export interface SimpleLineChartProps {
  data: LineChartData[]
  title?: string
  color?: string
  height?: number
  className?: string
  loading?: boolean
}

export function SimpleLineChart({
  data,
  title,
  color = "#8b5cf6",
  height = 200,
  className,
  loading = false
}: SimpleLineChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div 
          className="bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{ height: `${height}px` }}
        />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div 
          className="flex items-center justify-center text-gray-500 dark:text-gray-400"
          style={{ height: `${height}px` }}
        >
          Nenhum dado disponível
        </div>
      </div>
    )
  }

  const safeValues = data.map((d) => (Number.isFinite(d.value) ? d.value : 0))
  const maxValue = Math.max(...safeValues)
  const minValue = Math.min(...safeValues)
  const range = maxValue - minValue || 1
  const denom = data.length > 1 ? data.length - 1 : 1

  const points = data.map((item, index) => {
    const value = Number.isFinite(item.value) ? item.value : 0
    const x = (index / denom) * 100
    const y = 100 - ((value - minValue) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0"
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-200 dark:text-gray-700"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Points */}
          {data.map((item, index) => {
            const value = Number.isFinite(item.value) ? item.value : 0
            const x = (index / denom) * 100
            const y = 100 - ((value - minValue) / range) * 100
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={color}
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </circle>
            )
          })}
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          {data.map((item, index) => {
            if (index % Math.ceil(data.length / 6) === 0 || index === data.length - 1) {
              return (
                <span key={index} className="truncate max-w-16">
                  {item.label}
                </span>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

// Simple Bar Chart Component
export interface BarChartData {
  label: string
  value: number
  color?: string
}

export interface SimpleBarChartProps {
  data: BarChartData[]
  title?: string
  height?: number
  className?: string
  loading?: boolean
}

export function SimpleBarChart({
  data,
  title,
  height = 200,
  className,
  loading = false
}: SimpleBarChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div 
          className="bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{ height: `${height}px` }}
        />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div 
          className="flex items-center justify-center text-gray-500 dark:text-gray-400"
          style={{ height: `${height}px` }}
        >
          Nenhum dado disponível
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="flex items-end justify-between h-full space-x-2">
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * 100
            const barColor = item.color || colors[index % colors.length]
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80 relative group"
                  style={{ 
                    height: `${barHeight}%`,
                    backgroundColor: barColor,
                    minHeight: '4px'
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.value.toLocaleString('pt-BR')}
                  </div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center truncate max-w-full">
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Donut Chart Component
export interface DonutChartData {
  label: string
  value: number
  color?: string
}

export interface SimpleDonutChartProps {
  data: DonutChartData[]
  title?: string
  size?: number
  className?: string
  loading?: boolean
  showLegend?: boolean
}

export function SimpleDonutChart({
  data,
  title,
  size = 200,
  className,
  loading = false,
  showLegend = true
}: SimpleDonutChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-center justify-center">
          <div 
            className="bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
            style={{ width: `${size}px`, height: `${size}px` }}
          />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div 
          className="flex items-center justify-center text-gray-500 dark:text-gray-400"
          style={{ height: `${size}px` }}
        >
          Nenhum dado disponível
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const radius = size / 2 - 10
  const innerRadius = radius * 0.6
  const center = size / 2

  let cumulativePercentage = 0

  const arcs = data.map((item, index) => {
    const percentage = (item.value / total) * 100
    const startAngle = (cumulativePercentage / 100) * 2 * Math.PI - Math.PI / 2
    const endAngle = ((cumulativePercentage + percentage) / 100) * 2 * Math.PI - Math.PI / 2
    
    const x1 = center + radius * Math.cos(startAngle)
    const y1 = center + radius * Math.sin(startAngle)
    const x2 = center + radius * Math.cos(endAngle)
    const y2 = center + radius * Math.sin(endAngle)
    
    const x3 = center + innerRadius * Math.cos(endAngle)
    const y3 = center + innerRadius * Math.sin(endAngle)
    const x4 = center + innerRadius * Math.cos(startAngle)
    const y4 = center + innerRadius * Math.sin(startAngle)
    
    const largeArc = percentage > 50 ? 1 : 0
    
    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ')
    
    cumulativePercentage += percentage
    
    return {
      path: pathData,
      color: item.color || colors[index % colors.length],
      percentage: percentage.toFixed(1),
      ...item
    }
  })

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="flex items-center justify-center space-x-8">
        <div className="relative">
          <svg width={size} height={size}>
            {arcs.map((arc, index) => (
              <path
                key={index}
                d={arc.path}
                fill={arc.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>{`${arc.label}: ${arc.value} (${arc.percentage}%)`}</title>
              </path>
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {total.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>
        
        {showLegend && (
          <div className="space-y-2">
            {arcs.map((arc, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {arc.label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {arc.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
