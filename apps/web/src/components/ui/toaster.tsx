'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast glass group-[.toaster]:text-hekate-pearl group-[.toaster]:border-hekate-gold/20 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-hekate-pearl/60',
          actionButton:
            'group-[.toast]:bg-hekate-gold group-[.toast]:text-hekate-black',
          cancelButton:
            'group-[.toast]:bg-white/10 group-[.toast]:text-hekate-pearl/80',
          error: '!bg-red-950/80 !border-red-500/50 !text-red-100',
          success: '!bg-green-950/80 !border-green-500/50 !text-green-100',
          warning: '!bg-yellow-950/80 !border-yellow-500/50 !text-yellow-100',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }