"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

// Utilities adapted to TS and simplified from docs/sigilo_em_quadrado_magico_app_react_mvp.jsx
const PT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function a1z26(text: string) {
  const clean = text.toUpperCase().normalize('NFD').replace(/[^A-Z]/g,'')
  const codes = Array.from(clean).map(ch => PT_ALPHABET.indexOf(ch)+1).filter(n => n>0)
  return { clean, codes, sum: codes.reduce((a,b)=>a+b,0) }
}

function reducePythagorean(n: number) {
  // Reduce to 1..9 by digit sum
  let s = n
  while (s > 9) {
    s = s.toString().split('').reduce((a,b)=>a+parseInt(b,10),0)
  }
  return s
}

const MAGIC_SQUARES: Record<
  'Saturn'|'Jupiter'|'Mars'|'Sun'|'Venus'|'Mercury'|'Moon',
  { size: number; grid: number[][]; emoji: string; name: string; color: string }
> = {
  Saturn: { name: 'Saturno', emoji: '♄', color: '#111827', size: 3, grid: [ [4,9,2],[3,5,7],[8,1,6] ] },
  Jupiter: { name: 'Júpiter', emoji: '♃', color: '#2563eb', size: 4, grid: [ [1,15,14,4],[12,6,7,9],[8,10,11,5],[13,3,2,16] ] },
  Mars: { name: 'Marte', emoji: '♂', color: '#dc2626', size: 5, grid: [ [11,24,7,20,3],[4,12,25,8,16],[17,5,13,21,9],[10,18,1,14,22],[23,6,19,2,15] ] },
  Sun: { name: 'Sol', emoji: '☉', color: '#f59e0b', size: 6, grid: [ [6,32,3,34,35,1],[7,11,27,28,8,30],[19,14,16,15,23,24],[18,20,22,21,17,13],[25,29,10,9,26,12],[36,5,33,4,2,31] ] },
  Venus: { name: 'Vênus', emoji: '♀', color: '#16a34a', size: 7, grid: [ [22,47,16,41,10,35,4],[5,23,48,17,42,11,29],[30,6,24,49,18,36,12],[13,31,7,25,43,19,37],[38,14,32,1,26,44,20],[21,39,8,33,2,27,45],[46,15,40,9,34,3,28] ] },
  Mercury: { name: 'Mercúrio', emoji: '☿', color: '#7c3aed', size: 8, grid: [ [64,2,3,61,60,6,7,57],[9,55,54,12,13,51,50,16],[17,47,46,20,21,43,42,24],[40,26,27,37,36,30,31,33],[32,34,35,29,28,38,39,25],[41,23,22,44,45,19,18,48],[49,15,14,52,53,11,10,56],[8,58,59,5,4,62,63,1] ] },
  Moon: { name: 'Lua', emoji: '☾', color: '#6b7280', size: 9, grid: [ [47,58,69,80,1,12,23,34,45],[57,68,79,9,11,22,33,44,46],[67,78,8,10,21,32,43,54,55],[77,7,18,20,31,42,53,64,66],[6,17,19,30,41,52,63,65,76],[16,27,29,40,51,62,73,75,5],[26,28,39,50,61,72,74,4,15],[36,38,49,60,71,81,3,14,25],[37,48,59,70,80,2,13,24,35] ] }
}

function buildPathFromText(text: string, square: number[][]) {
  const { codes } = a1z26(text)
  const digits = codes.map(reducePythagorean)
  // Map digits 1..9 to coordinates scanning grid left-to-right top-to-bottom first occurrence
  const pos: Record<number, { r: number; c: number } | undefined> = {}
  for (let r=0;r<square.length;r++) {
    for (let c=0;c<square[r].length;c++) {
      const val = reducePythagorean(square[r][c])
      if (!pos[val]) pos[val] = { r, c }
    }
  }
  const path = digits.map(d => pos[d]).filter(Boolean) as {r:number;c:number}[]
  return path
}

function pathToSvg(path: {r:number;c:number}[], size: number) {
  if (path.length === 0) return ''
  const step = 60
  return path.map((p,i) => `${i===0?'M':'L'}${p.c*step+30},${p.r*step+30}`).join(' ')
}

export default function MagicSquareSigilPage() {
  const [text, setText] = useState("")
  const [planet, setPlanet] = useState<'Saturn'|'Jupiter'|'Mars'|'Sun'|'Venus'|'Mercury'|'Moon'>("Venus")

  const square = MAGIC_SQUARES[planet]
  const path = useMemo(() => buildPathFromText(text, square.grid), [text, square])
  const d = useMemo(() => pathToSvg(path, square.size), [path, square])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sigilo em Quadrado Mágico</h1>
          <p className="text-muted-foreground">Gere um traçado a partir de um texto processado sobre o quadrado mágico do planeta selecionado.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrada</CardTitle>
          <CardDescription>Escreva o texto de intenção e escolha o planeta (quadrado mágico) para o traçado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Texto</label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite sua intenção..." rows={5} />
            </div>
            <div>
              <label className="text-sm font-medium">Planeta</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(Object.keys(MAGIC_SQUARES) as Array<keyof typeof MAGIC_SQUARES>).map((key) => {
                  const p = MAGIC_SQUARES[key]
                  const active = key === planet
                  return (
                    <Button key={key} variant={active?"default":"outline"} onClick={() => setPlanet(key as any)} size="sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white" style={{ backgroundColor: p.color }}>
                          {p.emoji}
                        </span>
                        {p.name}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quadrado Mágico: {square.name}</CardTitle>
          <CardDescription>
            Traçado do sigilo baseado na redução pitagórica A1Z26 dos caracteres do texto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${square.size}, 60px)` }}>
                {square.grid.map((row, ri) => (
                  row.map((val, ci) => (
                    <div key={`${ri}-${ci}`} className="w-[60px] h-[60px] border flex items-center justify-center text-sm text-muted-foreground">
                      {val}
                    </div>
                  ))
                ))}
              </div>
              <svg width={square.size*60} height={square.size*60} className="-mt-[60px] pointer-events-none">
                <path d={d} stroke={square.color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {path.map((p, i) => (
                  <circle key={i} cx={p.c*60+30} cy={p.r*60+30} r={4} fill={i===0?"#10b981":"#111827"} />
                ))}
              </svg>
            </div>
          </div>
          {text && (
            <p className="text-xs text-muted-foreground mt-3">
              Texto processado: <Badge variant="secondary">{a1z26(text).clean}</Badge> • Soma: <Badge variant="outline">{a1z26(text).sum}</Badge>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}