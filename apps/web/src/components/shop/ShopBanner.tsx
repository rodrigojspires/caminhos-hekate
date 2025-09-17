"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

type BannerProduct = {
  id: string
  name: string
  slug: string
  image: string | null
}

export default function ShopBanner({ items }: { items: BannerProduct[] }) {
  const [index, setIndex] = useState(0)
  const total = items.length

  useEffect(() => {
    if (total <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % total), 6000)
    return () => clearInterval(t)
  }, [total])

  if (!items || items.length === 0) return null

  const current = items[index]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-hekate-gold/20 bg-hekate-gray-900">
      <div className="absolute inset-0 bg-gradient-to-r from-hekate-purple-950/60 via-hekate-purple-900/30 to-transparent" />
      <div className="aspect-[21/9] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {current.image && (
              <Image
                src={current.image}
                alt={current.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Overlay content */}
      <div className="absolute inset-0 flex items-center">
        <div className="p-6 md:p-10 lg:p-14 max-w-xl">
          <motion.h2
            key={current.id + "-title"}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-3xl md:text-4xl font-bold text-hekate-pearl mb-4"
          >
            {current.name}
          </motion.h2>
          <Button asChild className="btn-mystic-enhanced">
            <Link href={`/loja/${current.slug}`}>Comprar Agora</Link>
          </Button>
        </div>
      </div>
      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-hekate-gold' : 'bg-hekate-gold/40'}`}
              onClick={() => setIndex(i)}
              aria-label={`Ir para banner ${i + 1}`}
            />)
          )}
        </div>
      )}
    </div>
  )
}

