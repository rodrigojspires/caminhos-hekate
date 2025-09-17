import Link from 'next/link'
import { KeyIcon, CrossroadsIcon, StrophalosIcon, SerpentIcon } from '@/components/icons/Esoteric'

type Category = { id: string; name: string; slug: string }

const iconBySlug: Record<string, (props: any) => JSX.Element> = {
  oraculos: SerpentIcon,
  oraculo: SerpentIcon,
  caixas: KeyIcon,
  rituais: CrossroadsIcon,
  cursos: StrophalosIcon,
}

function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = iconBySlug[slug] || KeyIcon
  return <Icon className={className} />
}

export default function ShopCategoryNav({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  return (
    <div className="sticky top-16 z-30 bg-background/60 backdrop-blur border-b">
      <div className="container">
        <div className="flex items-center gap-3 overflow-x-auto py-3">
          <Link
            href="/loja"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${!activeSlug ? 'bg-hekate-gold text-hekate-black border-hekate-gold' : 'hover:bg-muted'}`}
          >
            <CategoryIcon slug="todos" className="h-4 w-4" />
            Todos
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/loja?category=${c.slug}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${activeSlug === c.slug ? 'bg-hekate-gold text-hekate-black border-hekate-gold' : 'hover:bg-muted'}`}
            >
              <CategoryIcon slug={c.slug} className="h-4 w-4" />
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

