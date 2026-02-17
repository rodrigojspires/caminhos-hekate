"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import {
  BOARD_COLS,
  BOARD_ROWS,
  JUMPS,
  getHouseByNumber,
  getHousePrompt,
} from "@hekate/mahalilah-core";
import { HOUSE_MEANINGS } from "@/lib/mahalilah/house-meanings";
import { HOUSE_POLARITIES } from "@/lib/mahalilah/house-polarities";
import { HOUSE_THERAPEUTIC_TEXTS } from "@/lib/mahalilah/house-therapeutic-texts";

type Participant = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
  consentAcceptedAt: string | null;
  gameIntention?: string | null;
};

type PlayerState = {
  participantId: string;
  position: number;
  hasStarted: boolean;
  hasCompleted: boolean;
  rollCountTotal: number;
  rollCountUntilStart: number;
};

type RoomState = {
  room: {
    id: string;
    code: string;
    status: string;
    planType?: string;
    isTrial?: boolean;
    playerIntentionLocked?: boolean;
    therapistSoloPlay?: boolean;
    therapistSummary?: string | null;
    aiReportsCount?: number;
    currentTurnIndex: number;
    turnParticipantId: string | null;
    therapistOnline: boolean;
  };
  participants: Participant[];
  playerStates: PlayerState[];
  aiUsage?: Array<{
    participantId: string;
    tipsUsed: number;
    tipsLimit: number;
  }>;
  lastMove: {
    id: string;
    participantId: string;
    turnNumber: number;
    diceValue: number;
    fromPos: number;
    toPos: number;
    appliedJumpFrom: number | null;
    appliedJumpTo: number | null;
  } | null;
  deckHistory: Array<{
    id: string;
    moveId: string | null;
    moveTurnNumber: number | null;
    cards: number[];
    createdAt: string;
    drawnBy: { id: string; user: { name: string | null; email: string } };
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
    } | null;
  }>;
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
    emotion: string | null;
    intensity: number | null;
    insight: string | null;
    body: string | null;
    microAction: string | null;
    createdAt: string;
  }>;
  cardDraws: Array<{
    id: string;
    cards: number[];
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
    } | null;
  }>;
};

type ActionPanel =
  | "house"
  | "deck"
  | "therapy"
  | "ai"
  | "players"
  | "timeline"
  | "summary";
type ToastKind = "info" | "success" | "warning" | "error";

type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
};

type TimelineAiReport = {
  id: string;
  kind: "TIP" | "PROGRESS" | "FINAL";
  content: string;
  createdAt: string;
  participant: {
    id: string;
    user: { name: string | null; email: string };
  } | null;
};

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

type RoomTutorialTarget =
  | "room-header"
  | "room-controls"
  | "room-board"
  | "room-menu-house"
  | "room-menu-deck"
  | "room-menu-therapy"
  | "room-menu-ai"
  | "room-menu-players"
  | "room-menu-timeline"
  | "room-menu-summary";

type TutorialStep = {
  title: string;
  description: string;
  target: RoomTutorialTarget;
};

type RoomTutorialRole = "THERAPIST" | "PLAYER";

const COLORS = [
  "#2f7f6f",
  "#b44c4c",
  "#546fa3",
  "#c07a4a",
  "#7a5aa5",
  "#d5a439",
];
const TRIAL_POST_START_MOVE_LIMIT = 5;
const DICE_ANIMATION_STORAGE_KEY = "mahalilah:dice-animation-enabled";
const ROOM_ONBOARDING_VERSION = "2026-02-feature-pack";
const ROOM_ONBOARDING_THERAPIST_VERSION_KEY =
  "mahalilah:onboarding:room:therapist:version";
const ROOM_ONBOARDING_PLAYER_VERSION_KEY =
  "mahalilah:onboarding:room:player:version";
const DICE_SPIN_INTERVAL_MS = 90;
const DICE_MIN_SPIN_MS = 900;
const DICE_RESULT_PREVIEW_MS = 950;

const ACTION_ITEMS: Array<{
  key: ActionPanel;
  label: string;
  icon: string;
  shortLabel: string;
}> = [
  { key: "house", label: "Significado da Casa", icon: "⌂", shortLabel: "Casa" },
  { key: "deck", label: "Tirar carta", icon: "♢", shortLabel: "Carta" },
  {
    key: "therapy",
    label: "Registro Terapêutico",
    icon: "✎",
    shortLabel: "Registro",
  },
  { key: "ai", label: "IA Terapêutica", icon: "✦", shortLabel: "IA" },
  {
    key: "players",
    label: "Jogadores",
    icon: "◉",
    shortLabel: "Jogadores",
  },
  {
    key: "timeline",
    label: "Jornada",
    icon: "☰",
    shortLabel: "Jornada",
  },
  {
    key: "summary",
    label: "Resumo do Jogador",
    icon: "▣",
    shortLabel: "Resumo",
  },
];

const HOUSE_SANSKRIT_NAMES: string[] = [
  "Janma",
  "Maya",
  "Krodh",
  "Lobh",
  "Bhu Loka",
  "Moha",
  "Mada",
  "Matsarya",
  "Kama Loka",
  "Shuddhi",
  "Gandharvas",
  "Eirsha",
  "Antariksha",
  "Bhuvar Loka",
  "Naga Loka",
  "Dvesh",
  "Daya",
  "Harsha Loka",
  "Karma Loka",
  "Daan",
  "Saman Papa",
  "Dharma Loka",
  "Svarga Loka",
  "Ku Sang Loka",
  "Su Sang Loka",
  "Dukh",
  "Parmarth",
  "Sudharma",
  "Adharma",
  "Uttam Gati",
  "Yarksha Loka",
  "Mahar Loka",
  "Gandha Loka",
  "Rasa Loka",
  "Narka Loka",
  "Swatch",
  "Jnana",
  "Prana Loka",
  "Apana Loka",
  "Vyana Loka",
  "Jana Loka",
  "Agni Loka",
  "Manushya Janma",
  "Avidya",
  "Suvidya",
  "Vivek",
  "Saraswati",
  "Yamuna",
  "Ganga",
  "Tapa Loka",
  "Prithvi",
  "Himsa Loka",
  "Jala Loka",
  "Bhakti Loka",
  "Ahamkara",
  "Omkar",
  "Vayu Loka",
  "Teja Loka",
  "Satya Loka",
  "Subuddhi",
  "Durbuddhi",
  "Sukh",
  "Tamas",
  "Prakriti Loka",
  "Uranta Loka",
  "Ananda Loka",
  "Rudra Loka",
  "Vaikuntha Loka",
  "Brahma Loka",
  "Satoguna",
  "Rajoguna",
  "Tamoguna",
];

type HouseDisplayInfo = {
  number: number;
  sanskrit: string;
  portuguese: string;
  meaning: string;
  description: string;
  keywords: string[];
  polarity: {
    lightKeywords: string;
    lightSummary: string;
    shadowKeywords: string;
    shadowSummary: string;
  } | null;
};

function parseHouseKeywords(description: string | null | undefined) {
  if (!description) return [];
  return description
    .split(/[,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
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

function stripTherapeuticPromptPrefix(prompt: string) {
  return prompt.replace(/^Pergunta terapêutica:\s*/i, "").trim();
}

const ROOM_TUTORIAL_PANEL_BY_TARGET: Partial<
  Record<RoomTutorialTarget, ActionPanel>
> = {
  "room-menu-house": "house",
  "room-menu-deck": "deck",
  "room-menu-therapy": "therapy",
  "room-menu-ai": "ai",
  "room-menu-players": "players",
  "room-menu-timeline": "timeline",
  "room-menu-summary": "summary",
};

const TOUR_TARGET_BY_ACTION_PANEL: Record<ActionPanel, RoomTutorialTarget> = {
  house: "room-menu-house",
  deck: "room-menu-deck",
  therapy: "room-menu-therapy",
  ai: "room-menu-ai",
  players: "room-menu-players",
  timeline: "room-menu-timeline",
  summary: "room-menu-summary",
};

function getRoomTutorialSteps({
  role,
}: {
  role: RoomTutorialRole | null;
}): TutorialStep[] {
  if (!role) return [];

  const controlDescription =
    role === "THERAPIST"
      ? 'Use "Rolar dado" para jogar a vez atual, "Avancar vez" para passar ao proximo participante e "Encerrar sala" para finalizar. Ao concluir a jornada (casa 68), o sistema pergunta se deseja gerar o relatorio final.'
      : 'No seu turno use "Rolar dado". Fora do turno, acompanhe os indicadores e aguarde. O botao muda de status automaticamente conforme vez e conexao do terapeuta.';

  return [
    {
      title: "Indicadores da sala",
      description:
        "No topo voce acompanha vez atual, rolagens, casa atual, status do terapeuta e status da sala em tempo real.",
      target: "room-header",
    },
    {
      title: "Controles da partida",
      description: controlDescription,
      target: "room-controls",
    },
    {
      title: "Leitura do tabuleiro",
      description:
        "Aqui ficam os pinos dos jogadores, atalhos de subida/descida e destaque visual de quem esta na vez.",
      target: "room-board",
    },
    {
      title: "Menu Casa",
      description:
        "No icone Casa voce consulta significado, palavras-chave, lado luz/sombra e pergunta terapeutica da casa selecionada.",
      target: "room-menu-house",
    },
    {
      title: "Menu Carta",
      description:
        "No icone Carta o jogador da vez tira cartas do deck (ate 3 por jogada), com imagem e registro automatico na jornada.",
      target: "room-menu-deck",
    },
    {
      title: "Menu Registro",
      description:
        "No icone Registro voce salva emocao, insight, corpo e acao da jogada atual para acompanhamento terapeutico.",
      target: "room-menu-therapy",
    },
    {
      title: "Menu IA",
      description:
        'No icone IA voce pede ajuda contextual, acompanha limite de uso, consulta "O Caminho ate agora" por bloco de jogadas e gera relatorio final.',
      target: "room-menu-ai",
    },
    {
      title: "Menu Jogadores",
      description:
        "No icone Jogadores voce visualiza terapeuta e participantes, com destaque de quem esta com a vez.",
      target: "room-menu-players",
    },
    {
      title: "Menu Jornada",
      description:
        "No icone Jornada voce revisa jogadas, atalhos, cartas, registros terapeuticos e saidas de IA por participante.",
      target: "room-menu-timeline",
    },
    {
      title: "Menu Resumo",
      description:
        "No icone Resumo voce consolida caminho no tabuleiro, casas recorrentes, registros e historico de IA por jogador.",
      target: "room-menu-summary",
    },
  ];
}

function clampTutorialNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type RoomTutorialPopoverPosition = {
  width: number;
  height: number;
  left: number;
  top: number;
  placement: "right" | "left" | "bottom" | "top";
  arrowOffset: number;
};

function getRoomTutorialPopoverPosition(targetRect: DOMRect | null) {
  if (!targetRect || typeof window === "undefined") return null;

  const margin = 14;
  const gap = 14;
  const cardWidth = Math.min(430, window.innerWidth - margin * 2);
  const cardHeight = 300;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const canRight =
    targetRect.right + gap + cardWidth <= viewportWidth - margin;
  const canLeft = targetRect.left - gap - cardWidth >= margin;
  const canBottom =
    targetRect.bottom + gap + cardHeight <= viewportHeight - margin;

  let left = (viewportWidth - cardWidth) / 2;
  let top = (viewportHeight - cardHeight) / 2;
  let placement: RoomTutorialPopoverPosition["placement"] = "right";

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

  const clampedLeft = clampTutorialNumber(
    left,
    margin,
    viewportWidth - cardWidth - margin,
  );
  const clampedTop = clampTutorialNumber(
    top,
    margin,
    viewportHeight - cardHeight - margin,
  );

  const arrowOffset =
    placement === "right" || placement === "left"
      ? clampTutorialNumber(
          targetRect.top + targetRect.height / 2 - clampedTop,
          20,
          cardHeight - 20,
        )
      : clampTutorialNumber(
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
  } satisfies RoomTutorialPopoverPosition;
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
    // Backward compatibility with old plain-text payloads.
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

function randomDiceFace() {
  return Math.floor(Math.random() * 6) + 1;
}

function getDiceFaceSymbol(face: number) {
  const symbols = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return symbols[face - 1] || "⚀";
}

export function RoomClient({ code }: { code: string }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHouseNumber, setSelectedHouseNumber] = useState(68);
  const [activePanel, setActivePanel] = useState<ActionPanel>("house");
  const [therapy, setTherapy] = useState({
    emotion: "",
    intensity: 5,
    insight: "",
    body: "",
    microAction: "",
  });
  const [aiIntention, setAiIntention] = useState("");
  const [aiTipLoading, setAiTipLoading] = useState(false);
  const [aiTipUsage, setAiTipUsage] = useState<{
    used: number;
    limit: number;
  } | null>(null);
  const [aiIntentionSavedLabel, setAiIntentionSavedLabel] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineMoves, setTimelineMoves] = useState<TimelineMove[]>([]);
  const [timelineReports, setTimelineReports] = useState<TimelineAiReport[]>(
    [],
  );
  const [timelineTargetParticipantId, setTimelineTargetParticipantId] =
    useState("");
  const [aiHistoryParticipantId, setAiHistoryParticipantId] = useState("");
  const [summaryParticipantId, setSummaryParticipantId] = useState("");
  const [therapistSummaryDraft, setTherapistSummaryDraft] = useState("");
  const [therapistSummaryModalOpen, setTherapistSummaryModalOpen] =
    useState(false);
  const [therapistSummarySaving, setTherapistSummarySaving] = useState(false);
  const [showBoardNames, setShowBoardNames] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [diceAnimationEnabled, setDiceAnimationEnabled] = useState(true);
  const [rollInFlight, setRollInFlight] = useState(false);
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [showRoomTutorial, setShowRoomTutorial] = useState(false);
  const [roomTutorialStep, setRoomTutorialStep] = useState(0);
  const [roomTutorialRole, setRoomTutorialRole] =
    useState<RoomTutorialRole | null>(null);
  const roomTutorialSteps = useMemo(
    () => getRoomTutorialSteps({ role: roomTutorialRole }),
    [roomTutorialRole],
  );
  const [roomTutorialTargetRect, setRoomTutorialTargetRect] =
    useState<DOMRect | null>(null);
  const [roomTutorialInitializedRole, setRoomTutorialInitializedRole] =
    useState<RoomTutorialRole | null>(null);
  const [roomOnboardingLoaded, setRoomOnboardingLoaded] = useState(false);
  const [roomOnboardingSeen, setRoomOnboardingSeen] = useState({
    therapist: false,
    player: false,
  });
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
  const [finalReportPrompt, setFinalReportPrompt] = useState<{
    mode: "close" | "participantCompleted" | "trialLimit";
    participantId?: string;
    participantName?: string;
  } | null>(null);
  const [trialLimitModalOpen, setTrialLimitModalOpen] = useState(false);
  const [pendingTrialPlansAfterAiModal, setPendingTrialPlansAfterAiModal] =
    useState(false);
  const [finalReportLoading, setFinalReportLoading] = useState(false);
  const [pendingCompletedParticipantPrompts, setPendingCompletedParticipantPrompts] =
    useState<string[]>([]);
  const [replicateIntentionLoading, setReplicateIntentionLoading] =
    useState(false);
  const [houseMeaningModal, setHouseMeaningModal] =
    useState<HouseMeaningModalState | null>(null);
  const [cardPreviewModal, setCardPreviewModal] =
    useState<CardPreviewModalState | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileActionPanelOpen, setMobileActionPanelOpen] = useState(false);
  const syncedIntentionRef = useRef("");
  const completionStateByParticipantRef = useRef<Map<string, boolean>>(
    new Map(),
  );
  const completionPromptedParticipantsRef = useRef<Set<string>>(new Set());
  const completionPromptQueueProcessingRef = useRef(false);
  const trialModalPromptedRef = useRef(false);
  const diceSpinIntervalRef = useRef<number | null>(null);
  const diceRevealTimeoutRef = useRef<number | null>(null);
  const diceCloseTimeoutRef = useRef<number | null>(null);

  const pushToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev, { id, message, kind }].slice(-3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  const removeToast = (toastId: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const clearDiceTimers = useCallback(() => {
    if (diceSpinIntervalRef.current !== null) {
      window.clearInterval(diceSpinIntervalRef.current);
      diceSpinIntervalRef.current = null;
    }
    if (diceRevealTimeoutRef.current !== null) {
      window.clearTimeout(diceRevealTimeoutRef.current);
      diceRevealTimeoutRef.current = null;
    }
    if (diceCloseTimeoutRef.current !== null) {
      window.clearTimeout(diceCloseTimeoutRef.current);
      diceCloseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DICE_ANIMATION_STORAGE_KEY);
      if (stored === "false") {
        setDiceAnimationEnabled(false);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DICE_ANIMATION_STORAGE_KEY,
        diceAnimationEnabled ? "true" : "false",
      );
    } catch {
      // no-op
    }
  }, [diceAnimationEnabled]);

  useEffect(
    () => () => {
      clearDiceTimers();
    },
    [clearDiceTimers],
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    const loadOnboarding = async () => {
      try {
        const res = await fetch("/api/mahalilah/onboarding", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("onboarding-fetch-failed");
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;

        let therapistVersionSeen = false;
        let playerVersionSeen = false;
        try {
          therapistVersionSeen =
            window.localStorage.getItem(
              ROOM_ONBOARDING_THERAPIST_VERSION_KEY,
            ) === ROOM_ONBOARDING_VERSION;
          playerVersionSeen =
            window.localStorage.getItem(ROOM_ONBOARDING_PLAYER_VERSION_KEY) ===
            ROOM_ONBOARDING_VERSION;
        } catch {
          therapistVersionSeen = false;
          playerVersionSeen = false;
        }

        setRoomOnboardingSeen({
          therapist:
            Boolean(payload.roomTherapistSeen) && therapistVersionSeen,
          player: Boolean(payload.roomPlayerSeen) && playerVersionSeen,
        });
      } catch {
        if (cancelled) return;
        setRoomOnboardingSeen({
          therapist: true,
          player: true,
        });
      } finally {
        if (!cancelled) {
          setRoomOnboardingLoaded(true);
        }
      }
    };

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const syncViewport = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setMobileActionPanelOpen(false);
      }
    };

    syncViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;
    let currentSocket: Socket | null = null;

    const connect = async () => {
      setLoading(true);
      setFatalError(null);

      const res = await fetch("/api/mahalilah/realtime/token");
      if (!res.ok) {
        if (!cancelled) {
          setFatalError("Não foi possível autenticar no realtime.");
          setLoading(false);
          pushToast("Não foi possível autenticar no realtime.", "error");
        }
        return;
      }

      const { token, wsUrl } = await res.json();
      if (cancelled) return;

      const s = io(wsUrl, {
        transports: ["websocket"],
        auth: { token },
      });
      currentSocket = s;

      s.on("connect_error", (err) => {
        if (!cancelled) {
          pushToast(err.message || "Erro de conexão com a sala.", "error");
        }
      });

      s.on("room:state", (payload: RoomState) => {
        if (!cancelled) {
          setState(payload);
          setLoading(false);
          setFatalError(null);
        }
      });

      s.emit("room:join", { code }, (resp: any) => {
        if (cancelled) return;
        if (!resp?.ok) {
          const message = resp?.error || "Não foi possível entrar na sala.";
          setFatalError(message);
          setLoading(false);
          pushToast(message, "error");
          return;
        }
        setState(resp.state);
        setLoading(false);
        setFatalError(null);
      });

      setSocket(s);
    };

    connect();

    return () => {
      cancelled = true;
      if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
      }
    };
  }, [session?.user?.id, code, pushToast]);

  useEffect(() => {
    if (!state?.lastMove) return;
    setSelectedHouseNumber(state.lastMove.toPos);
  }, [state?.lastMove?.id, state?.lastMove?.toPos]);

  useEffect(() => {
    setTimelineLoaded(false);
    setTimelineError(null);
    setTimelineMoves([]);
    setTimelineReports([]);
    clearDiceTimers();
    setRollInFlight(false);
    setDiceModalOpen(false);
    setDiceRolling(false);
    setDiceResult(null);
    setFinalReportPrompt(null);
    setPendingCompletedParticipantPrompts([]);
    completionStateByParticipantRef.current = new Map();
    completionPromptedParticipantsRef.current = new Set();
    completionPromptQueueProcessingRef.current = false;
  }, [state?.room.id, clearDiceTimers]);

  useEffect(() => {
    if (!state?.room) return;
    setTherapistSummaryDraft(state.room.therapistSummary || "");
  }, [state?.room.id, state?.room.therapistSummary]);

  const boardCells = useMemo(() => {
    const cells: Array<{ houseNumber: number; row: number; col: number }> = [];

    // Keep the exact serpentine construction used in the original HTML board.
    for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const cellNumber =
          row % 2 === 0
            ? col + row * BOARD_COLS
            : BOARD_COLS - 1 - col + row * BOARD_COLS;
        cells.push({ houseNumber: cellNumber + 1, row, col });
      }
    }

    return cells;
  }, []);

  const jumpMap = useMemo(
    () => new Map(JUMPS.map((jump) => [jump.from, jump.to])),
    [],
  );

  const currentParticipant = useMemo(() => {
    if (!state) return null;
    if (state.room.turnParticipantId === null) {
      return null;
    }
    if (typeof state.room.turnParticipantId === "string") {
      return (
        state.participants.find(
          (participant) => participant.id === state.room.turnParticipantId,
        ) || null
      );
    }
    return state.participants[state.room.currentTurnIndex] || null;
  }, [state]);

  const myParticipant = useMemo(() => {
    if (!state || !session?.user?.id) return null;
    return (
      state.participants.find(
        (participant) => participant.user.id === session.user.id,
      ) || null
    );
  }, [state, session?.user?.id]);

  const isTherapistSoloPlay = Boolean(state?.room.therapistSoloPlay);
  const therapistParticipantInRoom = useMemo(() => {
    if (!state?.participants) return null;
    return (
      state.participants.find((participant) => participant.role === "THERAPIST") ||
      null
    );
  }, [state?.participants]);

  const playerStateMap = useMemo(() => {
    const map = new Map<string, PlayerState>();
    state?.playerStates.forEach((playerState) =>
      map.set(playerState.participantId, playerState),
    );
    return map;
  }, [state]);

  const myPlayerState = myParticipant
    ? playerStateMap.get(myParticipant.id)
    : undefined;
  const indicatorParticipant =
    isTherapistSoloPlay &&
    myParticipant?.role === "PLAYER" &&
    therapistParticipantInRoom
      ? therapistParticipantInRoom
      : myPlayerState
        ? myParticipant
        : currentParticipant;
  const indicatorState = indicatorParticipant
    ? playerStateMap.get(indicatorParticipant.id)
    : undefined;
  const indicatorHouseNumber = (indicatorState?.position ?? 67) + 1;

  const selectedHouse =
    getHouseByNumber(selectedHouseNumber) ||
    getHouseByNumber(indicatorHouseNumber);
  const selectedHouseInfo = selectedHouse
    ? getHouseDisplayInfo(selectedHouse.number)
    : null;
  const selectedHouseQuestion = selectedHouse
    ? stripTherapeuticPromptPrefix(getHousePrompt(selectedHouse.number))
    : "";
  const selectedHouseTherapeutic = selectedHouse
    ? HOUSE_THERAPEUTIC_TEXTS[selectedHouse.number] || null
    : null;
  const modalHouseInfo = houseMeaningModal
    ? getHouseDisplayInfo(houseMeaningModal.houseNumber)
    : null;
  const modalHouseQuestion = houseMeaningModal
    ? stripTherapeuticPromptPrefix(getHousePrompt(houseMeaningModal.houseNumber))
    : "";
  const modalHouseTherapeutic = houseMeaningModal
    ? HOUSE_THERAPEUTIC_TEXTS[houseMeaningModal.houseNumber] || null
    : null;
  const lastMoveHouseInfo = state?.lastMove
    ? getHouseDisplayInfo(state.lastMove.toPos)
    : null;
  const lastMoveJump =
    state?.lastMove?.appliedJumpFrom !== null &&
    state?.lastMove?.appliedJumpFrom !== undefined &&
    state?.lastMove?.appliedJumpTo !== null &&
    state?.lastMove?.appliedJumpTo !== undefined
      ? {
          from: state.lastMove.appliedJumpFrom,
          to: state.lastMove.appliedJumpTo,
          isUp: state.lastMove.appliedJumpTo > state.lastMove.appliedJumpFrom,
        }
      : null;
  const lastMoveJumpFromInfo = lastMoveJump
    ? getHouseDisplayInfo(lastMoveJump.from)
    : null;
  const lastMoveJumpToInfo = lastMoveJump
    ? getHouseDisplayInfo(lastMoveJump.to)
    : null;

  const openHouseMeaningModal = ({
    houseNumber,
    title,
    subtitle,
    jumpContext,
  }: HouseMeaningModalState) => {
    setHouseMeaningModal({ houseNumber, title, subtitle, jumpContext });
  };

  const needsConsent = Boolean(
    myParticipant && !myParticipant.consentAcceptedAt,
  );
  const actionsBlockedByConsent = needsConsent && !consentAccepted;
  const isViewerInTherapistSoloPlay = Boolean(
    isTherapistSoloPlay && myParticipant?.role === "PLAYER",
  );
  const isTrialRoom = Boolean(state?.room.isTrial);
  const myPostStartMovesUsed = myPlayerState
    ? Math.max(0, myPlayerState.rollCountTotal - myPlayerState.rollCountUntilStart)
    : 0;
  const trialMovesRemaining = Math.max(
    0,
    TRIAL_POST_START_MOVE_LIMIT - myPostStartMovesUsed,
  );
  const trialLimitReached = Boolean(
    isTrialRoom && myPlayerState?.hasStarted && myPostStartMovesUsed >= TRIAL_POST_START_MOVE_LIMIT,
  );
  const isMyTurn = currentParticipant?.user.id === session?.user?.id;
  const canLogTherapy = Boolean(
    state?.lastMove &&
      myParticipant &&
      state.lastMove.participantId === myParticipant.id &&
      !isViewerInTherapistSoloPlay,
  );
  const isTherapist = myParticipant?.role === "THERAPIST";
  const canCloseRoom = myParticipant?.role === "THERAPIST";
  const isPlayerIntentionLocked = Boolean(
    myParticipant?.role === "PLAYER" && state?.room.playerIntentionLocked,
  );
  const shouldShowSessionIntentionField = Boolean(
    myParticipant && !isViewerInTherapistSoloPlay,
  );
  const canEditSessionIntention = Boolean(
    myParticipant && !isPlayerIntentionLocked && !isViewerInTherapistSoloPlay,
  );
  const playerParticipantsCount =
    state?.participants.filter((participant) => participant.role === "PLAYER")
      .length || 0;
  const canReplicateIntentionToPlayers = Boolean(
    myParticipant?.role === "THERAPIST" &&
      !isTherapistSoloPlay &&
      playerParticipantsCount > 1,
  );
  const canRoll = Boolean(
    isMyTurn &&
      state?.room.status === "ACTIVE" &&
      !actionsBlockedByConsent &&
      !trialLimitReached &&
      state?.room.therapistOnline,
  );

  const timelineParticipants = useMemo(() => {
    if (!state?.participants || !myParticipant) return [];
    if (myParticipant.role !== "THERAPIST") return [myParticipant];
    if (!isTherapistSoloPlay) return state.participants;
    return state.participants.filter(
      (participant) => participant.role === "THERAPIST",
    );
  }, [state?.participants, myParticipant, isTherapistSoloPlay]);

  const boardParticipants = useMemo(() => {
    if (!state?.participants) return [];
    if (!isTherapistSoloPlay) return state.participants;
    return state.participants.filter((participant) => participant.role === "THERAPIST");
  }, [state?.participants, isTherapistSoloPlay]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      const targetGroup = isTherapistSoloPlay
        ? state.participants.filter((participant) => participant.role === "THERAPIST")
        : state.participants;
      const preferredPlayer = targetGroup.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = targetGroup[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setTimelineTargetParticipantId((prev) => prev || targetId);
      return;
    }

    setTimelineTargetParticipantId(myParticipant.id);
  }, [state, myParticipant, isTherapistSoloPlay, therapistParticipantInRoom]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      const targetGroup = isTherapistSoloPlay
        ? state.participants.filter((participant) => participant.role === "THERAPIST")
        : state.participants;
      const preferredPlayer = targetGroup.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = targetGroup[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setSummaryParticipantId((prev) => prev || targetId);
      return;
    }

    const targetId =
      isTherapistSoloPlay && therapistParticipantInRoom
        ? therapistParticipantInRoom.id
        : myParticipant.id;
    setSummaryParticipantId(targetId);
  }, [state, myParticipant, isTherapistSoloPlay, therapistParticipantInRoom]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      const targetGroup = isTherapistSoloPlay
        ? state.participants.filter((participant) => participant.role === "THERAPIST")
        : state.participants;
      const preferredPlayer = targetGroup.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = targetGroup[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setAiHistoryParticipantId((prev) => prev || targetId);
      return;
    }

    const targetId =
      isTherapistSoloPlay && therapistParticipantInRoom
        ? therapistParticipantInRoom.id
        : myParticipant.id;
    setAiHistoryParticipantId(targetId);
  }, [state, myParticipant, isTherapistSoloPlay, therapistParticipantInRoom]);

  const filteredTimelineMoves = useMemo(() => {
    const effectiveTargetId =
      myParticipant?.role === "THERAPIST"
        ? timelineTargetParticipantId
        : myParticipant?.id || "__no-participant__";
    if (!effectiveTargetId) return timelineMoves;
    return timelineMoves.filter(
      (move) => move.participant.id === effectiveTargetId,
    );
  }, [timelineMoves, timelineTargetParticipantId, myParticipant]);

  const filteredTimelineReports = useMemo(() => {
    const effectiveTargetId =
      myParticipant?.role === "THERAPIST"
        ? timelineTargetParticipantId
        : myParticipant?.id || "__no-participant__";
    if (!effectiveTargetId) return timelineReports;
    return timelineReports.filter(
      (report) => report.participant?.id === effectiveTargetId,
    );
  }, [timelineReports, timelineTargetParticipantId, myParticipant]);

  const timelineTipsByMoveKey = useMemo(() => {
    const tipsByKey = new Map<
      string,
      Array<{ report: TimelineAiReport; parsed: ParsedTip }>
    >();

    filteredTimelineReports.forEach((report) => {
      if (report.kind !== "TIP" || !report.participant?.id) return;
      const parsed = parseTipReportContent(report.content);
      if (parsed.turnNumber !== null) {
        const key = `${report.participant.id}:${parsed.turnNumber}`;
        const existing = tipsByKey.get(key) || [];
        existing.push({ report, parsed });
        tipsByKey.set(key, existing);
      }
    });

    return tipsByKey;
  }, [filteredTimelineReports]);

  const aiTipHistory = useMemo(() => {
    if (!aiHistoryParticipantId) return [];
    const history = timelineReports
      .filter(
        (report) =>
          report.kind === "TIP" &&
          report.participant?.id === aiHistoryParticipantId,
      )
      .map((report) => ({
        report,
        parsed: parseTipReportContent(report.content),
      }))
      .sort(
        (a, b) =>
          new Date(a.report.createdAt).getTime() -
          new Date(b.report.createdAt).getTime(),
      );

    return history.map((entry, index) => ({
      ...entry,
      helpNumber: index + 1,
    }));
  }, [timelineReports, aiHistoryParticipantId]);

  const progressReportsByParticipantId = useMemo(() => {
    const reportsByParticipantId = new Map<string, TimelineAiReport[]>();

    timelineReports.forEach((report) => {
      if (report.kind !== "PROGRESS" || !report.participant?.id) return;
      const existing = reportsByParticipantId.get(report.participant.id) || [];
      existing.push(report);
      reportsByParticipantId.set(report.participant.id, existing);
    });

    reportsByParticipantId.forEach((reports, participantId) => {
      reportsByParticipantId.set(
        participantId,
        reports.sort((a, b) => {
          const parsedA = parseProgressSummaryContent(a.content);
          const parsedB = parseProgressSummaryContent(b.content);
          const endA = parsedA.intervalEnd ?? 0;
          const endB = parsedB.intervalEnd ?? 0;
          if (endA !== endB) return endB - endA;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
      );
    });

    return reportsByParticipantId;
  }, [timelineReports]);

  const selectedProgressReports = useMemo(() => {
    if (!aiHistoryParticipantId) return [];
    return progressReportsByParticipantId.get(aiHistoryParticipantId) || [];
  }, [progressReportsByParticipantId, aiHistoryParticipantId]);

  const finalReportsByParticipantId = useMemo(() => {
    const reportsByParticipantId = new Map<string, TimelineAiReport[]>();

    timelineReports.forEach((report) => {
      if (report.kind !== "FINAL" || !report.participant?.id) return;
      const existing = reportsByParticipantId.get(report.participant.id) || [];
      existing.push(report);
      reportsByParticipantId.set(report.participant.id, existing);
    });

    reportsByParticipantId.forEach((reports, participantId) => {
      reportsByParticipantId.set(
        participantId,
        reports.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    });

    return reportsByParticipantId;
  }, [timelineReports]);

  const finalReportParticipants = useMemo(() => {
    if (!state?.participants || !myParticipant) return [];

    if (isTherapistSoloPlay) {
      const therapistOnly = state.participants.filter(
        (participant) => participant.role === "THERAPIST",
      );
      return therapistOnly;
    }

    const players = state.participants.filter(
      (participant) => participant.role === "PLAYER",
    );

    if (isTherapist) {
      if (players.length > 0) return players;
      return [myParticipant];
    }

    if (myParticipant.role === "PLAYER") {
      return players.filter((participant) => participant.id === myParticipant.id);
    }

    return [myParticipant];
  }, [state?.participants, myParticipant, isTherapist, isTherapistSoloPlay]);

  const finalReportPromptTargets = useMemo(() => {
    if (!state?.participants) return [];

    if (isTherapistSoloPlay) {
      return state.participants.filter(
        (participant) => participant.role === "THERAPIST",
      );
    }

    const players = state.participants.filter(
      (participant) => participant.role === "PLAYER",
    );
    if (players.length > 0) return players;

    const therapist = state.participants.find(
      (participant) => participant.role === "THERAPIST",
    );
    return therapist ? [therapist] : [];
  }, [state?.participants, isTherapistSoloPlay]);

  const finalReportPromptTargetIds = useMemo(
    () => new Set(finalReportPromptTargets.map((participant) => participant.id)),
    [finalReportPromptTargets],
  );

  const summaryParticipant = useMemo(() => {
    if (!summaryParticipantId) return null;
    return (
      state?.participants.find(
        (participant) => participant.id === summaryParticipantId,
      ) || null
    );
  }, [state?.participants, summaryParticipantId]);

  const summaryPlayerState = summaryParticipant
    ? playerStateMap.get(summaryParticipant.id)
    : undefined;

  const summaryMoves = useMemo(() => {
    if (!summaryParticipantId) return [];
    return timelineMoves.filter(
      (move) => move.participant.id === summaryParticipantId,
    );
  }, [timelineMoves, summaryParticipantId]);

  const summaryPath = useMemo(() => {
    const path: number[] = [];

    summaryMoves.forEach((move) => {
      const jumpFrom = move.appliedJumpFrom;
      const jumpTo = move.appliedJumpTo;
      if (jumpFrom === null || jumpTo === null) {
        path.push(move.toPos);
        return;
      }

      path.push(jumpFrom);
      if (jumpTo !== jumpFrom) {
        path.push(jumpTo);
      }
    });

    return path;
  }, [summaryMoves]);

  useEffect(() => {
    if (!myParticipant) {
      syncedIntentionRef.current = "";
      setAiIntention("");
      setAiIntentionSavedLabel("");
      return;
    }

    const participantIntention = myParticipant.gameIntention || "";
    const syncKey = `${myParticipant.id}:${participantIntention}`;
    if (syncedIntentionRef.current === syncKey) {
      return;
    }

    syncedIntentionRef.current = syncKey;
    setAiIntention(participantIntention);
    setAiIntentionSavedLabel(
      participantIntention
        ? "Intenção carregada da sala."
        : "",
    );
  }, [myParticipant]);

  const persistAiIntention = () => {
    if (!socket || !myParticipant || !canEditSessionIntention) return;

    const normalizedIntention = aiIntention.trim();
    const currentIntention = (myParticipant.gameIntention || "").trim();
    if (normalizedIntention === currentIntention) {
      setAiIntentionSavedLabel("Intenção já está atualizada.");
      return;
    }

    socket.emit(
      "participant:setIntention",
      { intention: normalizedIntention },
      (resp: any) => {
        if (!resp?.ok) {
          pushToast(resp?.error || "Erro ao salvar intenção", "error");
          return;
        }
        setAiIntention(typeof resp.intention === "string" ? resp.intention : "");
        setAiIntentionSavedLabel("Intenção salva na sala.");
      },
    );
  };

  const replicateIntentionToPlayers = async () => {
    if (!socket || !canReplicateIntentionToPlayers) return;

    setReplicateIntentionLoading(true);
    try {
      const resp = await new Promise<any>((resolve) => {
        socket.emit(
          "participant:replicateIntentionToPlayers",
          { intention: aiIntention },
          resolve,
        );
      });

      if (!resp?.ok) {
        showSocketError("Erro ao replicar intenção", resp);
        return;
      }

      const intentionValue =
        typeof resp?.intention === "string" ? resp.intention : aiIntention;
      setAiIntention(intentionValue);
      setAiIntentionSavedLabel("Intenção replicada para todos os jogadores.");

      if (typeof resp?.updatedPlayers === "number") {
        const playersCount = resp.updatedPlayers;
        pushToast(
          playersCount === 1
            ? "Intenção replicada para 1 jogador e bloqueada."
            : `Intenção replicada para ${playersCount} jogadores e bloqueada.`,
          "success",
        );
      } else {
        pushToast(
          "Intenção replicada para os jogadores e bloqueada.",
          "success",
        );
      }
    } finally {
      setReplicateIntentionLoading(false);
    }
  };

  const summaryTopHouses = useMemo(() => {
    const frequency = new Map<number, number>();
    summaryPath.forEach((house) => {
      if (house === 68) return;
      frequency.set(house, (frequency.get(house) || 0) + 1);
    });
    return [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [summaryPath]);

  const summaryTherapyEntries = useMemo(() => {
    return summaryMoves
      .flatMap((move) =>
        move.therapyEntries.map((entry) => ({
          ...entry,
          move,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [summaryMoves]);

  const summaryAiTipsCount = useMemo(() => {
    if (!summaryParticipantId) return 0;
    return timelineReports.filter(
      (report) =>
        report.kind === "TIP" &&
        report.participant?.id === summaryParticipantId,
    ).length;
  }, [timelineReports, summaryParticipantId]);

  const myAiUsage = useMemo(() => {
    if (!state || !myParticipant) return null;
    return (
      (state.aiUsage || []).find(
        (usage) => usage.participantId === myParticipant.id,
      ) || null
    );
  }, [state, myParticipant]);

  useEffect(() => {
    if (!myAiUsage) return;
    setAiTipUsage({ used: myAiUsage.tipsUsed, limit: myAiUsage.tipsLimit });
  }, [myAiUsage?.tipsUsed, myAiUsage?.tipsLimit]);

  useEffect(() => {
    if (!myParticipant || !roomOnboardingLoaded) return;
    const role = myParticipant.role === "THERAPIST" ? "THERAPIST" : "PLAYER";
    if (roomTutorialInitializedRole === role) return;

    const alreadySeen =
      role === "THERAPIST"
        ? roomOnboardingSeen.therapist
        : roomOnboardingSeen.player;
    if (alreadySeen) return;

    setRoomTutorialInitializedRole(role);
    setRoomTutorialRole(role);
    setRoomTutorialStep(0);
    setShowRoomTutorial(true);
  }, [
    myParticipant,
    roomOnboardingLoaded,
    roomOnboardingSeen.player,
    roomOnboardingSeen.therapist,
    roomTutorialInitializedRole,
  ]);

  useEffect(() => {
    if (!showRoomTutorial || !roomTutorialRole) return;

    const step = roomTutorialSteps[roomTutorialStep];
    if (!step) return;
    const selector = `[data-tour-room="${step.target}"]`;
    const targetEl = document.querySelector<HTMLElement>(selector);
    if (!targetEl) return;

    targetEl.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [showRoomTutorial, roomTutorialRole, roomTutorialStep, roomTutorialSteps]);

  useEffect(() => {
    if (!showRoomTutorial || !roomTutorialRole) {
      setRoomTutorialTargetRect(null);
      return;
    }

    const step = roomTutorialSteps[roomTutorialStep];
    if (!step) {
      setRoomTutorialTargetRect(null);
      return;
    }
    const selector = `[data-tour-room="${step.target}"]`;

    const updateTargetRect = () => {
      const targetEl = document.querySelector<HTMLElement>(selector);
      if (!targetEl) {
        setRoomTutorialTargetRect(null);
        return;
      }
      setRoomTutorialTargetRect(targetEl.getBoundingClientRect());
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
    showRoomTutorial,
    roomTutorialRole,
    roomTutorialStep,
    roomTutorialSteps,
    activePanel,
  ]);

  useEffect(() => {
    if (!showRoomTutorial) return;
    if (roomTutorialSteps.length === 0) return;
    setRoomTutorialStep((prev) => Math.min(prev, roomTutorialSteps.length - 1));
  }, [showRoomTutorial, roomTutorialSteps.length]);

  useEffect(() => {
    if (!showRoomTutorial) return;
    const step = roomTutorialSteps[roomTutorialStep];
    if (!step) return;
    const targetPanel = ROOM_TUTORIAL_PANEL_BY_TARGET[step.target];
    if (!targetPanel) return;
    if (activePanel !== targetPanel) {
      setActivePanel(targetPanel);
    }
  }, [showRoomTutorial, roomTutorialStep, roomTutorialSteps, activePanel]);

  useEffect(() => {
    if (!isMobileViewport) return;
    if (!showRoomTutorial) return;
    setMobileActionPanelOpen(true);
  }, [isMobileViewport, showRoomTutorial, roomTutorialStep]);

  const finishRoomTutorial = async () => {
    if (!roomTutorialRole) {
      setShowRoomTutorial(false);
      return;
    }

    if (roomTutorialRole === "THERAPIST") {
      setRoomOnboardingSeen((prev) => ({ ...prev, therapist: true }));
      try {
        window.localStorage.setItem(
          ROOM_ONBOARDING_THERAPIST_VERSION_KEY,
          ROOM_ONBOARDING_VERSION,
        );
      } catch {
        // no-op
      }
    } else {
      setRoomOnboardingSeen((prev) => ({ ...prev, player: true }));
      try {
        window.localStorage.setItem(
          ROOM_ONBOARDING_PLAYER_VERSION_KEY,
          ROOM_ONBOARDING_VERSION,
        );
      } catch {
        // no-op
      }
    }

    setShowRoomTutorial(false);

    const scope =
      roomTutorialRole === "THERAPIST" ? "room_therapist" : "room_player";
    await fetch("/api/mahalilah/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    }).catch(() => null);
  };

  const showSocketError = useCallback(
    (fallback: string, resp: any) => {
      pushToast(resp?.error || fallback, "error");
    },
    [pushToast],
  );

  const closeAiContentModal = useCallback(() => {
    setAiContentModal(null);
    if (pendingTrialPlansAfterAiModal) {
      setPendingTrialPlansAfterAiModal(false);
      setTrialLimitModalOpen(true);
    }
  }, [pendingTrialPlansAfterAiModal]);

  const handleSelectActionPanel = useCallback(
    (panel: ActionPanel) => {
      setActivePanel(panel);
      if (isMobileViewport) {
        setMobileActionPanelOpen(true);
      }
    },
    [isMobileViewport],
  );

  const openDiceRollModal = useCallback(() => {
    clearDiceTimers();
    setDiceResult(null);
    setDiceFace(randomDiceFace());
    setDiceModalOpen(true);

    if (!diceAnimationEnabled) {
      setDiceRolling(false);
      return;
    }

    setDiceRolling(true);
    diceSpinIntervalRef.current = window.setInterval(() => {
      setDiceFace(randomDiceFace());
    }, DICE_SPIN_INTERVAL_MS);
  }, [clearDiceTimers, diceAnimationEnabled]);

  const finalizeDiceRollModal = useCallback(
    (finalDice: number | null) => {
      const finish = () => {
        clearDiceTimers();
        setDiceRolling(false);

        if (typeof finalDice === "number") {
          setDiceFace(finalDice);
          setDiceResult(finalDice);
          diceCloseTimeoutRef.current = window.setTimeout(() => {
            setDiceModalOpen(false);
          }, DICE_RESULT_PREVIEW_MS);
        } else {
          setDiceResult(null);
          setDiceModalOpen(false);
        }
      };

      if (diceAnimationEnabled && typeof finalDice === "number") {
        diceRevealTimeoutRef.current = window.setTimeout(finish, DICE_MIN_SPIN_MS);
        return;
      }

      finish();
    },
    [clearDiceTimers, diceAnimationEnabled],
  );

  const handleRoll = () => {
    if (!socket || rollInFlight) return;

    setRollInFlight(true);
    openDiceRollModal();

    socket.emit("game:roll", {}, (resp: any) => {
      setRollInFlight(false);
      const diceValue =
        typeof resp?.diceValue === "number" ? resp.diceValue : null;

      if (!resp?.ok) {
        clearDiceTimers();
        setDiceRolling(false);
        setDiceModalOpen(false);
        setDiceResult(null);

        if (resp?.code === "TRIAL_LIMIT_REACHED") {
          handleTrialLimitReached();
        }
        showSocketError("Erro ao rolar dado", resp);
        return;
      }

      finalizeDiceRollModal(diceValue);
    });
  };

  const cardsDrawnInCurrentMove = useMemo(() => {
    if (!state?.lastMove || !myParticipant) return 0;
    if (state.lastMove.participantId !== myParticipant.id) return 0;

    return state.deckHistory
      .filter(
        (draw) =>
          draw.moveId === state.lastMove?.id &&
          draw.drawnBy.id === myParticipant.id,
      )
      .reduce((sum, draw) => {
        if (draw.cards.length > 0) return sum + draw.cards.length;
        if (draw.card) return sum + 1;
        return sum;
      }, 0);
  }, [state?.deckHistory, state?.lastMove, myParticipant]);

  const remainingDrawsInCurrentMove = Math.max(0, 3 - cardsDrawnInCurrentMove);

  const canDrawCard = Boolean(
    state?.lastMove &&
      myParticipant &&
      state.lastMove.participantId === myParticipant.id &&
      remainingDrawsInCurrentMove > 0 &&
      !actionsBlockedByConsent &&
      !isViewerInTherapistSoloPlay,
  );
  const canUseAiActions = Boolean(
    !actionsBlockedByConsent && !isViewerInTherapistSoloPlay,
  );

  const timelineMoveTurnById = useMemo(() => {
    const byId = new Map<string, number>();
    timelineMoves.forEach((move) => {
      byId.set(move.id, move.turnNumber);
    });
    return byId;
  }, [timelineMoves]);

  const currentMoveDeckCards = useMemo(() => {
    if (!state?.lastMove) return [];
    return state.deckHistory.filter(
      (draw) => draw.moveId === state.lastMove?.id && Boolean(draw.card),
    );
  }, [state?.deckHistory, state?.lastMove]);

  const deckHistoryByMove = useMemo(() => {
    if (!state?.deckHistory?.length) return [];

    const grouped: Array<{
      key: string;
      moveId: string | null;
      moveTurnNumber: number | null;
      draws: typeof state.deckHistory;
    }> = [];

    state.deckHistory.forEach((draw) => {
      const key = draw.moveId ? `move:${draw.moveId}` : `standalone:${draw.id}`;
      const last = grouped[grouped.length - 1];

      if (last && last.key === key) {
        last.draws.push(draw);
        return;
      }

      grouped.push({
        key,
        moveId: draw.moveId,
        moveTurnNumber: draw.moveTurnNumber,
        draws: [draw],
      });
    });

    return grouped;
  }, [state?.deckHistory]);

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

  const handleDraw = () => {
    if (!socket || !state || !myParticipant) return;
    if (!state.lastMove || state.lastMove.participantId !== myParticipant.id) {
      pushToast(
        "Você precisa fazer uma jogada antes de tirar carta.",
        "warning",
      );
      return;
    }

    socket.emit("deck:draw", { moveId: state.lastMove.id }, (resp: any) => {
      if (!resp?.ok) {
        showSocketError("Erro ao tirar carta", resp);
      } else {
        const cardNumber = resp?.card?.cardNumber;
        const counter =
          typeof resp?.drawCountInMove === "number"
            ? `${resp.drawCountInMove}/3`
            : null;
        if (cardNumber) {
          pushToast(
            `Carta #${cardNumber} tirada${counter ? ` (${counter})` : ""}.`,
            "success",
          );
          if (resp?.card) {
            openCardPreview({
              card: resp.card,
              title: `Carta #${resp.card.cardNumber}`,
              subtitle: `Jogada #${state.lastMove?.turnNumber ?? "—"}${counter ? ` • ${counter}` : ""}`,
            });
          }
        } else {
          pushToast("Carta tirada com sucesso.", "success");
        }
      }
    });
  };

  const handleSaveTherapy = () => {
    if (!socket || !state?.lastMove) return;

    if (!myParticipant || state.lastMove.participantId !== myParticipant.id) {
      pushToast(
        "Você só pode registrar a jogada do seu próprio turno.",
        "warning",
      );
      return;
    }

    socket.emit(
      "therapy:save",
      {
        moveId: state.lastMove.id,
        emotion: therapy.emotion,
        intensity: therapy.intensity,
        insight: therapy.insight,
        body: therapy.body,
        microAction: therapy.microAction,
      },
      (resp: any) => {
        if (!resp?.ok) {
          showSocketError("Erro ao salvar registro", resp);
        } else {
          setTherapy({
            emotion: "",
            intensity: 5,
            insight: "",
            body: "",
            microAction: "",
          });
          pushToast("Registro terapêutico salvo.", "success");
        }
      },
    );
  };

  const loadTimelineData = useCallback(
    async (showSuccessToast = false) => {
      if (!state?.room.id) {
        return { ok: false as const, aiReports: [] as TimelineAiReport[] };
      }

      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const res = await fetch(`/api/mahalilah/rooms/${state.room.id}/timeline`);
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            payload.error || "Não foi possível carregar a jornada do jogador.";
          setTimelineError(message);
          pushToast(message, "error");
          return { ok: false as const, aiReports: [] as TimelineAiReport[] };
        }

        const moves = Array.isArray(payload.moves) ? payload.moves : [];
        const aiReports = Array.isArray(payload.aiReports)
          ? payload.aiReports
          : [];
        setTimelineMoves(moves);
        setTimelineReports(aiReports);
        if (showSuccessToast) {
          pushToast("Jornada carregada.", "success");
        }
        return {
          ok: true as const,
          aiReports: aiReports as TimelineAiReport[],
        };
      } catch {
        const message = "Não foi possível carregar a jornada do jogador.";
        setTimelineError(message);
        pushToast(message, "error");
        return { ok: false as const, aiReports: [] as TimelineAiReport[] };
      } finally {
        setTimelineLoading(false);
        setTimelineLoaded(true);
      }
    },
    [state?.room.id, pushToast],
  );

  const handleSaveTherapistSummary = useCallback(async () => {
    if (!state?.room.id || !isTherapist) return false;

    setTherapistSummarySaving(true);
    try {
      const res = await fetch(`/api/mahalilah/rooms/${state.room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistSummary: therapistSummaryDraft }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        showSocketError(
          payload.error || "Erro ao salvar síntese do terapeuta.",
          payload,
        );
        return false;
      }

      const nextSummary =
        typeof payload?.room?.therapistSummary === "string"
          ? payload.room.therapistSummary
          : "";

      setTherapistSummaryDraft(nextSummary);
      setState((prev) =>
        prev
          ? {
              ...prev,
              room: {
                ...prev.room,
                therapistSummary: nextSummary || null,
              },
            }
          : prev,
      );
      pushToast("Síntese do terapeuta atualizada.", "success");
      return true;
    } catch {
      pushToast("Erro ao salvar síntese do terapeuta.", "error");
      return false;
    } finally {
      setTherapistSummarySaving(false);
    }
  }, [
    state?.room.id,
    therapistSummaryDraft,
    isTherapist,
    showSocketError,
    pushToast,
  ]);

  const closeRoom = useCallback(() => {
    if (!socket) return;
    socket.emit("room:close", {}, (resp: any) => {
      if (!resp?.ok) {
        showSocketError("Erro ao encerrar sala", resp);
        return;
      }
      pushToast("Sala encerrada com sucesso.", "success");
    });
  }, [socket, showSocketError, pushToast]);

  const requestFinalReport = useCallback(
    async (options?: {
      participantId?: string;
      allPlayers?: boolean;
      successMessage?: string;
    }) => {
      if (!socket) return false;

      setFinalReportLoading(true);
      try {
        if (options?.allPlayers) {
          const resp = await new Promise<any>((resolve) => {
            socket.emit("ai:finalReportAll", {}, resolve);
          });

          if (!resp?.ok) {
            showSocketError("Erro ao gerar resumo", resp);
            return false;
          }

          const generatedCount =
            typeof resp.generatedCount === "number" ? resp.generatedCount : null;
          if (generatedCount !== null) {
            pushToast(
              generatedCount > 1
                ? `${generatedCount} resumos finais gerados.`
                : "Resumo final gerado.",
              "success",
            );
          } else {
            pushToast(
              options.successMessage || "Resumos finais gerados.",
              "success",
            );
          }
          await loadTimelineData();
          return true;
        }

        const targetParticipantId = options?.participantId || undefined;
        const resp = await new Promise<any>((resolve) => {
          socket.emit(
            "ai:finalReport",
            { participantId: targetParticipantId },
            resolve,
          );
        });

        if (!resp?.ok) {
          showSocketError("Erro ao gerar resumo", resp);
          return false;
        }

        const targetParticipant = targetParticipantId
          ? state?.participants.find(
              (participant) => participant.id === targetParticipantId,
            ) || null
          : myParticipant;
        const targetParticipantLabel = targetParticipant
          ? getParticipantDisplayName(targetParticipant)
          : "Jogador";
        setAiContentModal({
          title: `Relatório final • ${targetParticipantLabel}`,
          subtitle: `Gerado em ${new Date().toLocaleString("pt-BR")}`,
          content:
            typeof resp.content === "string"
              ? resp.content
              : "Sem conteúdo disponível.",
        });
        pushToast(options?.successMessage || "Resumo final gerado.", "success");
        await loadTimelineData();
        return true;
      } finally {
        setFinalReportLoading(false);
      }
    },
    [
      socket,
      showSocketError,
      pushToast,
      loadTimelineData,
      state?.participants,
      myParticipant,
    ],
  );

  const hasFinalReportForParticipant = useCallback(
    (reports: TimelineAiReport[], participantId: string) => {
      return reports.some(
        (report) =>
          report.kind === "FINAL" && report.participant?.id === participantId,
      );
    },
    [],
  );

  const getParticipantsNeedingFinalReport = useCallback(
    (reports: TimelineAiReport[]) => {
      if (!state) return [];
      const participantsWithFinal = new Set(
        reports
          .filter((report) => report.kind === "FINAL" && report.participant?.id)
          .map((report) => report.participant!.id),
      );

      return finalReportPromptTargets.filter(
        (participant) => !participantsWithFinal.has(participant.id),
      );
    },
    [state, finalReportPromptTargets],
  );

  const shouldPromptForFinalReport = useCallback(async () => {
    const loaded = await loadTimelineData();
    const reports = loaded.ok ? loaded.aiReports : timelineReports;
    return getParticipantsNeedingFinalReport(reports).length > 0;
  }, [loadTimelineData, timelineReports, getParticipantsNeedingFinalReport]);

  const handleCloseRoom = useCallback(async () => {
    if (!canCloseRoom || !state) return;
    if (state.room.status !== "ACTIVE" || actionsBlockedByConsent) return;

    const needsPrompt = await shouldPromptForFinalReport();
    if (needsPrompt) {
      setFinalReportPrompt({ mode: "close" });
      return;
    }

    closeRoom();
  }, [
    canCloseRoom,
    state,
    actionsBlockedByConsent,
    shouldPromptForFinalReport,
    closeRoom,
  ]);

  const handleTrialLimitReached = useCallback(() => {
    trialModalPromptedRef.current = true;
    if (canCloseRoom) {
      setFinalReportPrompt((current) => current ?? { mode: "trialLimit" });
      return;
    }
    setTrialLimitModalOpen(true);
  }, [canCloseRoom]);

  useEffect(() => {
    if (!state || !canCloseRoom) return;

    const previousCompletion = completionStateByParticipantRef.current;
    const currentCompletion = new Map<string, boolean>();
    const newlyCompletedParticipantIds: string[] = [];

    state.participants.forEach((participant) => {
      if (!finalReportPromptTargetIds.has(participant.id)) return;
      const isCompleted = Boolean(playerStateMap.get(participant.id)?.hasCompleted);
      currentCompletion.set(participant.id, isCompleted);

      const previousValue = previousCompletion.has(participant.id)
        ? previousCompletion.get(participant.id)
        : isCompleted;

      if (isCompleted && !previousValue) {
        newlyCompletedParticipantIds.push(participant.id);
      }
    });

    completionStateByParticipantRef.current = currentCompletion;

    if (!newlyCompletedParticipantIds.length) return;

    setPendingCompletedParticipantPrompts((previousQueue) => {
      const unique = new Set(previousQueue);
      newlyCompletedParticipantIds.forEach((participantId) => {
        if (!completionPromptedParticipantsRef.current.has(participantId)) {
          unique.add(participantId);
        }
      });
      return Array.from(unique);
    });
  }, [state, canCloseRoom, playerStateMap, finalReportPromptTargetIds]);

  useEffect(() => {
    if (!canCloseRoom || !state) return;
    if (finalReportPrompt) return;
    if (!pendingCompletedParticipantPrompts.length) return;
    if (completionPromptQueueProcessingRef.current) return;

    const nextParticipantId = pendingCompletedParticipantPrompts[0];
    const participant = state.participants.find(
      (item) => item.id === nextParticipantId,
    );

    if (!participant || !finalReportPromptTargetIds.has(participant.id)) {
      completionPromptedParticipantsRef.current.add(nextParticipantId);
      setPendingCompletedParticipantPrompts((queue) =>
        queue.filter((participantId) => participantId !== nextParticipantId),
      );
      return;
    }

    completionPromptQueueProcessingRef.current = true;
    let cancelled = false;

    const processPrompt = async () => {
      try {
        const loaded = await loadTimelineData();
        if (cancelled) return;

        const reports = loaded.ok ? loaded.aiReports : timelineReports;
        const alreadyHasFinal = hasFinalReportForParticipant(
          reports,
          nextParticipantId,
        );

        completionPromptedParticipantsRef.current.add(nextParticipantId);

        if (!alreadyHasFinal) {
          setFinalReportPrompt({
            mode: "participantCompleted",
            participantId: nextParticipantId,
            participantName: participant.user.name || participant.user.email,
          });
        }
      } finally {
        completionPromptQueueProcessingRef.current = false;
        if (!cancelled) {
          setPendingCompletedParticipantPrompts((queue) =>
            queue.filter((participantId) => participantId !== nextParticipantId),
          );
        }
      }
    };

    void processPrompt();

    return () => {
      cancelled = true;
    };
  }, [
    canCloseRoom,
    state,
    finalReportPrompt,
    pendingCompletedParticipantPrompts,
    loadTimelineData,
    timelineReports,
    hasFinalReportForParticipant,
    finalReportPromptTargetIds,
  ]);

  useEffect(() => {
    if (!["summary", "timeline", "ai"].includes(activePanel)) return;
    if (timelineLoading) return;
    if (timelineLoaded) return;
    void loadTimelineData();
  }, [
    activePanel,
    timelineLoading,
    timelineLoaded,
    loadTimelineData,
  ]);

  useEffect(() => {
    if (!timelineLoaded) return;
    if (!state?.lastMove?.id && !state?.room.aiReportsCount) return;
    void loadTimelineData();
  }, [
    timelineLoaded,
    state?.lastMove?.id,
    state?.room.aiReportsCount,
    loadTimelineData,
  ]);

  useEffect(() => {
    if (!trialLimitReached) {
      trialModalPromptedRef.current = false;
      return;
    }
    if (trialModalPromptedRef.current) return;
    handleTrialLimitReached();
  }, [trialLimitReached, handleTrialLimitReached]);

  const summaryStatus = summaryPlayerState
    ? summaryPlayerState.hasCompleted
      ? "Concluiu (retornou à casa 68)"
      : summaryPlayerState.hasStarted
        ? "Em andamento"
        : "Aguardando 6"
    : "Sem dados";

  const summaryPathText = summaryPath.length
    ? summaryPath
        .map((house) => {
          const houseTitle = getHouseByNumber(house)?.title || "";
          return `${house}${houseTitle ? ` (${houseTitle})` : ""}`;
        })
        .join(" → ")
    : "—";

  if (loading) {
    return <div className="card">Carregando sala...</div>;
  }

  if (!state) {
    return <div className="card">{fatalError || "Sala indisponível."}</div>;
  }

  const roomIsActive = state.room.status === "ACTIVE";
  const roomStatusLabel = roomIsActive ? "Ativa" : "Finalizada";
  const currentRoomTutorialStep = roomTutorialSteps[roomTutorialStep] || null;
  const roomTutorialPopover = getRoomTutorialPopoverPosition(
    roomTutorialTargetRect,
  );

  return (
    <div className="grid room-shell" style={{ gap: 14 }}>
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

      {needsConsent && !consentAccepted && (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Termo de consentimento</h3>
          <p className="small-muted">
            Para participar desta sessão, confirme que você está ciente de que
            os registros terapêuticos podem ser lidos pela IA para gerar
            insights e resumos.
          </p>
          <button
            onClick={async () => {
              const res = await fetch(
                `/api/mahalilah/rooms/${state.room.id}/consent`,
                { method: "POST" },
              );
              if (!res.ok) {
                pushToast(
                  "Não foi possível registrar o consentimento.",
                  "error",
                );
                return;
              }
              setConsentAccepted(true);
              pushToast("Consentimento registrado com sucesso.", "success");
            }}
          >
            Aceito o termo
          </button>
        </div>
      )}

      <div
        className="card room-header-card"
        style={{
          display: "grid",
          gap: 8,
          padding: "14px 16px",
          opacity: actionsBlockedByConsent ? 0.6 : 1,
        }}
      >
        <div
          className="room-header-pills"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 2,
          }}
          data-tour-room="room-header"
        >
          <span className="pill" style={{ flex: "0 0 auto" }}>
            Vez:{" "}
            <strong>
              {currentParticipant
                ? currentParticipant.user.name || currentParticipant.user.email
                : "Aguardando jogadores"}
            </strong>
          </span>
          <span className="pill">
            Rolagens: <strong>{indicatorState?.rollCountTotal || 0}</strong>
          </span>
          <span className="pill">
            Até iniciar:{" "}
            <strong>{indicatorState?.rollCountUntilStart || 0}</strong>
          </span>
          <span className="pill" style={{ flex: "0 0 auto" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: state.room.therapistOnline ? "#6ad3b0" : "#ff6b6b",
                boxShadow: state.room.therapistOnline
                  ? "0 0 0 3px rgba(106, 211, 176, 0.22)"
                  : "0 0 0 3px rgba(255, 107, 107, 0.22)",
              }}
            />
            <strong>Terapeuta</strong>
          </span>
          <span
            className="pill"
            style={{
              flex: "0 0 auto",
              borderColor: roomIsActive
                ? "rgba(106, 211, 176, 0.6)"
                : "rgba(255, 107, 107, 0.6)",
              background: roomIsActive
                ? "rgba(106, 211, 176, 0.15)"
                : "rgba(255, 107, 107, 0.15)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: roomIsActive ? "#6ad3b0" : "#ff6b6b",
                boxShadow: roomIsActive
                  ? "0 0 0 3px rgba(106, 211, 176, 0.22)"
                  : "0 0 0 3px rgba(255, 107, 107, 0.22)",
              }}
            />
            <strong>Status:</strong> {roomStatusLabel}
          </span>
          {isTrialRoom && (
            <span
              className="pill"
              style={{
                flex: "0 0 auto",
                borderColor: "rgba(241, 213, 154, 0.55)",
                background: "rgba(241, 213, 154, 0.14)",
              }}
            >
              <strong>Trial:</strong>{" "}
              {myPlayerState?.hasStarted
                ? `${trialMovesRemaining}/${TRIAL_POST_START_MOVE_LIMIT} jogadas restantes`
                : `limite de ${TRIAL_POST_START_MOVE_LIMIT} jogadas após sair da 68`}
            </span>
          )}
          {isTherapistSoloPlay && (
            <span
              className="pill"
              style={{
                flex: "0 0 auto",
                borderColor: "rgba(154, 208, 255, 0.55)",
                background: "rgba(154, 208, 255, 0.14)",
              }}
            >
              <strong>Modo:</strong> terapeuta único jogador (demais visualizam)
            </span>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRulesModalOpen(true)}
            style={{
              flex: "0 0 auto",
              minWidth: 30,
              width: 30,
              height: 30,
              padding: 0,
              borderRadius: 999,
            }}
            title="Regras do jogo"
            aria-label="Regras do jogo"
          >
            ?
          </button>
        </div>

        <div
          className="room-controls-row"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 2,
          }}
          data-tour-room="room-controls"
        >
          <button
            onClick={handleRoll}
            disabled={!canRoll || rollInFlight}
            style={{ flex: "0 0 auto" }}
          >
            {rollInFlight
              ? "Rolando..."
              : trialLimitReached
              ? "Trial bloqueada"
              : !state.room.therapistOnline
              ? "Aguardando terapeuta"
              : isViewerInTherapistSoloPlay
              ? "Modo visualização"
              : isMyTurn
                ? "Rolar dado"
                : "Aguardando sua vez"}
          </button>
          {canCloseRoom && (
            <button
              className="secondary"
              onClick={() =>
                socket?.emit("game:nextTurn", {}, (resp: any) => {
                  if (!resp?.ok) showSocketError("Erro ao avançar vez", resp);
                })
              }
              disabled={
                state.room.status !== "ACTIVE" || actionsBlockedByConsent
              }
              style={{ flex: "0 0 auto" }}
            >
              Avançar vez
            </button>
          )}
          {canCloseRoom && (
            <button
              className="secondary"
              onClick={() => void handleCloseRoom()}
              disabled={
                state.room.status !== "ACTIVE" ||
                actionsBlockedByConsent ||
                finalReportLoading
              }
              style={{ flex: "0 0 auto" }}
            >
              Encerrar sala
            </button>
          )}
          <button
            className="secondary"
            onClick={() => setShowBoardNames((prev) => !prev)}
            style={{ flex: "0 0 auto" }}
          >
            {showBoardNames ? "Ocultar nomes" : "Mostrar nomes"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setDiceAnimationEnabled((prev) => !prev)}
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
            }}
            title="Ativar ou desativar animação do dado"
            aria-pressed={diceAnimationEnabled}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: diceAnimationEnabled ? "#6ad3b0" : "#ff6b6b",
                boxShadow: diceAnimationEnabled
                  ? "0 0 0 3px rgba(106, 211, 176, 0.22)"
                  : "0 0 0 3px rgba(255, 107, 107, 0.22)",
              }}
            />
            <span>Animação do Dado</span>
          </button>
            <Link
              href="/dashboard"
              className="btn-secondary"
              style={{ flex: "0 0 auto" }}
            >
              Voltar ao dashboard
            </Link>
          
        </div>

        {isTrialRoom && trialLimitReached && (
          <div className="notice" style={{ display: "grid", gap: 6 }}>
            <span className="small-muted">
              Você atingiu o limite da sala trial ({TRIAL_POST_START_MOVE_LIMIT} jogadas após sair da casa 68).
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn-secondary"
                onClick={() => setTrialLimitModalOpen(true)}
              >
                Liberar continuidade
              </button>
            </div>
          </div>
        )}

        {lastMoveHouseInfo && state.lastMove && (
          <div className="small-muted">
            Última jogada: casa {lastMoveHouseInfo.number},{" "}
            {lastMoveHouseInfo.sanskrit || "—"},{" "}
            {lastMoveHouseInfo.portuguese} * dado {state.lastMove.diceValue}
          </div>
        )}
        {lastMoveJump &&
          lastMoveJumpFromInfo &&
          lastMoveJumpToInfo &&
          state.lastMove && (
            <div className="small-muted">
              Chegou por atalho: casa {lastMoveJumpFromInfo.number} (
              {lastMoveJumpFromInfo.sanskrit || "—"} •{" "}
              {lastMoveJumpFromInfo.portuguese}){" "}
              {lastMoveJump.isUp ? "↗" : "↘"} casa {lastMoveJumpToInfo.number} (
              {lastMoveJumpToInfo.sanskrit || "—"} •{" "}
              {lastMoveJumpToInfo.portuguese}) (
              {lastMoveJump.isUp ? "subida" : "descida"}).
            </div>
          )}
      </div>

      <div
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] room-main-grid"
        style={{
          opacity: actionsBlockedByConsent ? 0.6 : 1,
          alignItems: "start",
        }}
      >
        <div
          className="card room-board-card"
          style={{ display: "grid", gap: 10, minWidth: 0, overflow: "hidden" }}
          data-tour-room="room-board"
        >
          <div
            className="room-board-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BOARD_ROWS}, minmax(0, 1fr))`,
              gap: 4,
              aspectRatio: "9 / 10",
              width: "100%",
              maxWidth: "100%",
              borderRadius: 16,
              padding: 6,
              border: "1px solid rgba(217, 164, 65, 0.25)",
              background:
                "radial-gradient(circle at 50% 40%, rgba(43, 65, 94, 0.35), rgba(10, 16, 26, 0.94))",
            }}
          >
            {boardCells.map((cell) => {
              const house = getHouseByNumber(cell.houseNumber);
              const jumpTarget = jumpMap.get(cell.houseNumber);
              const isSelected = indicatorHouseNumber === cell.houseNumber;
              const sanskritName =
                HOUSE_SANSKRIT_NAMES[cell.houseNumber - 1] || "";
              const portugueseName = house?.title || `Casa ${cell.houseNumber}`;
              const tokens = boardParticipants
                .map((participant, participantIndex) => ({
                  participant,
                  color: COLORS[participantIndex % COLORS.length],
                  state: playerStateMap.get(participant.id),
                }))
                .filter(
                  (item) =>
                    (item.state?.position ?? -1) + 1 === cell.houseNumber,
                );

              return (
                <div
                  key={`${cell.row}-${cell.col}-${cell.houseNumber}`}
                  title={
                    house
                      ? `Casa ${house.number} - ${house.title}`
                      : `Casa ${cell.houseNumber}`
                  }
                  style={{
                    position: "relative",
                    minWidth: 0,
                    minHeight: 0,
                    borderRadius: 10,
                    border: isSelected
                      ? "1px solid rgba(217, 164, 65, 0.75)"
                      : "1px solid rgba(255, 255, 255, 0.12)",
                    background: isSelected
                      ? "rgba(217, 164, 65, 0.16)"
                      : "rgba(12, 19, 30, 0.48)",
                    padding: 6,
                    display: "grid",
                    gridTemplateRows: showBoardNames
                      ? "auto auto 1fr auto"
                      : "auto 1fr",
                    gap: 4,
                    textAlign: "left",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 4,
                    }}
                  >
                    <span className="small-muted" style={{ fontSize: 11 }}>
                      {cell.houseNumber}
                    </span>
                    {jumpTarget && (
                      <span
                        className="small-muted"
                        style={{
                          fontSize: 10,
                          color:
                            jumpTarget > cell.houseNumber
                              ? "#9fe6cc"
                              : "#ffc0a8",
                        }}
                        title={`Atalho ${cell.houseNumber} para ${jumpTarget}`}
                      >
                        {jumpTarget > cell.houseNumber ? "↗" : "↘"}{" "}
                        {jumpTarget}
                      </span>
                    )}
                  </div>
                  {showBoardNames && (
                    <span
                      style={{
                        fontSize: 9,
                        lineHeight: 1.05,
                        fontWeight: 600,
                        color: "rgba(223, 233, 247, 0.92)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={sanskritName}
                    >
                      {sanskritName}
                    </span>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      alignSelf: showBoardNames ? "center" : "end",
                    }}
                  >
                    {tokens.map((token, tokenIndex) => {
                      const isCurrentTurnToken =
                        token.participant.id === currentParticipant?.id;

                      return (
                        <span
                          key={`${token.participant.id}-${tokenIndex}`}
                          title={
                            token.participant.user.name ||
                            token.participant.user.email
                          }
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            border: isCurrentTurnToken
                              ? "2px solid rgba(255,45,45,0.95)"
                              : "1px solid rgba(255,255,255,0.72)",
                            boxShadow: isCurrentTurnToken
                              ? "0 3px 12px rgba(0,0,0,.45), 0 0 0 2px rgba(0,0,0,.65), 0 0 0 6px rgba(255,45,45,.18)"
                              : "0 3px 10px rgba(0,0,0,.35), 0 0 0 2px rgba(0,0,0,.45)",
                            animation: isCurrentTurnToken
                              ? "mahalilah-token-pulse 1.2s ease-in-out infinite"
                              : "none",
                            transform: "translateZ(0)",
                            background: token.color,
                            display: "inline-block",
                          }}
                        />
                      );
                    })}
                  </div>
                  {showBoardNames && (
                    <span
                      className="small-muted"
                      style={{
                        fontSize: 9,
                        lineHeight: 1.05,
                        color: "rgba(192, 205, 225, 0.95)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={portugueseName}
                    >
                      {portugueseName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="card room-side-panel"
          data-open={mobileActionPanelOpen}
          style={{ display: "grid", gap: 10, alignSelf: "start", minWidth: 0 }}
        >
          <div className="room-mobile-panel-header">
            <strong>Ações da sala</strong>
            <button
              className="btn-secondary"
              onClick={() => setMobileActionPanelOpen(false)}
            >
              Fechar
            </button>
          </div>

          {shouldShowSessionIntentionField && (
            <label style={{ display: "grid", gap: 4 }}>
              <span>Intenção de jogo (opcional)</span>
              <input
                value={aiIntention}
                disabled={!canEditSessionIntention || replicateIntentionLoading}
                onChange={(event) => {
                  if (!canEditSessionIntention) return;
                  setAiIntention(event.target.value);
                  setAiIntentionSavedLabel("");
                }}
                onBlur={persistAiIntention}
                placeholder="Ex.: clareza sobre limites e comunicação"
              />
              <span className="small-muted">
                {isPlayerIntentionLocked
                  ? "Intenção definida pelo terapeuta e bloqueada para edição."
                  : aiIntentionSavedLabel || "Salva na sala ao sair do campo."}
              </span>

              {canReplicateIntentionToPlayers && (
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={
                    replicateIntentionLoading || !aiIntention.trim().length
                  }
                  onClick={() => void replicateIntentionToPlayers()}
                >
                  {replicateIntentionLoading
                    ? "Replicando intenção..."
                    : state?.room.playerIntentionLocked
                      ? "Atualizar e replicar para jogadores"
                      : "Replicar intenção para jogadores"}
                </button>
              )}
            </label>
          )}

          <div
            className="room-desktop-action-nav"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {ACTION_ITEMS.map((item) => {
              const isActive = activePanel === item.key;
              return (
                <button
                  key={item.key}
                  className={isActive ? "btn-primary" : "btn-secondary"}
                  onClick={() => handleSelectActionPanel(item.key)}
                  title={item.label}
                  data-tour-room={
                    isMobileViewport
                      ? undefined
                      : TOUR_TARGET_BY_ACTION_PANEL[item.key]
                  }
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    minHeight: 38,
                    padding: "6px 4px",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>
                    {item.icon}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="divider" />

          {activePanel === "house" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Significado da casa</strong>
              {selectedHouse ? (
                <>
                  {lastMoveJump &&
                    selectedHouse.number === lastMoveJump.to &&
                    lastMoveJumpFromInfo && (
                      <div
                        className="notice"
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span className="small-muted">
                          Veio de Atalho ({lastMoveJump.isUp ? "subindo" : "descendo"}) da
                        </span>
                        <button
                          className="btn-secondary"
                          style={{ padding: "2px 8px", height: "auto" }}
                          onClick={() =>
                            openHouseMeaningModal({
                              houseNumber: lastMoveJump.from,
                              title: `Significado da casa ${lastMoveJump.from}`,
                              subtitle: `Atalho ${lastMoveJump.from} ${lastMoveJump.isUp ? "↗" : "↘"} ${lastMoveJump.to}`,
                              jumpContext: {
                                from: lastMoveJump.from,
                                to: lastMoveJump.to,
                                isUp: lastMoveJump.isUp,
                              },
                            })
                          }
                        >
                          casa {lastMoveJump.from}
                        </button>
                      </div>
                    )}
                  <div>
                    <strong>
                      Casa {selectedHouse.number} •{" "}
                      {selectedHouseInfo?.sanskrit || "—"} •{" "}
                      {selectedHouseInfo?.portuguese || selectedHouse.title}
                    </strong>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Significado</strong>
                    <span className="small-muted">
                      {selectedHouseInfo?.meaning || selectedHouse.title}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Palavras-chave gerais</strong>
                    <span className="small-muted">
                      {selectedHouseInfo?.keywords.length
                        ? selectedHouseInfo.keywords.join(" • ")
                        : selectedHouseInfo?.description || "—"}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Lado Luz</strong>
                    <span className="small-muted">
                      {selectedHouseInfo?.polarity
                        ? `Palavras-chave: ${selectedHouseInfo.polarity.lightKeywords}. ${selectedHouseInfo.polarity.lightSummary}`
                        : "—"}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Lado Sombra</strong>
                    <span className="small-muted">
                      {selectedHouseInfo?.polarity
                        ? `Palavras-chave: ${selectedHouseInfo.polarity.shadowKeywords}. ${selectedHouseInfo.polarity.shadowSummary}`
                        : "—"}
                    </span>
                  </div>
                  <div className="notice" style={{ display: "grid", gap: 4 }}>
                    <strong>Texto Terapêutico</strong>
                    <span className="small-muted">
                      {selectedHouseTherapeutic
                        ? `${selectedHouseTherapeutic.text} Pergunta: ${selectedHouseTherapeutic.question}`
                        : selectedHouseQuestion}
                    </span>
                  </div>
                </>
              ) : (
                <span className="small-muted">
                  Sem dados de casa disponíveis no momento.
                </span>
              )}
            </div>
          )}

          {activePanel === "deck" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Tirar carta</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="secondary"
                  onClick={handleDraw}
                  disabled={!canDrawCard}
                >
                  Tirar carta
                </button>
                <span className="small-muted">
                  Nesta jogada: <strong>{cardsDrawnInCurrentMove}/3</strong>
                </span>
              </div>
              {!canDrawCard && (
                <span className="small-muted">
                  A tiragem fica disponível para o jogador que acabou de rolar.
                </span>
              )}

              {currentMoveDeckCards.length > 0 && (
                <div
                  className="notice"
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>Cartas da jogada atual</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      overflowX: "auto",
                      paddingBottom: 2,
                    }}
                  >
                    {currentMoveDeckCards.map((draw) => {
                      if (!draw.card) return null;
                      return (
                        <button
                          key={draw.id}
                          className="btn-secondary"
                          style={{
                            padding: 0,
                            borderRadius: 10,
                            overflow: "hidden",
                            width: 84,
                            minWidth: 84,
                            height: 120,
                            borderColor: "rgba(217, 164, 65, 0.35)",
                            background: "rgba(9, 15, 24, 0.7)",
                          }}
                          onClick={() =>
                            openCardPreview({
                              card: draw.card!,
                              title: `Carta #${draw.card!.cardNumber}`,
                              subtitle: `Jogada #${state.lastMove?.turnNumber ?? "—"}`,
                            })
                          }
                        >
                          <img
                            src={draw.card.imageUrl}
                            alt={`Carta ${draw.card.cardNumber}`}
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
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 6,
                  maxHeight: 300,
                  overflow: "auto",
                  paddingRight: 2,
                }}
              >
                {state.deckHistory.length === 0 ? (
                  <span className="small-muted">
                    Nenhuma carta puxada ainda.
                  </span>
                ) : (
                  deckHistoryByMove.map((group) => (
                    <div
                      key={group.key}
                      className="notice"
                      style={{ display: "grid", gap: 6 }}
                    >
                      {group.moveId ? (
                        <strong style={{ fontSize: 12 }}>
                          {`Jogada #${
                            group.moveTurnNumber ??
                            timelineMoveTurnById.get(group.moveId) ??
                            "—"
                          }`}
                        </strong>
                      ) : (
                        <strong style={{ fontSize: 12 }}>
                          Sem jogada vinculada
                        </strong>
                      )}
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
                          .map((draw) => (
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
                                draw.card
                                  ? openCardPreview({
                                      card: draw.card,
                                      title: `Carta #${draw.card.cardNumber}`,
                                      subtitle: group.moveId
                                        ? `Jogada #${
                                            group.moveTurnNumber ??
                                            timelineMoveTurnById.get(group.moveId) ??
                                            "—"
                                          }`
                                        : "Sem jogada vinculada",
                                    })
                                  : undefined
                              }
                            >
                              {draw.card && (
                                <img
                                  src={draw.card.imageUrl}
                                  alt={`Carta ${draw.card.cardNumber}`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              )}
                            </button>
                          ))}
                      </div>
                      {group.draws.every((draw) => !draw.card) && (
                        <span className="small-muted">
                          Carta(s):{" "}
                          {group.draws
                            .flatMap((draw) => draw.cards)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel === "therapy" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Registro terapêutico</strong>
              {state.lastMove ? (
                <span className="small-muted">
                  Jogada #{state.lastMove.turnNumber} • Dado{" "}
                  {state.lastMove.diceValue}
                  {canLogTherapy ? "" : " • registro apenas para quem jogou"}
                </span>
              ) : (
                <span className="small-muted">Sem jogadas para registrar.</span>
              )}

              <label style={{ display: "grid", gap: 4 }}>
                <span>Emoção principal</span>
                <select
                  value={therapy.emotion}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      emotion: event.target.value,
                    }))
                  }
                >
                  <option value="">—</option>
                  <option value="Calma">Calma</option>
                  <option value="Ansiedade">Ansiedade</option>
                  <option value="Medo">Medo</option>
                  <option value="Tristeza">Tristeza</option>
                  <option value="Raiva">Raiva</option>
                  <option value="Vergonha">Vergonha</option>
                  <option value="Culpa">Culpa</option>
                  <option value="Alívio">Alívio</option>
                  <option value="Gratidão">Gratidão</option>
                  <option value="Esperança">Esperança</option>
                  <option value="Confusão">Confusão</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>Intensidade (1-10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={therapy.intensity}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      intensity: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>O que isso ativa em mim agora? (insight)</span>
                <textarea
                  placeholder="Escreva com sinceridade e simplicidade..."
                  value={therapy.insight}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      insight: event.target.value,
                    }))
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>Onde isso aparece no corpo? (sensação)</span>
                <textarea
                  placeholder="Ex.: aperto no peito, mandíbula tensa, respiração curta..."
                  value={therapy.body}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>Ação</span>
                <textarea
                  placeholder="Ex.: 3 respirações profundas + 1 mensagem honesta + 1 limite claro..."
                  value={therapy.microAction}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      microAction: event.target.value,
                    }))
                  }
                />
              </label>

              <button
                onClick={handleSaveTherapy}
                disabled={
                  !state.lastMove || !canLogTherapy || actionsBlockedByConsent
                }
              >
                Salvar registro
              </button>
            </div>
          )}

          {activePanel === "ai" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>IA terapêutica</strong>
              {isViewerInTherapistSoloPlay && (
                <span className="small-muted">
                  Nesta sala você está como visualizador. As ações de IA ficam
                  disponíveis apenas para o terapeuta.
                </span>
              )}
              {isTrialRoom && (
                <span className="small-muted">
                  No modo trial você pode usar 1 ajuda da IA e gerar 1 resumo
                  final.
                </span>
              )}
              <span className="small-muted">
                Ajudas usadas:{" "}
                <strong>
                  {aiTipUsage?.used ?? 0}/{aiTipUsage?.limit ?? "—"}
                </strong>
              </span>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="secondary"
                  disabled={!canUseAiActions || aiTipLoading}
                  onClick={() =>
                    (() => {
                      if (!socket) return;
                      setAiTipLoading(true);
                      socket.emit(
                        "ai:tip",
                        {},
                        async (resp: any) => {
                          setAiTipLoading(false);
                          if (!resp?.ok) {
                            showSocketError("Erro ao gerar dica", resp);
                          } else {
                            if (
                              typeof resp.tipsUsed === "number" &&
                              typeof resp.tipsLimit === "number"
                            ) {
                              setAiTipUsage({
                                used: resp.tipsUsed,
                                limit: resp.tipsLimit,
                              });
                            }
                            setAiContentModal({
                              title: "Ajuda da IA",
                              subtitle: `Gerada em ${new Date().toLocaleString("pt-BR")}`,
                              content:
                                typeof resp.content === "string"
                                  ? resp.content
                                  : "Sem conteúdo disponível.",
                            });
                            await loadTimelineData();
                            pushToast("Dica da IA gerada.", "success");
                          }
                        },
                      );
                    })()
                  }
                >
                  {aiTipLoading ? "Processando ajuda..." : "IA: me ajuda agora"}
                </button>
                {isTherapist && (
                  <button
                    className="secondary"
                    disabled={therapistSummarySaving}
                    onClick={() => setTherapistSummaryModalOpen(true)}
                  >
                    Observações do terapeuta
                  </button>
                )}
              </div>

              {aiTipLoading && (
                <span className="small-muted">
                  Gerando orientação da IA, aguarde...
                </span>
              )}

              <div className="notice" style={{ display: "grid", gap: 6 }}>
                <strong>Histórico de ajudas da IA</strong>
                {isTherapist && timelineParticipants.length > 1 && (
                  <select
                    value={aiHistoryParticipantId}
                    onChange={(event) =>
                      setAiHistoryParticipantId(event.target.value)
                    }
                  >
                    {timelineParticipants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.user.name || participant.user.email}
                      </option>
                    ))}
                  </select>
                )}
                {timelineLoading && aiTipHistory.length === 0 ? (
                  <span className="small-muted">Carregando histórico...</span>
                ) : aiTipHistory.length === 0 ? (
                  <span className="small-muted">Nenhuma ajuda registrada.</span>
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
                    {aiTipHistory.map(({ report, parsed, helpNumber }) => (
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
                    ))}
                  </div>
                )}
              </div>

              <div className="notice" style={{ display: "grid", gap: 6 }}>
                <strong>O Caminho até agora</strong>
                {timelineLoading && selectedProgressReports.length === 0 ? (
                  <span className="small-muted">Carregando sínteses...</span>
                ) : selectedProgressReports.length === 0 ? (
                  <span className="small-muted">
                    Ainda não há sínteses por intervalo para este jogador.
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
                    {selectedProgressReports.map((report) => {
                      const parsed = parseProgressSummaryContent(report.content);
                      const participantLabel = report.participant
                        ? getParticipantDisplayName(report.participant)
                        : "Jogador";
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
                              title: `O Caminho até agora • ${participantLabel}`,
                              subtitle: `Jogadas ${intervalLabel} • ${new Date(report.createdAt).toLocaleString("pt-BR")}`,
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

              <button
                className="secondary"
                onClick={() => {
                  if (!isTherapist || !aiHistoryParticipantId) {
                    void requestFinalReport();
                    return;
                  }

                  const selectedParticipant = state.participants.find(
                    (participant) => participant.id === aiHistoryParticipantId,
                  );
                  if (!selectedParticipant) {
                    void requestFinalReport();
                    return;
                  }

                  void requestFinalReport({
                    participantId: selectedParticipant.id,
                    successMessage: `Resumo final gerado para ${getParticipantDisplayName(selectedParticipant)}.`,
                  });
                }}
                disabled={!canUseAiActions || finalReportLoading}
              >
                {finalReportLoading
                  ? "Gerando resumo final..."
                  : "Gerar resumo final"}
              </button>

              <div className="notice" style={{ display: "grid", gap: 6 }}>
                <strong>Relatórios finais disponíveis</strong>
                {finalReportParticipants.length === 0 ? (
                  <span className="small-muted">
                    Nenhum relatório final disponível para leitura.
                  </span>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {finalReportParticipants.map((participant) => {
                      const participantReports =
                        finalReportsByParticipantId.get(participant.id) || [];
                      const latestReport = participantReports[0] || null;
                      const participantLabel =
                        getParticipantDisplayName(participant);

                      return (
                        <button
                          key={participant.id}
                          className="btn-secondary"
                          disabled={!latestReport}
                          style={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            whiteSpace: "normal",
                            height: "auto",
                            padding: "8px 10px",
                          }}
                          onClick={() => {
                            if (!latestReport) return;
                            setAiContentModal({
                              title: `Relatório final • ${participantLabel}`,
                              subtitle: `Gerado em ${new Date(latestReport.createdAt).toLocaleString("pt-BR")}`,
                              content: latestReport.content,
                            });
                          }}
                        >
                          <strong style={{ fontSize: 12 }}>
                            {isTherapist
                              ? participantLabel
                              : isTherapistSoloPlay
                                ? `Relatório final • ${participantLabel}`
                                : "Meu relatório final"}
                          </strong>
                          <span className="small-muted">
                            {latestReport
                              ? `Disponível para leitura${participantReports.length > 1 ? ` • ${participantReports.length} versões` : ""}`
                              : "Ainda não gerado para este jogador."}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === "players" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Jogadores</strong>
              <div style={{ display: "grid", gap: 6 }}>
                {state.participants.map((participant) => {
                  const isCurrent = participant.id === currentParticipant?.id;
                  const isTherapist = participant.role === "THERAPIST";
                  return (
                    <div
                      key={participant.id}
                      className="notice"
                      style={{
                        display: "grid",
                        gap: 4,
                        borderColor: isCurrent
                          ? "rgba(106, 211, 176, 0.6)"
                          : "rgba(217, 164, 65, 0.35)",
                        background: isCurrent
                          ? "rgba(106, 211, 176, 0.12)"
                          : "hsl(var(--temple-surface-2))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: 13 }}>
                          {participant.user.name || participant.user.email}
                        </strong>
                        <span
                          className="pill"
                          style={{ padding: "2px 7px", fontSize: 11 }}
                        >
                          {isTherapist ? "Terapeuta" : "Jogador"}
                        </span>
                        {isCurrent && (
                          <span
                            className="pill"
                            style={{ padding: "2px 7px", fontSize: 11 }}
                          >
                            Vez atual
                          </span>
                        )}
                      </div>
                      {!isTherapist && (
                        <span className="small-muted">
                          <strong>Intenção de jogo:</strong>{" "}
                          {participant.gameIntention?.trim()
                            ? participant.gameIntention
                            : "Não informada."}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activePanel === "timeline" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Jornada</strong>

              {timelineParticipants.length > 1 && (
                <select
                  value={timelineTargetParticipantId}
                  onChange={(event) =>
                    setTimelineTargetParticipantId(event.target.value)
                  }
                >
                  <option value="">Todos os jogadores</option>
                  {timelineParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.user.name || participant.user.email}
                    </option>
                  ))}
                </select>
              )}

              {timelineLoading ? (
                <span className="small-muted">Carregando jornada...</span>
              ) : timelineError ? (
                <span className="small-muted">{timelineError}</span>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      maxHeight: 280,
                      overflow: "auto",
                      paddingRight: 2,
                    }}
                  >
                    {filteredTimelineMoves.length === 0 ? (
                      <span className="small-muted">
                        Nenhuma jogada para o jogador selecionado.
                      </span>
                    ) : (
                      filteredTimelineMoves.map((move) => (
                        <div
                          key={move.id}
                          className="notice"
                          style={{ display: "grid", gap: 4 }}
                        >
                          <strong style={{ fontSize: 12 }}>
                            {move.participant.user.name ||
                              move.participant.user.email}
                          </strong>
                          {(() => {
                            const hasJump =
                              move.appliedJumpFrom !== null &&
                              move.appliedJumpTo !== null;
                            const finalHouse =
                              (hasJump ? move.appliedJumpTo : move.toPos) ||
                              move.toPos;
                            const movementText = !hasJump
                              ? `Jogada #${move.turnNumber} • Dado ${move.diceValue} • ${move.fromPos} → ${move.toPos}`
                              : `Jogada #${move.turnNumber} • Dado ${move.diceValue} • ${move.fromPos} → ${move.appliedJumpFrom} • atalho (${move.appliedJumpTo! > move.appliedJumpFrom! ? "subida" : "descida"}): ${move.appliedJumpTo}`;

                            return (
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
                                    houseNumber: finalHouse,
                                    title: `Significado da casa ${finalHouse}`,
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
                            );
                          })()}
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
                              {move.cardDraws.map((draw) => (
                                <div key={draw.id}>
                                  {draw.card ? (
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
                                          card: draw.card,
                                          title: `Carta #${draw.card.cardNumber}`,
                                          subtitle: `Jogada #${move.turnNumber}`,
                                        })
                                      }
                                    >
                                      <img
                                        src={draw.card.imageUrl}
                                        alt={`Carta ${draw.card.cardNumber}`}
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
                              ))}
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
                          {(() => {
                            const moveTips =
                              timelineTipsByMoveKey.get(
                                `${move.participant.id}:${move.turnNumber}`,
                              ) || [];
                            if (moveTips.length === 0) return null;
                            return (
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
                            );
                          })()}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activePanel === "summary" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Resumo do jogador</strong>

              {timelineParticipants.length > 1 && (
                <select
                  value={summaryParticipantId}
                  onChange={(event) =>
                    setSummaryParticipantId(event.target.value)
                  }
                >
                  {timelineParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.user.name || participant.user.email}
                    </option>
                  ))}
                </select>
              )}

              {timelineLoading && timelineMoves.length === 0 ? (
                <span className="small-muted">Carregando resumo...</span>
              ) : timelineError && timelineMoves.length === 0 ? (
                <span className="small-muted">{timelineError}</span>
              ) : !summaryParticipant ? (
                <span className="small-muted">
                  Nenhum jogador disponível para resumo.
                </span>
              ) : summaryMoves.length === 0 ? (
                <span className="small-muted">
                  Ainda não houve jogadas para gerar o resumo.
                </span>
              ) : (
                <>
                  <div className="notice" style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className="pill">
                        Jogador:{" "}
                        <strong>
                          {summaryParticipant.user.name ||
                            summaryParticipant.user.email}
                        </strong>
                      </span>
                      <span className="pill">
                        Status: <strong>{summaryStatus}</strong>
                      </span>
                      <span className="pill">
                        Jogadas:{" "}
                        <strong>
                          {summaryPlayerState?.rollCountTotal || 0}
                        </strong>
                      </span>
                      <span className="pill">
                        Até iniciar:{" "}
                        <strong>
                          {summaryPlayerState?.rollCountUntilStart || 0}
                        </strong>
                      </span>
                      <span className="pill">
                        Casas: <strong>{summaryPath.length}</strong>
                      </span>
                      <span className="pill">
                        Registros terapêuticos:{" "}
                        <strong>{summaryTherapyEntries.length}</strong>
                      </span>
                      <span className="pill">
                        Ajudas da IA: <strong>{summaryAiTipsCount}</strong>
                      </span>
                    </div>
                    <div className="small-muted">
                      <strong>Caminho:</strong> {summaryPathText}
                    </div>
                  </div>

                  <div className="notice" style={{ display: "grid", gap: 8 }}>
                    <strong>Casas mais recorrentes</strong>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {summaryTopHouses.length === 0 ? (
                        <span className="small-muted">(sem dados)</span>
                      ) : (
                        summaryTopHouses.map(([house, count]) => {
                          const houseTitle =
                            getHouseByNumber(house)?.title || "";
                          return (
                            <span key={`${house}-${count}`} className="pill">
                              {house}
                              {houseTitle ? ` • ${houseTitle}` : ""} ({count}x)
                            </span>
                          );
                        })
                      )}
                    </div>
                    <div className="small-muted">
                      Repetição costuma apontar para um tema que pede
                      integração.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="room-mobile-actionbar">
        {ACTION_ITEMS.map((item) => {
          const isActive = activePanel === item.key;
          return (
            <button
              key={`mobile-${item.key}`}
              className={isActive ? "btn-primary" : "btn-secondary"}
              onClick={() => handleSelectActionPanel(item.key)}
              title={item.label}
              data-tour-room={
                isMobileViewport
                  ? TOUR_TARGET_BY_ACTION_PANEL[item.key]
                  : undefined
              }
              style={{
                display: "grid",
                justifyItems: "center",
                minHeight: 40,
                padding: "6px 4px",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
            </button>
          );
        })}
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
              <div
                key={entry.id}
                className="notice"
                style={{ display: "grid", gap: 6 }}
              >
                <span className="small-muted">
                  Jogada #{entry.move.turnNumber} • Casa {entry.move.toPos} •{" "}
                  {new Date(entry.createdAt).toLocaleString("pt-BR")}
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

      {diceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (diceRolling || rollInFlight) return;
            clearDiceTimers();
            setDiceModalOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 10, 0.72)",
            zIndex: 10010,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            className="card mahalilah-dice-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <strong>
              {diceRolling ? "Rolando dado..." : "Resultado da rolagem"}
            </strong>
            <div
              className={`mahalilah-dice-face${diceRolling && diceAnimationEnabled ? " is-rolling" : ""}`}
            >
              {getDiceFaceSymbol(diceFace)}
            </div>
            <span className="small-muted">
              {diceRolling
                ? diceAnimationEnabled
                  ? "O dado está girando."
                  : "Aguardando o número sorteado..."
                : typeof diceResult === "number"
                  ? `Número sorteado: ${diceResult}`
                  : "Número não disponível."}
            </span>
            <button
              className="btn-secondary"
              onClick={() => {
                clearDiceTimers();
                setDiceModalOpen(false);
                setDiceRolling(false);
              }}
              disabled={diceRolling || rollInFlight}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {aiContentModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeAiContentModal}
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
                onClick={closeAiContentModal}
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

      {therapistSummaryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (therapistSummarySaving) return;
            setTherapistSummaryModalOpen(false);
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
              gap: 10,
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
              <strong>Síntese do terapeuta</strong>
              <button
                className="btn-secondary"
                disabled={therapistSummarySaving}
                onClick={() => setTherapistSummaryModalOpen(false)}
              >
                Fechar
              </button>
            </div>

            <span className="small-muted">
              Essas observações são compartilhadas com o campo de síntese da sala no dashboard.
            </span>

            <textarea
              rows={10}
              maxLength={8000}
              value={therapistSummaryDraft}
              onChange={(event) => setTherapistSummaryDraft(event.target.value)}
              placeholder="Registre aqui os principais pontos da condução terapêutica."
            />

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
                disabled={therapistSummarySaving}
                onClick={() => setTherapistSummaryDraft("")}
              >
                Limpar
              </button>
              <button
                className="btn-primary"
                disabled={therapistSummarySaving}
                onClick={async () => {
                  const ok = await handleSaveTherapistSummary();
                  if (!ok) return;
                  setTherapistSummaryModalOpen(false);
                }}
              >
                {therapistSummarySaving ? "Salvando..." : "Salvar síntese"}
              </button>
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
                  <span className="small-muted">
                    {houseMeaningModal.subtitle}
                  </span>
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
                    Casa {modalHouseInfo.number} •{" "}
                    {modalHouseInfo.sanskrit || "—"} •{" "}
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

      {rulesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setRulesModalOpen(false)}
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
              <strong>Resumo das regras do Maha Lilah</strong>
              <button
                className="btn-secondary"
                onClick={() => setRulesModalOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="notice" style={{ display: "grid", gap: 8 }}>
              <span className="small-muted">
                <strong>1.</strong> Todos começam na casa <strong>68</strong>.
              </span>
              <span className="small-muted">
                <strong>2.</strong> Para iniciar o jogo, precisa rolar{" "}
                <strong>6</strong>; ao iniciar, vai para a casa{" "}
                <strong>6</strong>.
              </span>
              <span className="small-muted">
                <strong>3.</strong> A rolagem do dado so fica ativa com o{" "}
                <strong>terapeuta online</strong> na sala.
              </span>
              <span className="small-muted">
                <strong>4.</strong> Atalhos podem subir (↗) ou descer (↘),
                conforme a casa onde o jogador caiu.
              </span>
              <span className="small-muted">
                <strong>5.</strong> A sala conclui quando o jogador retorna a{" "}
                casa <strong>68</strong> apos ja ter iniciado.
              </span>
              <span className="small-muted">
                <strong>6.</strong> Cada jogada permite tirar ate{" "}
                <strong>3 cartas</strong>.
              </span>
              <span className="small-muted">
                <strong>7.</strong> Registro terapeutico e ajudas de IA ficam
                salvos na jornada do jogador.
              </span>
            </div>
          </div>
        </div>
      )}

      {finalReportPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (finalReportLoading) return;
            if (finalReportPrompt.mode === "trialLimit") {
              setFinalReportPrompt(null);
              setTrialLimitModalOpen(true);
              return;
            }
            setFinalReportPrompt(null);
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
              width: "min(560px, 96vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            <strong>
              {finalReportPrompt.mode === "close"
                ? "Gerar resumo final da IA para todos os jogadores antes de encerrar?"
                : finalReportPrompt.mode === "trialLimit"
                  ? "Você atingiu o limite da sala trial. Deseja gerar o resumo final agora?"
                : `${finalReportPrompt.participantName || "Jogador"} concluiu (casa 68). Deseja gerar o resumo final agora?`}
            </strong>
            <span className="small-muted">
              {finalReportPrompt.mode === "close"
                ? "Os resumos finais serão registrados na jornada da sala."
                : finalReportPrompt.mode === "trialLimit"
                  ? "Após esta etapa, vamos abrir as opções para comprar sessão avulsa ou assinar um plano."
                : "Esse resumo final ficará registrado na jornada da sala."}
            </span>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn-secondary"
                disabled={finalReportLoading}
                onClick={() => {
                  if (finalReportPrompt.mode === "trialLimit") {
                    setFinalReportPrompt(null);
                    setTrialLimitModalOpen(true);
                    return;
                  }
                  setFinalReportPrompt(null);
                }}
              >
                {finalReportPrompt.mode === "close" ? "Cancelar" : "Agora não"}
              </button>

              {finalReportPrompt.mode === "close" && (
                <button
                  className="btn-secondary"
                  disabled={finalReportLoading}
                  onClick={() => {
                    setFinalReportPrompt(null);
                    closeRoom();
                  }}
                >
                  Encerrar sem gerar
                </button>
              )}

              <button
                disabled={finalReportLoading}
                onClick={async () => {
                  const ok =
                    finalReportPrompt.mode === "close"
                      ? await requestFinalReport({ allPlayers: true })
                      : finalReportPrompt.mode === "trialLimit"
                        ? await requestFinalReport({
                            participantId:
                              therapistParticipantInRoom?.id ||
                              myParticipant?.id,
                            successMessage: "Resumo final gerado.",
                          })
                      : await requestFinalReport({
                          participantId: finalReportPrompt.participantId,
                          successMessage: `Resumo final gerado para ${finalReportPrompt.participantName || "o jogador"}.`,
                        });
                  if (!ok) return;
                  if (finalReportPrompt.mode === "close") {
                    closeRoom();
                  }
                  setFinalReportPrompt(null);
                  if (finalReportPrompt.mode === "trialLimit") {
                    setPendingTrialPlansAfterAiModal(true);
                  }
                }}
              >
                {finalReportLoading
                  ? "Gerando..."
                  : finalReportPrompt.mode === "close"
                    ? "Gerar e encerrar"
                    : finalReportPrompt.mode === "trialLimit"
                      ? "Gerar resumo e continuar"
                    : "Gerar agora"}
              </button>
            </div>
          </div>
        </div>
      )}

      {trialLimitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setTrialLimitModalOpen(false)}
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
              width: "min(560px, 96vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            <strong>Sua experiência trial terminou</strong>
            <span className="small-muted">
              Você usou as {TRIAL_POST_START_MOVE_LIMIT} jogadas da sala trial após sair da casa 68.
              Para continuar com mais uso de IA, histórico completo e sessões
              sem limite de trial, escolha uma opção:
            </span>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setTrialLimitModalOpen(false)}
              >
                Depois
              </button>
              <a href="/planos" className="btn-secondary">
                Comprar sala avulsa
              </a>
              <a href="/planos" className="btn-primary">
                Assinar plano
              </a>
            </div>
          </div>
        </div>
      )}

      {showRoomTutorial && roomTutorialRole && currentRoomTutorialStep && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: roomTutorialTargetRect
              ? "transparent"
              : "rgba(3, 6, 10, 0.72)",
            zIndex: 11000,
          }}
        >
          {roomTutorialTargetRect && (
            <div
              style={{
                position: "fixed",
                top: roomTutorialTargetRect.top - 8,
                left: roomTutorialTargetRect.left - 8,
                width: roomTutorialTargetRect.width + 16,
                height: roomTutorialTargetRect.height + 16,
                borderRadius: 14,
                border: "2px solid rgba(217, 164, 65, 0.92)",
                boxShadow:
                  "0 0 0 9999px rgba(3, 6, 10, 0.72), 0 0 0 5px rgba(217, 164, 65, 0.22)",
                pointerEvents: "none",
                zIndex: 11001,
              }}
            />
          )}
          {roomTutorialPopover && (
            <div
              style={{
                position: "fixed",
                width: 14,
                height: 14,
                background: "hsl(var(--temple-surface-2))",
                transform: "rotate(45deg)",
                zIndex: 11002,
                ...(roomTutorialPopover.placement === "right"
                  ? {
                      left: roomTutorialPopover.left - 7,
                      top:
                        roomTutorialPopover.top +
                        roomTutorialPopover.arrowOffset -
                        7,
                      borderLeft: "1px solid rgba(217, 164, 65, 0.55)",
                      borderTop: "1px solid rgba(217, 164, 65, 0.55)",
                    }
                  : roomTutorialPopover.placement === "left"
                    ? {
                        left: roomTutorialPopover.left + roomTutorialPopover.width - 7,
                        top:
                          roomTutorialPopover.top +
                          roomTutorialPopover.arrowOffset -
                          7,
                        borderRight: "1px solid rgba(217, 164, 65, 0.55)",
                        borderBottom: "1px solid rgba(217, 164, 65, 0.55)",
                      }
                    : roomTutorialPopover.placement === "bottom"
                      ? {
                          left:
                            roomTutorialPopover.left +
                            roomTutorialPopover.arrowOffset -
                            7,
                          top: roomTutorialPopover.top - 7,
                          borderLeft: "1px solid rgba(217, 164, 65, 0.55)",
                          borderTop: "1px solid rgba(217, 164, 65, 0.55)",
                        }
                      : {
                          left:
                            roomTutorialPopover.left +
                            roomTutorialPopover.arrowOffset -
                            7,
                          top:
                            roomTutorialPopover.top +
                            roomTutorialPopover.height -
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
              width: roomTutorialPopover?.width || "min(430px, 94vw)",
              maxHeight: "82vh",
              overflow: "auto",
              display: "grid",
              gap: 12,
              position: "fixed",
              top: roomTutorialPopover?.top || "50%",
              left: roomTutorialPopover?.left || "50%",
              transform: roomTutorialPopover ? "none" : "translate(-50%, -50%)",
              zIndex: 11002,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <strong>
                Tutorial da sala •{" "}
                {roomTutorialRole === "THERAPIST" ? "Terapeuta" : "Jogador"} (
                {roomTutorialStep + 1}/{roomTutorialSteps.length})
              </strong>
              <span className="small-muted">
                Esse guia aparece automaticamente apenas no primeiro acesso da
                sala para este perfil.
              </span>
            </div>

            <div className="notice" style={{ display: "grid", gap: 8 }}>
              <strong>{currentRoomTutorialStep.title}</strong>
              <span className="small-muted">
                {currentRoomTutorialStep.description}
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
                  setRoomTutorialStep((prev) => Math.max(0, prev - 1))
                }
                disabled={roomTutorialStep === 0}
              >
                Voltar
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={finishRoomTutorial}>
                  Pular tutorial
                </button>
                <button
                  onClick={() => {
                    if (roomTutorialStep >= roomTutorialSteps.length - 1) {
                      finishRoomTutorial();
                      return;
                    }
                    setRoomTutorialStep((prev) => prev + 1);
                  }}
                >
                  {roomTutorialStep >= roomTutorialSteps.length - 1
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
