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

type RoomStats = {
  moves: number;
  therapyEntries: number;
  cardDraws: number;
  aiReports: number;
  rollsTotal: number;
  rollsUntilStart: number;
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
  | "create-room"
  | "filters"
  | "sessions-list"
  | "room-actions"
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

const DASHBOARD_ONBOARDING_VERSION = "2026-02-feature-pack";
const DASHBOARD_ONBOARDING_VERSION_KEY =
  "mahalilah:onboarding:dashboard:version";

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

  if (canCreateRoom) {
    steps.push({
      title: "Criar sala",
      description:
        'Defina "Jogadores maximos", marque se o terapeuta joga junto e use "Criar sala". Em sessao avulsa paga, a sala pode ser criada automaticamente.',
      target: "create-room",
    });
  }

  steps.push({
    title: "Filtros de sessao",
    description:
      'Use "Status", periodo "De/Ate" e "Aplicar filtros" para encontrar rapidamente as sessoes que deseja acompanhar.',
    target: "filters",
  });

  if (!hasRooms) {
    steps.push({
      title: "Minhas sessoes",
      description:
        'Quando a primeira sala aparecer (manual ou automatica apos checkout), aqui voce acompanha indicadores e abre detalhes por abas.',
      target: "sessions-list",
    });
    return steps;
  }

  steps.push(
    {
      title: "Acoes rapidas da sala",
      description:
        '"Abrir sala" (quando ativa) entra na partida e "Ver detalhes" abre a gestao. O chip "Novo" marca sala criada no checkout e some apos a primeira rodada.',
      target: "room-actions",
    },
    {
      title: "Aba Participantes",
      description:
        "Veja terapeuta e jogadores da sala, confira consentimento e remova participantes quando precisar ajustar a turma.",
      target: "room-tab-participants",
    },
    {
      title: "Aba Jornada",
      description:
        "Revise jogadas por ordem cronologica, com dado, casa, atalhos e registros terapeuticos por participante.",
      target: "room-tab-timeline",
    },
    {
      title: "Aba Deck randomico",
      description:
        "Acompanhe todas as cartas tiradas na sessao e filtre por jogador para leitura individual do percurso.",
      target: "room-tab-deck",
    },
    {
      title: "Aba Relatorios IA",
      description:
        'Consulte ajudas da IA, "O Caminho ate agora" por intervalo de jogadas e relatorios finais para fechamento terapeutico.',
      target: "room-tab-aiReports",
    },
  );

  if (canManageRoom) {
    steps.splice(4, 0, {
      title: "Aba Convites",
      description:
        "Envie novos convites por e-mail, acompanhe quem esta pendente/aceito e use reenviar quando necessario.",
      target: "room-tab-invites",
    });
  }

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
  const [isFiltersMenuOpen, setIsFiltersMenuOpen] = useState(false);
  const [isIndicatorsCollapsed, setIsIndicatorsCollapsed] = useState(false);
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
  const [aiContentModal, setAiContentModal] = useState<{
    title: string;
    content: string;
    subtitle?: string;
  } | null>(null);
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
    async (override?: Partial<Filters>) => {
      setLoading(true);
      const activeFilters = {
        status: override?.status ?? filters.status,
        from: override?.from ?? filters.from,
        to: override?.to ?? filters.to,
      };

      const params = new URLSearchParams();
      if (activeFilters.status) params.set("status", activeFilters.status);
      if (activeFilters.from) params.set("from", activeFilters.from);
      if (activeFilters.to) params.set("to", activeFilters.to);

      const res = await fetch(
        `/api/mahalilah/rooms${params.toString() ? `?${params.toString()}` : ""}`,
      );
      if (!res.ok) {
        pushToast("Não foi possível carregar as salas.", "error");
        setLoading(false);
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
      setLoading(false);
    },
    [filters, pushToast],
  );

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

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

  useEffect(() => {
    if (!showDashboardTutorial) return;
    const currentStep = dashboardTutorialSteps[dashboardTutorialStep];
    if (currentStep?.target === "filters") {
      setIsFiltersMenuOpen(true);
    }
  }, [showDashboardTutorial, dashboardTutorialStep, dashboardTutorialSteps]);

  const finishDashboardTutorial = async () => {
    setShowDashboardTutorial(false);
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
    if (!room.canManage) return;
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

    const targetTab = DETAIL_TAB_BY_TUTORIAL_TARGET[currentStep.target];
    if (!targetTab) return;

    const firstRoomId = rooms[0]?.id;
    if (!firstRoomId) return;

    if (!openRooms[firstRoomId]) {
      setOpenRooms((prev) => ({ ...prev, [firstRoomId]: true }));
    }
    if (activeDetailTabs[firstRoomId] !== targetTab) {
      setActiveDetailTabs((prev) => ({ ...prev, [firstRoomId]: targetTab }));
    }
    if (!details[firstRoomId]) {
      void loadTimeline(firstRoomId);
    }
  }, [
    showDashboardTutorial,
    dashboardTutorialStep,
    dashboardTutorialSteps,
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
  const hasActiveFilters = Boolean(filters.status || filters.from || filters.to);

  const roomCards = visibleRooms.map((room, index) => {
    const isOpen = !!openRooms[room.id];
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
    const shouldShowNewChip =
      Boolean(room.isAutoCreatedFromCheckout) &&
      room.stats.rollsTotal === 0 &&
      room.stats.moves === 0;
    const isDeletingRoom = Boolean(deletingRoomIds[room.id]);
    return (
      <div
        key={room.id}
        className="card dashboard-room-card"
        style={{ display: "grid", gap: 14 }}
      >
        <div
          className="dashboard-room-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
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
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              {new Date(room.createdAt).toLocaleString("pt-BR")} •{" "}
              {room.participantsCount}/{room.maxParticipants} jogadores •{" "}
              {room.therapistSoloPlay
                ? "Terapeuta joga sozinho (demais visualizam)"
                : room.therapistPlays
                ? "Terapeuta joga junto"
                : "Terapeuta conduz sem jogar"}
            </div>
          </div>
            <div
              className="dashboard-room-actions"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
            data-tour-dashboard={index === 0 ? "room-actions" : undefined}
            >
            {room.canManage && hasNonTherapistParticipants && (
              <label
                className="small-muted"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 4px",
                }}
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
            {room.status === "ACTIVE" && (
              <a href={`/rooms/${room.code}`} className="btn-secondary">
                Abrir sala
              </a>
            )}
            <button
              className="btn-secondary"
              onClick={() => toggleRoom(room.id)}
            >
              {isOpen ? "Fechar detalhes" : "Detalhes"}
            </button>
            {room.canDelete && (
              <button
                className="btn-secondary"
                onClick={() => handleDeleteRoom(room)}
                disabled={isDeletingRoom}
                style={{
                  borderColor: "rgba(255, 107, 107, 0.45)",
                  color: "#ff9f9f",
                }}
              >
                {isDeletingRoom ? "Excluindo..." : "Excluir"}
              </button>
            )}
          </div>
        </div>

        <div className="grid dashboard-room-indicators" style={{ gap: 8 }}>
          <strong>Indicadores</strong>
          <div
            className="dashboard-room-pill-row"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <span className="pill">Jogadas: {room.stats.moves}</span>
            <span className="pill">Rolagens: {room.stats.rollsTotal}</span>
            <span className="pill">
              Até iniciar: {room.stats.rollsUntilStart}
            </span>
            <span className="pill">Registros: {room.stats.therapyEntries}</span>
            <span className="pill">Cartas: {room.stats.cardDraws}</span>
            <span className="pill">Relatórios IA: {room.stats.aiReports}</span>
          </div>
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
                    index === 0 ? "room-tab-invites" : undefined
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
                  index === 0 ? "room-tab-participants" : undefined
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
                  index === 0 ? "room-tab-timeline" : undefined
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
                data-tour-dashboard={index === 0 ? "room-tab-deck" : undefined}
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
                  index === 0 ? "room-tab-aiReports" : undefined
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
                      room.canManage &&
                      (participant.role === "PLAYER" ||
                        Boolean(room.therapistSoloPlay));
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
                                onClick={() =>
                                  setAiContentModal({
                                    title: "Ajuda da IA",
                                    subtitle: `Jogada #${move.turnNumber} • ${new Date(moveTips[moveTips.length - 1]?.report.createdAt).toLocaleString("pt-BR")}`,
                                    content: moveTips
                                      .map((tip) => tip.parsed.text)
                                      .join("\n\n"),
                                  })
                                }
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
  const quotaPeriodLabel =
    roomQuota?.periodStart && roomQuota?.periodEnd
      ? `${new Date(roomQuota.periodStart).toLocaleDateString("pt-BR")} a ${new Date(
          roomQuota.periodEnd,
        ).toLocaleDateString("pt-BR")}`
      : roomQuota?.periodEnd
        ? `até ${new Date(roomQuota.periodEnd).toLocaleDateString("pt-BR")}`
        : "período atual";
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
  const indicatorRooms = createdRooms;
  const totalRoomsCount = indicatorRooms.length;
  const activeRoomsCount = indicatorRooms.filter(
    (room) => room.status === "ACTIVE",
  ).length;

  const occupancyBaseRooms =
    activeRoomsCount > 0
      ? indicatorRooms.filter((room) => room.status === "ACTIVE")
      : indicatorRooms;
  const occupiedSlots = occupancyBaseRooms.reduce(
    (sum, room) => sum + room.participantsCount,
    0,
  );
  const availableSlots = occupancyBaseRooms.reduce(
    (sum, room) => sum + room.maxParticipants,
    0,
  );
  const occupancyPercent =
    availableSlots > 0 ? Math.round((occupiedSlots / availableSlots) * 100) : 0;

  const invitesSentCount = indicatorRooms.reduce(
    (sum, room) => sum + room.invites.length,
    0,
  );
  const invitesAcceptedCount = indicatorRooms.reduce(
    (sum, room) =>
      sum + room.invites.filter((invite) => Boolean(invite.acceptedAt)).length,
    0,
  );
  const inviteAcceptancePercent =
    invitesSentCount > 0
      ? Math.round((invitesAcceptedCount / invitesSentCount) * 100)
      : null;

  const consentPendingParticipantsCount = indicatorRooms.reduce(
    (sum, room) =>
      sum +
      room.participants.filter(
        (participant) =>
          participant.role === "PLAYER" && !participant.consentAcceptedAt,
      ).length,
    0,
  );
  const consentPendingRoomsCount = indicatorRooms.filter((room) =>
    room.participants.some(
      (participant) =>
        participant.role === "PLAYER" && !participant.consentAcceptedAt,
    ),
  ).length;

  const activeRoomsWithoutMovementCount = indicatorRooms.filter(
    (room) => room.status === "ACTIVE" && room.stats.moves === 0,
  ).length;

  const totalMoves = indicatorRooms.reduce((sum, room) => sum + room.stats.moves, 0);
  const totalTherapyEntries = indicatorRooms.reduce(
    (sum, room) => sum + room.stats.therapyEntries,
    0,
  );
  const totalAiReports = indicatorRooms.reduce(
    (sum, room) => sum + room.stats.aiReports,
    0,
  );
  const therapyEntriesPerMove =
    totalMoves > 0 ? totalTherapyEntries / totalMoves : null;
  const aiReportsPerMove = totalMoves > 0 ? totalAiReports / totalMoves : null;

  const closedRoomsCount = indicatorRooms.filter(
    (room) => room.status === "CLOSED",
  ).length;
  const completedRoomsCount = indicatorRooms.filter(
    (room) => room.status === "COMPLETED",
  ).length;
  const finalizedRoomsCount = closedRoomsCount + completedRoomsCount;
  const completionRatePercent =
    totalRoomsCount > 0
      ? Math.round((completedRoomsCount / totalRoomsCount) * 100)
      : 0;
  const closedRoomsPercent =
    finalizedRoomsCount > 0
      ? Math.round((closedRoomsCount / finalizedRoomsCount) * 100)
      : 0;
  const completedRoomsPercent =
    finalizedRoomsCount > 0
      ? Math.round((completedRoomsCount / finalizedRoomsCount) * 100)
      : 0;

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const roomsCreatedLast7Days = indicatorRooms.filter((room) => {
    const createdAt = new Date(room.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt <= sevenDaysMs;
  }).length;
  const roomsCreatedLast30Days = indicatorRooms.filter((room) => {
    const createdAt = new Date(room.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt <= thirtyDaysMs;
  }).length;

  const dashboardAlerts: string[] = [];
  if (consentPendingParticipantsCount > 0) {
    dashboardAlerts.push(
      `${consentPendingParticipantsCount} participante(s) sem consentimento em ${consentPendingRoomsCount} sala(s).`,
    );
  }
  if (activeRoomsWithoutMovementCount > 0) {
    dashboardAlerts.push(
      `${activeRoomsWithoutMovementCount} sala(s) ativa(s) ainda sem jogadas.`,
    );
  }
  if (inviteAcceptancePercent !== null && inviteAcceptancePercent < 40) {
    dashboardAlerts.push(
      `Taxa de aceite de convites em ${inviteAcceptancePercent}% (abaixo de 40%).`,
    );
  }

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
            className="card dashboard-filters-card"
            style={{ display: "grid", gap: 12 }}
            data-tour-dashboard="filters"
          >
            <div
              className="dashboard-filters-head"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <h2 className="section-title">Filtros de sessão</h2>
              <button
                className="btn-secondary"
                onClick={() => setIsFiltersMenuOpen((prev) => !prev)}
                aria-expanded={isFiltersMenuOpen}
                aria-controls="dashboard-filters-menu"
              >
                {isFiltersMenuOpen ? "✕ Fechar" : "☰ Filtros"}
              </button>
            </div>
            {hasActiveFilters && (
              <span className="small-muted">Filtros ativos aplicados no painel.</span>
            )}
            {isFiltersMenuOpen ? (
              <div id="dashboard-filters-menu" className="grid" style={{ gap: 12 }}>
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
                  <button
                    className="btn-secondary w-fit"
                    style={{ alignSelf: "center" }}
                    onClick={() => loadRooms()}
                  >
                    Aplicar filtros
                  </button>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setFilters({ status: "", from: "", to: "" });
                    loadRooms({ status: "", from: "", to: "" });
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <p className="small-muted" style={{ margin: 0 }}>
                Abra o menu para filtrar por status e período.
              </p>
            )}
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
          {canCreateRoom && (
            <div
              className="card dashboard-create-card"
              style={{ display: "grid", gap: 12 }}
              data-tour-dashboard="create-room"
            >
              <strong>Criar nova sala</strong>
              <div
                className="dashboard-create-row"
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Jogadores máximos</span>
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
                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    paddingTop: 22,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={therapistPlays}
                    onChange={(event) => {
                      if (therapistSoloPlay && !event.target.checked) return;
                      setTherapistPlays(event.target.checked);
                    }}
                    disabled={therapistSoloPlay}
                  />
                  <span>Terapeuta joga junto</span>
                </label>
                {canUseTherapistSoloPlay && (
                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      paddingTop: 22,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={therapistSoloPlay}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setTherapistSoloPlay(enabled);
                        if (enabled) {
                          setTherapistPlays(true);
                        }
                      }}
                    />
                    <span>Só o terapeuta joga (demais visualizam)</span>
                  </label>
                )}
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
              <p className="small-muted">
                Defina se o terapeuta entra na fila. Quando ele jogar junto, ocupa 1
                vaga de jogador.
                {canUseTherapistSoloPlay
                  ? ' No modo "só o terapeuta joga", os demais entram apenas como visualizadores da mesma partida.'
                  : ' O modo de jogadores somente visualização não está disponível no seu plano atual.'}
              </p>
              {isLimitedQuotaExhausted && (
                <p className="notice">
                  Você já usou todas as salas disponíveis no período atual do plano limitado.
                </p>
              )}
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

        <aside className="grid dashboard-side-column dashboard-right-column" style={{ gap: 16 }}>
          <div className="card dashboard-indicators-card" style={{ display: "grid", gap: 12 }}>
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
                onClick={() => setIsIndicatorsCollapsed((prev) => !prev)}
                aria-expanded={!isIndicatorsCollapsed}
              >
                {isIndicatorsCollapsed ? "Expandir" : "Recolher"}
              </button>
            </div>

            {isIndicatorsCollapsed ? (
              <p className="small-muted" style={{ margin: 0 }}>
                Painel recolhido. Clique em "Expandir" para ver os indicadores.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
                    <span className="small-muted">Taxa de ocupação</span>
                    <strong>{occupancyPercent}%</strong>
                    <span className="small-muted">
                      {occupiedSlots}/{availableSlots} vagas preenchidas
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
                    <span className="small-muted">Convites aceitos</span>
                    <strong>
                      {inviteAcceptancePercent === null ? "--" : `${inviteAcceptancePercent}%`}
                    </strong>
                    <span className="small-muted">
                      {invitesAcceptedCount}/{invitesSentCount} convites
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
                    <span className="small-muted">Consentimento pendente</span>
                    <strong>{consentPendingParticipantsCount}</strong>
                    <span className="small-muted">
                      {consentPendingRoomsCount} sala{consentPendingRoomsCount === 1 ? "" : "s"} com pendência
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
                    <span className="small-muted">Salas ativas sem movimento</span>
                    <strong>{activeRoomsWithoutMovementCount}</strong>
                    <span className="small-muted">
                      de {activeRoomsCount} sala{activeRoomsCount === 1 ? "" : "s"} ativa
                      {activeRoomsCount === 1 ? "" : "s"}
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
                    <span className="small-muted">Profundidade terapêutica</span>
                    <strong>
                      {therapyEntriesPerMove === null
                        ? "--"
                        : therapyEntriesPerMove.toFixed(2).replace(".", ",")}
                    </strong>
                    <span className="small-muted">registros por jogada</span>
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
                    <span className="small-muted">Uso da IA</span>
                    <strong>
                      {aiReportsPerMove === null
                        ? "--"
                        : aiReportsPerMove.toFixed(2).replace(".", ",")}
                    </strong>
                    <span className="small-muted">relatórios por jogada</span>
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
                    <strong>{completionRatePercent}%</strong>
                    <span className="small-muted">
                      {completedRoomsCount}/{totalRoomsCount} salas completas
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
                    <span className="small-muted">Ritmo de criação</span>
                    <strong>
                      7d: {roomsCreatedLast7Days} | 30d: {roomsCreatedLast30Days}
                    </strong>
                    <span className="small-muted">salas criadas</span>
                  </div>

                  {roomQuota && (
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
                        {roomQuota.planType === "SUBSCRIPTION_LIMITED"
                          ? "Salas do plano limitado"
                          : "Salas no período"}
                      </span>
                      <strong>{roomQuota.roomsUsed}</strong>
                      <span className="small-muted">Período: {quotaPeriodLabel}</span>
                      {roomQuota.planType === "SUBSCRIPTION_LIMITED" ? (
                        <span className="small-muted">
                          Máx.: {limitedCatalogLimit == null ? "Ilimitado" : limitedCatalogLimit} |
                          Disponíveis:{" "}
                          {roomQuota.roomsRemaining == null ? "Ilimitadas" : roomQuota.roomsRemaining}
                        </span>
                      ) : (
                        <span className="small-muted">
                          Limite: {roomQuota.roomsLimit == null ? "Ilimitado" : roomQuota.roomsLimit}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div className="pill" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>Encerradas (CLOSED)</span>
                      <strong>
                        {finalizedRoomsCount > 0 ? `${closedRoomsPercent}%` : "--"} ({closedRoomsCount})
                      </strong>
                    </div>
                    <div className="pill" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>Completas (COMPLETED)</span>
                      <strong>
                        {finalizedRoomsCount > 0 ? `${completedRoomsPercent}%` : "--"} ({completedRoomsCount})
                      </strong>
                    </div>
                  </div>
                </div>

                {dashboardAlerts.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: 10,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <strong>Alertas rápidos</strong>
                    {dashboardAlerts.map((alert) => (
                      <span key={alert} className="small-muted">
                        • {alert}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

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
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{aiContentModal.title}</strong>
                {aiContentModal.subtitle && (
                  <span className="small-muted">{aiContentModal.subtitle}</span>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={() => setAiContentModal(null)}
              >
                Fechar
              </button>
            </div>
            <div className="notice" style={{ whiteSpace: "pre-wrap" }}>
              {aiContentModal.content}
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

            <div style={{ display: "grid", gap: 10 }}>
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
      )}

      {showDashboardTutorial && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: dashboardTutorialTargetRect
              ? "transparent"
              : "rgba(3, 6, 10, 0.72)",
            zIndex: 10000,
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
                boxShadow:
                  "0 0 0 9999px rgba(3, 6, 10, 0.72), 0 0 0 5px rgba(217, 164, 65, 0.22)",
                pointerEvents: "none",
                zIndex: 10001,
              }}
            />
          )}
          {dashboardTutorialPopover && (
            <div
              style={{
                position: "fixed",
                width: 14,
                height: 14,
                background: "hsl(var(--temple-surface-2))",
                transform: "rotate(45deg)",
                zIndex: 10002,
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
              top: dashboardTutorialPopover?.top || "50%",
              left: dashboardTutorialPopover?.left || "50%",
              transform: dashboardTutorialPopover
                ? "none"
                : "translate(-50%, -50%)",
              zIndex: 10002,
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
                {dashboardTutorialSteps[dashboardTutorialStep]?.title}
              </strong>
              <span className="small-muted">
                {dashboardTutorialSteps[dashboardTutorialStep]?.description}
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
