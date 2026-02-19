"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getHouseByNumber, getHousePrompt } from "@hekate/mahalilah-core";
import { HOUSE_MEANINGS } from "@/lib/mahalilah/house-meanings";
import { HOUSE_POLARITIES } from "@/lib/mahalilah/house-polarities";
import { HOUSE_THERAPEUTIC_TEXTS } from "@/lib/mahalilah/house-therapeutic-texts";

type RoomInvite = {
  id: string;
  email: string;
  acceptedAt: string | null;
  sentAt: string;
};

type RoomParticipant = {
  id: string;
  role: string;
  consentAcceptedAt: string | null;
  gameIntention?: string | null;
  therapistSummary?: string | null;
  user: { id: string; name: string | null; email: string };
};

type RoomParticipantStats = {
  participantId: string;
  participantName: string;
  role: string;
  moves: number;
  rollsTotal: number;
  rollsUntilStart: number;
  therapyEntries: number;
  cardDraws: number;
  aiReports: number;
};

type RoomStats = {
  moves: number;
  therapyEntries: number;
  cardDraws: number;
  aiReports: number;
  rollsTotal: number;
  rollsUntilStart: number;
  byParticipant: RoomParticipantStats[];
};

type Room = {
  id: string;
  code: string;
  status: string;
  planType: string;
  viewerRole: "THERAPIST" | "PLAYER";
  canManage: boolean;
  canDelete: boolean;
  maxParticipants: number;
  therapistPlays: boolean;
  therapistSoloPlay?: boolean;
  isVisibleToPlayers?: boolean;
  isTrial?: boolean;
  isAutoCreatedFromCheckout?: boolean;
  createdAt: string;
  invites: RoomInvite[];
  participants: RoomParticipant[];
  participantsCount: number;
  stats: RoomStats;
};

type RoomQuota = {
  source: "ORDER" | "USER_SUBSCRIPTION";
  planType: "SUBSCRIPTION" | "SUBSCRIPTION_LIMITED" | "SINGLE_SESSION";
  roomsUsed: number;
  roomsLimit: number | null;
  roomsRemaining: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  billingInterval: string | null;
  catalogRoomsLimit: number | null;
};

type TimelineCardDraw = {
  id: string;
  cards: number[];
  createdAt: string;
  moveId: string | null;
  drawnBy: { id: string; user: { name: string | null; email: string } };
  card?: {
    id: string;
    cardNumber: number;
    description: string;
    keywords: string;
    observation: string | null;
    imageUrl: string;
    deck: {
      id: string;
      name: string;
      imageDirectory: string;
      imageExtension: string;
    };
  } | null;
};

type TimelineMove = {
  id: string;
  turnNumber: number;
  diceValue: number;
  fromPos: number;
  toPos: number;
  appliedJumpFrom: number | null;
  appliedJumpTo: number | null;
  createdAt: string;
  participant: { id: string; user: { name: string | null; email: string } };
  therapyEntries: Array<{
    id: string;
    emotion?: string | null;
    intensity?: number | null;
    insight?: string | null;
    body?: string | null;
    microAction?: string | null;
    createdAt?: string;
  }>;
  cardDraws: TimelineCardDraw[];
};

type AiReport = {
  id: string;
  kind: string;
  content: string;
  createdAt: string;
  participant: {
    id: string;
    user: { name: string | null; email: string };
  } | null;
};

type StandaloneCardDraw = TimelineCardDraw;

type DashboardToastKind = "info" | "success" | "warning" | "error";
type DashboardToast = { id: number; message: string; kind: DashboardToastKind };
type ParsedTip = {
  text: string;
  turnNumber: number | null;
  houseNumber: number | null;
  intention: string | null;
};

type ParsedProgressSummary = {
  text: string;
  intervalStart: number | null;
  intervalEnd: number | null;
  summaryEveryMoves: number | null;
  intention: string | null;
};

type HouseMeaningModalState = {
  houseNumber: number;
  title: string;
  subtitle?: string;
  jumpContext?: {
    from: number;
    to: number;
    isUp: boolean;
  };
};

type CardPreviewModalState = {
  card: {
    id: string;
    cardNumber: number;
    description: string;
    keywords: string;
    observation: string | null;
    imageUrl: string;
    deck: {
      id: string;
      name: string;
      imageDirectory: string;
      imageExtension: string;
    };
  };
  title: string;
  subtitle?: string;
};

type AiContentModalEntry = {
  label: string;
  content: string;
  subtitle?: string;
};

type AiContentModalState = {
  title: string;
  content: string;
  subtitle?: string;
  entries?: AiContentModalEntry[];
  activeEntryIndex?: number;
};

type HouseDisplayInfo = {
  number: number;
  sanskrit: string;
  portuguese: string;
  meaning: string;
  description: string;
  keywords: string[];
  polarity: { lightKeywords: string; lightSummary: string; shadowKeywords: string; shadowSummary: string } | null;
};

type Filters = {
  status: string;
  from: string;
  to: string;
};

type SessionsViewTab = "created" | "participated";

type RoomDetailsTab =
  | "invites"
  | "participants"
  | "timeline"
  | "deck"
  | "aiReports";

type DashboardTutorialTarget =
  | "toolbar-indicators"
  | "create-room"
  | "create-room-config"
  | "filters"
  | "sessions-tabs"
  | "sessions-list"
  | "room-actions"
  | "room-indicators"
  | "room-tab-invites"
  | "room-tab-participants"
  | "room-tab-timeline"
  | "room-tab-deck"
  | "room-tab-aiReports";

type TutorialStep = {
  title: string;
  description: string;
  target: DashboardTutorialTarget;
};

type IndicatorsTab =
  | "overview"
  | "engagement"
  | "performance"
  | "comparison"
  | "heatmaps";

type IndicatorsDateFilter = {
  from: string;
  to: string;
};

type IndicatorsStatusMetric = {
  count: number;
  percent: number;
};

type IndicatorsCoverageMetric = {
  count: number;
  total: number;
  percent: number;
};

type IndicatorsModeComparisonMetric = {
  rooms: number;
  completionPercent: number;
  averageDurationMinutes: number | null;
  averageMoves: number;
};

type IndicatorsHeatmapMetric = {
  days: string[];
  hours: number[];
  matrix: number[][];
  max: number;
  total: number;
};

type IndicatorsThemeRoom = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  matchCount: number;
  intentions: string[];
};

type IndicatorsTheme = {
  theme: string;
  count: number;
  rooms: IndicatorsThemeRoom[];
};

type DashboardIndicators = {
  period: {
    from: string | null;
    to: string | null;
    roomsCount: number;
  };
  lastSession: {
    id: string;
    code: string;
    status: string;
    createdAt: string;
    lastMoveAt: string | null;
  } | null;
  invites: {
    pending: number;
    accepted: number;
    total: number;
  };
  roomsWithoutMoves: number;
  consents: {
    pending: number;
    accepted: number;
    total: number;
  };
  statuses: {
    completed: IndicatorsStatusMetric;
    closed: IndicatorsStatusMetric;
    active: IndicatorsStatusMetric;
  };
  averages: {
    movesPerRoom: number;
    aiPerRoom: number;
    therapyPerRoom: number;
  };
  completionRatePercent: number;
  gameplay: {
    averageDurationMinutes: number | null;
    totalDurationMinutes: number;
    startedRoomsCount: number;
  };
  roomsCreatedLast7Days: number;
  roomsCreatedLast30Days: number;
  daysSinceLastSession: number | null;
  aiReportsGenerated: {
    month: number;
    total: number;
  };
  sessionsWithRecords: {
    count: number;
    percent: number;
  };
  therapistModes: {
    playsTogether: number;
    notPlaying: number;
    solo: number;
  };
  intentionThemes: IndicatorsTheme[];
  funnel: {
    created: number;
    inviteAccepted: number;
    consentAccepted: number;
    started: number;
    completed: number;
    inviteAcceptedPercent: number;
    consentAcceptedPercent: number;
    startedPercent: number;
    completedPercent: number;
  };
  timeToFirstMove: {
    averageMinutes: number | null;
    measuredRooms: number;
  };
  timeToConsent: {
    averageMinutes: number | null;
    measuredParticipants: number;
  };
  abandonment: {
    count: number;
    percent: number;
    startedRooms: number;
  };
  therapeuticDensity: {
    entriesPer10Moves: number;
  };
  therapistSummaryCoverage: {
    players: IndicatorsCoverageMetric;
    sessions: IndicatorsCoverageMetric;
  };
  intentionCoverage: {
    players: IndicatorsCoverageMetric;
    startedPlayers: IndicatorsCoverageMetric;
  };
  aiEffectiveness: {
    sessionsWithAi: number;
    sessionsPercent: number;
    averagePerStartedRoom: number;
  };
  averageTimePerMoveMinutes: number | null;
  modeComparison: {
    playsTogether: IndicatorsModeComparisonMetric;
    notPlaying: IndicatorsModeComparisonMetric;
    solo: IndicatorsModeComparisonMetric;
  };
  heatmaps: {
    roomCreation: IndicatorsHeatmapMetric;
    moves: IndicatorsHeatmapMetric;
  };
};

function ToggleSwitch({
  checked,
  disabled,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: checked
          ? "rgba(106, 211, 176, 0.35)"
          : "hsl(var(--temple-surface-2))",
        display: "inline-flex",
        alignItems: "center",
        padding: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 140ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: checked ? "#6ad3b0" : "rgba(255, 255, 255, 0.68)",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          transition: "transform 140ms ease, background 140ms ease",
        }}
      />
    </button>
  );
}

function IndicatorsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 18V11M12 18V6M19 18v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="5" cy="9" r="1.4" fill="currentColor" />
      <circle cx="12" cy="4" r="1.4" fill="currentColor" />
      <circle cx="19" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

function NewRoomIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5h6v2M10 11v6M14 11v6M7.5 7l1 12h7l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DASHBOARD_ONBOARDING_VERSION = "2026-02-tutorial-refresh";
const DASHBOARD_ONBOARDING_VERSION_KEY =
  "mahalilah:onboarding:dashboard:version";
const DASHBOARD_ROOMS_POLL_MS = 15_000;

const DETAIL_TAB_BY_TUTORIAL_TARGET: Partial<
  Record<DashboardTutorialTarget, RoomDetailsTab>
> = {
  "room-tab-invites": "invites",
  "room-tab-participants": "participants",
  "room-tab-timeline": "timeline",
  "room-tab-deck": "deck",
  "room-tab-aiReports": "aiReports",
};

const HOUSE_SANSKRIT_NAMES: string[] = [
  "Janma",
  "Maya",
  "Krodha",
  "Lobha",
  "Moha",
  "Mada",
  "Matsarya",
  "Irsha",
  "Dvesha",
  "Klesha",
  "Trishna",
  "Ahamkara",
  "Raga",
  "Bhaya",
  "Dukkha",
  "Samsara",
  "Tamas",
  "Rajas",
  "Sattva",
  "Vasana",
  "Karma",
  "Dharma",
  "Artha",
  "Kama",
  "Moksha",
  "Shakti",
  "Bhakti",
  "Shraddha",
  "Smriti",
  "Viveka",
  "Vairagya",
  "Tapas",
  "Svadhyaya",
  "Ishvara",
  "Ananda",
  "Karuna",
  "Mudita",
  "Upeksha",
  "Satya",
  "Ahimsa",
  "Asteya",
  "Brahmacharya",
  "Aparigraha",
  "Saucha",
  "Santosha",
  "Dhyana",
  "Samadhi",
  "Prana",
  "Tejas",
  "Ojas",
  "Manas",
  "Buddhi",
  "Chitta",
  "Atman",
  "Purusha",
  "Prakriti",
  "Nada",
  "Bindu",
  "Kala",
  "Lila",
  "Shri",
  "Lakshmi",
  "Sarasvati",
  "Durga",
  "Kali",
  "Shiva",
  "Shakti-Kundalini",
  "Purna",
];

function stripTherapeuticPromptPrefix(prompt: string | null | undefined) {
  if (!prompt) return "";
  return prompt.replace(/^Pergunta Terapêutica:\s*/i, "").trim();
}

function parseHouseKeywords(description: string | null | undefined) {
  if (!description) return [];
  return description
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getHouseDisplayInfo(houseNumber: number | null | undefined) {
  if (typeof houseNumber !== "number" || houseNumber < 1) return null;
  const house = getHouseByNumber(houseNumber);
  return {
    number: houseNumber,
    sanskrit: HOUSE_SANSKRIT_NAMES[houseNumber - 1] || "",
    portuguese: house?.title || `Casa ${houseNumber}`,
    meaning: HOUSE_MEANINGS[houseNumber] || house?.description || "",
    description: house?.description || "",
    keywords: parseHouseKeywords(house?.description),
    polarity: HOUSE_POLARITIES[houseNumber] || null,
  } satisfies HouseDisplayInfo;
}

function getDashboardTutorialSteps({
  canCreateRoom,
  hasRooms,
  canManageRoom,
}: {
  canCreateRoom: boolean;
  hasRooms: boolean;
  canManageRoom: boolean;
}): TutorialStep[] {
  const steps: TutorialStep[] = [];

  steps.push({
    title: "Indicadores do painel",
    description:
      "Use o ícone de indicadores para abrir o modal com métricas gerais (ocupação, convites, consentimento e volume de jogadas).",
    target: "toolbar-indicators",
  });

  if (canCreateRoom) {
    steps.push(
      {
        title: "Nova sala",
        description:
          'Use o ícone "+" para abrir a criação de sala sem ocupar espaço no painel principal.',
        target: "create-room",
      },
      {
        title: "Configuração da nova sala",
        description:
          "No modal você define jogadores máximos, se o terapeuta joga junto e, quando disponível no plano, o modo de terapeuta único.",
        target: "create-room-config",
      },
    );
  }

  steps.push(
    {
      title: "Filtros de sessão",
      description:
        'Use "Status", período "De/Até", "Aplicar filtros" e "Limpar" para focar rapidamente nas sessões que deseja revisar.',
      target: "filters",
    },
    {
      title: "Abas de sessões",
      description:
        'Alterne entre "Sessões criadas" e "Sessões que participei" para separar gestão de sala e acompanhamento como participante.',
      target: "sessions-tabs",
    },
  );

  if (!hasRooms) {
    steps.push({
      title: "Lista de sessões",
      description:
        "Quando a primeira sala aparecer, aqui você acompanha os cards com status, indicadores e detalhes por aba.",
      target: "sessions-list",
    });
    return steps;
  }

  steps.push({
    title: "Cabeçalho da sala",
    description:
      "Na primeira linha você encontra código, trial, status, abrir sala e exclusão; abaixo, data, ocupação, modo da sala e disponibilidade para jogadores.",
    target: "room-actions",
  });

  steps.push({
    title: "Indicadores da sala",
    description:
      "Acompanhe os chips com jogadas, rolagens, registros, cartas e IA. A seta abre e recolhe os detalhes completos da sessão.",
    target: "room-indicators",
  });

  if (canManageRoom) {
    steps.push({
      title: "Aba Convites",
      description:
        "Envie convites por e-mail, acompanhe quem aceitou e use reenviar para pendências.",
      target: "room-tab-invites",
    });
  }

  steps.push(
    {
      title: "Aba Participantes",
      description:
        "Confira consentimento, remova jogador quando necessário e registre/edite a síntese terapêutica por participante.",
      target: "room-tab-participants",
    },
    {
      title: "Aba Jornada",
      description:
        "Revise jogadas em ordem cronológica com dado, casas, atalhos, registros terapêuticos e eventos de IA.",
      target: "room-tab-timeline",
    },
    {
      title: "Aba Deck randômico",
      description:
        "Visualize cartas tiradas na sessão, incluindo tiragens fora de jogada, com filtro por participante.",
      target: "room-tab-deck",
    },
    {
      title: "Aba Relatórios IA",
      description:
        'Consulte ajudas da IA, blocos de "O Caminho até agora" e relatórios finais por participante.',
      target: "room-tab-aiReports",
    },
  );

  return steps;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseTipReportContent(content: string): ParsedTip {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.text === "string"
    ) {
      return {
        text: parsed.text,
        turnNumber:
          typeof parsed.turnNumber === "number" ? parsed.turnNumber : null,
        houseNumber:
          typeof parsed.houseNumber === "number" ? parsed.houseNumber : null,
        intention:
          typeof parsed.intention === "string" ? parsed.intention : null,
      };
    }
  } catch {
    // Compat with previous plain text payload.
  }

  return {
    text: content,
    turnNumber: null,
    houseNumber: null,
    intention: null,
  };
}

function parseProgressSummaryContent(content: string): ParsedProgressSummary {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.text === "string"
    ) {
      return {
        text: parsed.text,
        intervalStart:
          typeof parsed.intervalStart === "number" ? parsed.intervalStart : null,
        intervalEnd:
          typeof parsed.intervalEnd === "number" ? parsed.intervalEnd : null,
        summaryEveryMoves:
          typeof parsed.summaryEveryMoves === "number"
            ? parsed.summaryEveryMoves
            : null,
        intention:
          typeof parsed.intention === "string" ? parsed.intention : null,
      };
    }
  } catch {
    // Compatibilidade com payload texto puro.
  }

  return {
    text: content,
    intervalStart: null,
    intervalEnd: null,
    summaryEveryMoves: null,
    intention: null,
  };
}

function normalizeAiModalText(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getParticipantDisplayName(participant: {
  user: { name: string | null; email: string };
}) {
  return participant.user.name || participant.user.email;
}

type TutorialPopoverPosition = {
  width: number;
  height: number;
  left: number;
  top: number;
  placement: "right" | "left" | "bottom" | "top";
  arrowOffset: number;
};

function getTutorialPopoverPosition(targetRect: DOMRect | null) {
  if (!targetRect || typeof window === "undefined") {
    return null;
  }

  const margin = 14;
  const gap = 14;
  const cardWidth = Math.min(420, window.innerWidth - margin * 2);
  const cardHeight = 300;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const canRight = targetRect.right + gap + cardWidth <= viewportWidth - margin;
  const canLeft = targetRect.left - gap - cardWidth >= margin;
  const canBottom =
    targetRect.bottom + gap + cardHeight <= viewportHeight - margin;

  let left = (viewportWidth - cardWidth) / 2;
  let top = (viewportHeight - cardHeight) / 2;
  let placement: TutorialPopoverPosition["placement"] = "right";

  if (canRight) {
    placement = "right";
    left = targetRect.right + gap;
    top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
  } else if (canLeft) {
    placement = "left";
    left = targetRect.left - cardWidth - gap;
    top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
  } else if (canBottom) {
    placement = "bottom";
    left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    top = targetRect.bottom + gap;
  } else {
    placement = "top";
    left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    top = targetRect.top - cardHeight - gap;
  }

  const clampedLeft = clampNumber(
    left,
    margin,
    viewportWidth - cardWidth - margin,
  );
  const clampedTop = clampNumber(
    top,
    margin,
    viewportHeight - cardHeight - margin,
  );

  const arrowOffset =
    placement === "right" || placement === "left"
      ? clampNumber(
          targetRect.top + targetRect.height / 2 - clampedTop,
          20,
          cardHeight - 20,
        )
      : clampNumber(
          targetRect.left + targetRect.width / 2 - clampedLeft,
          20,
          cardWidth - 20,
        );

  return {
    width: cardWidth,
    height: cardHeight,
    left: clampedLeft,
    top: clampedTop,
    placement,
    arrowOffset,
  } satisfies TutorialPopoverPosition;
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("pt-BR");
}

function formatPeriodLabel(from?: string | null, to?: string | null) {
  const fromLabel = from ? formatDateTimeLabel(from).split(",")[0] : null;
  const toLabel = to ? formatDateTimeLabel(to).split(",")[0] : null;
  if (fromLabel && toLabel) return `${fromLabel} até ${toLabel}`;
  if (fromLabel) return `a partir de ${fromLabel}`;
  if (toLabel) return `até ${toLabel}`;
  return "todo o histórico";
}

function formatMetricNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function formatDurationFromMinutes(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatHourLabel(hour: number) {
  return String(hour).padStart(2, "0");
}

function getHeatmapCellBackground(value: number, max: number) {
  if (value <= 0 || max <= 0) return "rgba(255, 255, 255, 0.04)";
  const ratio = Math.min(1, value / max);
  const alpha = 0.16 + ratio * 0.62;
  return `rgba(217, 164, 65, ${alpha.toFixed(3)})`;
}

export function DashboardClient() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingTrial, setCreatingTrial] = useState(false);
  const [deletingRoomIds, setDeletingRoomIds] = useState<Record<string, boolean>>({});
  const [savingTherapistSummaryByParticipantId, setSavingTherapistSummaryByParticipantId] =
    useState<Record<string, boolean>>({});
  const [therapistSummaries, setTherapistSummaries] = useState<
    Record<string, string>
  >({});
  const [roomQuota, setRoomQuota] = useState<RoomQuota | null>(null);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [therapistPlays, setTherapistPlays] = useState(true);
  const [therapistSoloPlay, setTherapistSoloPlay] = useState(false);
  const [canUseTherapistSoloPlay, setCanUseTherapistSoloPlay] = useState(true);
  const [toasts, setToasts] = useState<DashboardToast[]>([]);
  const [canCreateRoom, setCanCreateRoom] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({});
  const [activeDetailTabs, setActiveDetailTabs] = useState<
    Record<string, RoomDetailsTab>
  >({});
  const [timelineParticipantFilters, setTimelineParticipantFilters] = useState<
    Record<string, string>
  >({});
  const [details, setDetails] = useState<
    Record<
      string,
      {
        loading: boolean;
        moves: TimelineMove[];
        aiReports: AiReport[];
        cardDraws: StandaloneCardDraw[];
        error?: string;
      }
    >
  >({});
  const [filters, setFilters] = useState<Filters>({
    status: "",
    from: "",
    to: "",
  });
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [indicatorsTab, setIndicatorsTab] = useState<IndicatorsTab>("overview");
  const [indicatorsDateFilter, setIndicatorsDateFilter] =
    useState<IndicatorsDateFilter>({ from: "", to: "" });
  const [indicatorsDateDraft, setIndicatorsDateDraft] =
    useState<IndicatorsDateFilter>({ from: "", to: "" });
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null);
  const [indicatorsData, setIndicatorsData] = useState<DashboardIndicators | null>(
    null,
  );
  const [intentionThemeModal, setIntentionThemeModal] =
    useState<IndicatorsTheme | null>(null);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [sessionsViewTab, setSessionsViewTab] =
    useState<SessionsViewTab>("created");
  const [showDashboardTutorial, setShowDashboardTutorial] = useState(false);
  const [dashboardTutorialStep, setDashboardTutorialStep] = useState(0);
  const [dashboardTutorialTargetRect, setDashboardTutorialTargetRect] =
    useState<DOMRect | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState<boolean | null>(null);
  const [trialRoomStatus, setTrialRoomStatus] = useState<string | null>(null);
  const [therapyModalEntries, setTherapyModalEntries] = useState<
    Array<
      TimelineMove["therapyEntries"][number] & {
        move: TimelineMove;
      }
    >
  >([]);
  const [aiContentModal, setAiContentModal] =
    useState<AiContentModalState | null>(null);
  const [cardPreviewModal, setCardPreviewModal] =
    useState<CardPreviewModalState | null>(null);
  const [houseMeaningModal, setHouseMeaningModal] =
    useState<HouseMeaningModalState | null>(null);
  const dashboardTutorialSteps = useMemo(
    () =>
      getDashboardTutorialSteps({
        canCreateRoom,
        hasRooms: rooms.length > 0,
        canManageRoom: rooms.some(
          (room) => room.canManage && room.status === "ACTIVE",
        ),
      }),
    [canCreateRoom, rooms],
  );

  const modalHouseInfo = houseMeaningModal
    ? getHouseDisplayInfo(houseMeaningModal.houseNumber)
    : null;
  const modalHouseQuestion = houseMeaningModal
    ? stripTherapeuticPromptPrefix(getHousePrompt(houseMeaningModal.houseNumber))
    : "";
  const modalHouseTherapeutic = houseMeaningModal
    ? HOUSE_THERAPEUTIC_TEXTS[houseMeaningModal.houseNumber] || null
    : null;

  const openHouseMeaningModal = ({
    houseNumber,
    title,
    subtitle,
    jumpContext,
  }: HouseMeaningModalState) => {
    setHouseMeaningModal({ houseNumber, title, subtitle, jumpContext });
  };

  const openCardPreview = useCallback(
    ({
      card,
      title,
      subtitle,
    }: {
      card: CardPreviewModalState["card"];
      title: string;
      subtitle?: string;
    }) => {
      setCardPreviewModal({ card, title, subtitle });
    },
    [],
  );

  const pushToast = useCallback(
    (message: string, kind: DashboardToastKind = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      setToasts((prev) => [...prev, { id, message, kind }].slice(-3));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 2600);
    },
    [],
  );

  const removeToast = (toastId: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const loadRooms = useCallback(
    async (override?: Partial<Filters>, options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);
      if (!silent) {
        setLoading(true);
      }
      const activeFilters = {
        status: override?.status ?? filters.status,
        from: override?.from ?? filters.from,
        to: override?.to ?? filters.to,
      };

      const params = new URLSearchParams();
      if (activeFilters.status) params.set("status", activeFilters.status);
      if (activeFilters.from) params.set("from", activeFilters.from);
      if (activeFilters.to) params.set("to", activeFilters.to);

      try {
        const res = await fetch(
          `/api/mahalilah/rooms${params.toString() ? `?${params.toString()}` : ""}`,
        );
        if (!res.ok) {
          if (!silent) {
            pushToast("Não foi possível carregar as salas.", "error");
          }
          return;
        }
        const data = await res.json();
        const nextRooms = data.rooms || [];
        setCurrentUserId(data.currentUserId || null);
        setRooms(nextRooms);
        setTherapistSummaries(
          nextRooms.reduce(
            (acc: Record<string, string>, room: Room) => {
              room.participants.forEach((participant) => {
                acc[participant.id] = participant.therapistSummary || "";
              });
              return acc;
            },
            {} as Record<string, string>,
          ),
        );
        setRoomQuota(data.roomQuota || null);
        setCanCreateRoom(Boolean(data.canCreateRoom));
        setCanUseTherapistSoloPlay(Boolean(data.canUseTherapistSoloPlay));
        if (!data.canUseTherapistSoloPlay) {
          setTherapistSoloPlay(false);
        }
        setHasUsedTrial(Boolean(data.hasUsedTrial));
        setTrialRoomStatus(data.trialRoomStatus || null);
      } catch {
        if (!silent) {
          pushToast("Não foi possível carregar as salas.", "error");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [filters, pushToast],
  );

  const loadIndicators = useCallback(
    async (override?: Partial<IndicatorsDateFilter>) => {
      const activeFilter: IndicatorsDateFilter = {
        from: override?.from ?? indicatorsDateFilter.from,
        to: override?.to ?? indicatorsDateFilter.to,
      };
      setIndicatorsDateFilter(activeFilter);
      setIndicatorsLoading(true);
      setIndicatorsError(null);

      const params = new URLSearchParams();
      if (activeFilter.from) params.set("from", activeFilter.from);
      if (activeFilter.to) params.set("to", activeFilter.to);

      try {
        const res = await fetch(
          `/api/mahalilah/dashboard/indicators${params.toString() ? `?${params.toString()}` : ""}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const message =
            payload.error || "Não foi possível carregar os indicadores.";
          setIndicatorsError(message);
          return;
        }

        const payload = await res.json().catch(() => ({}));
        setIndicatorsData(payload.indicators || null);
      } catch {
        setIndicatorsError("Não foi possível carregar os indicadores.");
      } finally {
        setIndicatorsLoading(false);
      }
    },
    [indicatorsDateFilter.from, indicatorsDateFilter.to],
  );

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    let pollingInFlight = false;

    const runSilentRefresh = async () => {
      if (pollingInFlight) return;
      pollingInFlight = true;
      try {
        await loadRooms(undefined, { silent: true });
      } finally {
        pollingInFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void runSilentRefresh();
    }, DASHBOARD_ROOMS_POLL_MS);

    const handleFocusOrVisible = () => {
      if (document.visibilityState !== "visible") return;
      void runSilentRefresh();
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [loadRooms]);

  useEffect(() => {
    if (!isIndicatorsModalOpen) return;
    if (indicatorsLoading) return;
    if (indicatorsData) return;
    void loadIndicators(indicatorsDateFilter);
  }, [
    isIndicatorsModalOpen,
    indicatorsLoading,
    indicatorsData,
    indicatorsDateFilter,
    loadIndicators,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadOnboarding = async () => {
      try {
        const res = await fetch("/api/mahalilah/onboarding", {
          cache: "no-store",
        });
        if (!res.ok) return;

        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;

        const hasCurrentVersion =
          typeof window !== "undefined" &&
          window.localStorage.getItem(DASHBOARD_ONBOARDING_VERSION_KEY) ===
            DASHBOARD_ONBOARDING_VERSION;

        if (!payload.dashboardSeen || !hasCurrentVersion) {
          setDashboardTutorialStep(0);
          setShowDashboardTutorial(true);
        }
      } catch {
        // Keep onboarding closed if API is temporarily unavailable.
      }
    };

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showDashboardTutorial) return;
    const currentStep = dashboardTutorialSteps[dashboardTutorialStep];
    if (!currentStep) return;
    const selector = `[data-tour-dashboard="${currentStep.target}"]`;
    const targetEl = document.querySelector<HTMLElement>(selector);
    if (!targetEl) return;

    targetEl.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [
    showDashboardTutorial,
    dashboardTutorialStep,
    dashboardTutorialSteps,
    openRooms,
  ]);

  useEffect(() => {
    if (!showDashboardTutorial) {
      setDashboardTutorialTargetRect(null);
      return;
    }

    const currentStep = dashboardTutorialSteps[dashboardTutorialStep];
    if (!currentStep) {
      setDashboardTutorialTargetRect(null);
      return;
    }
    const selector = `[data-tour-dashboard="${currentStep.target}"]`;

    const updateTargetRect = () => {
      const targetEl = document.querySelector<HTMLElement>(selector);
      if (!targetEl) {
        setDashboardTutorialTargetRect(null);
        return;
      }

      setDashboardTutorialTargetRect(targetEl.getBoundingClientRect());
    };

    let rafId = window.requestAnimationFrame(updateTargetRect);
    const handleViewportChange = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [
    showDashboardTutorial,
    dashboardTutorialStep,
    dashboardTutorialSteps,
    rooms.length,
    openRooms,
  ]);

  useEffect(() => {
    if (!showDashboardTutorial) return;
    if (dashboardTutorialSteps.length === 0) return;
    setDashboardTutorialStep((prev) =>
      Math.min(prev, dashboardTutorialSteps.length - 1),
    );
  }, [showDashboardTutorial, dashboardTutorialSteps.length]);

  const finishDashboardTutorial = async () => {
    setShowDashboardTutorial(false);
    setIsCreateRoomModalOpen(false);
    try {
      window.localStorage.setItem(
        DASHBOARD_ONBOARDING_VERSION_KEY,
        DASHBOARD_ONBOARDING_VERSION,
      );
    } catch {
      // no-op
    }
    await fetch("/api/mahalilah/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "dashboard" }),
    }).catch(() => null);
  };

  const handleCreateRoom = async () => {
    if (isLimitedQuotaExhausted) {
      pushToast(
        "Você atingiu o limite de salas deste período no plano limitado.",
        "warning",
      );
      return;
    }

    setCreating(true);
    const res = await fetch("/api/mahalilah/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxParticipants, therapistPlays, therapistSoloPlay }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao criar sala.", "error");
      setCreating(false);
      return;
    }

    const payload = await res.json().catch(() => ({}));
    const roomCode = payload?.room?.code;
    pushToast(
      roomCode
        ? `Sala ${roomCode} criada com sucesso.`
        : "Sala criada com sucesso.",
      "success",
    );
    await loadRooms();
    setCreating(false);
    setIsCreateRoomModalOpen(false);
  };

  const handleCreateTrialRoom = async () => {
    setCreatingTrial(true);
    const res = await fetch("/api/mahalilah/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trial: true }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao criar sala trial.", "error");
      setCreatingTrial(false);
      return;
    }

    const payload = await res.json().catch(() => ({}));
    const roomCode = payload?.room?.code;
    pushToast(
      roomCode
        ? `Sala trial ${roomCode} criada com sucesso.`
        : "Sala trial criada com sucesso.",
      "success",
    );
    if (roomCode) {
      window.setTimeout(() => {
        window.location.href = `/rooms/${roomCode}`;
      }, 450);
      return;
    }

    await loadRooms();
    setCreatingTrial(false);
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!room.canDelete) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a sala ${room.code}? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setDeletingRoomIds((prev) => ({ ...prev, [room.id]: true }));
    const res = await fetch(`/api/mahalilah/rooms/${room.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao excluir sala.", "error");
      setDeletingRoomIds((prev) => {
        const next = { ...prev };
        delete next[room.id];
        return next;
      });
      return;
    }

    pushToast("Sala excluída com sucesso.", "success");
    await loadRooms();
    setDeletingRoomIds((prev) => {
      const next = { ...prev };
      delete next[room.id];
      return next;
    });
  };

  const handleToggleRoomPlayerVisibility = async (
    room: Room,
    isVisibleToPlayers: boolean,
  ) => {
    if (!room.canManage) return;

    const res = await fetch(`/api/mahalilah/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisibleToPlayers }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao atualizar visualização da sala.", "error");
      return;
    }

    pushToast(
      isVisibleToPlayers
        ? "Sessão disponibilizada para visualização do jogador."
        : "Sessão ocultada da visualização do jogador.",
      "success",
    );
    await loadRooms();
  };

  const handleSaveTherapistSummary = async (
    room: Room,
    participantId: string,
  ) => {
    if (room.viewerRole !== "THERAPIST") return;
    const therapistSummary = therapistSummaries[participantId] ?? "";

    setSavingTherapistSummaryByParticipantId((prev) => ({
      ...prev,
      [participantId]: true,
    }));
    try {
      const res = await fetch(
        `/api/mahalilah/rooms/${room.id}/participants/${participantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ therapistSummary }),
        },
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        pushToast(payload.error || "Erro ao salvar síntese do terapeuta.", "error");
        return;
      }

      const payload = await res.json().catch(() => ({}));
      const updatedSummary =
        typeof payload?.participant?.therapistSummary === "string"
          ? payload.participant.therapistSummary
          : "";

      setRooms((prev) =>
        prev.map((item) =>
          item.id === room.id
            ? {
                ...item,
                participants: item.participants.map((participant) =>
                  participant.id === participantId
                    ? { ...participant, therapistSummary: updatedSummary }
                    : participant,
                ),
              }
            : item,
        ),
      );
      setTherapistSummaries((prev) => ({
        ...prev,
        [participantId]: updatedSummary,
      }));
      pushToast("Síntese do terapeuta salva.", "success");
    } catch {
      pushToast("Erro ao salvar síntese do terapeuta.", "error");
    } finally {
      setSavingTherapistSummaryByParticipantId((prev) => ({
        ...prev,
        [participantId]: false,
      }));
    }
  };

  const handleSendInvites = async (
    roomId: string,
    overrideEmails?: string[],
  ) => {
    const raw = inviteEmails[roomId] || "";
    const emails =
      overrideEmails ||
      raw
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

    if (!emails.length) return;

    const res = await fetch(`/api/mahalilah/rooms/${roomId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao enviar convites.", "error");
      return;
    }

    setInviteEmails((prev) => ({ ...prev, [roomId]: "" }));
    pushToast("Convites enviados com sucesso.", "success");
    await loadRooms();
  };

  const handleRemoveParticipant = async (
    roomId: string,
    participantId: string,
  ) => {
    const res = await fetch(
      `/api/mahalilah/rooms/${roomId}/participants/${participantId}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao remover participante.", "error");
      return;
    }

    pushToast("Participante removido.", "success");
    await loadRooms();
  };

  const handleExport = async (roomId: string, participantId?: string) => {
    const params = new URLSearchParams({ format: "pdf" });
    if (participantId) params.set("participantId", participantId);
    const res = await fetch(`/api/mahalilah/rooms/${roomId}/export?${params.toString()}`);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao exportar sessão.", "error");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = participantId
      ? `mahalilah_${roomId}_${participantId}.pdf`
      : `mahalilah_${roomId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Relatório em PDF exportado com sucesso.", "success");
  };

  const loadTimeline = useCallback(async (roomId: string) => {
    setDetails((prev) => ({
      ...prev,
      [roomId]: {
        loading: true,
        moves: prev[roomId]?.moves || [],
        aiReports: prev[roomId]?.aiReports || [],
        cardDraws: prev[roomId]?.cardDraws || [],
      },
    }));

    const res = await fetch(`/api/mahalilah/rooms/${roomId}/timeline`);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setDetails((prev) => ({
        ...prev,
        [roomId]: {
          loading: false,
          moves: [],
          aiReports: [],
          cardDraws: [],
          error: payload.error || "Erro ao carregar jornada.",
        },
      }));
      return;
    }

    const data = await res.json();
    setDetails((prev) => ({
      ...prev,
      [roomId]: {
        loading: false,
        moves: data.moves || [],
        aiReports: data.aiReports || [],
        cardDraws: data.cardDraws || [],
      },
    }));
  }, []);

  useEffect(() => {
    if (!showDashboardTutorial) return;
    const currentStep = dashboardTutorialSteps[dashboardTutorialStep];
    if (!currentStep) return;

    const isRoomScopedStep = currentStep.target.startsWith("room-");
    const hasCreatedRooms = rooms.some((room) => room.canManage);
    if (isRoomScopedStep && hasCreatedRooms && sessionsViewTab !== "created") {
      setSessionsViewTab("created");
      return;
    }

    const shouldOpenCreateRoomModal =
      currentStep.target === "create-room-config" && canCreateRoom;
    if (shouldOpenCreateRoomModal && !isCreateRoomModalOpen) {
      setIsCreateRoomModalOpen(true);
    }
    if (!shouldOpenCreateRoomModal && isCreateRoomModalOpen) {
      setIsCreateRoomModalOpen(false);
    }

    const targetTab = DETAIL_TAB_BY_TUTORIAL_TARGET[currentStep.target];
    if (!targetTab) return;

    const tutorialRooms =
      sessionsViewTab === "created"
        ? rooms.filter((room) => room.canManage)
        : rooms.filter((room) => !room.canManage);
    const targetRoom =
      currentStep.target === "room-tab-invites"
        ? tutorialRooms.find((room) => room.canManage && room.status === "ACTIVE") ||
          null
        : tutorialRooms[0] || null;
    if (!targetRoom) return;
    const targetRoomId = targetRoom.id;

    if (!openRooms[targetRoomId]) {
      setOpenRooms((prev) => ({ ...prev, [targetRoomId]: true }));
    }
    if (activeDetailTabs[targetRoomId] !== targetTab) {
      setActiveDetailTabs((prev) => ({ ...prev, [targetRoomId]: targetTab }));
    }
    if (!details[targetRoomId]) {
      void loadTimeline(targetRoomId);
    }
  }, [
    showDashboardTutorial,
    dashboardTutorialStep,
    dashboardTutorialSteps,
    canCreateRoom,
    isCreateRoomModalOpen,
    sessionsViewTab,
    rooms,
    openRooms,
    activeDetailTabs,
    details,
    loadTimeline,
  ]);

  const toggleRoom = (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);
    const canManageInvites = room?.canManage && room.status === "ACTIVE";
    const defaultTab: RoomDetailsTab = canManageInvites
      ? "invites"
      : "participants";

    setOpenRooms((prev) => {
      const nextOpen = !prev[roomId];
      if (nextOpen && !details[roomId]) {
        void loadTimeline(roomId);
      }
      return { ...prev, [roomId]: nextOpen };
    });
    setActiveDetailTabs((prev) =>
      prev[roomId] ? prev : { ...prev, [roomId]: defaultTab },
    );
  };

  const statusClass = (status: string) => {
    if (status === "ACTIVE") return "status-pill active";
    if (status === "CLOSED") return "status-pill closed";
    if (status === "COMPLETED") return "status-pill completed";
    return "status-pill";
  };

  const participantRoleLabel = (role: string) => {
    if (role === "THERAPIST") return "Terapeuta";
    if (role === "PLAYER") return "Jogador";
    return role;
  };

  const createdRooms = rooms.filter((room) => room.canManage);
  const participatedRooms = rooms.filter((room) => !room.canManage);
  const visibleRooms =
    sessionsViewTab === "created" ? createdRooms : participatedRooms;
  const tutorialPrimaryRoomId = visibleRooms[0]?.id || null;
  const tutorialInvitesRoomId =
    visibleRooms.find((room) => room.canManage && room.status === "ACTIVE")?.id ||
    null;
  const hasActiveFilters = Boolean(filters.status || filters.from || filters.to);

  const roomCards = visibleRooms.map((room) => {
    const isOpen = !!openRooms[room.id];
    const isTutorialPrimaryRoom = room.id === tutorialPrimaryRoomId;
    const isTutorialInvitesRoom = room.id === tutorialInvitesRoomId;
    const canManageInvites = room.canManage && room.status === "ACTIVE";
    const requestedTab = activeDetailTabs[room.id];
    const activeTab: RoomDetailsTab =
      !canManageInvites && requestedTab === "invites"
        ? "participants"
        : requestedTab || (canManageInvites ? "invites" : "participants");
    const roomDetails = details[room.id];
    const selectedParticipantId = timelineParticipantFilters[room.id] || "";
    const isTherapistViewer = room.viewerRole === "THERAPIST";
    const currentUserParticipant = room.participants.find(
      (participant) => participant.user.id === currentUserId,
    );
    const timelineFilterParticipants = isTherapistViewer
      ? room.participants
      : currentUserParticipant
        ? [currentUserParticipant]
        : [];
    const effectiveSelectedParticipantId = isTherapistViewer
      ? selectedParticipantId
      : currentUserParticipant?.id || "__no-participant__";
    const playerParticipants = room.participants.filter(
      (participant) => participant.role === "PLAYER",
    );
    const therapistParticipants = room.participants.filter(
      (participant) => participant.role === "THERAPIST",
    );
    const hasNonTherapistParticipants = room.participants.some(
      (participant) => participant.role !== "THERAPIST",
    );
    const exportableParticipants =
      room.therapistSoloPlay
        ? room.viewerRole === "THERAPIST"
          ? therapistParticipants
          : []
        : room.viewerRole === "THERAPIST"
          ? room.therapistPlays
            ? [...playerParticipants, ...therapistParticipants]
            : playerParticipants
          : currentUserParticipant
            ? [currentUserParticipant]
            : [];

    const visibleParticipants = room.canManage
      ? room.participants
      : currentUserParticipant
        ? [currentUserParticipant]
        : [];

    const filteredMoves = (roomDetails?.moves || []).filter((move) =>
      effectiveSelectedParticipantId
        ? move.participant.id === effectiveSelectedParticipantId
        : true,
    );

    const deckHistoryByMove = [
      ...filteredMoves
        .filter((move) => move.cardDraws.length > 0)
        .map((move) => ({
          key: `move:${move.id}`,
          createdAt: move.cardDraws[0]?.createdAt || move.createdAt,
          turnNumber: move.turnNumber,
          drawnBy: move.participant,
          draws: move.cardDraws,
        })),
      ...(roomDetails?.cardDraws || [])
        .filter((draw) => !draw.moveId)
        .filter((draw) =>
          effectiveSelectedParticipantId
            ? draw.drawnBy.id === effectiveSelectedParticipantId
            : true,
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((draw) => ({
          key: `standalone:${draw.id}`,
          createdAt: draw.createdAt,
          turnNumber: null as number | null,
          drawnBy: draw.drawnBy,
          draws: [draw],
        })),
    ].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const filteredAiReports = (roomDetails?.aiReports || []).filter((report) =>
      effectiveSelectedParticipantId
        ? report.participant?.id === effectiveSelectedParticipantId
        : true,
    );

    const filteredTipReports = filteredAiReports.filter(
      (report) => report.kind === "TIP",
    );

    const filteredFinalReports = filteredAiReports.filter(
      (report) => report.kind === "FINAL",
    );

    const filteredProgressReports = filteredAiReports.filter(
      (report) => report.kind === "PROGRESS",
    );

    const timelineTipsByMoveKey = new Map<
      string,
      Array<{ report: AiReport; parsed: ParsedTip }>
    >();
    filteredTipReports.forEach((report) => {
      const parsed = parseTipReportContent(report.content);
      if (!report.participant || parsed.turnNumber === null) return;
      const key = `${report.participant.id}:${parsed.turnNumber}`;
      const current = timelineTipsByMoveKey.get(key) || [];
      current.push({ report, parsed });
      timelineTipsByMoveKey.set(key, current);
    });

    const finalReportsByParticipantId = new Map<string, AiReport[]>();
    filteredFinalReports.forEach((report) => {
      if (!report.participant) return;
      const current = finalReportsByParticipantId.get(report.participant.id) || [];
      current.push(report);
      finalReportsByParticipantId.set(report.participant.id, current);
    });
    finalReportsByParticipantId.forEach((reports) => {
      reports.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
    const indicatorStatsByParticipant =
      room.viewerRole === "THERAPIST"
        ? room.stats.byParticipant
        : currentUserParticipant
          ? room.stats.byParticipant.filter(
              (participantStats) =>
                participantStats.participantId === currentUserParticipant.id,
            )
          : [];
    const shouldShowNewChip =
      Boolean(room.isAutoCreatedFromCheckout) &&
      room.stats.rollsTotal === 0 &&
      room.stats.moves === 0;
    const isDeletingRoom = Boolean(deletingRoomIds[room.id]);
    const roomModeLabel = room.therapistSoloPlay
      ? "Terapeuta joga sozinho (demais visualizam)"
      : room.therapistPlays
        ? "Terapeuta joga junto"
        : "Terapeuta conduz sem jogar";
    return (
      <div
        key={room.id}
        className="card dashboard-room-card"
        style={{ display: "grid", gap: 14 }}
      >
        <div
          className="dashboard-room-header"
          data-tour-dashboard={isTutorialPrimaryRoom ? "room-actions" : undefined}
        >
          <div
            className="dashboard-room-topline"
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="badge">Sala {room.code}</div>
              {room.isTrial && <span className="pill">Trial</span>}
              {shouldShowNewChip && <span className="pill pill-new-room">Novo</span>}
              <span className={`pill ${statusClass(room.status)}`}>
                {room.status}
              </span>
            </div>
            <div
              className="dashboard-room-inline-actions"
            >
              {room.status === "ACTIVE" && (
                <a href={`/rooms/${room.code}`} className="btn-secondary">
                  Abrir sala
                </a>
              )}
              {room.canDelete && (
                <button
                  className="btn-secondary"
                  onClick={() => handleDeleteRoom(room)}
                  disabled={isDeletingRoom}
                  aria-label="Excluir sala"
                  title="Excluir sala"
                  style={{
                    borderColor: "rgba(255, 107, 107, 0.45)",
                    color: "#ff9f9f",
                  }}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>

          <div className="dashboard-room-subline">
            <span className="dashboard-room-meta-chip">
              {new Date(room.createdAt).toLocaleString("pt-BR")}
            </span>
            <span className="dashboard-room-meta-chip">
              {room.participantsCount}/{room.maxParticipants} jogadores
            </span>
            <div className="dashboard-room-mode-row">
              <span className="dashboard-room-meta-chip">
                {roomModeLabel}
              </span>
              {room.canManage && hasNonTherapistParticipants && (
                <label
                  className="small-muted dashboard-room-visibility-toggle"
                >
                  <ToggleSwitch
                    checked={Boolean(room.isVisibleToPlayers)}
                    ariaLabel="Disponibilizar para jogadores"
                    onToggle={() =>
                      handleToggleRoomPlayerVisibility(
                        room,
                        !Boolean(room.isVisibleToPlayers),
                      )
                    }
                  />
                  <span>Disponibilizar para jogadores</span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div
          className="grid dashboard-room-indicators"
          style={{ gap: 8 }}
          data-tour-dashboard={isTutorialPrimaryRoom ? "room-indicators" : undefined}
        >
          <div className="dashboard-room-indicators-row">
            {indicatorStatsByParticipant.length === 0 ? (
              <span className="small-muted">
                Sem indicadores por jogador nesta sala.
              </span>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {indicatorStatsByParticipant.map((participantStats) => (
                  <div
                    key={participantStats.participantId}
                    className="notice"
                    style={{
                      display: "grid",
                      gap: 6,
                      borderColor:
                        participantStats.role === "THERAPIST"
                          ? "rgba(217, 164, 65, 0.45)"
                          : "var(--border)",
                    }}
                  >
                    <strong style={{ fontSize: 12 }}>
                      {participantStats.participantName}
                    </strong>
                    <div
                      className="dashboard-room-pill-row"
                      style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                    >
                      <span className="pill">Jogadas: {participantStats.moves}</span>
                      <span className="pill">
                        Rolagens: {participantStats.rollsTotal}
                      </span>
                      <span className="pill">
                        Até iniciar: {participantStats.rollsUntilStart}
                      </span>
                      <span className="pill">
                        Registros: {participantStats.therapyEntries}
                      </span>
                      <span className="pill">
                        Cartas: {participantStats.cardDraws}
                      </span>
                      <span className="pill">
                        Relatórios IA: {participantStats.aiReports}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn-secondary dashboard-room-expand-btn"
            onClick={() => toggleRoom(room.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Recolher detalhes" : "Expandir detalhes"}
            title={isOpen ? "Recolher detalhes" : "Expandir detalhes"}
          >
            {isOpen ? "▲" : "▼"}
          </button>
        </div>

        {isOpen && (
          <div
            className="grid dashboard-room-details"
            style={{
              gap: 12,
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
            }}
          >
            <div
              className="dashboard-room-tabs"
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              {canManageInvites && (
                <button
                  className={
                    activeTab === "invites" ? "btn-primary" : "btn-secondary"
                  }
                  onClick={() =>
                    setActiveDetailTabs((prev) => ({
                      ...prev,
                      [room.id]: "invites",
                    }))
                  }
                  data-tour-dashboard={
                    isTutorialInvitesRoom ? "room-tab-invites" : undefined
                  }
                >
                  Convites
                </button>
              )}
              <button
                className={
                  activeTab === "participants" ? "btn-primary" : "btn-secondary"
                }
                onClick={() =>
                  setActiveDetailTabs((prev) => ({
                    ...prev,
                    [room.id]: "participants",
                  }))
                }
                data-tour-dashboard={
                  isTutorialPrimaryRoom ? "room-tab-participants" : undefined
                }
              >
                Participantes
              </button>
              <button
                className={
                  activeTab === "timeline" ? "btn-primary" : "btn-secondary"
                }
                onClick={() =>
                  setActiveDetailTabs((prev) => ({
                    ...prev,
                    [room.id]: "timeline",
                  }))
                }
                data-tour-dashboard={
                  isTutorialPrimaryRoom ? "room-tab-timeline" : undefined
                }
              >
                Jornada
              </button>
              <button
                className={
                  activeTab === "deck" ? "btn-primary" : "btn-secondary"
                }
                onClick={() =>
                  setActiveDetailTabs((prev) => ({
                    ...prev,
                    [room.id]: "deck",
                  }))
                }
                data-tour-dashboard={
                  isTutorialPrimaryRoom ? "room-tab-deck" : undefined
                }
              >
                Deck randômico
              </button>
              <button
                className={
                  activeTab === "aiReports" ? "btn-primary" : "btn-secondary"
                }
                onClick={() =>
                  setActiveDetailTabs((prev) => ({
                    ...prev,
                    [room.id]: "aiReports",
                  }))
                }
                data-tour-dashboard={
                  isTutorialPrimaryRoom ? "room-tab-aiReports" : undefined
                }
              >
                Relatórios IA
              </button>
            </div>

            {canManageInvites && activeTab === "invites" && (
              <>
                <div className="grid" style={{ gap: 10 }}>
                  <strong>Convites</strong>
                  {room.invites.length === 0 ? (
                    <span className="small-muted">Nenhum convite enviado.</span>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {room.invites.map((invite) => (
                        <div
                          key={invite.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            background: "hsl(var(--temple-surface-2))",
                          }}
                        >
                          <div style={{ display: "grid", gap: 2 }}>
                            <strong style={{ fontSize: 13 }}>
                              {invite.email}
                            </strong>
                            <span className="small-muted">
                              Enviado em{" "}
                              {new Date(invite.sentAt).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className="pill"
                              style={
                                invite.acceptedAt
                                  ? {
                                      background: "rgba(106, 211, 176, 0.18)",
                                      borderColor: "rgba(106, 211, 176, 0.4)",
                                      color: "#9fe6cc",
                                    }
                                  : {
                                      background: "rgba(241, 213, 154, 0.2)",
                                      borderColor: "rgba(217, 164, 65, 0.45)",
                                      color: "#f1d59a",
                                    }
                              }
                            >
                              {invite.acceptedAt ? "Aceito" : "Pendente"}
                            </span>
                            {!invite.acceptedAt && (
                              <button
                                className="btn-secondary px-3 py-1 text-xs"
                                onClick={() =>
                                  handleSendInvites(room.id, [invite.email])
                                }
                              >
                                Reenviar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Enviar convites (separe por vírgula)</span>
                    <input
                      type="text"
                      value={inviteEmails[room.id] || ""}
                      onChange={(event) =>
                        setInviteEmails((prev) => ({
                          ...prev,
                          [room.id]: event.target.value,
                        }))
                      }
                      placeholder="jogador1@email.com, jogador2@email.com"
                    />
                  </label>
                  <button
                    className="btn-secondary w-fit"
                    onClick={() => handleSendInvites(room.id)}
                  >
                    Enviar convites
                  </button>
                </div>
              </>
            )}

            {activeTab === "participants" && (
              <div className="grid" style={{ gap: 10 }}>
                <strong>Participantes</strong>
                <div style={{ display: "grid", gap: 6 }}>
                  {visibleParticipants.map((participant) => {
                    const isTherapist = participant.role === "THERAPIST";
                    const canEditParticipantSummary =
                      room.viewerRole === "THERAPIST";
                    const participantSummaryValue =
                      therapistSummaries[participant.id] ??
                      participant.therapistSummary ??
                      "";
                    const isSavingParticipantSummary = Boolean(
                      savingTherapistSummaryByParticipantId[participant.id],
                    );

                    return (
                      <div
                        key={participant.id}
                        style={{
                          display: "grid",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: isTherapist
                            ? "1px solid rgba(217, 164, 65, 0.45)"
                            : "1px solid var(--border)",
                          background: isTherapist
                            ? "linear-gradient(160deg, rgba(217, 164, 65, 0.12) 0%, hsl(var(--temple-surface-2)) 80%)"
                            : "hsl(var(--temple-surface-2))",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "grid", gap: 2 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <strong>
                                {participant.user.name || participant.user.email}
                              </strong>
                              {isTherapist ? (
                                <span
                                  className="pill"
                                  style={{
                                    background: "rgba(217, 164, 65, 0.2)",
                                    borderColor: "rgba(217, 164, 65, 0.5)",
                                    color: "#f1d59a",
                                  }}
                                >
                                  Terapeuta
                                </span>
                              ) : (
                                <span className="small-muted">
                                  {participantRoleLabel(participant.role)}
                                </span>
                              )}
                            </div>
                            {!participant.consentAcceptedAt && (
                              <span className="small-muted">
                                Consentimento pendente
                              </span>
                            )}
                          </div>
                          {room.canManage && participant.role === "PLAYER" && (
                            <button
                              className="btn-secondary px-3 py-1 text-xs"
                              onClick={() =>
                                handleRemoveParticipant(room.id, participant.id)
                              }
                            >
                              Remover
                            </button>
                          )}
                        </div>

                        {canEditParticipantSummary && (
                          <div className="notice" style={{ display: "grid", gap: 8 }}>
                            <strong style={{ fontSize: 12 }}>
                              Síntese terapêutica deste jogador
                            </strong>
                            <textarea
                              rows={4}
                              maxLength={8000}
                              value={participantSummaryValue}
                              onChange={(event) =>
                                setTherapistSummaries((prev) => ({
                                  ...prev,
                                  [participant.id]: event.target.value,
                                }))
                              }
                              placeholder="Registre os principais pontos para este jogador."
                            />
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                className="btn-secondary"
                                disabled={isSavingParticipantSummary}
                                onClick={() =>
                                  handleSaveTherapistSummary(room, participant.id)
                                }
                              >
                                {isSavingParticipantSummary
                                  ? "Salvando..."
                                  : "Salvar síntese"}
                              </button>
                              <button
                                className="btn-ghost"
                                disabled={isSavingParticipantSummary}
                                onClick={() =>
                                  setTherapistSummaries((prev) => ({
                                    ...prev,
                                    [participant.id]: "",
                                  }))
                                }
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <strong>Jornada</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {isTherapistViewer && timelineFilterParticipants.length > 1 && (
                      <select
                        value={effectiveSelectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {timelineFilterParticipants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {roomDetails?.loading ? (
                  <span className="small-muted">Carregando jornada...</span>
                ) : roomDetails?.error ? (
                  <span className="notice">{roomDetails.error}</span>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {filteredMoves.length === 0 ? (
                      <span className="small-muted">
                        {effectiveSelectedParticipantId
                          ? "Nenhuma jogada para o jogador selecionado."
                          : "Ainda não há jogadas."}
                      </span>
                    ) : (
                      filteredMoves.map((move) => {
                        const hasJump =
                          move.appliedJumpFrom !== null &&
                          move.appliedJumpTo !== null;
                        const movementText = !hasJump
                          ? `Jogada #${move.turnNumber} • Dado ${move.diceValue} • ${move.fromPos} → ${move.toPos}`
                          : `Jogada #${move.turnNumber} • Dado ${move.diceValue} • ${move.fromPos} → ${move.appliedJumpFrom} • atalho (${move.appliedJumpTo! > move.appliedJumpFrom! ? "subida" : "descida"}): ${move.appliedJumpTo}`;
                        const moveTips =
                          timelineTipsByMoveKey.get(
                            `${move.participant.id}:${move.turnNumber}`,
                          ) || [];

                        return (
                          <div
                            key={move.id}
                            className="notice"
                            style={{ display: "grid", gap: 4 }}
                          >
                            <strong style={{ fontSize: 12 }}>
                              {move.participant.user.name ||
                                move.participant.user.email}
                            </strong>
                            <button
                              className="btn-secondary"
                              style={{
                                justifyContent: "flex-start",
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                padding: "6px 8px",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                              onClick={() =>
                                openHouseMeaningModal({
                                  houseNumber: hasJump
                                    ? move.appliedJumpTo!
                                    : move.toPos,
                                  title: `Significado da casa ${hasJump ? move.appliedJumpTo : move.toPos}`,
                                  subtitle: !hasJump
                                    ? `Jogada #${move.turnNumber} • Dado ${move.diceValue}`
                                    : `Jogada #${move.turnNumber} • Dado ${move.diceValue} • Atalho ${move.appliedJumpFrom} ${move.appliedJumpTo! > move.appliedJumpFrom! ? "↗" : "↘"} ${move.appliedJumpTo}`,
                                  jumpContext: hasJump
                                    ? {
                                        from: move.appliedJumpFrom!,
                                        to: move.appliedJumpTo!,
                                        isUp:
                                          move.appliedJumpTo! >
                                          move.appliedJumpFrom!,
                                      }
                                    : undefined,
                                })
                              }
                            >
                              {movementText}
                            </button>
                            <span className="small-muted">
                              {new Date(move.createdAt).toLocaleString("pt-BR")}
                            </span>
                            {move.cardDraws.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  overflowX: "auto",
                                  paddingBottom: 2,
                                }}
                              >
                                {move.cardDraws.map((draw) => {
                                  const card = draw.card;
                                  return (
                                    <div key={draw.id}>
                                      {card ? (
                                        <button
                                          className="btn-secondary"
                                          style={{
                                            padding: 0,
                                            borderRadius: 9,
                                            overflow: "hidden",
                                            width: 66,
                                            minWidth: 66,
                                            height: 92,
                                            borderColor: "rgba(217, 164, 65, 0.3)",
                                            background: "rgba(9, 15, 24, 0.7)",
                                          }}
                                          onClick={() =>
                                            openCardPreview({
                                              card,
                                              title: `Carta #${card.cardNumber}`,
                                              subtitle: `Jogada #${move.turnNumber}`,
                                            })
                                          }
                                        >
                                          <img
                                            src={card.imageUrl}
                                            alt={`Carta ${card.cardNumber}`}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </button>
                                      ) : (
                                        <span className="small-muted">
                                          Carta(s): {draw.cards.join(", ")}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {move.therapyEntries.length > 0 && (
                              <button
                                className="btn-secondary"
                                style={{ justifyContent: "flex-start" }}
                                onClick={() =>
                                  setTherapyModalEntries(
                                    move.therapyEntries.map((entry) => ({
                                      ...entry,
                                      move,
                                    })),
                                  )
                                }
                              >
                                Ver registro ({move.therapyEntries.length})
                              </button>
                            )}
                            {moveTips.length > 0 && (
                              <button
                                className="btn-secondary"
                                style={{ justifyContent: "flex-start" }}
                                onClick={() => {
                                  const orderedMoveTips = [...moveTips].sort(
                                    (a, b) =>
                                      new Date(a.report.createdAt).getTime() -
                                      new Date(b.report.createdAt).getTime(),
                                  );
                                  const modalEntries = orderedMoveTips.map(
                                    (tip, index) => ({
                                      label: `Ajuda ${index + 1}`,
                                      subtitle: `Jogada #${move.turnNumber} • ${new Date(
                                        tip.report.createdAt,
                                      ).toLocaleString("pt-BR")}`,
                                      content: tip.parsed.text,
                                    }),
                                  );
                                  const firstEntry = modalEntries[0];
                                  if (!firstEntry) return;
                                  setAiContentModal({
                                    title: "Ajuda da IA",
                                    subtitle: firstEntry.subtitle,
                                    content: firstEntry.content,
                                    ...(modalEntries.length > 1
                                      ? {
                                          entries: modalEntries,
                                          activeEntryIndex: 0,
                                        }
                                      : {}),
                                  });
                                }}
                              >
                                Ver ajuda IA ({moveTips.length})
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "deck" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <strong>Deck randômico</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {isTherapistViewer && timelineFilterParticipants.length > 1 && (
                      <select
                        value={effectiveSelectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {timelineFilterParticipants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {deckHistoryByMove.length ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {deckHistoryByMove.map((group) => (
                      <div
                        key={group.key}
                        style={{
                          display: "grid",
                          gap: 6,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "hsl(var(--temple-surface-2))",
                        }}
                      >
                        <div style={{ display: "grid", gap: 2 }}>
                          <strong>
                            {group.drawnBy.user.name || group.drawnBy.user.email}
                          </strong>
                          <div className="small-muted">
                            {new Date(group.createdAt).toLocaleString("pt-BR")}
                            {group.turnNumber
                              ? ` • Jogada #${group.turnNumber}`
                              : " • Sem jogada"}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            overflowX: "auto",
                            paddingBottom: 2,
                          }}
                        >
                          {group.draws
                            .filter((draw) => Boolean(draw.card))
                            .map((draw) => {
                              const card = draw.card;
                              if (!card) return null;
                              return (
                                <button
                                  key={draw.id}
                                  className="btn-secondary"
                                  style={{
                                    padding: 0,
                                    borderRadius: 9,
                                    overflow: "hidden",
                                    width: 66,
                                    minWidth: 66,
                                    height: 92,
                                    borderColor: "rgba(217, 164, 65, 0.3)",
                                    background: "rgba(9, 15, 24, 0.7)",
                                  }}
                                  onClick={() =>
                                    openCardPreview({
                                      card,
                                      title: `Carta #${card.cardNumber}`,
                                      subtitle: group.turnNumber
                                        ? `Jogada #${group.turnNumber}`
                                        : "Sem jogada vinculada",
                                    })
                                  }
                                >
                                  <img
                                    src={card.imageUrl}
                                    alt={`Carta ${card.cardNumber}`}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                </button>
                              );
                            })}
                        </div>
                        {group.draws.every((draw) => !draw.card) && (
                          <span className="small-muted">
                            Carta(s): {group.draws.flatMap((draw) => draw.cards).join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {effectiveSelectedParticipantId
                      ? "Nenhuma tiragem para o jogador selecionado."
                      : "Nenhuma tiragem registrada."}
                  </span>
                )}
              </>
            )}

            {activeTab === "aiReports" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <strong>Relatórios IA</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {isTherapistViewer && timelineFilterParticipants.length > 1 && (
                      <select
                        value={effectiveSelectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {timelineFilterParticipants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {filteredAiReports.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="notice" style={{ display: "grid", gap: 6 }}>
                      <strong>Histórico de ajudas da IA</strong>
                      {filteredTipReports.length === 0 ? (
                        <span className="small-muted">
                          Nenhuma ajuda registrada.
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            maxHeight: 220,
                            overflow: "auto",
                            paddingRight: 2,
                          }}
                        >
                          {filteredTipReports.map((report, index) => {
                            const parsed = parseTipReportContent(report.content);
                            const helpNumber = filteredTipReports.length - index;
                            return (
                              <button
                                key={report.id}
                                className="btn-secondary"
                                style={{
                                  justifyContent: "flex-start",
                                  textAlign: "left",
                                  whiteSpace: "normal",
                                  height: "auto",
                                  padding: "8px 10px",
                                }}
                                onClick={() =>
                                  setAiContentModal({
                                    title: `Ajuda da IA #${helpNumber}`,
                                    subtitle: `${parsed.turnNumber !== null ? `Jogada #${parsed.turnNumber}` : "Jogada não identificada"}${parsed.houseNumber !== null ? ` • Casa ${parsed.houseNumber}` : ""} • ${new Date(report.createdAt).toLocaleString("pt-BR")}`,
                                    content: parsed.text,
                                  })
                                }
                              >
                                <strong style={{ fontSize: 12 }}>
                                  Ajuda #{helpNumber}
                                </strong>
                                <span className="small-muted">
                                  {parsed.turnNumber !== null
                                    ? `Jogada #${parsed.turnNumber}`
                                    : "Jogada não identificada"}
                                  {parsed.houseNumber !== null
                                    ? ` • Casa ${parsed.houseNumber}`
                                    : ""}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="notice" style={{ display: "grid", gap: 6 }}>
                      <strong>Relatórios finais disponíveis</strong>
                      {finalReportsByParticipantId.size === 0 ? (
                        <span className="small-muted">
                          Nenhum relatório final disponível para leitura.
                        </span>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {Array.from(finalReportsByParticipantId.entries()).map(
                            ([participantId, reports]) => {
                              const participant = room.participants.find(
                                (item) => item.id === participantId,
                              );
                              const latestReport = reports[0] || null;
                              if (!participant || !latestReport) return null;
                              const participantLabel =
                                getParticipantDisplayName(participant);
                              return (
                                <button
                                  key={participantId}
                                  className="btn-secondary"
                                  style={{
                                    justifyContent: "flex-start",
                                    textAlign: "left",
                                    whiteSpace: "normal",
                                    height: "auto",
                                    padding: "8px 10px",
                                  }}
                                  onClick={() =>
                                    setAiContentModal({
                                      title: `Relatório final • ${participantLabel}`,
                                      subtitle: `Gerado em ${new Date(latestReport.createdAt).toLocaleString("pt-BR")}`,
                                      content: latestReport.content,
                                    })
                                  }
                                >
                                  <strong style={{ fontSize: 12 }}>
                                    {room.viewerRole === "THERAPIST"
                                      ? participantLabel
                                      : "Meu relatório final"}
                                  </strong>
                                  <span className="small-muted">
                                    Disponível para leitura
                                    {reports.length > 1
                                      ? ` • ${reports.length} versões`
                                      : ""}
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      )}
                    </div>

                    <div className="notice" style={{ display: "grid", gap: 6 }}>
                      <strong>O Caminho até agora</strong>
                      {filteredProgressReports.length === 0 ? (
                        <span className="small-muted">
                          Nenhuma síntese por intervalo registrada.
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            maxHeight: 220,
                            overflow: "auto",
                            paddingRight: 2,
                          }}
                        >
                          {filteredProgressReports.map((report) => {
                            const parsed = parseProgressSummaryContent(
                              report.content,
                            );
                            const intervalLabel =
                              parsed.intervalStart !== null &&
                              parsed.intervalEnd !== null
                                ? `${parsed.intervalStart}-${parsed.intervalEnd}`
                                : "intervalo não identificado";
                            return (
                              <button
                                key={report.id}
                                className="btn-secondary"
                                style={{
                                  justifyContent: "flex-start",
                                  textAlign: "left",
                                  whiteSpace: "normal",
                                  height: "auto",
                                  padding: "8px 10px",
                                }}
                                onClick={() =>
                                  setAiContentModal({
                                    title: `O Caminho até agora • Jogadas ${intervalLabel}`,
                                    subtitle: `Gerado em ${new Date(report.createdAt).toLocaleString("pt-BR")}`,
                                    content: parsed.text,
                                  })
                                }
                              >
                                <strong style={{ fontSize: 12 }}>
                                  Jogadas {intervalLabel}
                                </strong>
                                <span className="small-muted">
                                  {parsed.summaryEveryMoves
                                    ? `Síntese automática a cada ${parsed.summaryEveryMoves} jogadas`
                                    : "Síntese automática por intervalo"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="small-muted">
                    {effectiveSelectedParticipantId
                      ? "Nenhum relatório para o jogador selecionado."
                      : "Nenhum relatório ainda."}
                  </span>
                )}
              </>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              <strong>
                {room.viewerRole === "THERAPIST"
                  ? "Exportar PDF por participante"
                  : "Exportar meu PDF"}
              </strong>
              {exportableParticipants.length === 0 ? (
                <span className="small-muted">
                  {room.therapistSoloPlay && room.viewerRole !== "THERAPIST"
                    ? "Exportação disponível apenas para o terapeuta neste modo."
                    : "Nenhum participante disponível para exportação."}
                </span>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {exportableParticipants.map((participant) => (
                    <button
                      key={participant.id}
                      className="btn-secondary"
                      onClick={() => handleExport(room.id, participant.id)}
                    >
                      {room.viewerRole === "THERAPIST"
                        ? getParticipantDisplayName(participant)
                        : "Exportar meu PDF"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  });

  const dashboardTutorialPopover = getTutorialPopoverPosition(
    dashboardTutorialTargetRect,
  );
  const currentDashboardTutorialStep =
    dashboardTutorialSteps[dashboardTutorialStep] || null;
  const isTutorialCreateRoomConfigStep =
    currentDashboardTutorialStep?.target === "create-room-config";
  const isDockedCreateRoomTutorial =
    isTutorialCreateRoomConfigStep && isCreateRoomModalOpen;
  const limitedCatalogLimit =
    roomQuota?.planType === "SUBSCRIPTION_LIMITED"
      ? roomQuota.catalogRoomsLimit ?? roomQuota.roomsLimit
      : null;
  const isLimitedQuotaExhausted =
    roomQuota?.planType === "SUBSCRIPTION_LIMITED" &&
    roomQuota.roomsRemaining !== null &&
    roomQuota.roomsRemaining <= 0;
  const hasSingleSessionOrPlan =
    canCreateRoom || createdRooms.some((room) => !room.isTrial);
  const showTrialUpgradeCard =
    hasUsedTrial === true &&
    trialRoomStatus !== null &&
    trialRoomStatus !== "ACTIVE" &&
    !canCreateRoom;
  const indicatorsPeriodLabel = formatPeriodLabel(
    indicatorsData?.period.from,
    indicatorsData?.period.to,
  );
  const planPeriodLabel =
    roomQuota?.periodStart || roomQuota?.periodEnd
      ? formatPeriodLabel(roomQuota?.periodStart, roomQuota?.periodEnd)
      : null;
  const indicatorsRoomsCount = indicatorsData?.period.roomsCount ?? 0;
  const aiModalEntries = aiContentModal?.entries || [];
  const hasMultipleAiModalEntries = aiModalEntries.length > 1;
  const activeAiModalEntryIndex = hasMultipleAiModalEntries
    ? Math.min(
        Math.max(aiContentModal?.activeEntryIndex ?? 0, 0),
        aiModalEntries.length - 1,
      )
    : 0;
  const activeAiModalEntry = hasMultipleAiModalEntries
    ? aiModalEntries[activeAiModalEntryIndex]
    : null;
  const aiModalContent =
    activeAiModalEntry?.content || aiContentModal?.content || "";
  const aiModalSubtitle =
    activeAiModalEntry?.subtitle || aiContentModal?.subtitle;

  return (
    <div className="grid dashboard-root" style={{ gap: 24 }}>
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 18,
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "grid",
          gap: 8,
          width: "min(92vw, 560px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const palette =
            toast.kind === "success"
              ? { border: "rgba(118, 240, 181, 0.35)", dot: "#76f0b5" }
              : toast.kind === "warning"
                ? { border: "rgba(255, 207, 90, 0.35)", dot: "#ffcf5a" }
                : toast.kind === "error"
                  ? { border: "rgba(255, 107, 107, 0.35)", dot: "#ff6b6b" }
                  : { border: "rgba(154, 208, 255, 0.35)", dot: "#9ad0ff" };

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                background: "rgba(15, 22, 33, 0.95)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: palette.dot,
                  marginTop: 4,
                  flex: "0 0 auto",
                }}
              />
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>
                {toast.message}
              </div>
              <button
                className="btn-ghost"
                style={{ padding: "2px 8px", borderRadius: 8 }}
                onClick={() => removeToast(toast.id)}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
      <div className="dashboard-three-columns">
        <aside className="grid dashboard-side-column dashboard-left-column" style={{ gap: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-secondary"
              onClick={() => {
                setIndicatorsTab("overview");
                setIndicatorsDateDraft(indicatorsDateFilter);
                setIntentionThemeModal(null);
                setIndicatorsData(null);
                setIsIndicatorsModalOpen(true);
                void loadIndicators(indicatorsDateFilter);
              }}
              data-tour-dashboard="toolbar-indicators"
              aria-label="Abrir indicadores"
              title="Abrir indicadores"
              style={{
                width: 36,
                minWidth: 36,
                height: 36,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IndicatorsIcon />
            </button>
            <button
              className="btn-primary"
              onClick={() => setIsCreateRoomModalOpen(true)}
              disabled={!canCreateRoom || isLimitedQuotaExhausted}
              data-tour-dashboard={canCreateRoom ? "create-room" : undefined}
              aria-label="Criar nova sala"
              title={
                !canCreateRoom
                  ? "No momento você não pode criar nova sala."
                  : isLimitedQuotaExhausted
                    ? "Limite do período atingido."
                    : "Criar nova sala"
              }
              style={{
                width: 36,
                minWidth: 36,
                height: 36,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NewRoomIcon />
            </button>
          </div>

          <div
            className="card dashboard-filters-card"
            style={{ display: "grid", gap: 12 }}
            data-tour-dashboard="filters"
          >
            <h2 className="section-title">Filtros de sessão</h2>
            {hasActiveFilters && (
              <span className="small-muted">Filtros ativos aplicados no painel.</span>
            )}
            <div className="grid" style={{ gap: 12 }}>
              <div
                className="dashboard-filters-row"
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Status</span>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="ACTIVE">Ativas</option>
                    <option value="CLOSED">Encerradas</option>
                    <option value="COMPLETED">Concluídas</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>De</span>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, from: event.target.value }))
                    }
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Até</span>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, to: event.target.value }))
                    }
                    />
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    alignSelf: "center",
                  }}
                >
                  <button
                    className="btn-secondary w-fit"
                    style={{ width: "auto" }}
                    onClick={() => loadRooms()}
                  >
                    Aplicar filtros
                  </button>
                  <button
                    className="btn-secondary w-fit"
                    style={{ width: "auto" }}
                    onClick={() => {
                      setFilters({ status: "", from: "", to: "" });
                      loadRooms({ status: "", from: "", to: "" });
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="grid dashboard-center-column" style={{ gap: 16 }}>
          {hasUsedTrial === false && !hasSingleSessionOrPlan && (
            <div
              className="card dashboard-create-card"
              style={{ display: "grid", gap: 12 }}
            >
              <strong>Sala trial</strong>
              <p className="small-muted" style={{ margin: 0 }}>
                Experimente agora com 1 jogador, 1 ajuda de IA e resumo final, com
                limite de 5 jogadas após sair da casa 68.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  onClick={handleCreateTrialRoom}
                  disabled={creatingTrial}
                >
                  {creatingTrial ? "Criando trial..." : "Experimente já"}
                </button>
                <a href="/planos" className="btn-secondary">
                  Ver planos
                </a>
              </div>
            </div>
          )}
          {showTrialUpgradeCard && (
            <div className="card dashboard-create-card" style={{ display: "grid", gap: 12 }}>
              <strong>Sala trial encerrada</strong>
              <p className="small-muted" style={{ margin: 0 }}>
                Sua sala trial foi encerrada. Para criar novas salas, escolha entre sessão
                avulsa ou assinatura.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href="/planos" className="btn-secondary">
                  Comprar sessão avulsa
                </a>
                <a href="/planos" className="btn-primary">
                  Assinar Plano
                </a>
              </div>
            </div>
          )}
          <div className="grid dashboard-sessions-section" style={{ gap: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className={
                    sessionsViewTab === "created" ? "btn-primary" : "btn-secondary"
                  }
                  data-tour-dashboard="sessions-tabs"
                  onClick={() => setSessionsViewTab("created")}
                >
                  Sessões criadas ({createdRooms.length})
                </button>
                <button
                  className={
                    sessionsViewTab === "participated"
                      ? "btn-primary"
                      : "btn-secondary"
                  }
                  onClick={() => setSessionsViewTab("participated")}
                >
                  Sessões que participei ({participatedRooms.length})
                </button>
              </div>
            </div>
            {loading ? (
              <div className="card" data-tour-dashboard="sessions-list">
                Carregando...
              </div>
            ) : visibleRooms.length === 0 ? (
              <div className="card" data-tour-dashboard="sessions-list">
                {sessionsViewTab === "created"
                  ? "Nenhuma sessão criada com os filtros atuais."
                  : "Nenhuma sessão em que você participou com os filtros atuais."}
              </div>
            ) : (
              <div
                className="dashboard-sessions-list"
                data-tour-dashboard="sessions-list"
              >
                {roomCards}
              </div>
            )}
          </div>
        </div>

      </div>

      {isCreateRoomModalOpen && canCreateRoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (creating) return;
            setIsCreateRoomModalOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.7)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
              }}
            >
              <strong>Criar nova sala</strong>
              <button
                className="btn-secondary"
                disabled={creating}
                onClick={() => setIsCreateRoomModalOpen(false)}
              >
                Fechar
              </button>
            </div>

            <div
              className="dashboard-create-row"
              data-tour-dashboard="create-room-config"
              style={{
                display: "grid",
                gap: 10,
                alignItems: "start",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>Número de jogadores</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={maxParticipants}
                  onChange={(event) =>
                    setMaxParticipants(Number(event.target.value))
                  }
                />
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <ToggleSwitch
                  checked={therapistPlays}
                  disabled={therapistSoloPlay}
                  onToggle={() => {
                    if (therapistSoloPlay) return;
                    setTherapistPlays((prev) => !prev);
                  }}
                  ariaLabel="Terapeuta joga junto"
                />
                <span>Terapeuta joga junto</span>
              </div>
              {canUseTherapistSoloPlay && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <ToggleSwitch
                    checked={therapistSoloPlay}
                    onToggle={() => {
                      const enabled = !therapistSoloPlay;
                      setTherapistSoloPlay(enabled);
                      if (enabled) {
                        setTherapistPlays(true);
                      }
                    }}
                    ariaLabel="Só o terapeuta joga"
                  />
                  <span>Só o terapeuta joga</span>
                </div>
              )}
            </div>

            <p className="small-muted" style={{ margin: 0 }}>
              Defina se o terapeuta entra na fila. <br/>Quando ele jogar junto, ocupa 1
              vaga de jogador.<br/>
              {canUseTherapistSoloPlay
                ? ' No modo "só o terapeuta joga", os demais entram apenas como visualizadores da mesma partida.'
                : " O modo de jogadores somente visualização não está disponível no seu plano atual."}
            </p>

            {isLimitedQuotaExhausted && (
              <p className="notice">
                Você já usou todas as salas disponíveis no período atual do plano
                limitado.
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn-ghost"
                disabled={creating}
                onClick={() => setIsCreateRoomModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateRoom}
                disabled={creating || isLimitedQuotaExhausted}
              >
                {creating
                  ? "Criando..."
                  : isLimitedQuotaExhausted
                    ? "Limite do período atingido"
                    : "Criar sala"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isIndicatorsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setIsIndicatorsModalOpen(false);
            setIntentionThemeModal(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.7)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, 96vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h2 className="section-title">Indicadores do painel</h2>
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsIndicatorsModalOpen(false);
                  setIntentionThemeModal(null);
                }}
              >
                Fechar
              </button>
            </div>

            <div className="small-muted" style={{ marginTop: -6 }}>
              Indicadores calculados apenas com salas criadas/compradas por você.
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>De</span>
                <input
                  type="date"
                  value={indicatorsDateDraft.from}
                  onChange={(event) =>
                    setIndicatorsDateDraft((prev) => ({
                      ...prev,
                      from: event.target.value,
                    }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Até</span>
                <input
                  type="date"
                  value={indicatorsDateDraft.to}
                  onChange={(event) =>
                    setIndicatorsDateDraft((prev) => ({
                      ...prev,
                      to: event.target.value,
                    }))
                  }
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn-secondary"
                  disabled={indicatorsLoading}
                  onClick={() => void loadIndicators(indicatorsDateDraft)}
                >
                  {indicatorsLoading ? "Aplicando..." : "Aplicar período"}
                </button>
                <button
                  className="btn-secondary"
                  disabled={indicatorsLoading}
                  onClick={() => {
                    const cleared = { from: "", to: "" };
                    setIndicatorsDateDraft(cleared);
                    void loadIndicators(cleared);
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="small-muted">
              Período ativo: {indicatorsPeriodLabel}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className={indicatorsTab === "overview" ? "btn-primary" : "btn-secondary"}
                onClick={() => setIndicatorsTab("overview")}
              >
                Visão Geral
              </button>
              <button
                className={indicatorsTab === "engagement" ? "btn-primary" : "btn-secondary"}
                onClick={() => setIndicatorsTab("engagement")}
              >
                Engajamento
              </button>
              <button
                className={
                  indicatorsTab === "performance" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setIndicatorsTab("performance")}
              >
                Performance
              </button>
              <button
                className={indicatorsTab === "heatmaps" ? "btn-primary" : "btn-secondary"}
                onClick={() => setIndicatorsTab("heatmaps")}
              >
                Mapas de calor
              </button>
              <button
                className={
                  indicatorsTab === "comparison" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setIndicatorsTab("comparison")}
              >
                Comparativo
              </button>
            </div>

            {indicatorsError && <span className="small-muted">{indicatorsError}</span>}

            {indicatorsLoading ? (
              <span className="small-muted">Carregando indicadores...</span>
            ) : !indicatorsData ? (
              <span className="small-muted">
                Sem dados disponíveis para o período selecionado.
              </span>
            ) : (
              <>
                {indicatorsTab === "overview" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Última sessão</span>
                      <strong>
                        {indicatorsData.lastSession
                          ? `Sala ${indicatorsData.lastSession.code}`
                          : "Sem sessão"}
                      </strong>
                      <span className="small-muted">
                        {indicatorsData.lastSession
                          ? `${indicatorsData.lastSession.status} • ${
                              indicatorsData.lastSession.lastMoveAt
                                ? `Última jogada em ${formatDateTimeLabel(
                                    indicatorsData.lastSession.lastMoveAt,
                                  )}`
                                : `Criada em ${formatDateTimeLabel(
                                    indicatorsData.lastSession.createdAt,
                                  )}`
                            }`
                          : "--"}
                      </span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Salas concluídas (qtde / %)
                      </span>
                      <strong>
                        {formatMetricNumber(indicatorsData.statuses.completed.count)} (
                        {formatMetricNumber(indicatorsData.statuses.completed.percent)}%)
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Salas encerradas (qtde / %)
                      </span>
                      <strong>
                        {formatMetricNumber(indicatorsData.statuses.closed.count)} (
                        {formatMetricNumber(indicatorsData.statuses.closed.percent)}%)
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Salas ativas (qtde / %)</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.statuses.active.count)} (
                        {formatMetricNumber(indicatorsData.statuses.active.percent)}%)
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Taxa de conclusão</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.completionRatePercent)}%
                      </strong>
                      <span className="small-muted">
                        Base: {formatMetricNumber(indicatorsData.gameplay.startedRoomsCount)}{" "}
                        sala(s) iniciadas
                      </span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Salas criadas nos últimos 7 dias
                      </span>
                      <strong>
                        {formatMetricNumber(indicatorsData.roomsCreatedLast7Days)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Salas criadas nos últimos 30 dias
                      </span>
                      <strong>
                        {formatMetricNumber(indicatorsData.roomsCreatedLast30Days)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Salas criadas no período</span>
                      <strong>{formatMetricNumber(indicatorsRoomsCount)}</strong>
                      <span className="small-muted">
                        Período: {planPeriodLabel || indicatorsPeriodLabel}
                      </span>
                      {roomQuota ? (
                        roomQuota.planType === "SUBSCRIPTION_LIMITED" ? (
                          <span className="small-muted">
                            Limite:{" "}
                            {limitedCatalogLimit == null
                              ? "Ilimitado"
                              : formatMetricNumber(limitedCatalogLimit)}{" "}
                            | Disponíveis:{" "}
                            {roomQuota.roomsRemaining == null
                              ? "Ilimitadas"
                              : formatMetricNumber(roomQuota.roomsRemaining)}
                          </span>
                        ) : (
                          <span className="small-muted">
                            Limite do plano:{" "}
                            {roomQuota.roomsLimit == null
                              ? "Ilimitado"
                              : formatMetricNumber(roomQuota.roomsLimit)}
                          </span>
                        )
                      ) : (
                        <span className="small-muted">
                          Limite do plano indisponível.
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Dias desde a última sessão
                      </span>
                      <strong>
                        {indicatorsData.daysSinceLastSession === null
                          ? "--"
                          : formatMetricNumber(indicatorsData.daysSinceLastSession)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Taxa de abandono</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.abandonment.count)} (
                        {formatMetricNumber(indicatorsData.abandonment.percent)}%)
                      </strong>
                      <span className="small-muted">
                        Base: {formatMetricNumber(indicatorsData.abandonment.startedRooms)}{" "}
                        sessão(ões) iniciada(s)
                      </span>
                    </div>
                  </div>
                )}

                {indicatorsTab === "engagement" && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">
                          Convites pendentes / aceitos
                        </span>
                        <strong>
                          <span style={{ color: "#ff6b6b" }}>
                            {formatMetricNumber(indicatorsData.invites.pending)}
                          </span>{" "}
                          /{" "}
                          <span style={{ color: "rgba(255, 255, 255, 0.92)" }}>
                            {formatMetricNumber(indicatorsData.invites.accepted)}
                          </span>
                        </strong>
                        <span className="small-muted">
                          Total: {formatMetricNumber(indicatorsData.invites.total)}
                        </span>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">
                          Consentimentos pendentes / aceitos
                        </span>
                        <strong>
                          <span style={{ color: "#ff6b6b" }}>
                            {formatMetricNumber(indicatorsData.consents.pending)}
                          </span>{" "}
                          /{" "}
                          <span style={{ color: "rgba(255, 255, 255, 0.92)" }}>
                            {formatMetricNumber(indicatorsData.consents.accepted)}
                          </span>
                        </strong>
                        <span className="small-muted">
                          Total: {formatMetricNumber(indicatorsData.consents.total)}
                        </span>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">
                          Sessões terapeuta joga junto
                        </span>
                        <strong>
                          {formatMetricNumber(indicatorsData.therapistModes.playsTogether)}
                        </strong>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">
                          Sessões terapeuta não joga
                        </span>
                        <strong>
                          {formatMetricNumber(indicatorsData.therapistModes.notPlaying)}
                        </strong>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">Sessões solo</span>
                        <strong>
                          {formatMetricNumber(indicatorsData.therapistModes.solo)}
                        </strong>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">Tempo até consentimento</span>
                        <strong>
                          {formatDurationFromMinutes(
                            indicatorsData.timeToConsent.averageMinutes,
                          )}
                        </strong>
                        <span className="small-muted">
                          Base:{" "}
                          {formatMetricNumber(
                            indicatorsData.timeToConsent.measuredParticipants,
                          )}{" "}
                          participante(s)
                        </span>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">Cobertura da síntese do terapeuta</span>
                        <strong>
                          Jogadores:{" "}
                          {formatMetricNumber(
                            indicatorsData.therapistSummaryCoverage.players.percent,
                          )}
                          %
                        </strong>
                        <span className="small-muted">
                          {formatMetricNumber(
                            indicatorsData.therapistSummaryCoverage.players.count,
                          )}{" "}
                          de{" "}
                          {formatMetricNumber(
                            indicatorsData.therapistSummaryCoverage.players.total,
                          )}{" "}
                          jogador(es)
                        </span>
                        <span className="small-muted">
                          Sessões:{" "}
                          {formatMetricNumber(
                            indicatorsData.therapistSummaryCoverage.sessions.count,
                          )}{" "}
                          de{" "}
                          {formatMetricNumber(
                            indicatorsData.therapistSummaryCoverage.sessions.total,
                          )}{" "}
                          (
                          {formatMetricNumber(
                            indicatorsData.therapistSummaryCoverage.sessions.percent,
                          )}
                          %)
                        </span>
                      </div>

                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span className="small-muted">Intenção definida</span>
                        <strong>
                          Participantes:{" "}
                          {formatMetricNumber(indicatorsData.intentionCoverage.players.percent)}
                          %
                        </strong>
                        <span className="small-muted">
                          {formatMetricNumber(indicatorsData.intentionCoverage.players.count)} de{" "}
                          {formatMetricNumber(indicatorsData.intentionCoverage.players.total)}
                        </span>
                        <span className="small-muted">
                          Sessões iniciadas:{" "}
                          {formatMetricNumber(
                            indicatorsData.intentionCoverage.startedPlayers.percent,
                          )}
                          % (
                          {formatMetricNumber(
                            indicatorsData.intentionCoverage.startedPlayers.count,
                          )}{" "}
                          de{" "}
                          {formatMetricNumber(
                            indicatorsData.intentionCoverage.startedPlayers.total,
                          )}
                          )
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <strong>Intenções de jogo no período</strong>
                      {indicatorsData.intentionThemes.length === 0 ? (
                        <span className="small-muted">
                          Nenhum tema de intenção encontrado para este período.
                        </span>
                      ) : (
                        <>
                          <span className="small-muted">
                            Clique em um tema para ver as sessões relacionadas.
                          </span>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {indicatorsData.intentionThemes.map((theme) => (
                              <button
                                key={theme.theme}
                                className="btn-secondary"
                                onClick={() => setIntentionThemeModal(theme)}
                                style={{ height: "auto", padding: "6px 10px" }}
                              >
                                {theme.theme} ({formatMetricNumber(theme.count)})
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {indicatorsTab === "performance" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Salas criadas e não jogadas
                      </span>
                      <strong>{formatMetricNumber(indicatorsData.roomsWithoutMoves)}</strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Média de jogadas</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.averages.movesPerRoom, 2)}
                      </strong>
                      <span className="small-muted">por sala no período</span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Média de uso de IA</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.averages.aiPerRoom, 2)}
                      </strong>
                      <span className="small-muted">relatórios por sala</span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Média de registros terapêuticos
                      </span>
                      <strong>
                        {formatMetricNumber(indicatorsData.averages.therapyPerRoom, 2)}
                      </strong>
                      <span className="small-muted">por sala</span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Tempo médio de jogo</span>
                      <strong>
                        {formatDurationFromMinutes(
                          indicatorsData.gameplay.averageDurationMinutes,
                        )}
                      </strong>
                      <span className="small-muted">
                        Base: {formatMetricNumber(indicatorsData.gameplay.startedRoomsCount)}{" "}
                        sala(s) iniciadas
                      </span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Tempo total em sessão</span>
                      <strong>
                        {formatDurationFromMinutes(indicatorsData.gameplay.totalDurationMinutes)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Tempo até primeira jogada</span>
                      <strong>
                        {formatDurationFromMinutes(
                          indicatorsData.timeToFirstMove.averageMinutes,
                        )}
                      </strong>
                      <span className="small-muted">
                        Base: {formatMetricNumber(indicatorsData.timeToFirstMove.measuredRooms)}{" "}
                        sala(s)
                      </span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Densidade terapêutica</span>
                      <strong>
                        {formatMetricNumber(
                          indicatorsData.therapeuticDensity.entriesPer10Moves,
                          2,
                        )}
                      </strong>
                      <span className="small-muted">registros a cada 10 jogadas</span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">
                        Registros por IA gerados (mês / total)
                      </span>
                      <strong>
                        {formatMetricNumber(indicatorsData.aiReportsGenerated.month)} /{" "}
                        {formatMetricNumber(indicatorsData.aiReportsGenerated.total)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Uso efetivo da IA</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.aiEffectiveness.sessionsWithAi)} (
                        {formatMetricNumber(indicatorsData.aiEffectiveness.sessionsPercent)}%)
                      </strong>
                      <span className="small-muted">
                        Média por sessão iniciada:{" "}
                        {formatMetricNumber(
                          indicatorsData.aiEffectiveness.averagePerStartedRoom,
                          2,
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">Tempo médio por jogada</span>
                      <strong>
                        {formatDurationFromMinutes(indicatorsData.averageTimePerMoveMinutes)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <span className="small-muted">% de sessões com registro</span>
                      <strong>
                        {formatMetricNumber(indicatorsData.sessionsWithRecords.percent)}%
                      </strong>
                      <span className="small-muted">
                        {formatMetricNumber(indicatorsData.sessionsWithRecords.count)} de{" "}
                        {formatMetricNumber(indicatorsRoomsCount)} sala(s)
                      </span>
                    </div>

                  </div>
                )}

                {indicatorsTab === "comparison" && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <strong>Comparativo por modo</strong>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {[
                          {
                            label: "Terapeuta joga junto",
                            data: indicatorsData.modeComparison.playsTogether,
                          },
                          {
                            label: "Terapeuta não joga",
                            data: indicatorsData.modeComparison.notPlaying,
                          },
                          {
                            label: "Sessão solo",
                            data: indicatorsData.modeComparison.solo,
                          },
                        ].map((mode) => (
                          <div
                            key={mode.label}
                            className="notice"
                            style={{ display: "grid", gap: 4 }}
                          >
                            <strong>{mode.label}</strong>
                            <span className="small-muted">
                              Sessões: {formatMetricNumber(mode.data.rooms)}
                            </span>
                            <span className="small-muted">
                              Conclusão:{" "}
                              {formatMetricNumber(mode.data.completionPercent)}%
                            </span>
                            <span className="small-muted">
                              Tempo médio:{" "}
                              {formatDurationFromMinutes(mode.data.averageDurationMinutes)}
                            </span>
                            <span className="small-muted">
                              Média de jogadas:{" "}
                              {formatMetricNumber(mode.data.averageMoves, 2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {indicatorsTab === "heatmaps" && (
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      {
                        key: "roomCreation",
                        title: "Criação de salas por dia e horário",
                        subtitle: "Baseado na data/hora de criação da sala",
                        data: indicatorsData.heatmaps.roomCreation,
                      },
                      {
                        key: "moves",
                        title: "Jogadas por dia e horário",
                        subtitle: "Baseado no horário de cada jogada",
                        data: indicatorsData.heatmaps.moves,
                      },
                    ].map((heatmapItem) => (
                      <div
                        key={heatmapItem.key}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <strong>{heatmapItem.title}</strong>
                        <span className="small-muted">
                          {heatmapItem.subtitle} • Total de eventos:{" "}
                          {formatMetricNumber(heatmapItem.data.total)} • Pico:{" "}
                          {formatMetricNumber(heatmapItem.data.max)}
                        </span>
                        <div style={{ overflowX: "auto" }}>
                          <div style={{ display: "grid", gap: 4, minWidth: 760 }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: `74px repeat(${heatmapItem.data.hours.length}, minmax(22px, 1fr))`,
                                gap: 4,
                                alignItems: "center",
                              }}
                            >
                              <span className="small-muted">Dia/Hora</span>
                              {heatmapItem.data.hours.map((hour) => (
                                <span
                                  key={`${heatmapItem.key}-hour-${hour}`}
                                  className="small-muted"
                                  style={{ textAlign: "center", fontSize: 10 }}
                                >
                                  {formatHourLabel(hour)}
                                </span>
                              ))}
                            </div>

                            {heatmapItem.data.days.map((day, dayIndex) => (
                              <div
                                key={`${heatmapItem.key}-day-${day}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: `74px repeat(${heatmapItem.data.hours.length}, minmax(22px, 1fr))`,
                                  gap: 4,
                                  alignItems: "center",
                                }}
                              >
                                <span className="small-muted">{day}</span>
                                {heatmapItem.data.hours.map((hour, hourIndex) => {
                                  const value =
                                    heatmapItem.data.matrix?.[dayIndex]?.[hourIndex] || 0;
                                  return (
                                    <div
                                      key={`${heatmapItem.key}-${day}-${hour}`}
                                      title={`${day} ${formatHourLabel(hour)}:00 • ${formatMetricNumber(value)} evento(s)`}
                                      style={{
                                        height: 18,
                                        borderRadius: 4,
                                        border: "1px solid rgba(255, 255, 255, 0.08)",
                                        background: getHeatmapCellBackground(
                                          value,
                                          heatmapItem.data.max,
                                        ),
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {intentionThemeModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIntentionThemeModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.62)",
            zIndex: 10001,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(780px, 96vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <strong>
                Tema: {intentionThemeModal.theme} (
                {formatMetricNumber(intentionThemeModal.count)})
              </strong>
              <button
                className="btn-secondary"
                onClick={() => setIntentionThemeModal(null)}
              >
                Fechar
              </button>
            </div>
            {intentionThemeModal.rooms.length === 0 ? (
              <span className="small-muted">Nenhuma sessão relacionada.</span>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {intentionThemeModal.rooms.map((room) => (
                  <div
                    key={`${intentionThemeModal.theme}-${room.id}`}
                    className="notice"
                    style={{ display: "grid", gap: 4 }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <strong>Sala {room.code}</strong>
                      <span className="small-muted">{room.status}</span>
                      <span className="small-muted">
                        {formatDateTimeLabel(room.createdAt)}
                      </span>
                    </div>
                    <span className="small-muted">
                      Correspondências do tema: {formatMetricNumber(room.matchCount)}
                    </span>
                    <span className="small-muted">
                      Intenções: {room.intentions.join(" | ")}
                    </span>
                    {room.status === "ACTIVE" && (
                      <a href={`/rooms/${room.code}`} className="btn-secondary w-fit">
                        Abrir sala
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {therapyModalEntries.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setTherapyModalEntries([])}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.7)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(680px, 96vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <strong>Registro terapêutico</strong>
              <button
                className="btn-secondary"
                onClick={() => setTherapyModalEntries([])}
              >
                Fechar
              </button>
            </div>
            {therapyModalEntries.map((entry) => (
              <div key={entry.id} className="notice" style={{ display: "grid", gap: 6 }}>
                <span className="small-muted">
                  Jogada #{entry.move.turnNumber} • Casa {entry.move.toPos} •{" "}
                  {entry.createdAt
                    ? new Date(entry.createdAt).toLocaleString("pt-BR")
                    : "-"}
                </span>
                {entry.emotion && (
                  <span className="small-muted">
                    <strong>Emoção:</strong> {entry.emotion}
                    {entry.intensity ? ` (${entry.intensity}/10)` : ""}
                  </span>
                )}
                {entry.insight && (
                  <span className="small-muted">
                    <strong>Insight:</strong> {entry.insight}
                  </span>
                )}
                {entry.body && (
                  <span className="small-muted">
                    <strong>Corpo:</strong> {entry.body}
                  </span>
                )}
                {entry.microAction && (
                  <span className="small-muted">
                    <strong>Ação:</strong> {entry.microAction}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {aiContentModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setAiContentModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.7)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "82vh",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "flex-start",
                padding: "10px 12px",
                borderBottom: "1px solid var(--border)",
                background: "rgba(11, 18, 29, 0.92)",
              }}
            >
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{aiContentModal.title}</strong>
                  {aiModalSubtitle && (
                    <span className="small-muted">{aiModalSubtitle}</span>
                  )}
                </div>
                {hasMultipleAiModalEntries && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {aiModalEntries.map((entry, index) => {
                      const isActive = index === activeAiModalEntryIndex;
                      return (
                        <button
                          key={`${entry.label}-${index}`}
                          className="btn-secondary"
                          style={{
                            height: 30,
                            minHeight: 30,
                            padding: "0 10px",
                            borderColor: isActive
                              ? "rgba(217, 164, 65, 0.72)"
                              : "rgba(217, 164, 65, 0.35)",
                            background: isActive
                              ? "rgba(217, 164, 65, 0.24)"
                              : "rgba(9, 15, 24, 0.7)",
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setAiContentModal((previous) =>
                              previous
                                ? { ...previous, activeEntryIndex: index }
                                : previous,
                            );
                          }}
                        >
                          {entry.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={() => setAiContentModal(null)}
              >
                Fechar
              </button>
            </div>
            <div
              style={{ overflow: "auto", display: "grid", gap: 10, padding: 12 }}
            >
              <div className="notice" style={{ whiteSpace: "pre-wrap" }}>
                {normalizeAiModalText(aiModalContent)}
              </div>
            </div>
          </div>
        </div>
      )}

      {cardPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setCardPreviewModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.7)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "82vh",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: "1px solid var(--border)",
                background: "rgba(11, 18, 29, 0.92)",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{cardPreviewModal.title}</strong>
                {cardPreviewModal.subtitle && (
                  <span className="small-muted">{cardPreviewModal.subtitle}</span>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={() => setCardPreviewModal(null)}
              >
                Fechar
              </button>
            </div>

            <div style={{ overflow: "auto", display: "grid", gap: 10, padding: 12 }}>
              <div
                className="notice"
                style={{
                  display: "grid",
                  justifyItems: "center",
                  padding: 12,
                }}
              >
                <img
                  src={cardPreviewModal.card.imageUrl}
                  alt={`Carta ${cardPreviewModal.card.cardNumber}`}
                  style={{
                    width: "min(420px, 88vw)",
                    maxHeight: "60vh",
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1px solid rgba(217, 164, 65, 0.35)",
                    background: "rgba(9, 15, 24, 0.7)",
                  }}
                />
              </div>
              <div className="notice" style={{ display: "grid", gap: 4 }}>
                <strong>Descrição</strong>
                <span className="small-muted">
                  {cardPreviewModal.card.description}
                </span>
              </div>
              <div className="notice" style={{ display: "grid", gap: 4 }}>
                <strong>Palavras-chave</strong>
                <span className="small-muted">
                  {cardPreviewModal.card.keywords}
                </span>
              </div>
              {cardPreviewModal.card.observation && (
                <div className="notice" style={{ display: "grid", gap: 4 }}>
                  <strong>Observação</strong>
                  <span className="small-muted">
                    {cardPreviewModal.card.observation}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {houseMeaningModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setHouseMeaningModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.7)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "82vh",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: "1px solid var(--border)",
                background: "rgba(11, 18, 29, 0.92)",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{houseMeaningModal.title}</strong>
                {houseMeaningModal.subtitle && (
                  <span className="small-muted">{houseMeaningModal.subtitle}</span>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={() => setHouseMeaningModal(null)}
              >
                Fechar
              </button>
            </div>

            <div style={{ overflow: "auto", display: "grid", gap: 10, padding: 12 }}>
              {houseMeaningModal.jumpContext && (
                <div className="notice" style={{ display: "grid", gap: 8 }}>
                  <span className="small-muted">
                    Contexto de atalho: casa {houseMeaningModal.jumpContext.from}{" "}
                    {houseMeaningModal.jumpContext.isUp ? "↗" : "↘"} casa{" "}
                    {houseMeaningModal.jumpContext.to} (
                    {houseMeaningModal.jumpContext.isUp ? "subida" : "descida"})
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setHouseMeaningModal((prev) =>
                          prev?.jumpContext
                            ? {
                                ...prev,
                                houseNumber: prev.jumpContext.from,
                                title: `Significado da casa ${prev.jumpContext.from}`,
                              }
                            : prev,
                        )
                      }
                    >
                      Ver casa {houseMeaningModal.jumpContext.from}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setHouseMeaningModal((prev) =>
                          prev?.jumpContext
                            ? {
                                ...prev,
                                houseNumber: prev.jumpContext.to,
                                title: `Significado da casa ${prev.jumpContext.to}`,
                              }
                            : prev,
                        )
                      }
                    >
                      Ver casa {houseMeaningModal.jumpContext.to}
                    </button>
                  </div>
                </div>
              )}

              {modalHouseInfo ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>
                      Casa {modalHouseInfo.number} • {modalHouseInfo.sanskrit || "—"} •{" "}
                      {modalHouseInfo.portuguese}
                    </strong>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Significado</strong>
                    <span className="small-muted">
                      {modalHouseInfo.meaning || modalHouseInfo.portuguese}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Palavras-chave gerais</strong>
                    <span className="small-muted">
                      {modalHouseInfo.keywords.length
                        ? modalHouseInfo.keywords.join(" • ")
                        : modalHouseInfo.description || "—"}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Lado Luz</strong>
                    <span className="small-muted">
                      {modalHouseInfo.polarity
                        ? `Palavras-chave: ${modalHouseInfo.polarity.lightKeywords}. ${modalHouseInfo.polarity.lightSummary}`
                        : "—"}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Lado Sombra</strong>
                    <span className="small-muted">
                      {modalHouseInfo.polarity
                        ? `Palavras-chave: ${modalHouseInfo.polarity.shadowKeywords}. ${modalHouseInfo.polarity.shadowSummary}`
                        : "—"}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Texto Terapêutico</strong>
                    <span className="small-muted">
                      {modalHouseTherapeutic
                        ? `${modalHouseTherapeutic.text} Pergunta: ${modalHouseTherapeutic.question}`
                        : modalHouseQuestion}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="small-muted">
                  Sem dados de significado para esta casa.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {showDashboardTutorial && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: isDockedCreateRoomTutorial || dashboardTutorialTargetRect
              ? "transparent"
              : "rgba(3, 6, 10, 0.72)",
            zIndex: 10000,
            pointerEvents: isTutorialCreateRoomConfigStep ? "none" : "auto",
          }}
        >
          {dashboardTutorialTargetRect && (
            <div
              style={{
                position: "fixed",
                top: dashboardTutorialTargetRect.top - 8,
                left: dashboardTutorialTargetRect.left - 8,
                width: dashboardTutorialTargetRect.width + 16,
                height: dashboardTutorialTargetRect.height + 16,
                borderRadius: 14,
                border: "2px solid rgba(217, 164, 65, 0.92)",
                boxShadow: isDockedCreateRoomTutorial
                  ? "0 0 0 5px rgba(217, 164, 65, 0.22)"
                  : "0 0 0 9999px rgba(3, 6, 10, 0.72), 0 0 0 5px rgba(217, 164, 65, 0.22)",
                pointerEvents: "none",
                zIndex: 10001,
              }}
            />
          )}
          {dashboardTutorialPopover && !isDockedCreateRoomTutorial && (
            <div
              style={{
                position: "fixed",
                width: 14,
                height: 14,
                background: "hsl(var(--temple-surface-2))",
                transform: "rotate(45deg)",
                zIndex: 10002,
                pointerEvents: "none",
                ...(dashboardTutorialPopover.placement === "right"
                  ? {
                      left: dashboardTutorialPopover.left - 7,
                      top:
                        dashboardTutorialPopover.top +
                        dashboardTutorialPopover.arrowOffset -
                        7,
                      borderLeft: "1px solid rgba(217, 164, 65, 0.55)",
                      borderTop: "1px solid rgba(217, 164, 65, 0.55)",
                    }
                  : dashboardTutorialPopover.placement === "left"
                    ? {
                        left:
                          dashboardTutorialPopover.left +
                          dashboardTutorialPopover.width -
                          7,
                        top:
                          dashboardTutorialPopover.top +
                          dashboardTutorialPopover.arrowOffset -
                          7,
                        borderRight: "1px solid rgba(217, 164, 65, 0.55)",
                        borderBottom: "1px solid rgba(217, 164, 65, 0.55)",
                      }
                    : dashboardTutorialPopover.placement === "bottom"
                      ? {
                          left:
                            dashboardTutorialPopover.left +
                            dashboardTutorialPopover.arrowOffset -
                            7,
                          top: dashboardTutorialPopover.top - 7,
                          borderLeft: "1px solid rgba(217, 164, 65, 0.55)",
                          borderTop: "1px solid rgba(217, 164, 65, 0.55)",
                        }
                      : {
                          left:
                            dashboardTutorialPopover.left +
                            dashboardTutorialPopover.arrowOffset -
                            7,
                          top:
                            dashboardTutorialPopover.top +
                            dashboardTutorialPopover.height -
                            7,
                          borderRight: "1px solid rgba(217, 164, 65, 0.55)",
                          borderBottom: "1px solid rgba(217, 164, 65, 0.55)",
                        }),
              }}
            />
          )}
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: dashboardTutorialPopover?.width || "min(420px, 94vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 12,
              position: "fixed",
              top: isDockedCreateRoomTutorial
                ? "auto"
                : dashboardTutorialPopover?.top || "50%",
              left: isDockedCreateRoomTutorial
                ? "50%"
                : dashboardTutorialPopover?.left || "50%",
              bottom: isDockedCreateRoomTutorial ? 18 : "auto",
              transform: isDockedCreateRoomTutorial
                ? "translateX(-50%)"
                : dashboardTutorialPopover
                  ? "none"
                  : "translate(-50%, -50%)",
              zIndex: 10002,
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <strong>
                Tutorial do dashboard ({dashboardTutorialStep + 1}/
                {dashboardTutorialSteps.length})
              </strong>
              <span className="small-muted">
                Esse guia aparece automaticamente apenas no primeiro acesso.
              </span>
            </div>

            <div className="notice" style={{ display: "grid", gap: 8 }}>
              <strong>
                {currentDashboardTutorialStep?.title}
              </strong>
              <span className="small-muted">
                {currentDashboardTutorialStep?.description}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() =>
                  setDashboardTutorialStep((prev) => Math.max(0, prev - 1))
                }
                disabled={dashboardTutorialStep === 0}
              >
                Voltar
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={finishDashboardTutorial}
                >
                  Pular tutorial
                </button>
                <button
                  onClick={() => {
                    if (
                      dashboardTutorialStep >=
                      dashboardTutorialSteps.length - 1
                    ) {
                      finishDashboardTutorial();
                      return;
                    }
                    setDashboardTutorialStep((prev) => prev + 1);
                  }}
                >
                  {dashboardTutorialStep >= dashboardTutorialSteps.length - 1
                    ? "Concluir"
                    : "Próximo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
