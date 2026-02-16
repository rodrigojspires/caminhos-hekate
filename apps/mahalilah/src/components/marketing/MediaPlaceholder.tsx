import type { ReactNode } from 'react'
import Image from 'next/image'

const variants = {
  horizontal: 'aspect-[16/9]',
  vertical: 'aspect-[3/4]',
  video: 'aspect-[16/9]'
}

export function MediaPlaceholder({
  variant = 'horizontal',
  label = 'Prévia de mídia',
  imageSrc,
  imageAlt,
  children
}: {
  variant?: keyof typeof variants
  label?: string
  imageSrc?: string
  imageAlt?: string
  children?: ReactNode
}) {
  const isImageMode = Boolean(imageSrc)

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-surface/85 shadow-soft ${variants[variant]}`}
    >
      {isImageMode && (
        <Image
          src={imageSrc!}
          alt={imageAlt || label}
          fill
          className="object-cover"
          sizes={variant === 'vertical' ? '(max-width: 1024px) 100vw, 36vw' : '(max-width: 1024px) 100vw, 52vw'}
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,196,84,0.22),_transparent_62%)]" />
      <div
        className={`absolute inset-0 [background:linear-gradient(120deg,rgba(255,182,66,0.18),transparent,rgba(86,191,163,0.16))] ${isImageMode ? 'opacity-35' : 'opacity-50'}`}
      />
      {isImageMode ? (
        <div className="relative z-10 mt-auto w-full p-4">
          <div className="inline-flex items-center rounded-xl border border-white/35 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {label}
          </div>
          {children}
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <span className="text-xs uppercase tracking-[0.28em] text-gold-soft">
            {variant === 'video' ? 'Vídeo' : 'Imagem'}
          </span>
          <strong className="font-serif text-lg text-ink">{label}</strong>
          <span className="text-xs text-ink-muted">Prévia visual do fluxo em produção.</span>
          {children}
        </div>
      )}
      {variant === 'video' && (
        <div className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full border border-gold/70 bg-surface text-gold shadow-[0_0_0_1px_rgba(255,198,93,0.28)_inset]">
          ▶
        </div>
      )}
    </div>
  )
}
