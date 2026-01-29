import type { ReactNode } from 'react'

const variants = {
  horizontal: 'aspect-[16/9]',
  vertical: 'aspect-[3/4]',
  video: 'aspect-[16/9]'
}

export function MediaPlaceholder({
  variant = 'horizontal',
  label = 'Placeholder de mídia',
  children
}: {
  variant?: keyof typeof variants
  label?: string
  children?: ReactNode
}) {
  // TODO: substituir MediaPlaceholder por mídia real quando disponível.
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-surface/80 shadow-soft ${variants[variant]}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,164,65,0.18),_transparent_60%)]" />
      <div className="absolute inset-0 opacity-40 [background:linear-gradient(120deg,rgba(217,164,65,0.15),transparent,rgba(106,211,176,0.12))]" />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        <span className="text-xs uppercase tracking-[0.28em] text-gold-soft">
          {variant === 'video' ? 'Vídeo' : 'Imagem'}
        </span>
        <strong className="font-serif text-lg text-ink">{label}</strong>
        <span className="text-xs text-ink-muted">TODO: substituir por mídia real.</span>
        {children}
      </div>
      {variant === 'video' && (
        <div className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full border border-gold/70 bg-surface text-gold">
          ▶
        </div>
      )}
    </div>
  )
}
