export const DASHBOARD_VOCAB_COOKIE = "dashboard_vocab"

export type DashboardVocabularyMode = "initiatic" | "plain"

type VocabularyLabels = {
  menu: {
    home: string
    courses: string
    progress: string
    orders: string
    events: string
    communities: string
    planetaryHours: string
    sigils: string
    tools: string
    profile: string
    altar: string
    settings: string
  }
  pages: {
    homeTitle: string
    coursesTitle: string
    coursesSubtitle: string
    progressTitle: string
    progressSubtitle: string
    ordersTitle: string
    ordersSubtitle: string
    eventsTitle: string
    eventsSubtitle: string
    communitiesTitle: string
    toolsTitle: string
    toolsSubtitle: string
    planetaryTitle: string
    planetarySubtitle: string
    sigilTitle: string
    sigilSubtitle: string
    profileTitle: string
    profileSubtitle: string
  }
}

const vocabulary: Record<DashboardVocabularyMode, VocabularyLabels> = {
  initiatic: {
    menu: {
      home: "Santuário",
      courses: "Meus Rituais",
      progress: "Trilha de Ascensão",
      orders: "Meu Caldeirão",
      events: "Ritos Sazonais",
      communities: "Comunidades",
      planetaryHours: "Oráculo Planetário",
      sigils: "Oficina de Sigilos",
      tools: "Ferramentas",
      profile: "Eu Astral",
      altar: "Altar Pessoal",
      settings: "Ajustes Arcanos",
    },
    pages: {
      homeTitle: "Santuário",
      coursesTitle: "Meus Rituais",
      coursesSubtitle: "Continue sua jornada, desvendando os mistérios que aguardam.",
      progressTitle: "Trilha de Ascensão",
      progressSubtitle: "Acompanhe sua jornada e sua evolução ritual.",
      ordersTitle: "Meu Caldeirão",
      ordersSubtitle: "Visualize seus pedidos e conclua pagamentos pendentes quando necessário.",
      eventsTitle: "Ritos Sazonais",
      eventsSubtitle: "Acompanhe os eventos da comunidade e alterne entre lista e calendário.",
      communitiesTitle: "Comunidades",
      toolsTitle: "Ferramentas",
      toolsSubtitle: "Coleção de utilitários esotéricos e astrológicos.",
      planetaryTitle: "Horas Planetárias",
      planetarySubtitle: "Selecione a data e o local para calcular as 24 horas planetárias (ordem caldaica).",
      sigilTitle: "Sigilo em Quadrado Mágico",
      sigilSubtitle:
        "Parâmetros clássicos de sigilização com traçado correto dentro do quadrado.",
      profileTitle: "Meu Perfil",
      profileSubtitle: "Gerencie suas informações pessoais e preferências.",
    },
  },
  plain: {
    menu: {
      home: "Início",
      courses: "Meus Cursos",
      progress: "Meu Progresso",
      orders: "Minhas Compras",
      events: "Eventos",
      communities: "Comunidades",
      planetaryHours: "Horas Planetárias",
      sigils: "Sigilos",
      tools: "Ferramentas",
      profile: "Perfil",
      altar: "Preferências",
      settings: "Configurações",
    },
    pages: {
      homeTitle: "Início",
      coursesTitle: "Meus Cursos",
      coursesSubtitle: "Continue seus estudos e acompanhe sua evolução.",
      progressTitle: "Meu Progresso",
      progressSubtitle: "Acompanhe seu desenvolvimento e sua evolução nos cursos.",
      ordersTitle: "Minhas Compras",
      ordersSubtitle: "Visualize seus pedidos e conclua pagamentos pendentes quando necessário.",
      eventsTitle: "Eventos",
      eventsSubtitle: "Acompanhe os eventos da comunidade e alterne entre lista e calendário.",
      communitiesTitle: "Comunidades",
      toolsTitle: "Ferramentas",
      toolsSubtitle: "Coleção de utilitários e recursos de apoio.",
      planetaryTitle: "Horas Planetárias",
      planetarySubtitle: "Selecione a data e o local para calcular as 24 horas planetárias.",
      sigilTitle: "Sigilos",
      sigilSubtitle:
        "Parâmetros clássicos de sigilização com traçado correto dentro do quadrado.",
      profileTitle: "Meu Perfil",
      profileSubtitle: "Gerencie suas informações pessoais e preferências.",
    },
  },
}

const plainReplacements: Array<[RegExp, string]> = [
  [/Meus Rituais/gi, "Meus Cursos"],
  [/Ritos Sazonais/gi, "Eventos"],
  [/Trilha de Ascensão/gi, "Meu Progresso"],
  [/Meu Caldeirão/gi, "Minhas Compras"],
  [/Oráculo Planetário/gi, "Horas Planetárias"],
  [/Oficina de Sigilos/gi, "Sigilos"],
  [/\bSantuário\b/gi, "Início"],
  [/Próximos Alinhamentos/gi, "Próximos Eventos"],
  [/\bAlinhamentos\b/gi, "Eventos"],
  [/\bEgrégora\b/gi, "comunidade"],
  [/\bRituais\b/gi, "Cursos"],
  [/\bRitual\b/gi, "Curso"],
]

export function resolveDashboardVocabularyMode(
  value?: string | null
): DashboardVocabularyMode {
  if (value === "plain") return "plain"
  return "initiatic"
}

export function getDashboardVocabulary(mode: DashboardVocabularyMode) {
  return vocabulary[mode]
}

export function applyDashboardVocabulary(
  text: string,
  mode: DashboardVocabularyMode
) {
  if (mode !== "plain") return text
  return plainReplacements.reduce((acc, [regex, replacement]) => {
    return acc.replace(regex, replacement)
  }, text)
}
