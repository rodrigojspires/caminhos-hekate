import { PrismaClient } from '@prisma/client'

export type SeedTherapyInput = {
  name: string
  value: number
  valuePerSession: boolean
  defaultSessions: number
  singleSessionValue: number | null
  active: boolean
}

export const THERAPY_SEED_DATA: SeedTherapyInput[] = [
  { name: 'CIRCULAÇÃO', value: 450, valuePerSession: true, defaultSessions: 1, singleSessionValue: 550, active: true },
  { name: 'SAMU', value: 170, valuePerSession: true, defaultSessions: 1, singleSessionValue: 200, active: true },
  { name: 'FLORAL DE SAINT GERMAIN', value: 80, valuePerSession: false, defaultSessions: 1, singleSessionValue: 80, active: true },
  { name: 'GRÁFICO RADIÔNICO', value: 35, valuePerSession: false, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'JORNADA XAMÂNICA', value: 197, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'MAPA ASTRAL', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'REVOLUÇÃO SOLAR', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'MAPA NUMEROLÓGICO', value: 264, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'ORÁCULO', value: 220, valuePerSession: true, defaultSessions: 1, singleSessionValue: 220, active: true },
  { name: 'TEBE', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'APOMETRIA LUNAR', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'MAHA LILAH', value: 450, valuePerSession: true, defaultSessions: 1, singleSessionValue: 550, active: true },
  { name: 'EFT', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'PERGUNTE AO SEU CORAÇÃO', value: 197, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'MANDALA - CASA', value: 125, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'MANDALA CHÃO', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'MESA QUANTIÔNICA', value: 200, valuePerSession: true, defaultSessions: 1, singleSessionValue: 250, active: true },
  { name: 'LIMPEZA DA CASA', value: 550, valuePerSession: true, defaultSessions: 1, singleSessionValue: 550, active: true },
  { name: 'RESGATE CRIANÇA INTERIOR', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'CRIACAO DE SERVIDOR(MAGIA DO CAOS)', value: 305, valuePerSession: false, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'DIVORCIO ENERGETICO', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'BENZIMENTO', value: 30, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'REIKI', value: 197, valuePerSession: true, defaultSessions: 1, singleSessionValue: null, active: false },
  { name: 'TRABALHO DE MAGIA', value: 350, valuePerSession: true, defaultSessions: 1, singleSessionValue: 420, active: true },
  { name: 'HARMONIZACAO DE CASA (FENGSHUI E RADIESTESIA)', value: 963, valuePerSession: false, defaultSessions: 1, singleSessionValue: 963, active: true },
  { name: 'TAMEANA', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'GRADE DE CRISTAL', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'APOMETRIA LUNAR MULTIDIMENSIONAL', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'ESCUTA DAS EMOCOES', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'APOMETRIA LUNAR SISTEMICA', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'TERAPIA DE CRENCA', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
  { name: 'ALQUIMIA DA ALMA', value: 270, valuePerSession: true, defaultSessions: 1, singleSessionValue: 350, active: true },
]

export async function seedTherapies(prisma: PrismaClient) {
  const names = THERAPY_SEED_DATA.map((item) => item.name)
  const existing = await prisma.therapy.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  })

  const existingByName = new Map<string, string>()
  for (const therapy of existing) {
    if (!existingByName.has(therapy.name)) {
      existingByName.set(therapy.name, therapy.id)
    }
  }

  const operations = THERAPY_SEED_DATA.map((therapy) => {
    const existingId = existingByName.get(therapy.name)
    if (existingId) {
      return prisma.therapy.update({
        where: { id: existingId },
        data: {
          value: therapy.value,
          valuePerSession: therapy.valuePerSession,
          defaultSessions: therapy.defaultSessions,
          singleSessionValue: therapy.singleSessionValue,
          active: therapy.active,
        },
      })
    }

    return prisma.therapy.create({
      data: {
        name: therapy.name,
        value: therapy.value,
        valuePerSession: therapy.valuePerSession,
        defaultSessions: therapy.defaultSessions,
        singleSessionValue: therapy.singleSessionValue,
        active: therapy.active,
      },
    })
  })

  await prisma.$transaction(operations)
}
