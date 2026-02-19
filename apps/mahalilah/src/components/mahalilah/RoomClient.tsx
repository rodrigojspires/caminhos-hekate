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
  online?: boolean;
  consentAcceptedAt: string | null;
  gameIntention?: string | null;
  therapistSummary?: string | null;
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
    therapistPlays?: boolean;
    playerIntentionLocked?: boolean;
    therapistSoloPlay?: boolean;
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
  mode: "currentHouse" | "pathQuestion" | null;
  question: string | null;
};

type ParsedProgressSummary = {
  text: string;
  intervalStart: number | null;
  intervalEnd: number | null;
  summaryEveryMoves: number | null;
  intention: string | null;
};

type ProgressSummaryStatusPayload = {
  status?: "processing" | "done" | "error";
  participantId?: string;
  participantName?: string;
  windowStartMoveIndex?: number;
  windowEndMoveIndex?: number;
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
type RulesHelpTab = "about" | "rules" | "controls" | "howToPlay";

const COLORS = [
  "#2f7f6f",
  "#b44c4c",
  "#546fa3",
  "#c07a4a",
  "#7a5aa5",
  "#d5a439",
];
const TRIAL_POST_START_MOVE_LIMIT = 5;
const AI_PATH_HELP_MAX_LENGTH = 600;
const DICE_ANIMATION_STORAGE_KEY = "mahalilah:dice-animation-enabled";
const ROOM_ONBOARDING_VERSION = "2026-02-tutorial-refresh";
const ROOM_ONBOARDING_THERAPIST_VERSION_KEY =
  "mahalilah:onboarding:room:therapist:version";
const ROOM_ONBOARDING_PLAYER_VERSION_KEY =
  "mahalilah:onboarding:room:player:version";
const DICE_SPIN_INTERVAL_MS = 90;
const DICE_MIN_SPIN_MS = 900;
const DICE_RESULT_PREVIEW_MS = 950;
const THERAPY_EMOTION_OPTIONS = [
  "Abandono (sentimento de)",
  "Admiração",
  "Alegria",
  "Alívio",
  "Amor / afeto",
  "Angústia",
  "Ansiedade",
  "Antecipação",
  "Apreensão",
  "Arrependimento",
  "Cansaço emocional",
  "Ciúme",
  "Compaixão",
  "Confiança",
  "Confusão",
  "Contentamento",
  "Culpa",
  "Curiosidade",
  "Decepção",
  "Desamparo",
  "Desânimo",
  "Desconfiança",
  "Desdém",
  "Desespero",
  "Desmotivação",
  "Desprezo",
  "Dúvida",
  "Empatia",
  "Empolgação",
  "Encantamento",
  "Entusiasmo",
  "Esperança",
  "Euforia",
  "Expectativa",
  "Frustração",
  "Gratidão",
  "Humor / diversão",
  "Humilhação",
  "Impaciência",
  "Indignação",
  "Insegurança",
  "Interesse",
  "Inveja",
  "Irritação",
  "Luto",
  "Medo",
  "Melancolia",
  "Nervosismo",
  "Nojo",
  "Nostalgia",
  "Orgulho (saudável)",
  "Pânico",
  "Paz",
  "Preocupação",
  "Raiva",
  "Rejeição",
  "Remorso",
  "Ressentimento",
  "Satisfação",
  "Saudade",
  "Sensação de rejeição",
  "Senso de pertencimento",
  "Serenidade / calma",
  "Sobrecarga",
  "Solidão",
  "Surpresa",
  "Tédio",
  "Tensão",
  "Ternura",
  "Terror",
  "Timidez",
  "Tristeza",
  "Tristeza profunda",
  "Vazio",
  "Vergonha (exposição)",
  "Vergonha alheia",
  "Vulnerabilidade",
] as const;

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

const RULES_HELP_TABS: Array<{
  id: RulesHelpTab;
  label: string;
  description: string;
}> = [
  {
    id: "about",
    label: "O que é",
    description: "Visão geral do Maha Lilah e do propósito terapêutico da sessão.",
  },
  {
    id: "rules",
    label: "Regras",
    description: "Regras oficiais da sala, turnos, início, atalhos e encerramento.",
  },
  {
    id: "controls",
    label: "Botões",
    description: "Explicação botão por botão, com quando usar cada um.",
  },
  {
    id: "howToPlay",
    label: "Como jogar",
    description: "Mini tutorial prático em passos para conduzir uma rodada.",
  },
];

const ACTION_ITEM_HELP_TEXT: Record<ActionPanel, string> = {
  house:
    "Consulta o significado completo da casa selecionada: tema, polaridade (luz/sombra), palavras-chave e pergunta terapêutica.",
  deck: "Permite tirar cartas da jogada atual (até 3 cartas), com leitura e registro no histórico da jornada.",
  therapy:
    "Registra emoção, intensidade, insight, corpo e ação da jogada para acompanhamento terapêutico ao longo da sessão.",
  ai: "Central de IA: ajuda da casa atual, ajuda personalizada pelo caminho e histórico de respostas geradas.",
  players:
    "Mostra participantes, estado de cada jogador e opções de acompanhamento clínico (como síntese do terapeuta).",
  timeline:
    "Exibe a jornada cronológica com jogadas, atalhos, cartas, registros e conteúdos de IA por jogador.",
  summary:
    "Mostra o consolidado do jogador: caminho no tabuleiro, frequência de casas, resumos e visão de evolução.",
};

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
      ? 'Use "Rolar dado" na vez atual, "Avançar vez" para conduzir a rodada e "Encerrar sala" para fechamento. Ao concluir a jornada, você pode gerar relatório final direto pela sala.'
      : 'No seu turno use "Rolar dado". Fora do turno, acompanhe os indicadores e aguarde sua vez; o botão muda de estado automaticamente.';
  const aiDescription =
    role === "THERAPIST"
      ? 'No ícone IA você gera ajuda contextual, acompanha histórico de ajudas, monitora "O Caminho até agora" por blocos e dispara relatório final por jogador ou da sala.'
      : 'No ícone IA você acompanha ajudas e sínteses já geradas na sessão. Em modo visualização, as ações de geração ficam apenas com o terapeuta.';
  const playersDescription =
    role === "THERAPIST"
      ? "No ícone Jogadores você acompanha participantes e vez atual, além de abrir o botão de observações para editar a síntese terapêutica de cada jogador."
      : "No ícone Jogadores você acompanha quem está na sala e quem está com a vez no momento.";
  const summaryDescription =
    role === "THERAPIST"
      ? "No ícone Resumo você revisa caminho completo, casas recorrentes, registros terapêuticos e volume de IA por participante para fechamento clínico."
      : "No ícone Resumo você visualiza o consolidado da jornada, com caminho no tabuleiro e casas mais recorrentes.";

  return [
    {
      title: "Indicadores da sala",
      description:
        "No topo você acompanha vez atual, rolagens, status da sala, status do terapeuta e sinalizações de trial/modo de jogo em tempo real.",
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
        "Aqui ficam os pinos, atalhos de subida/descida e destaque visual da vez atual, com leitura rápida da posição de cada participante.",
      target: "room-board",
    },
    {
      title: "Menu Casa",
      description:
        "No ícone Casa você consulta significado completo da casa selecionada, com palavras-chave, polaridade (luz/sombra) e pergunta terapêutica.",
      target: "room-menu-house",
    },
    {
      title: "Menu Carta",
      description:
        "No ícone Carta o jogador da vez tira cartas do deck (até 3 por jogada), com pré-visualização, texto terapêutico e registro na jornada.",
      target: "room-menu-deck",
    },
    {
      title: "Menu Registro",
      description:
        "No ícone Registro você salva emoção, intensidade, insight, corpo e ação da jogada atual para acompanhamento terapêutico.",
      target: "room-menu-therapy",
    },
    {
      title: "Menu IA",
      description: aiDescription,
      target: "room-menu-ai",
    },
    {
      title: "Menu Jogadores",
      description: playersDescription,
      target: "room-menu-players",
    },
    {
      title: "Menu Jornada",
      description:
        "No ícone Jornada você revisa jogadas, atalhos, cartas, registros terapêuticos e saídas de IA por participante.",
      target: "room-menu-timeline",
    },
    {
      title: "Menu Resumo",
      description: summaryDescription,
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
        mode:
          parsed.mode === "currentHouse" || parsed.mode === "pathQuestion"
            ? parsed.mode
            : null,
        question:
          typeof parsed.question === "string" ? parsed.question : null,
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
    mode: null,
    question: null,
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

function randomDiceFace() {
  return Math.floor(Math.random() * 6) + 1;
}

function getDiceFaceSymbol(face: number) {
  const symbols = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return symbols[face - 1] || "⚀";
}

function getSocketDisconnectMessage(reason: string) {
  if (reason === "io server disconnect") {
    return "Sua sessão foi desconectada pelo servidor.";
  }
  if (reason === "io client disconnect") {
    return "Conexão encerrada nesta aba.";
  }
  if (reason === "ping timeout") {
    return "Conexão com a sala perdida por inatividade/rede instável.";
  }
  if (reason === "transport close" || reason === "transport error") {
    return "Conexão com a sala foi interrompida.";
  }
  return "Conexão com a sala foi perdida.";
}

export function RoomClient({
  code,
  adminOpenToken,
}: {
  code: string;
  adminOpenToken?: string;
}) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [fatalErrorCode, setFatalErrorCode] = useState<string | null>(null);
  const [forceTakeoverLoading, setForceTakeoverLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketReconnecting, setSocketReconnecting] = useState(false);
  const [socketConnectionMessage, setSocketConnectionMessage] = useState("");
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
  const [aiPathHelpInput, setAiPathHelpInput] = useState("");
  const [aiTipUsage, setAiTipUsage] = useState<{
    used: number;
    limit: number;
  } | null>(null);
  const [progressSummaryGeneratingByParticipantId, setProgressSummaryGeneratingByParticipantId] =
    useState<Record<string, boolean>>({});
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
  const [deckParticipantId, setDeckParticipantId] = useState("");
  const [therapistSummaryParticipantId, setTherapistSummaryParticipantId] =
    useState("");
  const [therapistSummaryDraft, setTherapistSummaryDraft] = useState("");
  const [therapistSummaryModalOpen, setTherapistSummaryModalOpen] =
    useState(false);
  const [therapistSummarySaving, setTherapistSummarySaving] = useState(false);
  const [showBoardNames, setShowBoardNames] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesHelpTab, setRulesHelpTab] = useState<RulesHelpTab>("about");
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
  const [aiContentModal, setAiContentModal] =
    useState<AiContentModalState | null>(null);
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

  const joinRoom = useCallback(
    (
      targetSocket: Socket,
      options?: {
        forceTakeover?: boolean;
        onSettled?: () => void;
        skipLoading?: boolean;
      },
    ) => {
      if (!options?.skipLoading) {
        setLoading(true);
      }
      setFatalError(null);
      setFatalErrorCode(null);

      targetSocket.emit(
        "room:join",
        {
          code,
          forceTakeover: Boolean(options?.forceTakeover),
          adminOpenToken: adminOpenToken || undefined,
        },
        (resp: any) => {
          options?.onSettled?.();
          if (!resp?.ok) {
            const message = resp?.error || "Não foi possível entrar na sala.";
            setFatalError(message);
            setFatalErrorCode(
              typeof resp?.code === "string" ? resp.code : null,
            );
            setLoading(false);
            pushToast(message, "error");
            return;
          }

          setState(resp.state);
          setLoading(false);
          setFatalError(null);
          setFatalErrorCode(null);
        },
      );
    },
    [code, adminOpenToken, pushToast],
  );

  const handleForceTakeoverJoin = useCallback(() => {
    if (!socket) return;
    setForceTakeoverLoading(true);
    joinRoom(socket, {
      forceTakeover: true,
      onSettled: () => setForceTakeoverLoading(false),
    });
  }, [socket, joinRoom]);

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
    let hasConnectedAtLeastOnce = false;

    const connect = async () => {
      setLoading(true);
      setFatalError(null);
      setFatalErrorCode(null);
      setSocketConnected(false);
      setSocketReconnecting(false);
      setSocketConnectionMessage("Conectando à sala...");

      const res = await fetch("/api/mahalilah/realtime/token");
      if (!res.ok) {
        if (!cancelled) {
          setFatalError("Não foi possível autenticar no realtime.");
          setFatalErrorCode(null);
          setLoading(false);
          setSocketConnected(false);
          setSocketReconnecting(false);
          setSocketConnectionMessage("Falha de autenticação no realtime.");
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

      s.on("connect", () => {
        if (cancelled) return;
        const isReconnect = hasConnectedAtLeastOnce;
        hasConnectedAtLeastOnce = true;
        setSocketConnected(true);
        setSocketReconnecting(false);
        setSocketConnectionMessage("");
        joinRoom(s, { skipLoading: isReconnect });
        if (isReconnect) {
          pushToast("Conexão restabelecida. Sala sincronizada.", "success");
        }
      });

      s.on("disconnect", (reason) => {
        if (cancelled) return;
        setSocketConnected(false);
        setSocketReconnecting(false);
        setSocketConnectionMessage(getSocketDisconnectMessage(reason));
        setRollInFlight(false);
        clearDiceTimers();
        setDiceRolling(false);
        setDiceModalOpen(false);
        setDiceResult(null);
        pushToast("Conexão com a sala perdida. Tentando reconectar...", "warning");
      });

      s.io.on("reconnect_attempt", () => {
        if (cancelled) return;
        setSocketReconnecting(true);
        setSocketConnectionMessage("Tentando reconectar com a sala...");
      });

      s.io.on("reconnect_failed", () => {
        if (cancelled) return;
        setSocketReconnecting(false);
        setSocketConnectionMessage("Não foi possível reconectar automaticamente.");
        pushToast(
          "Não foi possível reconectar automaticamente. Recarregue a página.",
          "error",
        );
      });

      s.on("connect_error", (err) => {
        if (!cancelled) {
          setSocketConnected(false);
          pushToast(err.message || "Erro de conexão com a sala.", "error");
        }
      });

      s.on("room:state", (payload: RoomState) => {
        if (!cancelled) {
          setState(payload);
          setLoading(false);
          setFatalError(null);
          setFatalErrorCode(null);
        }
      });

      s.on("session:terminated", (payload: any) => {
        if (cancelled) return;
        const message =
          typeof payload?.message === "string" && payload.message.trim()
            ? payload.message
            : "Sua sessão foi encerrada porque a conta entrou na sala em outro dispositivo.";
        setState(null);
        setFatalError(message);
        setFatalErrorCode(
          typeof payload?.code === "string" ? payload.code : "SESSION_TERMINATED",
        );
        setLoading(false);
        pushToast(message, "error");
      });

      s.on(
        "ai:progressSummaryStatus",
        (payload: ProgressSummaryStatusPayload) => {
          if (cancelled) return;
          const participantId = payload?.participantId;
          if (!participantId) return;

          if (payload.status === "processing") {
            setProgressSummaryGeneratingByParticipantId((prev) => ({
              ...prev,
              [participantId]: true,
            }));
            const participantLabel =
              payload.participantName?.trim() || "jogador";
            const intervalLabel =
              typeof payload.windowStartMoveIndex === "number" &&
              typeof payload.windowEndMoveIndex === "number"
                ? ` (jogadas ${payload.windowStartMoveIndex}-${payload.windowEndMoveIndex})`
                : "";
            pushToast(
              `Gerando síntese automática de O Caminho até agora para ${participantLabel}${intervalLabel}.`,
              "warning",
            );
            return;
          }

          setProgressSummaryGeneratingByParticipantId((prev) => {
            if (!prev[participantId]) return prev;
            const next = { ...prev };
            delete next[participantId];
            return next;
          });
        },
      );

      setSocket(s);
    };

    connect();

    return () => {
      cancelled = true;
      if (currentSocket) {
        currentSocket.io.removeAllListeners();
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
      }
    };
  }, [session?.user?.id, pushToast, joinRoom, clearDiceTimers]);

  useEffect(() => {
    if (!socket) return;

    const ensureSocketConnected = () => {
      if (document.visibilityState === "hidden") return;
      if (socket.connected) return;
      setSocketReconnecting(true);
      setSocketConnectionMessage("Tentando reconectar com a sala...");
      socket.connect();
    };

    window.addEventListener("focus", ensureSocketConnected);
    window.addEventListener("online", ensureSocketConnected);
    window.addEventListener("pageshow", ensureSocketConnected);
    document.addEventListener("visibilitychange", ensureSocketConnected);

    return () => {
      window.removeEventListener("focus", ensureSocketConnected);
      window.removeEventListener("online", ensureSocketConnected);
      window.removeEventListener("pageshow", ensureSocketConnected);
      document.removeEventListener("visibilitychange", ensureSocketConnected);
    };
  }, [socket]);

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
    setProgressSummaryGeneratingByParticipantId({});
    setTherapistSummaryParticipantId("");
    setTherapistSummaryDraft("");
    setTherapistSummaryModalOpen(false);
    setTherapistSummarySaving(false);
    completionStateByParticipantRef.current = new Map();
    completionPromptedParticipantsRef.current = new Set();
    completionPromptQueueProcessingRef.current = false;
  }, [state?.room.id, clearDiceTimers]);

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
  const playerParticipants =
    state?.participants.filter((participant) => participant.role === "PLAYER") ||
    [];
  const singlePlayerParticipant =
    playerParticipants.length === 1 ? playerParticipants[0] : null;
  const therapistHasPlayerState = Boolean(
    therapistParticipantInRoom &&
      playerStateMap.has(therapistParticipantInRoom.id),
  );
  const therapistPlaysInCurrentRoom =
    state?.room.therapistPlays ?? therapistHasPlayerState;

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

  useEffect(() => {
    if (!state || !myParticipant) return;

    const myState = playerStateMap.get(myParticipant.id);
    const myHouseNumber = (myState?.position ?? 67) + 1;

    if (!state.lastMove) {
      setSelectedHouseNumber(myHouseNumber);
      return;
    }

    // A última jogada deve atualizar automaticamente para o terapeuta
    // e para o próprio jogador que acabou de jogar.
    const shouldFollowLastMove =
      myParticipant.role === "THERAPIST" ||
      state.lastMove.participantId === myParticipant.id;

    if (shouldFollowLastMove) {
      setSelectedHouseNumber(state.lastMove.toPos);
      return;
    }

    // Para os demais jogadores, mantém o foco na própria casa.
    setSelectedHouseNumber(myHouseNumber);
  }, [
    state,
    myParticipant,
    playerStateMap,
    state?.lastMove?.id,
    state?.lastMove?.toPos,
    state?.lastMove?.participantId,
  ]);

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
  const socketReady = Boolean(socket && socketConnected && socket.connected);
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
      !isViewerInTherapistSoloPlay &&
      socketReady,
  );
  const isTherapist = myParticipant?.role === "THERAPIST";
  const isSinglePlayerWithTherapistObserver = Boolean(
    !isTherapistSoloPlay &&
      singlePlayerParticipant &&
      therapistParticipantInRoom &&
      !therapistPlaysInCurrentRoom,
  );
  const shouldLockPlayerDropdownForTherapist = Boolean(
    isTherapist && isSinglePlayerWithTherapistObserver && singlePlayerParticipant,
  );
  const lockedPlayerParticipantId =
    shouldLockPlayerDropdownForTherapist && singlePlayerParticipant
      ? singlePlayerParticipant.id
      : "";
  const canCloseRoom = myParticipant?.role === "THERAPIST";
  const isPlayerIntentionLocked = Boolean(
    myParticipant?.role === "PLAYER" && state?.room.playerIntentionLocked,
  );
  const shouldShowSessionIntentionField = Boolean(
    myParticipant && !isViewerInTherapistSoloPlay,
  );
  const canEditSessionIntention = Boolean(
    myParticipant &&
      !isPlayerIntentionLocked &&
      !isViewerInTherapistSoloPlay &&
      !actionsBlockedByConsent &&
      socketReady,
  );
  const playerParticipantsCount = playerParticipants.length;
  const canReplicateIntentionToPlayers = Boolean(
    myParticipant?.role === "THERAPIST" &&
      !actionsBlockedByConsent &&
      !isTherapistSoloPlay &&
      playerParticipantsCount > 1 &&
      socketReady,
  );
  const shouldAutoSyncTherapistDropdownsByTurn = Boolean(
    isTherapist && !isTherapistSoloPlay && playerParticipantsCount > 1,
  );
  const currentTurnParticipantId = currentParticipant?.id || "";
  const currentTurnParticipantRole = currentParticipant?.role || "";
  const canRoll = Boolean(
    isMyTurn &&
      state?.room.status === "ACTIVE" &&
      !actionsBlockedByConsent &&
      !trialLimitReached &&
      state?.room.therapistOnline &&
      socketReady,
  );

  const timelineParticipants = useMemo(() => {
    if (!state?.participants || !myParticipant) return [];
    if (myParticipant.role !== "THERAPIST") return [myParticipant];
    if (!isTherapistSoloPlay) return state.participants;
    return state.participants.filter(
      (participant) => participant.role === "THERAPIST",
    );
  }, [state?.participants, myParticipant, isTherapistSoloPlay]);
  const timelineAndSummaryParticipants =
    shouldLockPlayerDropdownForTherapist && singlePlayerParticipant
      ? [singlePlayerParticipant]
      : timelineParticipants;

  const boardParticipants = useMemo(() => {
    if (!state?.participants) return [];
    if (!isTherapistSoloPlay) return state.participants;
    return state.participants.filter((participant) => participant.role === "THERAPIST");
  }, [state?.participants, isTherapistSoloPlay]);
  const participantPinColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    boardParticipants.forEach((participant, participantIndex) => {
      colorMap.set(participant.id, COLORS[participantIndex % COLORS.length]);
    });
    return colorMap;
  }, [boardParticipants]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      if (shouldLockPlayerDropdownForTherapist && lockedPlayerParticipantId) {
        setTimelineTargetParticipantId(lockedPlayerParticipantId);
        return;
      }
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
  }, [
    state,
    myParticipant,
    isTherapistSoloPlay,
    shouldLockPlayerDropdownForTherapist,
    lockedPlayerParticipantId,
  ]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      if (shouldLockPlayerDropdownForTherapist && lockedPlayerParticipantId) {
        setSummaryParticipantId(lockedPlayerParticipantId);
        return;
      }
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
  }, [
    state,
    myParticipant,
    isTherapistSoloPlay,
    therapistParticipantInRoom,
    shouldLockPlayerDropdownForTherapist,
    lockedPlayerParticipantId,
  ]);

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

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      if (shouldLockPlayerDropdownForTherapist && lockedPlayerParticipantId) {
        setDeckParticipantId(lockedPlayerParticipantId);
        return;
      }
      const targetGroup = isTherapistSoloPlay
        ? state.participants.filter((participant) => participant.role === "THERAPIST")
        : state.participants;
      const preferredPlayer = targetGroup.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = targetGroup[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setDeckParticipantId((prev) => prev || targetId);
      return;
    }

    const targetId =
      isTherapistSoloPlay && therapistParticipantInRoom
        ? therapistParticipantInRoom.id
        : myParticipant.id;
    setDeckParticipantId(targetId);
  }, [
    state,
    myParticipant,
    isTherapistSoloPlay,
    therapistParticipantInRoom,
    shouldLockPlayerDropdownForTherapist,
    lockedPlayerParticipantId,
  ]);

  useEffect(() => {
    if (!shouldAutoSyncTherapistDropdownsByTurn) return;
    if (!currentTurnParticipantId || currentTurnParticipantRole !== "PLAYER")
      return;

    const nextParticipantId = currentTurnParticipantId;
    setAiHistoryParticipantId((prev) =>
      prev === nextParticipantId ? prev : nextParticipantId,
    );
    setTimelineTargetParticipantId((prev) =>
      prev === nextParticipantId ? prev : nextParticipantId,
    );
    setSummaryParticipantId((prev) =>
      prev === nextParticipantId ? prev : nextParticipantId,
    );
    setDeckParticipantId((prev) =>
      prev === nextParticipantId ? prev : nextParticipantId,
    );
  }, [
    shouldAutoSyncTherapistDropdownsByTurn,
    currentTurnParticipantId,
    currentTurnParticipantRole,
  ]);
  const effectiveTimelineTargetParticipantId =
    shouldLockPlayerDropdownForTherapist && lockedPlayerParticipantId
      ? lockedPlayerParticipantId
      : timelineTargetParticipantId;
  const effectiveSummaryParticipantId =
    shouldLockPlayerDropdownForTherapist && lockedPlayerParticipantId
      ? lockedPlayerParticipantId
      : summaryParticipantId;
  const effectiveDeckParticipantId =
    shouldLockPlayerDropdownForTherapist && lockedPlayerParticipantId
      ? lockedPlayerParticipantId
      : deckParticipantId;
  const deckDisplayParticipantId = effectiveDeckParticipantId;
  const deckTargetParticipantId =
    myParticipant?.id || "";
  const isDeckViewingSelf = Boolean(
    deckDisplayParticipantId &&
      deckTargetParticipantId &&
      deckDisplayParticipantId === deckTargetParticipantId,
  );

  const filteredTimelineMoves = useMemo(() => {
    const effectiveTargetId =
      myParticipant?.role === "THERAPIST"
        ? effectiveTimelineTargetParticipantId
        : myParticipant?.id || "__no-participant__";
    if (!effectiveTargetId) return timelineMoves;
    return timelineMoves.filter(
      (move) => move.participant.id === effectiveTargetId,
    );
  }, [timelineMoves, effectiveTimelineTargetParticipantId, myParticipant]);

  const filteredTimelineReports = useMemo(() => {
    const effectiveTargetId =
      myParticipant?.role === "THERAPIST"
        ? effectiveTimelineTargetParticipantId
        : myParticipant?.id || "__no-participant__";
    if (!effectiveTargetId) return timelineReports;
    return timelineReports.filter(
      (report) => report.participant?.id === effectiveTargetId,
    );
  }, [timelineReports, effectiveTimelineTargetParticipantId, myParticipant]);

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

  const isProgressSummaryGeneratingForSelectedParticipant = Boolean(
    aiHistoryParticipantId &&
      progressSummaryGeneratingByParticipantId[aiHistoryParticipantId],
  );

  const generatingProgressSummaryParticipantNames = useMemo(() => {
    if (!state?.participants) return [];
    return Object.keys(progressSummaryGeneratingByParticipantId)
      .map(
        (participantId) =>
          state.participants.find((participant) => participant.id === participantId) ||
          null,
      )
      .filter(
        (participant): participant is RoomState["participants"][number] =>
          Boolean(participant),
      )
      .map((participant) => getParticipantDisplayName(participant));
  }, [progressSummaryGeneratingByParticipantId, state?.participants]);

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
    if (!effectiveSummaryParticipantId) return null;
    return (
      state?.participants.find(
        (participant) => participant.id === effectiveSummaryParticipantId,
      ) || null
    );
  }, [state?.participants, effectiveSummaryParticipantId]);

  const therapistSummaryParticipant = useMemo(() => {
    if (!therapistSummaryParticipantId) return null;
    return (
      state?.participants.find(
        (participant) => participant.id === therapistSummaryParticipantId,
      ) || null
    );
  }, [state?.participants, therapistSummaryParticipantId]);

  const summaryPlayerState = summaryParticipant
    ? playerStateMap.get(summaryParticipant.id)
    : undefined;

  const summaryMoves = useMemo(() => {
    if (!effectiveSummaryParticipantId) return [];
    return timelineMoves.filter(
      (move) => move.participant.id === effectiveSummaryParticipantId,
    );
  }, [timelineMoves, effectiveSummaryParticipantId]);

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
    if (!effectiveSummaryParticipantId) return 0;
    return timelineReports.filter(
      (report) =>
        report.kind === "TIP" &&
        report.participant?.id === effectiveSummaryParticipantId,
    ).length;
  }, [timelineReports, effectiveSummaryParticipantId]);

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

  const handleRestartRoomTutorial = useCallback(() => {
    if (!myParticipant) {
      pushToast("Não foi possível iniciar o tutorial agora.", "warning");
      return;
    }
    const role: RoomTutorialRole =
      myParticipant.role === "THERAPIST" ? "THERAPIST" : "PLAYER";
    setRulesModalOpen(false);
    setRoomTutorialRole(role);
    setRoomTutorialStep(0);
    setShowRoomTutorial(true);
    if (isMobileViewport) {
      setMobileActionPanelOpen(true);
    }
  }, [myParticipant, isMobileViewport, pushToast]);

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
      if (actionsBlockedByConsent) {
        pushToast(
          "Aceite o termo de consentimento para liberar o menu da sala.",
          "warning",
        );
        return;
      }
      setActivePanel(panel);
      if (isMobileViewport) {
        setMobileActionPanelOpen(true);
      }
    },
    [actionsBlockedByConsent, isMobileViewport, pushToast],
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
    if (!socket || !socket.connected || rollInFlight) {
      if (!rollInFlight) {
        pushToast(
          "Sem conexão com a sala. Aguarde a reconexão para rolar o dado.",
          "warning",
        );
      }
      return;
    }

    handleSelectActionPanel("house");
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

  const canInitiateDraw = Boolean(
    deckTargetParticipantId &&
      isDeckViewingSelf &&
      !actionsBlockedByConsent &&
      !isViewerInTherapistSoloPlay &&
      socketReady,
  );
  const canUseAiActions = Boolean(
    myParticipant &&
      !actionsBlockedByConsent &&
      !isViewerInTherapistSoloPlay &&
      socketReady,
  );
  const shouldBlockTherapistAiTipActions = Boolean(
    isTherapist && isSinglePlayerWithTherapistObserver,
  );
  const canUseAiTipActions = Boolean(
    canUseAiActions && !shouldBlockTherapistAiTipActions,
  );

  const filteredDeckHistory = useMemo(() => {
    if (!state?.deckHistory?.length || !deckDisplayParticipantId) return [];
    return state.deckHistory.filter(
      (draw) => draw.drawnBy.id === deckDisplayParticipantId,
    );
  }, [state?.deckHistory, deckDisplayParticipantId]);

  const deckHistoryByMove = useMemo(() => {
    if (!filteredDeckHistory.length) return [];

    const grouped: Array<{
      key: string;
      moveId: string | null;
      moveTurnNumber: number | null;
      draws: typeof filteredDeckHistory;
    }> = [];

    filteredDeckHistory.forEach((draw) => {
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
  }, [filteredDeckHistory]);

  const currentMoveDeckGroup = useMemo(() => {
    for (let index = deckHistoryByMove.length - 1; index >= 0; index -= 1) {
      const group = deckHistoryByMove[index];
      if (group.moveId) return group;
    }
    return null;
  }, [deckHistoryByMove]);

  const cardsDrawnInCurrentMove = useMemo(() => {
    if (!currentMoveDeckGroup) return 0;
    return currentMoveDeckGroup.draws.reduce((sum, draw) => {
      if (draw.cards.length > 0) return sum + draw.cards.length;
      if (draw.card) return sum + 1;
      return sum;
    }, 0);
  }, [currentMoveDeckGroup]);

  const remainingDrawsInCurrentMove = Math.max(0, 3 - cardsDrawnInCurrentMove);
  const hasOwnMoveForDeck = Boolean(
    myPlayerState && myPlayerState.rollCountTotal > 0,
  );
  const canDrawCard =
    canInitiateDraw &&
    hasOwnMoveForDeck &&
    remainingDrawsInCurrentMove > 0;

  const timelineMoveTurnById = useMemo(() => {
    const byId = new Map<string, number>();
    timelineMoves.forEach((move) => {
      byId.set(move.id, move.turnNumber);
    });
    return byId;
  }, [timelineMoves]);

  const currentMoveDeckCards = useMemo(() => {
    if (!currentMoveDeckGroup) return [];
    return currentMoveDeckGroup.draws.filter((draw) => Boolean(draw.card));
  }, [currentMoveDeckGroup]);

  const currentMoveTurnNumber = currentMoveDeckGroup
    ? currentMoveDeckGroup.moveTurnNumber ??
      (currentMoveDeckGroup.moveId
        ? timelineMoveTurnById.get(currentMoveDeckGroup.moveId) ?? null
        : null)
    : null;

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
    if (!socket || !socket.connected || !state || !myParticipant) {
      pushToast(
        "Sem conexão com a sala. Aguarde a reconexão para tirar carta.",
        "warning",
      );
      return;
    }
    if (!deckTargetParticipantId) {
      pushToast(
        "Participante inválido para tirar carta.",
        "warning",
      );
      return;
    }
    if (!isDeckViewingSelf) {
      pushToast(
        "Cada participante só pode tirar carta para si. Selecione seu nome.",
        "warning",
      );
      return;
    }
    if (!hasOwnMoveForDeck) {
      pushToast(
        "Você precisa fazer ao menos uma jogada para tirar carta.",
        "warning",
      );
      return;
    }

    socket.emit("deck:draw", { participantId: deckTargetParticipantId }, (resp: any) => {
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
            const moveTurnNumber =
              typeof resp?.moveTurnNumber === "number"
                ? resp.moveTurnNumber
                : null;
            openCardPreview({
              card: resp.card,
              title: `Carta #${resp.card.cardNumber}`,
              subtitle: `Jogada #${moveTurnNumber ?? "—"}${counter ? ` • ${counter}` : ""}`,
            });
          }
        } else {
          pushToast("Carta tirada com sucesso.", "success");
        }
      }
    });
  };

  const handleSaveTherapy = () => {
    if (!socket || !socket.connected || !state?.lastMove) {
      pushToast(
        "Sem conexão com a sala. Aguarde a reconexão para salvar o registro.",
        "warning",
      );
      return;
    }

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
        const params = new URLSearchParams({ context: "room" });
        const res = await fetch(
          `/api/mahalilah/rooms/${state.room.id}/timeline?${params.toString()}`,
        );
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

  const requestAiTip = useCallback(
    ({
      mode,
      question,
    }: {
      mode: "currentHouse" | "pathQuestion";
      question?: string;
    }) => {
      if (!socket || !socket.connected) {
        pushToast(
          "Sem conexão com a sala. Aguarde a reconexão para usar a IA.",
          "warning",
        );
        return;
      }

      const normalizedQuestion =
        typeof question === "string"
          ? question.trim().slice(0, AI_PATH_HELP_MAX_LENGTH)
          : "";
      if (mode === "pathQuestion" && !normalizedQuestion) {
        pushToast(
          "Escreva seu contexto/pergunta antes de pedir a ajuda pelo caminho.",
          "warning",
        );
        return;
      }

      setAiTipLoading(true);
      socket.emit(
        "ai:tip",
        {
          mode,
          question: normalizedQuestion || undefined,
        },
        async (resp: any) => {
          setAiTipLoading(false);
          if (!resp?.ok) {
            showSocketError("Erro ao gerar dica", resp);
            return;
          }
          if (
            typeof resp.tipsUsed === "number" &&
            typeof resp.tipsLimit === "number"
          ) {
            setAiTipUsage({
              used: resp.tipsUsed,
              limit: resp.tipsLimit,
            });
          }

          const responseMode =
            resp?.mode === "pathQuestion" ? "pathQuestion" : "currentHouse";
          const responseQuestion =
            typeof resp?.question === "string" ? resp.question.trim() : "";
          const modeLabel =
            responseMode === "pathQuestion"
              ? "Ajuda pelo caminho"
              : "Entendimento da casa atual";

          setAiContentModal({
            title: "Ajuda da IA",
            subtitle:
              responseMode === "pathQuestion" && responseQuestion
                ? `${modeLabel} • ${new Date().toLocaleString("pt-BR")}`
                : `Gerada em ${new Date().toLocaleString("pt-BR")} • ${modeLabel}`,
            content:
              responseMode === "pathQuestion" && responseQuestion
                ? `Pergunta enviada: ${responseQuestion}\n\n${typeof resp.content === "string" ? resp.content : "Sem conteúdo disponível."}`
                : typeof resp.content === "string"
                  ? resp.content
                  : "Sem conteúdo disponível.",
          });
          if (responseMode === "pathQuestion") {
            setAiPathHelpInput("");
          }

          await loadTimelineData();
          pushToast("Dica da IA gerada.", "success");
        },
      );
    },
    [socket, pushToast, showSocketError, loadTimelineData],
  );

  const openTherapistSummaryModal = useCallback(
    (participantId: string) => {
      const participant = state?.participants.find(
        (item) => item.id === participantId,
      );
      if (!participant) return;
      if (isSinglePlayerWithTherapistObserver && participant.role === "THERAPIST") {
        return;
      }
      setTherapistSummaryParticipantId(participant.id);
      setTherapistSummaryDraft(participant.therapistSummary || "");
      setTherapistSummaryModalOpen(true);
    },
    [state?.participants, isSinglePlayerWithTherapistObserver],
  );

  const handleSaveTherapistSummary = useCallback(async () => {
    if (!state?.room.id || !isTherapist || !therapistSummaryParticipantId) {
      return false;
    }

    setTherapistSummarySaving(true);
    try {
      const res = await fetch(
        `/api/mahalilah/rooms/${state.room.id}/participants/${therapistSummaryParticipantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ therapistSummary: therapistSummaryDraft }),
        },
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        showSocketError(
          payload.error || "Erro ao salvar síntese do terapeuta.",
          payload,
        );
        return false;
      }

      const nextSummary =
        typeof payload?.participant?.therapistSummary === "string"
          ? payload.participant.therapistSummary
          : "";

      setTherapistSummaryDraft(nextSummary);
      setState((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((participant) =>
                participant.id === therapistSummaryParticipantId
                  ? { ...participant, therapistSummary: nextSummary || null }
                  : participant,
              ),
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
    therapistSummaryParticipantId,
    therapistSummaryDraft,
    isTherapist,
    showSocketError,
    pushToast,
  ]);

  const closeTherapistSummaryModal = useCallback(() => {
    if (therapistSummarySaving) return;
    setTherapistSummaryModalOpen(false);
    setTherapistSummaryParticipantId("");
  }, [therapistSummarySaving]);

  const closeRoom = useCallback(() => {
    if (!socket || !socket.connected) {
      pushToast(
        "Sem conexão com a sala. Aguarde a reconexão para encerrar.",
        "warning",
      );
      return;
    }
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
      if (!socket || !socket.connected) {
        pushToast(
          "Sem conexão com a sala. Aguarde a reconexão para gerar resumo.",
          "warning",
        );
        return false;
      }

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

  if (loading) {
    return <div className="card">Carregando sala...</div>;
  }

  if (!state) {
    const canForceTakeover =
      fatalErrorCode === "CONCURRENT_ROOM_SESSION" && Boolean(socket);
    return (
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <span>{fatalError || "Sala indisponível."}</span>
        {canForceTakeover && (
          <button
            className="btn-primary"
            onClick={handleForceTakeoverJoin}
            disabled={forceTakeoverLoading}
          >
            {forceTakeoverLoading
              ? "Desconectando outra sessão..."
              : "Desconectar outra sessão e entrar"}
          </button>
        )}
      </div>
    );
  }

  const roomIsActive = state.room.status === "ACTIVE";
  const roomStatusLabel = roomIsActive ? "Ativa" : "Finalizada";
  const connectionStatusLabel = socketReady
    ? "Conectado"
    : socketReconnecting
      ? "Reconectando..."
      : "Desconectado";
  const connectionStatusColor = socketReady
    ? "#6ad3b0"
    : socketReconnecting
      ? "#ffcf5a"
      : "#ff6b6b";
  const currentRoomTutorialStep = roomTutorialSteps[roomTutorialStep] || null;
  const roomTutorialPopover = getRoomTutorialPopoverPosition(
    roomTutorialTargetRect,
  );
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
          overflow: "hidden",
          opacity: actionsBlockedByConsent ? 0.6 : 1,
        }}
      >
        <div
          className="room-header-pills"
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            minWidth: 0,
          }}
          data-tour-room="room-header"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              flexWrap: "nowrap",
              paddingBottom: 2,
              flex: 1,
              minWidth: 0,
            }}
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
            <span
              className="pill"
              style={{
                flex: "0 0 auto",
                borderColor: socketReady
                  ? "rgba(106, 211, 176, 0.6)"
                  : socketReconnecting
                    ? "rgba(255, 207, 90, 0.6)"
                    : "rgba(255, 107, 107, 0.6)",
                background: socketReady
                  ? "rgba(106, 211, 176, 0.15)"
                  : socketReconnecting
                    ? "rgba(255, 207, 90, 0.15)"
                    : "rgba(255, 107, 107, 0.15)",
              }}
              title={
                socketConnectionMessage ||
                "Status da conexão em tempo real com a sala."
              }
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: connectionStatusColor,
                  boxShadow: socketReady
                    ? "0 0 0 3px rgba(106, 211, 176, 0.22)"
                    : socketReconnecting
                      ? "0 0 0 3px rgba(255, 207, 90, 0.22)"
                      : "0 0 0 3px rgba(255, 107, 107, 0.22)",
                }}
              />
              <strong>Conexão:</strong> {connectionStatusLabel}
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
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setRulesHelpTab("about");
              setRulesModalOpen(true);
            }}
            style={{
              flex: "0 0 auto",
              minWidth: isMobileViewport ? 44 : 112,
              width: isMobileViewport ? 44 : undefined,
              height: 40,
              padding: isMobileViewport ? 0 : "0 12px",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobileViewport ? 0 : 8,
              borderColor: "rgba(255, 229, 160, 0.88)",
              background:
                "linear-gradient(135deg, rgba(245, 204, 106, 0.98), rgba(194, 141, 43, 0.98))",
              color: "#261500",
              fontWeight: 800,
              boxShadow: isMobileViewport
                ? "0 6px 14px rgba(94, 63, 17, 0.24)"
                : "0 10px 26px rgba(94, 63, 17, 0.32)",
            }}
            title="Abrir central de ajuda"
            aria-label="Abrir central de ajuda"
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>?</span>
            {!isMobileViewport && <span>Ajuda</span>}
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
              : !socketReady
              ? socketReconnecting
                ? "Reconectando..."
                : "Sem conexão"
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
                state.room.status !== "ACTIVE" ||
                actionsBlockedByConsent ||
                !socketReady
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
                finalReportLoading ||
                !socketReady
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

        {!socketReady && (
          <div className="notice" style={{ display: "grid", gap: 6 }}>
            <strong>
              {socketReconnecting
                ? "Reconectando com a sala..."
                : "Você está desconectado da sala."}
            </strong>
            <span className="small-muted">
              {socketConnectionMessage ||
                "As ações da sessão ficam bloqueadas até a conexão voltar."}
            </span>
            {socket && !socket.connected && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSocketReconnecting(true);
                  setSocketConnectionMessage("Tentando reconectar com a sala...");
                  socket.connect();
                }}
                disabled={socketReconnecting}
                style={{ width: "fit-content" }}
              >
                {socketReconnecting ? "Reconectando..." : "Tentar reconectar"}
              </button>
            )}
          </div>
        )}

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
                .map((participant) => ({
                  participant,
                  color: participantPinColorMap.get(participant.id) || COLORS[0],
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
                      const participantLabel =
                        token.participant.user.name ||
                        token.participant.user.email;
                      const participantInitial = participantLabel
                        .trim()
                        .charAt(0)
                        .toUpperCase();

                      return (
                        <span
                          key={`${token.participant.id}-${tokenIndex}`}
                          title={participantLabel}
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
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 8,
                            lineHeight: 1,
                            fontWeight: 800,
                            color: "#ffffff",
                            textShadow: "0 1px 1px rgba(0,0,0,0.65)",
                          }}
                        >
                          {participantInitial}
                        </span>
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
                  disabled={actionsBlockedByConsent}
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

              {timelineParticipants.length > 1 && (
                <select
                  value={effectiveDeckParticipantId}
                  disabled={shouldLockPlayerDropdownForTherapist}
                  onChange={(event) => setDeckParticipantId(event.target.value)}
                >
                  {timelineAndSummaryParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.user.name || participant.user.email}
                    </option>
                  ))}
                </select>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="secondary"
                  onClick={handleDraw}
                  disabled={!canDrawCard}
                >
                  Tirar carta
                </button>
                <span className="small-muted">
                  Na jogada vinculada: <strong>{cardsDrawnInCurrentMove}/3</strong>
                </span>
              </div>
              <span className="small-muted">
                A carta será vinculada à sua jogada mais recente.
              </span>
              {!isDeckViewingSelf && (
                <span className="small-muted">
                  Cada participante só pode tirar carta para si mesmo. Selecione seu nome.
                </span>
              )}
              {isDeckViewingSelf && !hasOwnMoveForDeck && (
                <span className="small-muted">
                  Faça pelo menos uma jogada para liberar a tiragem.
                </span>
              )}
              {remainingDrawsInCurrentMove === 0 && cardsDrawnInCurrentMove > 0 && (
                <span className="small-muted">
                  Limite de 3 cartas atingido nesta jogada.
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
                  <strong style={{ fontSize: 12 }}>
                    Cartas da jogada vinculada
                  </strong>
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
                              subtitle: `Jogada #${currentMoveTurnNumber ?? "—"}`,
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
                {filteredDeckHistory.length === 0 ? (
                  <span className="small-muted">
                    Nenhuma carta puxada para este jogador.
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
                <input
                  type="text"
                  list="therapy-emotion-options"
                  placeholder="Digite ou selecione uma emoção"
                  value={therapy.emotion}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      emotion: event.target.value,
                    }))
                  }
                />
                <datalist id="therapy-emotion-options">
                  {THERAPY_EMOTION_OPTIONS.map((emotion) => (
                    <option key={emotion} value={emotion} />
                  ))}
                </datalist>
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
              <strong>Assistência com IA</strong>
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
              {shouldBlockTherapistAiTipActions && (
                <span className="small-muted">
                  Neste modo, as ajudas da IA devem ser solicitadas pelo jogador.
                </span>
              )}
              <span className="small-muted">
                Ajudas usadas:{" "}
                <strong>
                  {aiTipUsage?.used ?? 0}/{aiTipUsage?.limit ?? "—"}
                </strong>
              </span>

              <div style={{ display: "grid", gap: 8 }}>
                <div
                  className="notice"
                  style={{ display: "grid", gap: 6, alignItems: "start" }}
                >
                  <strong style={{ fontSize: 12 }}>Ajuda rápida da casa atual</strong>
                  <span className="small-muted">
                    Leitura simbólica da casa em que você está neste momento.
                  </span>
                  <button
                    className="secondary"
                    disabled={!canUseAiTipActions || aiTipLoading}
                    onClick={() => requestAiTip({ mode: "currentHouse" })}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(224, 186, 95, 0.96), rgba(182, 131, 45, 0.96))",
                      borderColor: "rgba(255, 229, 160, 0.72)",
                      color: "#231302",
                      fontWeight: 700,
                      boxShadow: "0 7px 18px rgba(94, 63, 17, 0.28)",
                    }}
                  >
                    {aiTipLoading
                      ? "Processando ajuda..."
                      : "Ajuda na Casa Atual"}
                  </button>
                </div>

                <div
                  className="notice"
                  style={{ display: "grid", gap: 6, alignItems: "start" }}
                >
                  <strong style={{ fontSize: 12 }}>
                    Ajuda personalizada pelo caminho
                  </strong>
                  <span className="small-muted">
                    Escreva seu contexto para a IA analisar seu caminho até aqui.
                  </span>
                  <label style={{ display: "grid", gap: 4 }}>
                    <textarea
                      placeholder="Escreva sua dúvida/contexto. Ex.: estou repetindo a mesma dificuldade de comunicação e não sei como sair disso."
                      value={aiPathHelpInput}
                      maxLength={AI_PATH_HELP_MAX_LENGTH}
                      disabled={!canUseAiTipActions || aiTipLoading}
                      onChange={(event) =>
                        setAiPathHelpInput(
                          event.target.value.slice(0, AI_PATH_HELP_MAX_LENGTH),
                        )
                      }
                    />
                    <span className="small-muted">
                      A IA responde somente sobre o Maha Lilah e a sessão em
                      andamento.
                    </span>
                    <span className="small-muted" style={{ justifySelf: "end" }}>
                      {aiPathHelpInput.length}/{AI_PATH_HELP_MAX_LENGTH}{" "}
                      caracteres
                    </span>
                  </label>

                  <button
                    className="secondary"
                    disabled={
                      !canUseAiTipActions || aiTipLoading || !aiPathHelpInput.trim()
                    }
                    onClick={() =>
                      requestAiTip({
                        mode: "pathQuestion",
                        question: aiPathHelpInput,
                      })
                    }
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(224, 186, 95, 0.96), rgba(182, 131, 45, 0.96))",
                      borderColor: "rgba(255, 229, 160, 0.72)",
                      color: "#231302",
                      fontWeight: 700,
                      boxShadow: "0 7px 18px rgba(94, 63, 17, 0.28)",
                    }}
                  >
                    {aiTipLoading
                      ? "Processando ajuda..."
                      : "Me ajuda com minha pergunta"}
                  </button>
                </div>
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
                            subtitle: `${
                              parsed.mode === "pathQuestion"
                                ? "Ajuda pelo caminho"
                                : parsed.mode === "currentHouse"
                                  ? "Entendimento da casa atual"
                                  : "Ajuda da IA"
                            } • ${
                              parsed.turnNumber !== null
                                ? `Jogada #${parsed.turnNumber}`
                                : "Jogada não identificada"
                            }${
                              parsed.houseNumber !== null
                                ? ` • Casa ${parsed.houseNumber}`
                                : ""
                            } • ${new Date(report.createdAt).toLocaleString("pt-BR")}`,
                            content:
                              parsed.mode === "pathQuestion" && parsed.question
                                ? `Pergunta enviada: ${parsed.question}\n\n${parsed.text}`
                                : parsed.text,
                          })
                        }
                      >
                        <strong style={{ fontSize: 12 }}>
                          Ajuda #{helpNumber}
                        </strong>
                        <span className="small-muted">
                          {parsed.mode === "pathQuestion"
                            ? "Ajuda pelo caminho"
                            : parsed.mode === "currentHouse"
                              ? "Casa atual"
                              : "Ajuda"}
                          {" • "}
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
                {isProgressSummaryGeneratingForSelectedParticipant && (
                  <span
                    className="small-muted"
                    style={{
                      color: "#ff9f9f",
                      fontWeight: 600,
                      background: "rgba(255, 107, 107, 0.14)",
                      border: "1px solid rgba(255, 107, 107, 0.35)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      width: "fit-content",
                    }}
                  >
                    Gerando síntese automática deste jogador, aguarde...
                  </span>
                )}
                {!isProgressSummaryGeneratingForSelectedParticipant &&
                  isTherapist &&
                  generatingProgressSummaryParticipantNames.length > 0 && (
                    <span className="small-muted">
                      Geração em andamento para:{" "}
                      {generatingProgressSummaryParticipantNames.join(", ")}
                    </span>
                  )}
                {isProgressSummaryGeneratingForSelectedParticipant &&
                selectedProgressReports.length === 0 ? (
                  <span className="small-muted">
                    O primeiro bloco será exibido assim que a geração concluir.
                  </span>
                ) : timelineLoading && selectedProgressReports.length === 0 ? (
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
                  const participantOnline = Boolean(participant.online);
                  const participantPinColor =
                    participantPinColorMap.get(participant.id) || null;
                  const participantIsTherapist =
                    participant.role === "THERAPIST";
                  const canEditParticipantSummary = isTherapist;
                  const shouldDisableTherapistSummaryEdit = Boolean(
                    participantIsTherapist && isSinglePlayerWithTherapistObserver,
                  );
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
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
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
                          {participantPinColor && (
                            <span
                              aria-hidden="true"
                              title="Cor do pino no tabuleiro"
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                display: "inline-block",
                                background: participantPinColor,
                                border: "1px solid rgba(255,255,255,0.72)",
                                boxShadow: "0 1px 5px rgba(0,0,0,.28)",
                              }}
                            />
                          )}
                          <strong style={{ fontSize: 13 }}>
                            {participant.user.name || participant.user.email}
                          </strong>
                          <span
                            className="pill"
                            style={{ padding: "2px 7px", fontSize: 11 }}
                          >
                            {participantIsTherapist ? "Terapeuta" : "Jogador"}
                          </span>
                          <span
                            className="pill"
                            style={{
                              padding: "2px 7px",
                              fontSize: 11,
                              borderColor: participantOnline
                                ? "rgba(106, 211, 176, 0.6)"
                                : "rgba(255, 107, 107, 0.6)",
                              background: participantOnline
                                ? "rgba(106, 211, 176, 0.15)"
                                : "rgba(255, 107, 107, 0.15)",
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: participantOnline ? "#6ad3b0" : "#ff6b6b",
                                boxShadow: participantOnline
                                  ? "0 0 0 3px rgba(106, 211, 176, 0.22)"
                                  : "0 0 0 3px rgba(255, 107, 107, 0.22)",
                              }}
                            />
                            {participantOnline ? "Online" : "Offline"}
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
                        {canEditParticipantSummary && (
                          <button
                            className="btn-secondary"
                            disabled={
                              therapistSummarySaving ||
                              shouldDisableTherapistSummaryEdit
                            }
                            title={
                              shouldDisableTherapistSummaryEdit
                                ? "Edição indisponível: terapeuta fora da fila de jogo."
                                : "Abrir observações do terapeuta"
                            }
                            onClick={() => openTherapistSummaryModal(participant.id)}
                            style={{
                              width: 32,
                              minWidth: 32,
                              height: 32,
                              padding: 0,
                              fontSize: 15,
                            }}
                          >
                            ✎
                          </button>
                        )}
                      </div>
                      {!participantIsTherapist && (
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
                  value={effectiveTimelineTargetParticipantId}
                  disabled={shouldLockPlayerDropdownForTherapist}
                  onChange={(event) =>
                    setTimelineTargetParticipantId(event.target.value)
                  }
                >
                  {!shouldLockPlayerDropdownForTherapist && (
                    <option value="">Todos os jogadores</option>
                  )}
                  {timelineAndSummaryParticipants.map((participant) => (
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
                              )})}
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
                            const orderedMoveTips = [...moveTips].sort(
                              (a, b) =>
                                new Date(a.report.createdAt).getTime() -
                                new Date(b.report.createdAt).getTime(),
                            );
                            return (
                              <button
                                className="btn-secondary"
                                style={{ justifyContent: "flex-start" }}
                                onClick={() => {
                                  const modalEntries = orderedMoveTips.map(
                                    (tip, index) => ({
                                      label: `Ajuda ${index + 1}`,
                                      subtitle: `Jogada #${move.turnNumber} • ${new Date(
                                        tip.report.createdAt,
                                      ).toLocaleString("pt-BR")}`,
                                      content:
                                        tip.parsed.mode === "pathQuestion" &&
                                        tip.parsed.question
                                          ? `Pergunta enviada: ${tip.parsed.question}\n\n${tip.parsed.text}`
                                          : tip.parsed.text,
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
                  value={effectiveSummaryParticipantId}
                  disabled={shouldLockPlayerDropdownForTherapist}
                  onChange={(event) =>
                    setSummaryParticipantId(event.target.value)
                  }
                >
                  {timelineAndSummaryParticipants.map((participant) => (
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
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ fontSize: 12 }}>Caminho</strong>
                      {summaryPath.length === 0 ? (
                        <span className="small-muted">—</span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {summaryPath.map((house, index) => {
                            const houseTitle = getHouseByNumber(house)?.title || "";
                            return (
                              <span
                                key={`summary-path-${house}-${index}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{
                                    padding: "2px 8px",
                                    height: "auto",
                                    borderRadius: 999,
                                    fontSize: 12,
                                  }}
                                  title={`Ver significado da casa ${house}`}
                                  onClick={() =>
                                    openHouseMeaningModal({
                                      houseNumber: house,
                                      title: `Significado da casa ${house}`,
                                      subtitle: `Resumo do jogador • ${
                                        summaryParticipant?.user.name ||
                                        summaryParticipant?.user.email ||
                                        "Jogador"
                                      }`,
                                    })
                                  }
                                >
                                  {house}
                                  {houseTitle ? ` • ${houseTitle}` : ""}
                                </button>
                                {index < summaryPath.length - 1 && (
                                  <span className="small-muted" aria-hidden="true">
                                    →
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
                            <button
                              key={`${house}-${count}`}
                              type="button"
                              className="btn-secondary"
                              style={{
                                padding: "2px 8px",
                                height: "auto",
                                borderRadius: 999,
                                fontSize: 12,
                              }}
                              title={`Ver significado da casa ${house}`}
                              onClick={() =>
                                openHouseMeaningModal({
                                  houseNumber: house,
                                  title: `Significado da casa ${house}`,
                                  subtitle: `Casa recorrente no resumo (${count}x)`,
                                })
                              }
                            >
                              {house}
                              {houseTitle ? ` • ${houseTitle}` : ""} ({count}x)
                            </button>
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
              disabled={actionsBlockedByConsent}
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
                onClick={closeAiContentModal}
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

      {therapistSummaryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeTherapistSummaryModal}
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
              <strong>
                Síntese do terapeuta
                {therapistSummaryParticipant
                  ? ` • ${getParticipantDisplayName(therapistSummaryParticipant)}`
                  : ""}
              </strong>
              <button
                className="btn-secondary"
                disabled={therapistSummarySaving}
                onClick={closeTherapistSummaryModal}
              >
                Fechar
              </button>
            </div>

            <span className="small-muted">
              Essas observações ficam vinculadas a este jogador e também aparecem na síntese do dashboard e do PDF da sessão.
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
                  closeTherapistSummaryModal();
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
                alignItems: "center",
              }}
            >
              <strong>Central de ajuda do Maha Lilah</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn-secondary"
                  onClick={handleRestartRoomTutorial}
                >
                  Refazer tutorial (onboarding)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setRulesModalOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {RULES_HELP_TABS.map((tab) => {
                const active = rulesHelpTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className="btn-secondary"
                    onClick={() => setRulesHelpTab(tab.id)}
                    aria-pressed={active}
                    style={{
                      borderColor: active
                        ? "rgba(217, 164, 65, 0.72)"
                        : "rgba(217, 164, 65, 0.35)",
                      background: active
                        ? "rgba(217, 164, 65, 0.24)"
                        : "rgba(9, 15, 24, 0.7)",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span className="small-muted">
              {RULES_HELP_TABS.find((tab) => tab.id === rulesHelpTab)?.description}
            </span>

            {rulesHelpTab === "about" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div className="notice" style={{ display: "grid", gap: 6 }}>
                  <strong>O que é o Maha Lilah?</strong>
                  <span className="small-muted">
                    O Maha Lilah é um jogo terapêutico de autoconhecimento. Cada
                    casa representa um tema simbólico da jornada humana e ajuda a
                    transformar experiência em insight prático.
                  </span>
                </div>
                <div className="notice" style={{ display: "grid", gap: 6 }}>
                  <strong>Como a sessão funciona</strong>
                  <span className="small-muted">
                    A sala combina tabuleiro, cartas, registro terapêutico e
                    apoio da IA. O objetivo não é &quot;vencer&quot;, e sim ampliar
                    consciência, reconhecer padrões e apoiar decisões concretas
                    para a vida real.
                  </span>
                </div>
                <div className="notice" style={{ display: "grid", gap: 6 }}>
                  <strong>Papel de cada participante</strong>
                  <span className="small-muted">
                    Jogadores fazem as jogadas e registram percepções. O
                    terapeuta conduz a sessão, acompanha a jornada e pode apoiar
                    com sínteses e direcionamento clínico.
                  </span>
                </div>
              </div>
            )}

            {rulesHelpTab === "rules" && (
              <div className="notice" style={{ display: "grid", gap: 8 }}>
                <span className="small-muted">
                  <strong>1.</strong> Todos começam na casa <strong>68</strong>.
                </span>
                <span className="small-muted">
                  <strong>2.</strong> Para iniciar o jogo, é necessário rolar{" "}
                  <strong>6</strong>; ao iniciar, o jogador vai para a casa{" "}
                  <strong>6</strong>.
                </span>
                <span className="small-muted">
                  <strong>3.</strong> As jogadas seguem ordem de turnos e o botão
                  de rolagem só libera para quem está com a vez.
                </span>
                <span className="small-muted">
                  <strong>4.</strong> A rolagem só fica ativa com o{" "}
                  <strong>terapeuta online</strong> na sala.
                </span>
                <span className="small-muted">
                  <strong>5.</strong> Ao cair em casas com atalho, o jogador
                  sobe (↗) ou desce (↘) automaticamente.
                </span>
                <span className="small-muted">
                  <strong>6.</strong> Cada jogada permite tirar até{" "}
                  <strong>3 cartas</strong>.
                </span>
                <span className="small-muted">
                  <strong>7.</strong> Registro terapêutico e ajudas de IA ficam
                  salvos na jornada do jogador.
                </span>
                <span className="small-muted">
                  <strong>8.</strong> A jornada conclui quando o jogador retorna
                  para a casa <strong>68</strong> após ter iniciado.
                </span>
              </div>
            )}

            {rulesHelpTab === "controls" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div className="notice" style={{ display: "grid", gap: 6 }}>
                  <strong>Controles da sala (linha superior)</strong>
                  <span className="small-muted">
                    <strong>?</strong> Abre esta central de ajuda com regras,
                    explicações e tutorial.
                  </span>
                  <span className="small-muted">
                    <strong>Rolar dado</strong> faz a jogada da vez e move o pino
                    no tabuleiro.
                  </span>
                  {canCloseRoom && (
                    <span className="small-muted">
                      <strong>Avançar vez</strong> passa a vez manualmente quando
                      necessário na condução da sessão.
                    </span>
                  )}
                  {canCloseRoom && (
                    <span className="small-muted">
                      <strong>Encerrar sala</strong> fecha a sessão e finaliza a
                      rodada atual.
                    </span>
                  )}
                  <span className="small-muted">
                    <strong>Mostrar/Ocultar nomes</strong> exibe ou esconde os
                    nomes dentro dos pinos no tabuleiro.
                  </span>
                  <span className="small-muted">
                    <strong>Animação do Dado</strong> liga/desliga o efeito
                    visual da rolagem.
                  </span>
                  <span className="small-muted">
                    <strong>Voltar ao dashboard</strong> retorna para o painel de
                    salas sem perder os dados da sessão.
                  </span>
                </div>

                <div className="notice" style={{ display: "grid", gap: 6 }}>
                  <strong>Menu de ações (ícones lateral/inferior)</strong>
                  {ACTION_ITEMS.map((item) => (
                    <span key={item.key} className="small-muted">
                      <strong>
                        {item.icon} {item.shortLabel}
                      </strong>{" "}
                      - {ACTION_ITEM_HELP_TEXT[item.key]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rulesHelpTab === "howToPlay" && (
              <div className="notice" style={{ display: "grid", gap: 8 }}>
                <span className="small-muted">
                  <strong>1.</strong> Confirme o termo de consentimento para
                  liberar as ações da sala.
                </span>
                <span className="small-muted">
                  <strong>2.</strong> Veja no topo quem está com a vez e aguarde
                  o seu turno.
                </span>
                <span className="small-muted">
                  <strong>3.</strong> Clique em <strong>Rolar dado</strong> no
                  seu turno.
                </span>
                <span className="small-muted">
                  <strong>4.</strong> Se ainda não iniciou, tente obter 6 para
                  sair da casa 68 e começar pela casa 6.
                </span>
                <span className="small-muted">
                  <strong>5.</strong> Abra o menu <strong>Casa</strong> para
                  ler o significado terapêutico da posição atual.
                </span>
                <span className="small-muted">
                  <strong>6.</strong> No menu <strong>Carta</strong>, tire até 3
                  cartas para aprofundar a leitura da jogada.
                </span>
                <span className="small-muted">
                  <strong>7.</strong> No menu <strong>Registro</strong>, anote
                  emoção, insight, corpo e ação prática.
                </span>
                <span className="small-muted">
                  <strong>8.</strong> No menu <strong>IA</strong>, peça ajuda da
                  casa atual ou ajuda personalizada pelo caminho.
                </span>
                <span className="small-muted">
                  <strong>9.</strong> Acompanhe <strong>Jornada</strong> e{" "}
                  <strong>Resumo</strong> para fechar aprendizados ao longo da
                  sessão.
                </span>
              </div>
            )}
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
