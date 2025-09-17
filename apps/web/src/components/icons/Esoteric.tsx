"use client"

import * as React from "react"

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string }

function withSize(props: IconProps) {
  const { size = 24, width, height, ...rest } = props
  return { width: width ?? size, height: height ?? size, ...rest }
}

export function TorchIcon(props: IconProps) {
  const p = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2c2.5 1.2 4 3.2 4 5.2 0 1.4-1 2.6-2.6 2.6-.9 0-1.7-.4-2.2-1-0.5.6-1.3 1-2.2 1C6.4 9.8 5.4 8.6 5.4 7.2c0-1.7 1.2-3.4 3.6-4.6" />
      <path d="M10 11h4v9a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-9z" />
      <path d="M9 11h6" />
    </svg>
  )
}

export function TripleMoonIcon(props: IconProps) {
  const p = withSize(props)
  return (
    <svg viewBox="0 0 64 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      {/* Left crescent */}
      <path d="M10 12c0-4.97 4.03-9 9-9 1.25 0 2.45.25 3.54.7C19.4 5.3 17 8.36 17 12s2.4 6.7 5.54 8.3A8.97 8.97 0 0 1 19 21c-4.97 0-9-4.03-9-9z" />
      {/* Full moon */}
      <circle cx="32" cy="12" r="7" />
      {/* Right crescent */}
      <path d="M54 12c0 4.97-4.03 9-9 9-1.25 0-2.45-.25-3.54-.7C44.6 18.7 47 15.64 47 12s-2.4-6.7-5.54-8.3A8.97 8.97 0 0 1 45 3c4.97 0 9 4.03 9 9z" />
    </svg>
  )
}

export function StrophalosIcon(props: IconProps) {
  const p = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
      <path d="M7 7l3 2m4 2 3 2M7 17l3-2m4-2 3-2" />
    </svg>
  )
}

export function KeyIcon(props: IconProps) {
  const p = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="7.5" cy="7.5" r="3.5" />
      <path d="M10.5 10.5L20 20M16 16l4-4M12 14l3-3" />
    </svg>
  )
}

export function CrossroadsIcon(props: IconProps) {
  const p = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2v20M2 12h20" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2l2 2M12 2l-2 2M12 22l2-2M12 22l-2-2M2 12l2 2M2 12l2-2M22 12l-2 2M22 12l-2-2" />
    </svg>
  )
}

export function SerpentIcon(props: IconProps) {
  const p = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 16c0-2.5 2-4.5 4.5-4.5S13 9 13 6.5 15 2 17.5 2 22 4 22 6.5 20 11 17.5 11 13 13 13 15.5 11 22 8.5 22 4 19.5 4 16z" />
      <circle cx="18.5" cy="6.5" r=".8" fill="currentColor" />
    </svg>
  )
}

export function TorchLeft(props: IconProps) {
  return <TorchIcon {...props} />
}

export function TorchRight(props: IconProps) {
  return <TorchIcon {...props} />
}

