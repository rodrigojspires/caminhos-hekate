const WHATSAPP_NUMBER = '5511961460883'
const WHATSAPP_MESSAGE =
  'Olá! Vim pelo site do Maha Lilah e quero entender qual plano faz mais sentido para mim.'

const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

export function WhatsAppCta() {
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      data-analytics-role="cta"
      data-analytics-label="whatsapp_fixo"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111b] sm:bottom-6 sm:right-6"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 fill-current"
      >
        <path d="M12.05 2a9.93 9.93 0 0 0-8.6 14.9L2 22l5.24-1.37A9.94 9.94 0 1 0 12.05 2Zm0 18.1a8.1 8.1 0 0 1-4.1-1.12l-.29-.17-3.1.81.83-3.02-.2-.31a8.08 8.08 0 1 1 6.86 3.81Zm4.43-6.05c-.24-.12-1.4-.69-1.62-.77-.21-.08-.37-.12-.53.12-.16.24-.61.77-.75.93-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.17-1.38-1.31-1.62-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.41.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.72-1.75-.19-.46-.39-.4-.53-.41l-.45-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.17.86 2.3.98 2.46.12.16 1.69 2.57 4.08 3.6.57.24 1.01.39 1.36.5.57.18 1.09.16 1.5.1.46-.07 1.4-.57 1.6-1.11.2-.54.2-1 .14-1.1-.06-.1-.22-.16-.46-.28Z" />
      </svg>
      <span className="hidden sm:inline">Fale no WhatsApp</span>
      <span className="sm:hidden">WhatsApp</span>
    </a>
  )
}
