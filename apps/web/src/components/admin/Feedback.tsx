"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle, AlertCircle, Info, AlertTriangle, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface FeedbackProps {
  type: FeedbackType
  title: string
  message?: string
  show: boolean
  onClose?: () => void
  autoClose?: boolean
  duration?: number
  className?: string
  actions?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }[]
}

export function Feedback({
  type,
  title,
  message,
  show,
  onClose,
  autoClose = true,
  duration = 5000,
  className,
  actions
}: FeedbackProps) {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
  }, [show])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (show && autoClose && type !== 'loading') {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, duration, type, handleClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      case 'loading':
        return <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800'
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
      case 'loading':
        return 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800'
    }
  }

  if (!show && !isVisible) return null

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 max-w-md w-full transition-all duration-300 transform",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        className
      )}
    >
      <div className={cn(
        "p-4 border rounded-lg shadow-lg",
        getStyles()
      )}>
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </h4>
            {message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            )}
            {actions && actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      action.variant === 'primary'
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {type !== 'loading' && onClose && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline feedback component for forms and actions
export interface InlineFeedbackProps {
  type: FeedbackType
  message: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function InlineFeedback({ type, message, className, size = 'md' }: InlineFeedbackProps) {
  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
    
    switch (type) {
      case 'success':
        return <CheckCircle className={cn(iconSize, "text-green-500")} />
      case 'error':
        return <AlertCircle className={cn(iconSize, "text-red-500")} />
      case 'warning':
        return <AlertTriangle className={cn(iconSize, "text-yellow-500")} />
      case 'info':
        return <Info className={cn(iconSize, "text-blue-500")} />
      case 'loading':
        return <Loader2 className={cn(iconSize, "text-purple-500 animate-spin")} />
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-400'
      case 'error':
        return 'text-red-700 dark:text-red-400'
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400'
      case 'info':
        return 'text-blue-700 dark:text-blue-400'
      case 'loading':
        return 'text-purple-700 dark:text-purple-400'
    }
  }

  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {getIcon()}
      <span className={cn(textSize, "font-medium", getTextColor())}>
        {message}
      </span>
    </div>
  )
}

// Loading overlay component
export interface LoadingOverlayProps {
  show: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ show, message = "Carregando...", className }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
      className
    )}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <span className="text-gray-900 dark:text-white font-medium">
            {message}
          </span>
        </div>
      </div>
    </div>
  )
}

// Progress feedback component
export interface ProgressFeedbackProps {
  progress: number
  message?: string
  className?: string
  showPercentage?: boolean
}

export function ProgressFeedback({ 
  progress, 
  message, 
  className, 
  showPercentage = true 
}: ProgressFeedbackProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn("space-y-2", className)}>
      {message && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {message}
          </span>
          {showPercentage && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}