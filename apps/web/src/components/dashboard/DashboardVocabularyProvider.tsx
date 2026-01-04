"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  DASHBOARD_VOCAB_COOKIE,
  type DashboardVocabularyMode,
  applyDashboardVocabulary,
  getDashboardVocabulary,
  resolveDashboardVocabularyMode,
} from "@/lib/dashboardVocabulary"

type DashboardVocabularyContextValue = {
  mode: DashboardVocabularyMode
  setMode: (mode: DashboardVocabularyMode) => void
  labels: ReturnType<typeof getDashboardVocabulary>
  apply: (text: string) => string
}

const DashboardVocabularyContext = createContext<DashboardVocabularyContextValue | null>(null)

export function DashboardVocabularyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardVocabularyMode>("initiatic")

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(DASHBOARD_VOCAB_COOKIE) : null
    const fromCookie = typeof document !== "undefined"
      ? document.cookie.split("; ").find((row) => row.startsWith(`${DASHBOARD_VOCAB_COOKIE}=`))?.split("=")[1]
      : null
    const resolved = resolveDashboardVocabularyMode(stored || fromCookie || undefined)
    setModeState(resolved)
  }, [])

  const setMode = useCallback((next: DashboardVocabularyMode) => {
    setModeState(next)
    if (typeof window !== "undefined") {
      localStorage.setItem(DASHBOARD_VOCAB_COOKIE, next)
      document.cookie = `${DASHBOARD_VOCAB_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
  }, [])

  const labels = useMemo(() => getDashboardVocabulary(mode), [mode])
  const apply = useCallback((text: string) => applyDashboardVocabulary(text, mode), [mode])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      labels,
      apply,
    }),
    [mode, setMode, labels, apply]
  )

  return (
    <DashboardVocabularyContext.Provider value={value}>
      {children}
    </DashboardVocabularyContext.Provider>
  )
}

export function useDashboardVocabulary() {
  const ctx = useContext(DashboardVocabularyContext)
  if (!ctx) {
    return {
      mode: "initiatic" as DashboardVocabularyMode,
      setMode: () => {},
      labels: getDashboardVocabulary("initiatic"),
      apply: (text: string) => text,
    }
  }
  return ctx
}
