'use client'

import React, { useEffect, useRef, useState } from 'react'

type OnExport = (args: { html: string; design?: any }) => void

interface TemplateEditorProps {
  initialDesign?: any
  onExport?: OnExport
  className?: string
}

// Lightweight wrapper for react-email-editor with graceful fallback
export function TemplateEditor({ initialDesign, onExport, className }: TemplateEditorProps) {
  const editorRef = useRef<any>(null)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let mounted = true
    // Dynamically import to avoid SSR issues; if lib is missing, fallback
    import('react-email-editor')
      .then((mod) => {
        if (!mounted) return
        editorRef.current = mod.default
        setAvailable(true)
      })
      .catch(() => {
        setAvailable(false)
      })
    return () => { mounted = false }
  }, [])

  if (!available) {
    return (
      <div className={`border rounded p-4 text-sm text-muted-foreground ${className || ''}`}>
        Editor visual indisponível. Usando editor padrão.
      </div>
    )
  }

  const EmailEditor: any = editorRef.current
  return (
    <div className={className}>
      <EmailEditor
        ref={(instance: any) => {
          // store instance if needed
        }}
        minHeight={600}
        options={{
          appearance: { theme: 'dark' },
        }}
        onLoad={() => {
          // load initial design if provided
          try {
            if (initialDesign && (EmailEditor as any)?.loadDesign) {
              ;(EmailEditor as any).loadDesign(initialDesign)
            }
          } catch {}
        }}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="px-3 py-2 border rounded text-sm"
          onClick={() => {
            try {
              // @ts-ignore
              (EmailEditor as any)?.exportHtml?.((data: any) => {
                onExport?.({ html: data?.html || '', design: data?.design })
              })
            } catch {}
          }}
        >
          Exportar HTML
        </button>
      </div>
    </div>
  )
}

export default TemplateEditor
