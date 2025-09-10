import React, { useMemo, useRef, useState, useEffect } from "react";

// --- UI helpers -----------------------------------------------------------
function InfoTooltip({ content, ariaLabel = "Ajuda" }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex items-center select-none">
      <button
        type="button"
        aria-label={ariaLabel}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full border border-neutral-300 text-[10px] leading-none text-neutral-700 bg-white hover:bg-neutral-50"
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-80 p-3 rounded-xl border border-neutral-200 bg-white shadow-md text-xs leading-relaxed text-neutral-800"
        >
          {content}
        </div>
      )}
    </span>
  );
}

const MappingHelp = () => (
  <div>
    <p>
      Converte cada caractere em número e mapeia para as casas do quadrado (1…n²).
      Quando o valor excede n², aplicamos módulo para voltar ao intervalo.
    </p>
    <ul className="list-disc pl-4 space-y-1 mt-2">
      <li>
        <strong>A1Z26 (direto, com wrap):</strong> A=1…Z=26; cada letra vira um
        número e é ajustado para 1…n².
      </li>
      <li>
        <strong>A1Z26 (soma cumulativa):</strong> somamos progressivamente os
        valores das letras (ex.: H(8), E(5) → 8, 13, …), aplicando wrap; o
        traçado tende a ficar mais contínuo.
      </li>
      <li>
        <strong>Pitagórico 1–9 (soma cumulativa):</strong> usa a tabela
        numerológica 1–9 (A/J/S=1 … I/R=9), também com soma cumulativa + wrap.
      </li>
      <li>
        <strong>Gematria Hebraica (1–400) + transliteração simples:</strong>
        converte letras latinas para valores hebraicos clássicos (ex.: A=1, B=2, C/K=20, L=30, M=40,
        N=50, O/U/V/W=6, I/J/Y=10, S=60, X=90, Q=100, R=200, T=400, Z=7). Dígitos 0–9 são mantidos.
        Depois aplicamos wrap para 1…n² antes de traçar no Kamea.
      </li>
    </ul>
    <p className="mt-2">
      Dicas: acentos e espaços são removidos; dígitos (0–9) são aceitos; n² é o
      tamanho do quadrado (ex.: 7×7=49). Para um sigilo mais tradicional, você pode
      ativar o pré-processamento (remover vogais/duplicadas) antes do mapeamento.
    </p>
  </div>
);



const PlanetHelp = () => (
  <div>
    <p>Escolha o quadrado conforme a intenção mágica (planetas clássicos):</p>
    <ul className="list-disc pl-4 space-y-1 mt-2">
      <li><strong>Saturno (3×3):</strong> estrutura, limites, proteção, banimentos, disciplina, tempo.</li>
      <li><strong>Júpiter (4×4):</strong> expansão, prosperidade, sorte, autoridade, justiça, sabedoria.</li>
      <li><strong>Marte (5×5):</strong> coragem, ação, corte de obstáculos, defesa ativa, vigor.</li>
      <li><strong>Sol (6×6):</strong> vitalidade, sucesso, liderança, clareza, reconhecimento, cura.</li>
      <li><strong>Vênus (7×7):</strong> amor, atração, harmonia, arte, conciliação, prazer.</li>
      <li><strong>Mercúrio (8×8):</strong> comunicação, estudo, comércio, escrita, viagens, tecnologia.</li>
      <li><strong>Lua (9×9):</strong> intuição, sonhos, fertilidade, proteção do lar, fluxos emocionais.</li>
    </ul>
    <p className="mt-2">Dica: selecione o quadrado que ressoa com o propósito do sigilo.</p>
  </div>
);


// --- Utils ---------------------------------------------------------------
const latinToA1Z26 = (text) => {
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const arr = [];
  for (const ch of clean) {
    if (/[A-Z]/.test(ch)) arr.push(ch.charCodeAt(0) - 64); // A=1
    else if (/[0-9]/.test(ch)) arr.push(parseInt(ch, 10)); // allow numbers
  }
  return arr;
};

const latinToPythagorean = (text) => {
  const table = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
    J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
    S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
  };
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const arr = [];
  for (const ch of clean) {
    if (/[A-Z]/.test(ch)) arr.push(table[ch] ?? 9);
    else if (/[0-9]/.test(ch)) arr.push(parseInt(ch, 10));
  }
  return arr;
};

// Gematria Hebraica (1–400) + transliteração simples
function latinToHebrewGematriaSimple(text) {
  const map = {
    A: 1,  B: 2,  C: 20, D: 4,  E: 5,  F: 80, G: 3,  H: 5,
    I: 10, J: 10, K: 20, L: 30, M: 40, N: 50, O: 6,  P: 80,
    Q: 100, R: 200, S: 60, T: 400, U: 6,  V: 6,  W: 6,  X: 90,
    Y: 10, Z: 7
  };
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const out = [];
  for (const ch of clean) {
    if (/[A-Z]/.test(ch)) out.push(map[ch] ?? 0);
    else if (/[0-9]/.test(ch)) out.push(parseInt(ch, 10));
  }
  return out.filter(v => v > 0);
}

// Pré-processamento de texto (sigilização clássica)
function preprocessText(text, rmVowels, rmDup) {
  let out = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (rmVowels) out = out.replace(/[AEIOU]/g, "");
  if (rmDup) {
    const seen = new Set();
    let tmp = "";
    for (const ch of out) {
      if (!seen.has(ch)) { seen.add(ch); tmp += ch; }
    }
    out = tmp;
  }
  return out;
}

// Quick dev tests ---------------------------------------------------------
function runDevTests() {
  try {
    console.group("Sigilo App — quick tests");
    // A1Z26
    console.assert(JSON.stringify(latinToA1Z26("ABZ")) === JSON.stringify([1, 2, 26]), "A1Z26 basic failed");
    // Pythagorean
    console.assert(JSON.stringify(latinToPythagorean("AZ")) === JSON.stringify([1, 8]), "Pythagorean basic failed");
    // Gematria
    console.assert(JSON.stringify(latinToHebrewGematriaSimple("KVT")) === JSON.stringify([20, 6, 400]), "Gematria basic failed");
    // Preprocess (remove vogais + duplicadas)
    const p = preprocessText("AABBÉ-ç", true, true); // → "BC"
    console.assert(p === "BC", "preprocessText failed, got " + p);
    // Repetições
    const testSeq = [6, 1, 1, 5];
    const repIdx = [];
    for (let i = 1; i < testSeq.length; i++) if (testSeq[i] === testSeq[i - 1]) repIdx.push(i);
    console.assert(repIdx.length === 1 && repIdx[0] === 2, "repeatIndices logic failed");
    const seg = computeTickSegment({x:90,y:10}, 4, 100, 0);
    console.assert(seg.x2 > seg.x1 && seg.y2 < seg.y1, "computeTickSegment 45deg up-right failed");
    // Extra tests (não alteram os existentes):
    // - Wrap de A1Z26 para max=9 (Z→8)
    const wrapZ = ((26 - 1) % 9) + 1; console.assert(wrapZ === 8, "wrap Z->8 failed");
    // - Repetição do seu exemplo (5,8,9,6,4,4,5,...)
    const ex = [5,8,9,6,4,4,5,7,3,7,9];
    const exRep = ex.map((v,i,a)=> i>0 && v===a[i-1]).filter(Boolean).length; // 1 repetição
    console.assert(exRep === 1, "example repeat count failed");
    console.groupEnd();
  } catch (e) {
    console.error("Dev tests failed:", e);
  }
}

// Siamese method for odd n (3,5,7,9...)
const magicOdd = (n) => {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  let num = 1;
  let i = 0, j = Math.floor(n / 2);
  while (num <= n * n) {
    grid[i][j] = num;
    num++;
    let ni = (i - 1 + n) % n;
    let nj = (j + 1) % n;
    if (grid[ni][nj] !== 0) {
      i = (i + 1) % n; // move down
    } else {
      i = ni;
      j = nj;
    }
  }
  return grid;
};

// Predefined classic squares for 4x4 (Jupiter), 6x6 (Sun), 8x8 (Mercury)
const MAGIC_4 = [
  [16, 2, 3, 13],
  [5, 11, 10, 8],
  [9, 7, 6, 12],
  [4, 14, 15, 1],
];

const MAGIC_6 = [
  [35, 1, 6, 26, 19, 24],
  [3, 32, 7, 21, 23, 25],
  [31, 9, 2, 22, 27, 20],
  [8, 28, 33, 17, 10, 15],
  [30, 5, 34, 12, 14, 16],
  [4, 36, 29, 13, 18, 11],
];

const MAGIC_8 = [
  [64, 2, 3, 61, 60, 6, 7, 57],
  [9, 55, 54, 12, 13, 51, 50, 16],
  [17, 47, 46, 20, 21, 43, 42, 24],
  [40, 26, 27, 37, 36, 30, 31, 33],
  [32, 34, 35, 29, 28, 38, 39, 25],
  [41, 23, 22, 44, 45, 19, 18, 48],
  [49, 15, 14, 52, 53, 11, 10, 56],
  [8, 58, 59, 5, 4, 62, 63, 1],
];

const PLANETS = [
  { key: "saturn", name: "Saturno (3x3)", n: 3, grid: magicOdd(3) },
  { key: "jupiter", name: "Júpiter (4x4)", n: 4, grid: MAGIC_4 },
  { key: "mars", name: "Marte (5x5)", n: 5, grid: magicOdd(5) },
  { key: "sun", name: "Sol (6x6)", n: 6, grid: MAGIC_6 },
  { key: "venus", name: "Vênus (7x7)", n: 7, grid: magicOdd(7) },
  { key: "mercury", name: "Mercúrio (8x8)", n: 8, grid: MAGIC_8 },
  { key: "moon", name: "Lua (9x9)", n: 9, grid: magicOdd(9) },
];

const mappings = [
  { key: "a1z26-wrap", label: "A1Z26 (direto, com wrap)", fn: (text, max) => latinToA1Z26(text).map(v => ((v - 1) % max) + 1) },
  { key: "a1z26-cum", label: "A1Z26 (soma cumulativa)", fn: (text, max) => {
      const arr = latinToA1Z26(text);
      let sum = 0; return arr.map(v => { sum += v; return ((sum - 1) % max) + 1; });
    }
  },
  { key: "pyth-cum", label: "Pitagórico 1–9 (soma cumulativa)", fn: (text, max) => {
      const arr = latinToPythagorean(text);
      let sum = 0; return arr.map(v => { sum += v; return ((sum - 1) % max) + 1; });
    }
  },
  {
    key: "hebrew-1to400-wrap",
    label: "Gematria Hebraica (1–400) + transliteração simples",
    fn: (text, max) => latinToHebrewGematriaSimple(text).map(v => ((v - 1) % max) + 1)
  },  
];

function useNumberIndex(grid) {
  return useMemo(() => {
    const map = new Map();
    grid.forEach((row, r) => row.forEach((val, c) => map.set(val, { r, c })));
    return map;
  }, [grid]);
}

function toPathCoords(seq, idx, n, size, pad) {
  const cell = (size - 2 * pad) / n;
  return seq
    .map(num => idx.get(num))
    .filter(Boolean)
    .map(({ r, c }) => ({
      x: pad + c * cell + cell / 2,
      y: pad + r * cell + cell / 2,
      r, c,
    }));
}

function computeTickSegment(p, stroke, size, padding) {
  // desenha um tique curto (45°) apontando para o centro do canvas
  const cx = size / 2;
  const cy = size / 2;
  const signX = Math.sign(cx - p.x) || 1; // se estiver exatamente no centro, usa +1
  const signY = Math.sign(cy - p.y) || 1;
  const off = Math.max(3, stroke * 0.9);
  const len = Math.max(5, stroke * 1.6);
  const k = Math.SQRT1_2; // 1/√2 ≈ 0.707
  const x1 = p.x + off * signX;
  const y1 = p.y + off * signY;
  const x2 = x1 + len * k * signX;
  const y2 = y1 + len * k * signY;
  return { x1, y1, x2, y2 };
}

function download(filename, text) {
  const blob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function downloadPNGFromSVG(svgRef, filename) {
  if (!svgRef.current) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgRef.current);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const width = svgRef.current.viewBox.baseVal.width || svgRef.current.clientWidth;
  const height = svgRef.current.viewBox.baseVal.height || svgRef.current.clientHeight;
  await new Promise((resolve) => {
    img.onload = resolve; img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  });
}

// --- Main Component ------------------------------------------------------
export default function App() {
  const [text, setText] = useState("HEKATE");
  const [planetKey, setPlanetKey] = useState("venus");
  const [mappingKey, setMappingKey] = useState("a1z26-cum");
  const [showNumbers, setShowNumbers] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const [closePath, setClosePath] = useState(false);
  const [markEnds, setMarkEnds] = useState(true);
  const [markRepeats, setMarkRepeats] = useState(true);
  const [repeatStyle, setRepeatStyle] = useState('loop');
  const [size, setSize] = useState(600);
  const [stroke, setStroke] = useState(4);
  const [padding, setPadding] = useState(32);
  const [removeVowels, setRemoveVowels] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);

  const svgRef = useRef(null);

  const planet = PLANETS.find((p) => p.key === planetKey) || PLANETS[0];
  const grid = planet.grid;
  const n = planet.n;
  const maxVal = n * n;

  const mapping = mappings.find((m) => m.key === mappingKey) || mappings[0];
  const processed = useMemo(
    () => preprocessText(text, removeVowels, removeDuplicates),
    [text, removeVowels, removeDuplicates]
  );
  const seq = mapping.fn(processed, maxVal);

  const index = useNumberIndex(grid);
  const coords = useMemo(() => toPathCoords(seq, index, n, size, padding), [seq, index, n, size, padding]);

  const repeatIndices = useMemo(() => {
    const indices = [];
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1]) indices.push(i);
    }
    return indices;
  }, [seq]);

  const repeatFontSize = useMemo(() => Math.max(10, size / (n * 3)), [size, n]);

  // Build SVG path
  const pathD = useMemo(() => {
    if (!coords.length) return "";
    const d = [
      `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`,
      ...coords.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ];
    if (closePath && coords.length > 2) d.push("Z");
    return d.join(" ");
  }, [coords, closePath]);

  const gridLines = useMemo(() => {
    const lines = [];
    const cell = (size - 2 * padding) / n;
    const start = padding;
    const end = size - padding;
    for (let i = 0; i <= n; i++) {
      const pos = start + i * cell;
      // vertical
      lines.push({ x1: pos, y1: start, x2: pos, y2: end });
      // horizontal
      lines.push({ x1: start, y1: pos, x2: end, y2: pos });
    }
    return { lines, cell, start };
  }, [n, size, padding]);

  const numberCells = useMemo(() => {
    if (!showNumbers) return [];
    const items = [];
    const { cell, start } = gridLines;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const val = grid[r][c];
        const x = start + c * cell + cell / 2;
        const y = start + r * cell + cell / 2;
        items.push({ x, y, val });
      }
    }
    return items;
  }, [showNumbers, gridLines, grid, n]);

  const exportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    download("sigilo.svg", svgStr);
  };

  const exportPNG = () => downloadPNGFromSVG(svgRef, "sigilo.png");

  // Keyboard shortcut: Ctrl/Cmd + S to export SVG
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        exportSVG();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Run quick self-tests once (non-blocking)
  useEffect(() => { runDevTests(); }, []);

  return (
    <div className="min-h-screen w-full bg-neutral-100 text-neutral-900">
      <header className="px-6 py-5 border-b bg-white sticky top-0 z-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Gerador Rápido de Sigilo em Quadrado Mágico</h1>
        <p className="text-sm text-neutral-600 mt-1">Escreva uma palavra/frase, escolha um quadrado planetário e gere o traçado. Exporte em SVG/PNG.</p>
      </header>

      <main className="mx-auto max-w-7xl p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <label className="text-sm font-medium">Texto (letras e números)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 w-full h-24 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
              placeholder="Ex.: HEKATE, CAMINHOS DE HEKATE, etc."
            />
            <p className="text-xs text-neutral-500 mt-2">Diacríticos e espaços são removidos automaticamente.</p>
            <div className="text-xs text-neutral-500 mt-2">
              Texto processado: <span className="font-mono">{processed || "(vazio)"}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium flex items-center">Quadrado Planetário<InfoTooltip ariaLabel="Ajuda: Quadrado Planetário" content={<PlanetHelp />} /></label>
              <select
                value={planetKey}
                onChange={(e) => setPlanetKey(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2"
              >
                {PLANETS.map(p => (
                  <option key={p.key} value={p.key}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">Para ordens ímpares (3,5,7,9) o quadrado é gerado pelo método Siamês; 4,6,8 usam arranjos clássicos.</p>
            </div>

            <div>
              <label className="text-sm font-medium flex items-center">Mapeamento de Letras → Números<InfoTooltip ariaLabel="Ajuda: Mapeamento" content={<MappingHelp />} /></label>
              <select
                value={mappingKey}
                onChange={(e) => setMappingKey(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2"
              >
                {mappings.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Pré-processamento do texto</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={removeVowels}
                    onChange={(e) => setRemoveVowels(e.target.checked)}
                  />
                  Remover vogais (A,E,I,O,U)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                  />
                  Remover letras duplicadas
                </label>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Aplicado antes do mapeamento → números (útil nos métodos clássicos de sigilização).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showNumbers} onChange={(e) => setShowNumbers(e.target.checked)} /> Mostrar números
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showDots} onChange={(e) => setShowDots(e.target.checked)} /> Pontos nas letras
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={closePath} onChange={(e) => setClosePath(e.target.checked)} /> Fechar sigilo (Z)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markEnds} onChange={(e) => setMarkEnds(e.target.checked)} /> Marcar início/fim
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markRepeats} onChange={(e) => setMarkRepeats(e.target.checked)} /> Marcar repetições
              </label>
              <div className="col-span-2 flex items-center gap-2 text-sm">
                <label className="min-w-[140px]">Estilo da repetição</label>
                <select
                  value={repeatStyle}
                  onChange={(e)=>setRepeatStyle(e.target.value)}
                  className="rounded-xl border px-2 py-1 disabled:opacity-50"
                  disabled={!markRepeats}
                >
                  <option value="loop">Loop (círculo vazado)</option>
                  <option value="tick">Tique curto (45°)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm">Tamanho (px)</label>
                <input type="number" value={size} onChange={(e) => setSize(parseInt(e.target.value || '0', 10))} className="mt-1 w-full rounded-xl border px-3 py-2" min={200} max={2000}/>
              </div>
              <div>
                <label className="text-sm">Espessura (px)</label>
                <input type="number" value={stroke} onChange={(e) => setStroke(parseInt(e.target.value || '0', 10))} className="mt-1 w-full rounded-xl border px-3 py-2" min={1} max={20}/>
              </div>
              <div>
                <label className="text-sm">Margem (px)</label>
                <input type="number" value={padding} onChange={(e) => setPadding(parseInt(e.target.value || '0', 10))} className="mt-1 w-full rounded-xl border px-3 py-2" min={0} max={200}/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 flex gap-3">
            <button onClick={exportSVG} className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800">Baixar SVG</button>
            <button onClick={exportPNG} className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300">Baixar PNG</button>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-medium mb-2">Sequência numérica derivada</h3>
            <div className="text-xs text-neutral-700 break-words">
              {seq.join(", ") || "(vazia)"}
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow p-4 overflow-auto">
            <div className="w-full flex justify-between items-center mb-3">
              <div>
                <div className="text-sm font-medium">Pré-visualização</div>
                <div className="text-xs text-neutral-500">{planet.name} — {n}×{n} • {seq.length} pontos</div>
              </div>
            </div>

            <div className="border rounded-xl inline-block">
              <svg
                ref={svgRef}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Bg */}
                <rect x="0" y="0" width={size} height={size} fill="#ffffff" />

                {/* Grid lines */}
                {gridLines.lines.map((l, idx) => (
                  <line key={idx} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#111111" strokeWidth={1} />
                ))}

                {/* Numbers */}
                {numberCells.map((ncell, i) => (
                  <text key={i} x={ncell.x} y={ncell.y + 4} fontSize={Math.max(10, (size / (n * 4)))} textAnchor="middle" fill="#666">{ncell.val}</text>
                ))}

                {/* Path */}
                {pathD && (
                  <path d={pathD} fill="none" stroke="#111111" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
                )}

                {/* Points */}
                {showDots && coords.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={Math.max(2, stroke)} fill="#111111" />
                ))}

                {/* Repeat markers */}
                {markRepeats && repeatIndices.map((i) => {
                  const p = coords[i];
                  if (!p) return null;
                  if (repeatStyle === 'loop') {
                    const r = Math.max(4, stroke * 0.8);
                    return (
                      <circle
                        key={`rep-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={r}
                        fill="none"
                        stroke="#111111"
                        strokeWidth={Math.max(1, stroke * 0.9)}
                      />
                    );
                  } else {
                    const seg = computeTickSegment(p, stroke, size, padding);
                    return (
                      <line
                        key={`rep-${i}`}
                        x1={seg.x1}
                        y1={seg.y1}
                        x2={seg.x2}
                        y2={seg.y2}
                        stroke="#111111"
                        strokeWidth={Math.max(1, stroke)}
                      />
                    );
                  }
                })}

                {/* Start/End markers */}
                {markEnds && coords[0] && (
                  <g>
                    {/* Start */}
                    <circle cx={coords[0].x} cy={coords[0].y} r={Math.max(5, stroke * 1.5)} fill="none" stroke="#111111" strokeWidth={2} />
                    {/* End */}
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
          </div>

          <div className="mt-4 text-xs text-neutral-600">
            Dica: use o atalho <kbd className="px-1 py-0.5 bg-neutral-200 rounded">Ctrl/Cmd + S</kbd> para exportar SVG rapidamente.
          </div>
        </section>
      </main>

      <footer className="p-6 text-center text-xs text-neutral-500">
        Feito com ❤️ para práticas mágicas: quadrados planetários (Saturno→Lua) + mapeamentos numéricos flexíveis. Ajuste o traçado e exporte.
      </footer>
    </div>
  );
}
