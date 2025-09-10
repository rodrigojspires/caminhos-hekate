import React, { useEffect, useMemo, useState } from "react";

// --- Utilidades de formatação ---
const fmtTime = (d, tz, withSeconds = false) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(d);

const fmtDate = (d, tz) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const fmtYMD = (d, tz) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD

const formatYMDpt = (ymd) => {
  const [y, m, d] = ymd.split("-");
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
};

const weekdayEn = (d, tz) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(d);

const WEEKDAY_PT = {
  Sunday: "Domingo",
  Monday: "Segunda-feira",
  Tuesday: "Terça-feira",
  Wednesday: "Quarta-feira",
  Thursday: "Quinta-feira",
  Friday: "Sexta-feira",
  Saturday: "Sábado",
};

// --- Ordem caldaica e regentes dos dias (chaves internas em EN, exibição em PT) ---
const CHALDEAN = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
const DAY_RULER = {
  Sunday: "Sun",
  Monday: "Moon",
  Tuesday: "Mars",
  Wednesday: "Mercury",
  Thursday: "Jupiter",
  Friday: "Venus",
  Saturday: "Saturn",
};

const PLANET_INFO = {
  Saturn: {
    symbol: "♄",
    color: "#111827",
    pt: "Saturno",
    energy: "Estrutura, disciplina, limites e tempo (responsabilidade).",
  },
  Jupiter: {
    symbol: "♃",
    color: "#2563eb",
    pt: "Júpiter",
    energy: "Expansão, sorte, sabedoria e abundância (crescimento).",
  },
  Mars: {
    symbol: "♂",
    color: "#dc2626",
    pt: "Marte",
    energy: "Ação, coragem, desejo e iniciativa (corte).",
  },
  Sun: {
    symbol: "☉",
    color: "#f59e0b",
    pt: "Sol",
    energy: "Vitalidade, identidade, propósito e clareza.",
  },
  Venus: {
    symbol: "♀",
    color: "#16a34a",
    pt: "Vênus",
    energy: "Amor, harmonia, beleza e valores (atração).",
  },
  Mercury: {
    symbol: "☿",
    color: "#7c3aed",
    pt: "Mercúrio",
    energy: "Comunicação, raciocínio, comércio e movimento.",
  },
  Moon: {
    symbol: "☾",
    color: "#6b7280",
    pt: "Lua",
    energy: "Emoções, ciclos, intuição e nutrição.",
  },
};

// --- Nomes tradicionais das 13 Luas (Farmer's Almanac) ---
// Mês 1..12: Jan..Dez; a 13ª (quando houver segunda lua cheia no mesmo mês) = "Lua Azul"
const FULL_MOON_NAMES_ALMANAC_PT = [
  "Lua do Lobo", // Jan
  "Lua da Neve", // Fev
  "Lua das Minhocas", // Mar (ou "do Verme")
  "Lua Rosa", // Abr
  "Lua das Flores", // Mai
  "Lua do Morango", // Jun
  "Lua do Veado", // Jul (Buck)
  "Lua do Esturjão", // Ago (Sturgeon)
  "Lua da Colheita", // Set (Harvest)
  "Lua do Caçador", // Out (Hunter's)
  "Lua do Castor", // Nov (Beaver)
  "Lua Fria", // Dez (Cold)
];

// --- Nomes sazonais (tabela do usuário) ---
// Arrays indexados por mês (1..12). A 13ª do ano = "Lua do Vinho".
const FULL_MOON_NAMES_SAZONAL_SUL = [
  null,
  "Lua da Benção", // Jan
  "Lua da Colheita", // Fev
  "Lua da Cevada", // Mar
  "Lua do Sangue", // Abr
  "Lua Escura", // Mai
  "Lua do Carvalho", // Jun
  "Lua do Lobo", // Jul
  "Lua da Tempestade", // Ago
  "Lua dos Ventos", // Set
  "Lua da Semente", // Out
  "Lua da Flor", // Nov
  "Lua Brilhante", // Dez
];

const FULL_MOON_NAMES_SAZONAL_NORTE = [
  null,
  "Lua do Lobo", // Jan
  "Lua da Tempestade", // Fev
  "Lua dos Ventos", // Mar
  "Lua da Semente", // Abr
  "Lua da Flor", // Mai
  "Lua Brilhante", // Jun
  "Lua da Benção", // Jul
  "Lua da Colheita", // Ago
  "Lua da Cevada", // Set
  "Lua do Sangue", // Out
  "Lua Escura", // Nov
  "Lua do Carvalho", // Dez
];

// --- Helpers de datas ---
const addMs = (d, ms) => new Date(d.getTime() + ms);
const daysInMonthUTC = (y, m /* 0-11 */) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const ymdToUTCNoon = (ymd) => {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};

function splitIntoHours(startUTC, endUTC) {
  const total = endUTC.getTime() - startUTC.getTime();
  const step = total / 12;
  const arr = [];
  for (let i = 0; i < 12; i++) {
    const s = addMs(startUTC, i * step);
    const e = addMs(startUTC, (i + 1) * step);
    arr.push({ start: s, end: e });
  }
  return arr;
}

// --- Algoritmo simples de Fase da Lua (aprox.) ---
// Base: Nova em 2000-01-06 18:14 UTC, mês sinódico ~29.530588853 dias
function moonPhaseFraction(dateUTC) {
  const synodic = 29.530588853;
  const base = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (dateUTC.getTime() - base) / 86400000;
  const age = ((days % synodic) + synodic) % synodic;
  return age / synodic; // 0..1
}

function moonIlluminationPct(frac) {
  // 0.5*(1 - cos(2π*phase)) — aproximação razoável
  const illum = 0.5 * (1 - Math.cos(2 * Math.PI * frac));
  return Math.round(illum * 100);
}

function moonPhaseInfo(frac) {
  const idx = Math.floor(frac * 8 + 0.5) % 8; // 0..7
  const names = [
    "Lua Nova",
    "Crescente",
    "Quarto Crescente",
    "Gibosa Crescente",
    "Lua Cheia",
    "Gibosa Minguante",
    "Quarto Minguante",
    "Minguante",
  ];
  const emojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const main = idx === 0 || idx === 2 || idx === 4 || idx === 6; // fases principais
  return { name: names[idx], emoji: emojis[idx], idx, main };
}

function buildMonthlyMoonTable(ymd /* YYYY-MM-DD */, tz) {
  const [y, m] = ymd.split("-").map((n) => parseInt(n, 10));
  const year = y;
  const month0 = m - 1; // 0-11
  const nDays = daysInMonthUTC(year, month0);
  const rows = [];
  for (let d = 1; d <= nDays; d++) {
    // usar meio-dia UTC para evitar "volta" de fuso ao formatar
    const dt = new Date(Date.UTC(year, month0, d, 12, 0, 0));
    const frac = moonPhaseFraction(dt);
    const { name, emoji, idx, main } = moonPhaseInfo(frac);
    const illum = moonIlluminationPct(frac);
    rows.push({
      ymd: `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dateUTC: dt,
      frac,
      illum,
      name,
      emoji,
      main,
    });
  }
  return rows;
}

// --- Luas Cheias (datas, sem nomes) ---
function buildFullMoonDatesForYear(year) {
  const fulls = [];
  for (let m = 0; m < 12; m++) {
    const nDays = daysInMonthUTC(year, m);
    for (let d = 1; d <= nDays; d++) {
      const dt = new Date(Date.UTC(year, m, d, 12, 0, 0));
      const frac = moonPhaseFraction(dt);
      const { idx } = moonPhaseInfo(frac);
      if (idx === 4) {
        const prev = new Date(Date.UTC(year, m, Math.max(1, d - 1), 12, 0, 0));
        const next = new Date(Date.UTC(year, m, Math.min(nDays, d + 1), 12, 0, 0));
        const illum = moonIlluminationPct(frac);
        const illumPrev = moonIlluminationPct(moonPhaseFraction(prev));
        const illumNext = moonIlluminationPct(moonPhaseFraction(next));
        if (illum >= illumPrev && illum >= illumNext) {
          fulls.push({
            ymd: `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            dateUTC: dt,
          });
        }
      }
    }
  }
  // Fallback: garante ao menos 12
  if (fulls.length < 12) {
    for (let m = 0; m < 12; m++) {
      const already = fulls.find((f) => parseInt(f.ymd.slice(5, 7), 10) === m + 1);
      if (already) continue;
      const nDays = daysInMonthUTC(year, m);
      let best = null;
      let bestIll = -1;
      for (let d = 1; d <= nDays; d++) {
        const dt = new Date(Date.UTC(year, m, d, 12, 0, 0));
        const ill = moonIlluminationPct(moonPhaseFraction(dt));
        if (ill > bestIll) {
          bestIll = ill;
          best = { ymd: `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dateUTC: dt };
        }
      }
      if (best) fulls.push(best);
    }
  }
  fulls.sort((a, b) => (a.ymd < b.ymd ? -1 : 1));
  return fulls;
}

// --- Nomeadores ---
function nameFullMoons_Almanac(fulls) {
  const seenByMonth = {};
  return fulls.map((f) => {
    const m = parseInt(f.ymd.slice(5, 7), 10);
    seenByMonth[m] = (seenByMonth[m] || 0) + 1;
    const isSecondInMonth = seenByMonth[m] >= 2;
    const name = isSecondInMonth ? "Lua Azul" : FULL_MOON_NAMES_ALMANAC_PT[m - 1];
    return { ...f, name };
  });
}

function nameFullMoons_Sazonal(fulls, south) {
  const arr = south ? FULL_MOON_NAMES_SAZONAL_SUL : FULL_MOON_NAMES_SAZONAL_NORTE;
  const named = fulls.map((f) => {
    const m = parseInt(f.ymd.slice(5, 7), 10);
    const name = arr[m];
    return { ...f, name };
  });
  // Se houver 13 luas no ano, a 13ª recebe "Lua do Vinho"
  if (named.length >= 13) {
    named[named.length - 1] = { ...named[named.length - 1], name: "Lua do Vinho" };
  }
  return named;
}

// Sabbats (aproximações por data civil). Ajusta automaticamente para hemisfério baseado na latitude.
function buildSabbats(year, south) {
  const north = [
    { name: "Imbolc", m: 2, d: 1 },
    { name: "Ostara (Equinócio de Primavera)", m: 3, d: 20 },
    { name: "Beltane", m: 5, d: 1 },
    { name: "Litha (Solstício de Verão)", m: 6, d: 21 },
    { name: "Lughnasadh (Lammas)", m: 8, d: 1 },
    { name: "Mabon (Equinócio de Outono)", m: 9, d: 22 },
    { name: "Samhain", m: 10, d: 31 },
    { name: "Yule (Solstício de Inverno)", m: 12, d: 21 },
  ];
  const southList = [
    { name: "Lughnasadh (Lammas)", m: 2, d: 1 },
    { name: "Mabon (Equinócio de Outono)", m: 3, d: 20 },
    { name: "Samhain", m: 4, d: 30 },
    { name: "Yule (Solstício de Inverno)", m: 6, d: 21 },
    { name: "Imbolc", m: 8, d: 1 },
    { name: "Ostara (Equinócio de Primavera)", m: 9, d: 22 },
    { name: "Beltane", m: 10, d: 31 },
    { name: "Litha (Solstício de Verão)", m: 12, d: 21 },
  ];
  const list = south ? southList : north;
  return list
    .map((x) => ({ ...x, ymd: `${year}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}` }))
    .sort((a, b) => (a.ymd < b.ymd ? -1 : 1));
}

function whichIndexNowOrNext(items, dateStr) {
  // items devem estar ordenados por ymd ascendente
  const target = String(dateStr).slice(0, 10);
  let now = -1; // último ≤ target
  for (let i = 0; i < items.length; i++) {
    const y = items[i]?.ymd;
    if (!y) continue;
    if (y <= target) {
      now = i;
    } else {
      break;
    }
  }
  const nextIdx = items.findIndex((x) => x.ymd > target);
  return { now, next: nextIdx >= 0 ? nextIdx : 0 };
}

// --- Fetchers (Open‑Meteo, sem API key) ---
async function geocodeCity(name) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "pt");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Falha ao geocodificar a cidade");
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) throw new Error("Cidade não encontrada");
  return {
    lat: hit.latitude,
    lon: hit.longitude,
    tz: hit.timezone,
    label: `${hit.name}${hit.admin1 ? ", " + hit.admin1 : ""}${hit.country ? ", " + hit.country : ""}`,
  };
}

async function getSunTimesUTC(lat, lon, dateStr) {
  const start = dateStr; // YYYY-MM-DD
  const end = new Date(new Date(dateStr).getTime() + 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", end);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Falha ao obter nascer/pôr do sol");
  const data = await res.json();
  const idx0 = 0; // dia selecionado
  const idx1 = 1; // próximo dia
  const sunrise0 = new Date(data.daily.sunrise[idx0] + "Z"); // garantir UTC
  const sunset0 = new Date(data.daily.sunset[idx0] + "Z");
  const sunrise1 = new Date(data.daily.sunrise[idx1] + "Z");
  return { sunrise0, sunset0, sunrise1 };
}

function buildPlanetaryTable(sunrise0, sunset0, sunrise1, tz, weekdayNameEn) {
  const dayRuler = DAY_RULER[weekdayNameEn];
  const startIdx = CHALDEAN.indexOf(dayRuler);
  const dayHours = splitIntoHours(sunrise0, sunset0);
  const nightHours = splitIntoHours(sunset0, sunrise1);
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const planet = CHALDEAN[(startIdx + i) % 7];
    rows.push({ n: i + 1, period: "Dia", planet, start: dayHours[i].start, end: dayHours[i].end });
  }
  for (let i = 0; i < 12; i++) {
    const planet = CHALDEAN[(startIdx + 12 + i) % 7];
    rows.push({ n: 13 + i, period: "Noite", planet, start: nightHours[i].start, end: nightHours[i].end });
  }
  return { dayRuler, rows };
}

function useNowUTC() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// --- Self-checks ("testes" simples no console) ---
function runSelfChecks() {
  try {
    console.groupCollapsed("Self-checks (Horas Planetárias App)");
    // Map de fases básico
    console.assert(moonPhaseInfo(0).name === "Lua Nova", "fase 0 => Lua Nova");
    console.assert(moonPhaseInfo(0.5).name === "Lua Cheia", "fase 0.5 => Lua Cheia");
    // Almanac: 2ª lua no mesmo mês vira Lua Azul
    const demoAlmanac = nameFullMoons_Almanac([
      { ymd: "2025-01-12" },
      { ymd: "2025-01-31" },
    ]);
    console.assert(demoAlmanac[1].name === "Lua Azul", "2ª do mês => Lua Azul");
    // Sazonal Sul: Jan/Fev
    const demoSazonalSul = nameFullMoons_Sazonal([
      { ymd: "2025-01-12" },
      { ymd: "2025-02-10" },
    ], true);
    console.assert(demoSazonalSul[0].name === "Lua da Benção", "Sazonal Sul Jan");
    console.assert(demoSazonalSul[1].name === "Lua da Colheita", "Sazonal Sul Fev");

    // whichIndexNowOrNext: semântica "último ≤ data"
    const wPast = whichIndexNowOrNext([
      { ymd: "2025-01-01" },
      { ymd: "2025-03-01" },
    ], "2025-02-01");
    console.assert(wPast.now === 0 && wPast.next === 1, "último ≤ data => now=0, next=1");

    // hoje exato => now e next apontam ao mesmo índice
    const wExact = whichIndexNowOrNext([{ ymd: "2025-02-10" }], "2025-02-10");
    console.assert(wExact.now === 0 && wExact.next === 0, "hoje => now=next");

    // ADICIONAIS
    console.assert(FULL_MOON_NAMES_ALMANAC_PT.length === 12, "Almanaque: 12 nomes base");
    console.assert(buildSabbats(2025, true).length === 8 && buildSabbats(2025, false).length === 8, "Sabbats: 8 por ano");
    console.groupEnd();
  } catch (e) {
    // nunca quebrar a UI por conta de testes
  }
}

export default function App() {
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [cityQuery, setCityQuery] = useState("São Paulo");
  const [loc, setLoc] = useState({ lat: -23.55, lon: -46.63, tz: "America/Sao_Paulo", label: "São Paulo, Brasil" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sun, setSun] = useState(null); // { sunrise0, sunset0, sunrise1 }

  const [moonMonth, setMoonMonth] = useState([]); // tabela mensal
  const [yearFullMoons, setYearFullMoons] = useState([]); // esbats do ano (com nome)
  const [yearSabbats, setYearSabbats] = useState([]); // sabbats do ano

  const [namingScheme, setNamingScheme] = useState("sazonal"); // 'sazonal' | 'almanac'

  const nowUTC = useNowUTC();

  const weekdayNameEn = useMemo(() => (loc?.tz && sun?.sunrise0 ? weekdayEn(sun.sunrise0, loc.tz) : ""), [loc, sun]);
  const weekdayNamePt = WEEKDAY_PT[weekdayNameEn] || "";

  const table = useMemo(() => {
    if (!sun || !loc?.tz || !weekdayNameEn) return null;
    return buildPlanetaryTable(sun.sunrise0, sun.sunset0, sun.sunrise1, loc.tz, weekdayNameEn);
  }, [sun, loc, weekdayNameEn]);

  const currentHourIndex = useMemo(() => {
    if (!table) return -1;
    const startCycle = table.rows[0]?.start;
    const endCycle = table.rows[table.rows.length - 1]?.end;
    if (!startCycle || !endCycle) return -1;
    if (nowUTC < startCycle || nowUTC >= endCycle) return -1;
    return table.rows.findIndex((r) => nowUTC >= r.start && nowUTC < r.end);
  }, [table, nowUTC]);

  const moonToday = useMemo(() => {
    if (!dateStr) return null;
    const dt = ymdToUTCNoon(dateStr);
    const frac = moonPhaseFraction(dt);
    const info = moonPhaseInfo(frac);
    const illum = moonIlluminationPct(frac);
    return { ...info, frac, illum, dateUTC: dt };
  }, [dateStr]);

  // Atualiza tabelas dependentes de data/local/esquema
  useEffect(() => {
    setMoonMonth(buildMonthlyMoonTable(dateStr, loc?.tz || "UTC"));

    const year = parseInt(dateStr.slice(0, 4), 10);
    const dates = buildFullMoonDatesForYear(year);
    const south = typeof loc?.lat === "number" ? loc.lat < 0 : false;
    const named =
      namingScheme === "sazonal" ? nameFullMoons_Sazonal(dates, south) : nameFullMoons_Almanac(dates);
    setYearFullMoons(named);

    setYearSabbats(buildSabbats(year, south));
  }, [dateStr, loc, namingScheme]);

  useEffect(() => {
    // Executa auto-testes uma vez no mount
    runSelfChecks();
  }, []);

  const [activeTab, setActiveTab] = useState("horas"); // 'horas' | 'lua' | 'rituais'

  const sabNowNext = useMemo(() => whichIndexNowOrNext(yearSabbats, dateStr), [yearSabbats, dateStr]);
  const esbNowNext = useMemo(() => whichIndexNowOrNext(yearFullMoons, dateStr), [yearFullMoons, dateStr]);

  async function handleCitySearch(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const g = await geocodeCity(cityQuery);
      setLoc(g);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUseMyLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada no navegador.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
          url.searchParams.set("latitude", String(pos.coords.latitude));
          url.searchParams.set("longitude", String(pos.coords.longitude));
          url.searchParams.set("language", "pt");
          const res = await fetch(url.toString());
          const data = await res.json();
          const r = data?.results?.[0];
          const tz = r?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          setLoc({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            tz,
            label: r ? `${r.name}${r.admin1 ? ", " + r.admin1 : ""}${r.country ? ", " + r.country : ""}` : "Local atual",
          });
        } catch (e) {
          setError("Não foi possível obter o fuso horário da sua posição.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError("Permita o acesso à localização para usar esta função.");
      }
    );
  }

  async function handleFetchSun() {
    setError("");
    if (!loc) return;
    setLoading(true);
    try {
      const s = await getSunTimesUTC(loc.lat, loc.lon, dateStr);
      setSun(s);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleFetchSun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, dateStr]);

  // --- UI ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Horas Planetárias — Calculadora Diária</h1>
          <p className="text-sm text-slate-600 mt-1">
            Informe a data e o local. O app busca o nascer/pôr do sol (Open‑Meteo) e calcula as 12 horas diurnas e as 12 noturnas seguindo a ordem caldaica. Planetas em português. Inclui fases da Lua, tabelas mensais e agora também Sabbats & Esbats.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <form onSubmit={handleCitySearch} className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Cidade / Local (busca)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="Ex.: São Paulo"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  Buscar cidade
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-slate-100"
                  onClick={handleUseMyLocation}
                  disabled={loading}
                >
                  Usar minha localização
                </button>
              </div>
            </form>
            <div>
              <label className="block text-sm font-medium mb-1">Nomes das Luas Cheias</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={namingScheme}
                onChange={(e) => setNamingScheme(e.target.value)}
              >
                <option value="sazonal">Sazonal (ajusta pelo hemisfério)</option>
                <option value="almanac">Almanaque (Lobo, Neve, etc.)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><strong>Local selecionado:</strong> {loc?.label}</span>
              <span className="opacity-70">Lat: {loc?.lat.toFixed(4)}</span>
              <span className="opacity-70">Lon: {loc?.lon.toFixed(4)}</span>
              <span className="opacity-70">Fuso: {loc?.tz}</span>
              <span className="opacity-70">Hemisfério: {(loc?.lat ?? 0) < 0 ? "Sul" : "Norte"}</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4">{error}</div>
        )}

        <section className="bg-white rounded-2xl shadow p-0 md:p-0">
          {/* Tabs */}
          <div className="px-4 md:px-6 pt-4 border-b">
            <div role="tablist" className="flex items-center gap-2 flex-wrap">
              <button role="tab" onClick={() => setActiveTab("horas")} className={`px-4 py-2 rounded-full text-sm ${activeTab === "horas" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`} aria-selected={activeTab === "horas"}>
                Horas planetárias
              </button>
              <button role="tab" onClick={() => setActiveTab("lua")} className={`px-4 py-2 rounded-full text-sm ${activeTab === "lua" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`} aria-selected={activeTab === "lua"}>
                Ciclos lunares
              </button>
              <button role="tab" onClick={() => setActiveTab("rituais")} className={`px-4 py-2 rounded-full text-sm ${activeTab === "rituais" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`} aria-selected={activeTab === "rituais"}>
                Sabbats & Esbats
              </button>
            </div>
          </div>

          {/* Conteúdo das abas */}
          <div className="p-4 md:p-6">
            {activeTab === "horas" && (
              <div>
                {loading && <p className="text-slate-600">Carregando…</p>}
                {!loading && sun && table && (
                  <>
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="text-slate-500">Nascer do sol</div>
                        <div className="text-lg font-semibold">{fmtTime(sun.sunrise0, loc.tz)}</div>
                        <div className="text-slate-500">{fmtDate(sun.sunrise0, loc.tz)}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="text-slate-500">Pôr do sol</div>
                        <div className="text-lg font-semibold">{fmtTime(sun.sunset0, loc.tz)}</div>
                        <div className="text-slate-500">{fmtDate(sun.sunset0, loc.tz)}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="text-slate-500">Regente do dia</div>
                        <div className="text-lg font-semibold flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white" style={{ backgroundColor: PLANET_INFO[table.dayRuler].color }} title={`${PLANET_INFO[table.dayRuler].pt}: ${PLANET_INFO[table.dayRuler].energy}`} aria-label={`${PLANET_INFO[table.dayRuler].pt}: ${PLANET_INFO[table.dayRuler].energy}`}>
                            {PLANET_INFO[table.dayRuler].symbol}
                          </span>
                          {PLANET_INFO[table.dayRuler].pt}
                          <span className="text-slate-500 text-sm">({weekdayNamePt})</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2 pr-2">#</th>
                            <th className="py-2 pr-2">Período</th>
                            <th className="py-2 pr-2">Planeta</th>
                            <th className="py-2 pr-2">Início</th>
                            <th className="py-2 pr-2">Fim</th>
                            <th className="py-2 pr-2">Duração</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((r, i) => {
                            const durMs = r.end - r.start;
                            const mins = Math.round(durMs / 60000);
                            const isCurrent = i === currentHourIndex;
                            return (
                              <tr key={i} className={`${i % 2 ? "bg-slate-50" : ""} ${isCurrent ? "bg-emerald-50 ring-2 ring-emerald-500" : ""}`}>
                                <td className="py-2 pr-2 font-mono">{r.n}</td>
                                <td className="py-2 pr-2">{r.period}</td>
                                <td className="py-2 pr-2">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white" style={{ backgroundColor: PLANET_INFO[r.planet].color }} title={`${PLANET_INFO[r.planet].pt}: ${PLANET_INFO[r.planet].energy}`} aria-label={`${PLANET_INFO[r.planet].pt}: ${PLANET_INFO[r.planet].energy}`}>
                                      {PLANET_INFO[r.planet].symbol}
                                    </span>
                                    {PLANET_INFO[r.planet].pt}
                                  </span>
                                </td>
                                <td className="py-2 pr-2">{fmtTime(r.start, loc.tz)}</td>
                                <td className="py-2 pr-2">{fmtTime(r.end, loc.tz)}</td>
                                <td className="py-2 pr-2">{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, "0")}m</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Legenda das energias planetárias */}
                    <div className="mt-8">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Legenda das energias planetárias</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {CHALDEAN.map((key) => (
                          <div key={key} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white flex-shrink-0" style={{ backgroundColor: PLANET_INFO[key].color }} title={`${PLANET_INFO[key].pt}: ${PLANET_INFO[key].energy}`} aria-label={`${PLANET_INFO[key].pt}: ${PLANET_INFO[key].energy}`}>
                              {PLANET_INFO[key].symbol}
                            </span>
                            <div>
                              <div className="font-medium">{PLANET_INFO[key].pt}</div>
                              <div className="text-xs text-slate-600 leading-snug">{PLANET_INFO[key].energy}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                      <p>* Cálculo das horas planetárias: 12 horas diurnas do nascer ao pôr do sol; 12 horas noturnas do pôr do sol ao próximo nascer. Ordem caldaica: Saturno → Júpiter → Marte → Sol → Vênus → Mercúrio → Lua.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "lua" && (
              <div>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-slate-500">Data</div>
                    <div className="text-lg font-semibold">{formatYMDpt(dateStr)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-slate-500">Fase da Lua (dia)</div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <span className="text-xl" title={`${moonToday?.name} — ${moonToday?.illum}%`}>{moonToday?.emoji}</span>
                      {moonToday?.name}
                      <span className="text-slate-500 text-sm">{moonToday?.illum}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-slate-500">Mês</div>
                    <div className="text-lg font-semibold">{dateStr.slice(0,7)}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-2">Data</th>
                        <th className="py-2 pr-2">Fase</th>
                        <th className="py-2 pr-2">Iluminação</th>
                        <th className="py-2 pr-2">Marco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moonMonth.map((row) => {
                        const isSel = row.ymd === dateStr;
                        const marco = row.main ? (row.idx === 0 ? "Nova" : row.idx === 2 ? "Quarto Crescente" : row.idx === 4 ? "Cheia" : "Quarto Minguante") : "";
                        return (
                          <tr key={row.ymd} className={`${isSel ? "ring-2 ring-amber-400" : ""} ${Number(row.ymd.slice(-2)) % 2 ? "bg-white" : "bg-slate-50"}`}>
                            <td className="py-2 pr-2 whitespace-nowrap">{formatYMDpt(row.ymd)}</td>
                            <td className="py-2 pr-2 flex items-center gap-2"><span className="text-lg">{row.emoji}</span> {row.name}</td>
                            <td className="py-2 pr-2">{row.illum}%</td>
                            <td className="py-2 pr-2">{marco}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">* Fases calculadas por aproximação astronômica (mês sinódico médio). Para ritos que exigem exatidão ao minuto, use efemérides oficiais.</p>
              </div>
            )}

            {activeTab === "rituais" && (
              <div>
                {/* Resumo */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-slate-500">Ano</div>
                    <div className="text-lg font-semibold">{dateStr.slice(0,4)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-slate-500">Hemisfério</div>
                    <div className="text-lg font-semibold">{(loc?.lat ?? 0) < 0 ? "Sul" : "Norte"}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-slate-500">Agora</div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Sabbat atual</span>{" "}
                        {sabNowNext.now >= 0 ? (
                          <span className="font-semibold">{formatYMDpt(yearSabbats[sabNowNext.now].ymd)} — {yearSabbats[sabNowNext.now].name}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                      <div className="text-slate-600">
                        {esbNowNext.now >= 0 ? (
                          <>Esbat atual: <span className="font-semibold">{formatYMDpt(yearFullMoons[esbNowNext.now].ymd)} — {yearFullMoons[esbNowNext.now].name}</span></>
                        ) : (
                          <>Esbat atual: <span className="text-slate-500">—</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controle de nomes */}
                <div className="mb-3 flex items-center gap-3 text-sm">
                  <label className="opacity-70">Nomes das Luas:</label>
                  <select className="border rounded-lg px-2 py-1" value={namingScheme} onChange={(e) => setNamingScheme(e.target.value)}>
                    <option value="sazonal">Sazonal (ajusta pelo hemisfério)</option>
                    <option value="almanac">Almanaque (Lobo, Neve, etc.)</option>
                  </select>
                </div>

                {/* Sabbats */}
                <h3 className="text-base font-semibold mb-2">Sabbats do ano</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-2">Data</th>
                        <th className="py-2 pr-2">Sabbat</th>
                        <th className="py-2 pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearSabbats.map((s, i) => {
                        const isNow = i === sabNowNext.now;
                        const isNext = !isNow && i === sabNowNext.next;
                        return (
                          <tr key={s.ymd} className={`${isNow ? "bg-emerald-50 ring-2 ring-emerald-500" : isNext ? "ring-2 ring-amber-400" : ""} ${i % 2 ? "bg-slate-50" : "bg-white"}`}>
                            <td className="py-2 pr-2 whitespace-nowrap">{formatYMDpt(s.ymd)}</td>
                            <td className="py-2 pr-2">{s.name}</td>
                            <td className="py-2 pr-2">{isNow ? "Atual" : isNext ? "Próximo" : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Esbats (Lua Cheia) */}
                <h3 className="text-base font-semibold mb-2">Esbats — Luas Cheias do ano</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-2">Data</th>
                        <th className="py-2 pr-2">Nome</th>
                        <th className="py-2 pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearFullMoons.map((f, i) => {
                        const isNow = i === esbNowNext.now;
                        const isNext = !isNow && i === esbNowNext.next;
                        return (
                          <tr key={f.ymd} className={`${isNow ? "bg-emerald-50 ring-2 ring-emerald-500" : isNext ? "ring-2 ring-amber-400" : ""} ${i % 2 ? "bg-slate-50" : "bg-white"}`}>
                            <td className="py-2 pr-2 whitespace-nowrap">{formatYMDpt(f.ymd)}</td>
                            <td className="py-2 pr-2">{f.name}</td>
                            <td className="py-2 pr-2">{isNow ? "Atual" : isNext ? "Próximo" : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  * Esquemas de nomes: <em>Sazonal</em> segue a sua tabela e ajusta automaticamente conforme hemisfério; a 13ª Lua do ano é nomeada "Lua do Vinho". No <em>Almanaque</em>, a 2ª lua cheia de um mesmo mês é chamada "Lua Azul".
                </p>
              </div>
            )}
          </div>
        </section>

        <footer className="text-center text-xs text-slate-500 mt-6">
          Feito rápido com Open‑Meteo (sem API key). Se desejar, exporto em HTML puro, PDF para impressão, ou integro em Flutter depois.
        </footer>
      </div>
    </div>
  );
}
