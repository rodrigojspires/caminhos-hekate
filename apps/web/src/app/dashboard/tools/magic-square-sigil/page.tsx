"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useDashboardVocabulary } from "@/components/dashboard/DashboardVocabularyProvider"

// ===================== Utils (baseados no MVP fornecido) =====================
const cleanText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

function preprocessText(text: string, rmVowels: boolean, rmDup: boolean) {
  let out = cleanText(text)
  if (rmVowels) out = out.replace(/[AEIOU]/g, "")
  if (rmDup) {
    const seen = new Set<string>()
    let tmp = ""
    for (const ch of out) {
      if (!seen.has(ch)) {
        seen.add(ch)
        tmp += ch
      }
    }
    out = tmp
  }
  return out
}

function latinToA1Z26(text: string) {
  const arr: number[] = []
  const clean = cleanText(text)
  for (const ch of clean) {
    if (/[A-Z]/.test(ch)) arr.push(ch.charCodeAt(0) - 64)
    else if (/[0-9]/.test(ch)) arr.push(parseInt(ch, 10))
  }
  return arr
}

function latinToPythagorean(text: string) {
  const table: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
    J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
    S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
  }
  const arr: number[] = []
  const clean = cleanText(text)
  for (const ch of clean) {
    if (/[A-Z]/.test(ch)) arr.push(table[ch] ?? 9)
    else if (/[0-9]/.test(ch)) arr.push(parseInt(ch, 10))
  }
  return arr
}

function latinToHebrewGematriaSimple(text: string) {
  const map: Record<string, number> = {
    A: 1,  B: 2,  C: 20, D: 4,  E: 5,  F: 80, G: 3,  H: 5,
    I: 10, J: 10, K: 20, L: 30, M: 40, N: 50, O: 6,  P: 80,
    Q: 100, R: 200, S: 60, T: 400, U: 6,  V: 6,  W: 6,  X: 90,
    Y: 10, Z: 7
  }
  const out: number[] = []
  const clean = cleanText(text)
  for (const ch of clean) {
    if (/[A-Z]/.test(ch)) out.push(map[ch] ?? 0)
    else if (/[0-9]/.test(ch)) out.push(parseInt(ch, 10))
  }
  return out.filter(v => v > 0)
}

// Siamês para n ímpar
const magicOdd = (n: number) => {
  const grid = Array.from({ length: n }, () => Array(n).fill(0)) as number[][]
  let num = 1
  let i = 0, j = Math.floor(n / 2)
  while (num <= n * n) {
    grid[i][j] = num
    num++
    const ni = (i - 1 + n) % n
    const nj = (j + 1) % n
    if (grid[ni][nj] !== 0) i = (i + 1) % n
    else { i = ni; j = nj }
  }
  return grid
}

const MAGIC_4 = [
  [16, 2, 3, 13],
  [5, 11, 10, 8],
  [9, 7, 6, 12],
  [4, 14, 15, 1],
]

const MAGIC_6 = [
  [35, 1, 6, 26, 19, 24],
  [3, 32, 7, 21, 23, 25],
  [31, 9, 2, 22, 27, 20],
  [8, 28, 33, 17, 10, 15],
  [30, 5, 34, 12, 14, 16],
  [4, 36, 29, 13, 18, 11],
]

const MAGIC_8 = [
  [64, 2, 3, 61, 60, 6, 7, 57],
  [9, 55, 54, 12, 13, 51, 50, 16],
  [17, 47, 46, 20, 21, 43, 42, 24],
  [40, 26, 27, 37, 36, 30, 31, 33],
  [32, 34, 35, 29, 28, 38, 39, 25],
  [41, 23, 22, 44, 45, 19, 18, 48],
  [49, 15, 14, 52, 53, 11, 10, 56],
  [8, 58, 59, 5, 4, 62, 63, 1],
]

const PLANETS = [
  { key: "saturn", name: "Saturno (3x3)", n: 3, grid: magicOdd(3), helper: "Estrutura para limites, disciplina, proteção e encerramentos." },
  { key: "jupiter", name: "Júpiter (4x4)", n: 4, grid: MAGIC_4, helper: "Expansão, abundância, benevolência e prosperidade." },
  { key: "mars", name: "Marte (5x5)", n: 5, grid: magicOdd(5), helper: "Ação, coragem, assertividade e corte de obstáculos." },
  { key: "sun", name: "Sol (6x6)", n: 6, grid: MAGIC_6, helper: "Vitalidade, clareza, liderança e realização." },
  { key: "venus", name: "Vênus (7x7)", n: 7, grid: magicOdd(7), helper: "Harmonia, atração, beleza, vínculos e prazer." },
  { key: "mercury", name: "Mercúrio (8x8)", n: 8, grid: MAGIC_8, helper: "Comunicação, estudo, agilidade e troca." },
  { key: "moon", name: "Lua (9x9)", n: 9, grid: magicOdd(9), helper: "Intuição, sonhos, ciclos, emoções e proteção noturna." },
] as const

type PlanetKey = typeof PLANETS[number]["key"]

const mappings = [
  { key: "a1z26-wrap", label: "A1Z26 (direto, com wrap)", helper: "Converte letras em números (A=1...Z=26) na ordem original. Se passar do tamanho do quadrado, volta ao início (wrap).", fn: (text: string, max: number) => latinToA1Z26(text).map(v => ((v - 1) % max) + 1) },
  { key: "a1z26-cum", label: "A1Z26 (soma cumulativa)", helper: "Converte A=1...Z=26 e soma progressivamente: cada ponto é a soma acumulada até ali. Bom para criar um traçado contínuo.", fn: (text: string, max: number) => {
      const arr = latinToA1Z26(text)
      let sum = 0; return arr.map(v => { sum += v; return ((sum - 1) % max) + 1 })
    }
  },
  { key: "pyth-cum", label: "Pitagórico 1–9 (soma cumulativa)", helper: "Converte letras para valores 1–9 (tabela pitagórica) e soma progressivamente. Mais compacto e simbólico.", fn: (text: string, max: number) => {
      const arr = latinToPythagorean(text)
      let sum = 0; return arr.map(v => { sum += v; return ((sum - 1) % max) + 1 })
    }
  },
  { key: "hebrew-1to400-wrap", label: "Gematria Hebraica (1–400) + transliteração simples", helper: "Translitera letras latinas para valores gemátricos e aplica wrap no quadrado. Útil para abordagens cabalísticas.", fn: (text: string, max: number) => latinToHebrewGematriaSimple(text).map(v => ((v - 1) % max) + 1) },
] as const

type MappingKey = typeof mappings[number]["key"]

// Tipo para coordenadas do traçado
type Coord = { x: number; y: number; r: number; c: number }

function useNumberIndex(grid: number[][]) {
  return useMemo(() => {
    const map = new Map<number, { r: number; c: number }>()
    grid.forEach((row, r) => row.forEach((val, c) => map.set(val, { r, c })))
    return map
  }, [grid])
}

function toPathCoords(
  seq: number[],
  idx: Map<number, { r: number; c: number }>,
  n: number,
  size: number,
  pad: number
): Coord[] {
  const cell = (size - 2 * pad) / n
  const points = seq
    .map(num => idx.get(num))
    .filter((p): p is { r: number; c: number } => !!p)

  return points.map(({ r, c }) => ({
    x: pad + c * cell + cell / 2,
    y: pad + r * cell + cell / 2,
    r,
    c,
  }))
}

function computeTickSegment(p: {x:number;y:number}, stroke: number, size: number) {
  const cx = size / 2
  const cy = size / 2
  const signX = Math.sign(cx - p.x) || 1
  const signY = Math.sign(cy - p.y) || 1
  const off = Math.max(3, stroke * 0.9)
  const len = Math.max(5, stroke * 1.6)
  const k = Math.SQRT1_2
  const x1 = p.x + off * signX
  const y1 = p.y + off * signY
  const x2 = x1 + len * k * signX
  const y2 = y1 + len * k * signY
  return { x1, y1, x2, y2 }
}

// ===================== Página =====================
export default function MagicSquareSigilPage() {
  const { labels } = useDashboardVocabulary()
  const [text, setText] = useState("HEKATE")
  const [planetKey, setPlanetKey] = useState<PlanetKey>("venus")
  const [mappingKey, setMappingKey] = useState<MappingKey>("a1z26-cum")

  const [showNumbers, setShowNumbers] = useState(false)
  const [showDots, setShowDots] = useState(true)
  const [closePath, setClosePath] = useState(false)
  const [markEnds, setMarkEnds] = useState(true)
  const [markRepeats, setMarkRepeats] = useState(true)
  const [repeatStyle, setRepeatStyle] = useState<'loop'|'tick'>("loop")

  const [size, setSize] = useState(480)
  const [stroke, setStroke] = useState(4)
  const [padding, setPadding] = useState(24)
  const [removeVowels, setRemoveVowels] = useState(false)
  const [removeDuplicates, setRemoveDuplicates] = useState(false)
  const [showMappingExample, setShowMappingExample] = useState(false)

  const svgRef = useRef<SVGSVGElement | null>(null)

  const planet = PLANETS.find(p => p.key === planetKey) ?? PLANETS[0]
  const grid = planet.grid
  const n = planet.n
  const maxVal = n * n

  const mapping = mappings.find(m => m.key === mappingKey) ?? mappings[0]
  const processed = useMemo(() => preprocessText(text, removeVowels, removeDuplicates), [text, removeVowels, removeDuplicates])
  const seq = useMemo(() => mapping.fn(processed, maxVal), [mapping, processed, maxVal])
  const mappingExample = useMemo(() => {
    const sample = "Eu sou prospero e abundante"
    const values = mapping.fn(sample, maxVal)
    return values.join(", ")
  }, [mapping, maxVal])

  const index = useNumberIndex(grid)
  const coords: Coord[] = useMemo(() => toPathCoords(seq, index, n, size, padding), [seq, index, n, size, padding])

  const repeatIndices: number[] = useMemo(() => {
    const indices: number[] = []
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) indices.push(i)
    return indices
  }, [seq])

  const pathD: string = useMemo(() => {
    if (!coords.length) return ""
    const d = [
      `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`,
      ...coords.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ]
    if (closePath && coords.length > 2) d.push("Z")
    return d.join(" ")
  }, [coords, closePath])

  const gridLines = useMemo((): { lines: {x1:number;y1:number;x2:number;y2:number}[]; cell: number; start: number } => {
    const lines: {x1:number;y1:number;x2:number;y2:number}[] = []
    const cell = (size - 2 * padding) / n
    const start = padding
    const end = size - padding
    for (let i = 0; i <= n; i++) {
      const pos = start + i * cell
      lines.push({ x1: pos, y1: start, x2: pos, y2: end }) // vertical
      lines.push({ x1: start, y1: pos, x2: end, y2: pos }) // horizontal
    }
    return { lines, cell, start }
  }, [n, size, padding])

  const numberCells: {x:number;y:number;val:number}[] = useMemo(() => {
    if (!showNumbers) return [] as {x:number;y:number;val:number}[]
    const items: {x:number;y:number;val:number}[] = []
    const { cell, start } = gridLines
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const val = grid[r][c]
        const x = start + c * cell + cell / 2
        const y = start + r * cell + cell / 2
        items.push({ x, y, val })
      }
    }
    return items
  }, [showNumbers, gridLines, grid, n])

  // Exportar SVG
  const exportSVG = () => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgRef.current)
    const blob = new Blob([svgStr], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "sigilo.svg"; a.click()
    URL.revokeObjectURL(url)
  }

  // Atalho Cmd/Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); exportSVG()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold temple-heading">{labels.pages.sigilTitle}</h1>
          <p className="text-[hsl(var(--temple-text-secondary))]">{labels.pages.sigilSubtitle}</p>
        </div>
      </div>

      {/* Controles */}
      <Card className="temple-card">
        <CardHeader>
          <CardTitle className="temple-section-title">Configurações</CardTitle>
          <CardDescription className="text-[hsl(var(--temple-text-secondary))]">Texto, quadrado planetário, mapeamento e opções visuais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Texto (letras e números)</label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: HEKATE, CAMINHOS DE HEKATE" rows={5} />
              <p className="text-xs text-[hsl(var(--temple-text-secondary))] mt-2">Diacríticos e espaços são removidos automaticamente.</p>
              <div className="text-xs text-[hsl(var(--temple-text-secondary))] mt-2">Texto processado: <Badge variant="secondary" className="temple-chip">{processed || "(vazio)"}</Badge></div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Quadrado Planetário</label>
                <select
                  value={planetKey}
                  onChange={(e) => setPlanetKey(e.target.value as PlanetKey)}
                  className="mt-2 w-full rounded-md border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-3 py-2 text-[hsl(var(--temple-text-primary))]"
                >
                  {PLANETS.map(p => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-[hsl(var(--temple-text-secondary))] mt-1">{PLANETS.find(p => p.key === planetKey)?.helper}</p>
                <p className="text-xs text-[hsl(var(--temple-text-secondary))] mt-1">Ímpares (3,5,7,9) via método Siamês; 4,6,8 usam arranjos clássicos.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Mapeamento de Letras → Números</label>
                <select
                  value={mappingKey}
                  onChange={(e) => setMappingKey(e.target.value as MappingKey)}
                  className="mt-2 w-full rounded-md border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-3 py-2 text-[hsl(var(--temple-text-primary))]"
                >
                  {mappings.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMappingExample((prev) => !prev)}
                  >
                    {showMappingExample ? "Ocultar exemplo" : "Ver exemplo"}
                  </Button>
                  <span className="text-xs text-[hsl(var(--temple-text-secondary))]">Usa a frase “Eu sou prospero e abundante” como amostra.</span>
                </div>
                <p className="text-xs text-[hsl(var(--temple-text-secondary))] mt-2">{mappings.find(m => m.key === mappingKey)?.helper}</p>
                {showMappingExample ? (
                  <div className="mt-2 rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-3 py-2 text-xs text-[hsl(var(--temple-text-secondary))]">
                    Exemplo (Eu sou prospero e abundante): {mappingExample}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">Pré-processamento do texto</label>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={removeVowels} onChange={(e)=>setRemoveVowels(e.target.checked)} /> Remover vogais (A,E,I,O,U)</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={removeDuplicates} onChange={(e)=>setRemoveDuplicates(e.target.checked)} /> Remover letras duplicadas</label>
                </div>
                <p className="text-xs text-[hsl(var(--temple-text-secondary))] mt-1">Aplicado antes do mapeamento (estilo clássico de sigilização).</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={showNumbers} onChange={(e)=>setShowNumbers(e.target.checked)} /> Mostrar números</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={showDots} onChange={(e)=>setShowDots(e.target.checked)} /> Pontos nas letras</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={closePath} onChange={(e)=>setClosePath(e.target.checked)} /> Fechar sigilo (Z)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={markEnds} onChange={(e)=>setMarkEnds(e.target.checked)} /> Marcar início/fim</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={markRepeats} onChange={(e)=>setMarkRepeats(e.target.checked)} /> Marcar repetições</label>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="min-w-[140px]">Estilo da repetição</span>
                  <select value={repeatStyle} onChange={(e)=>setRepeatStyle(e.target.value as 'loop'|'tick')} className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={!markRepeats}>
                    <option value="loop">Loop (círculo vazado)</option>
                    <option value="tick">Tique curto (45°)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-[hsl(var(--temple-text-secondary))]">Tamanho (px)</label>
                  <Input type="number" value={size} onChange={(e)=>setSize(parseInt(e.target.value || '0',10))} min={200} max={2000} />
                </div>
                <div>
                  <label className="text-sm text-[hsl(var(--temple-text-secondary))]">Espessura (px)</label>
                  <Input type="number" value={stroke} onChange={(e)=>setStroke(parseInt(e.target.value || '0',10))} min={1} max={20} />
                </div>
                <div>
                  <label className="text-sm text-[hsl(var(--temple-text-secondary))]">Margem (px)</label>
                  <Input type="number" value={padding} onChange={(e)=>setPadding(parseInt(e.target.value || '0',10))} min={0} max={200} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={exportSVG} variant="default">Baixar SVG</Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Sequência numérica derivada</h3>
            <div className="text-xs text-[hsl(var(--temple-text-secondary))] break-words">{seq.join(", ") || "(vazia)"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Pré-visualização */}
      <Card className="temple-card">
        <CardHeader>
          <CardTitle className="temple-section-title">Pré-visualização</CardTitle>
          <CardDescription className="text-[hsl(var(--temple-text-secondary))]">{PLANETS.find(p=>p.key===planetKey)?.name} • {n}×{n} • {seq.length} pontos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-[hsl(var(--temple-border-subtle))] rounded-xl inline-block bg-[hsl(var(--temple-surface-1))] overflow-hidden">
            <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
              {/* fundo */}
              <rect x="0" y="0" width={size} height={size} fill="#ffffff" />

              {/* linhas da grade */}
              {gridLines.lines.map((l, idx) => (
                <line key={idx} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#111111" strokeWidth={1} />
              ))}

              {/* números */}
              {showNumbers && numberCells.map((ncell, i) => (
                <text key={i} x={ncell.x} y={ncell.y + 4} fontSize={Math.max(10, (size / (n * 4)))} textAnchor="middle" fill="#666">{ncell.val}</text>
              ))}

              {/* path */}
              {pathD && (
                <path d={pathD} fill="none" stroke="#111111" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
              )}

              {/* pontos */}
              {showDots && coords.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={Math.max(2, stroke)} fill="#111827" />
              ))}

              {/* repetições */}
              {markRepeats && coords.length > 0 && repeatIndices.map((i) => {
                const p = coords[i]
                if (!p) return null
                if (repeatStyle === 'loop') {
                  const r = Math.max(4, stroke * 0.8)
                  return (
                    <circle key={`rep-${i}`} cx={p.x} cy={p.y} r={r} fill="none" stroke="#111111" strokeWidth={Math.max(1, stroke * 0.9)} />
                  )
                } else {
                  const seg = computeTickSegment(p, stroke, size)
                  return (
                    <line key={`rep-${i}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#111111" strokeWidth={Math.max(1, stroke)} />
                  )
                }
              })}

              {/* início/fim */}
              {markEnds && coords[0] && (
                <g>
                  {/* início */}
                  <circle cx={coords[0].x} cy={coords[0].y} r={Math.max(5, stroke * 1.5)} fill="none" stroke="#111111" strokeWidth={2} />
                  {/* fim */}
                  {coords.length > 1 && (
                    <g>
                      <line x1={coords[coords.length - 1].x - 8} y1={coords[coords.length - 1].y} x2={coords[coords.length - 1].x + 8} y2={coords[coords.length - 1].y} stroke="#111111" strokeWidth={2} />
                      <line x1={coords[coords.length - 1].x} y1={coords[coords.length - 1].y - 8} x2={coords[coords.length - 1].x} y2={coords[coords.length - 1].y + 8} stroke="#111111" strokeWidth={2} />
                    </g>
                  )}
                </g>
              )}
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
