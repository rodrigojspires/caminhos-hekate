"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import {
  BOARD_COLS,
  BOARD_ROWS,
  JUMPS,
  getHouseByNumber,
  getHousePrompt,
} from "@hekate/mahalilah-core";

type Participant = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
  consentAcceptedAt: string | null;
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
  kind: "TIP" | "FINAL";
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

const COLORS = [
  "#2f7f6f",
  "#b44c4c",
  "#546fa3",
  "#c07a4a",
  "#7a5aa5",
  "#d5a439",
];

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
    label: "Timeline",
    icon: "☰",
    shortLabel: "Timeline",
  },
  {
    key: "summary",
    label: "Resumo do Jogador",
    icon: "▣",
    shortLabel: "Resumo",
  },
];

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
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
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
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineMoves, setTimelineMoves] = useState<TimelineMove[]>([]);
  const [timelineReports, setTimelineReports] = useState<TimelineAiReport[]>(
    [],
  );
  const [timelineTargetParticipantId, setTimelineTargetParticipantId] =
    useState("");
  const [aiHistoryParticipantId, setAiHistoryParticipantId] = useState("");
  const [summaryParticipantId, setSummaryParticipantId] = useState("");
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
  const indicatorParticipant = myPlayerState
    ? myParticipant
    : currentParticipant;
  const indicatorState = indicatorParticipant
    ? playerStateMap.get(indicatorParticipant.id)
    : undefined;
  const indicatorHouseNumber = (indicatorState?.position ?? 67) + 1;
  const indicatorHouse = getHouseByNumber(indicatorHouseNumber);

  const selectedHouse =
    getHouseByNumber(selectedHouseNumber) ||
    getHouseByNumber(indicatorHouseNumber);
  const lastHouse = state?.lastMove
    ? getHouseByNumber(state.lastMove.toPos)
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

  const needsConsent = Boolean(
    myParticipant && !myParticipant.consentAcceptedAt,
  );
  const actionsBlockedByConsent = needsConsent && !consentAccepted;
  const isMyTurn = currentParticipant?.user.id === session?.user?.id;
  const canLogTherapy = Boolean(
    state?.lastMove &&
      myParticipant &&
      state.lastMove.participantId === myParticipant.id,
  );
  const canCloseRoom = myParticipant?.role === "THERAPIST";
  const canRoll = Boolean(
    isMyTurn &&
      state?.room.status === "ACTIVE" &&
      !actionsBlockedByConsent &&
      state?.room.therapistOnline,
  );

  const timelineParticipants = useMemo(() => {
    return state?.participants || [];
  }, [state?.participants]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      const preferredPlayer = state.participants.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = state.participants[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setTimelineTargetParticipantId((prev) => prev || targetId);
      return;
    }

    setTimelineTargetParticipantId(myParticipant.id);
  }, [state, myParticipant]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      const preferredPlayer = state.participants.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = state.participants[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setSummaryParticipantId((prev) => prev || targetId);
      return;
    }

    setSummaryParticipantId(myParticipant.id);
  }, [state, myParticipant]);

  useEffect(() => {
    if (!state || !myParticipant) return;

    if (myParticipant.role === "THERAPIST") {
      const preferredPlayer = state.participants.find(
        (participant) => participant.role === "PLAYER",
      );
      const fallbackParticipant = state.participants[0];
      const targetId = preferredPlayer?.id || fallbackParticipant?.id || "";
      setAiHistoryParticipantId((prev) => prev || targetId);
      return;
    }

    setAiHistoryParticipantId(myParticipant.id);
  }, [state, myParticipant]);

  const filteredTimelineMoves = useMemo(() => {
    if (!timelineTargetParticipantId) return timelineMoves;
    return timelineMoves.filter(
      (move) => move.participant.id === timelineTargetParticipantId,
    );
  }, [timelineMoves, timelineTargetParticipantId]);

  const filteredTimelineReports = useMemo(() => {
    if (!timelineTargetParticipantId) return timelineReports;
    return timelineReports.filter(
      (report) => report.participant?.id === timelineTargetParticipantId,
    );
  }, [timelineReports, timelineTargetParticipantId]);

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
    return timelineReports
      .filter(
        (report) =>
          report.kind === "TIP" &&
          report.participant?.id === aiHistoryParticipantId,
      )
      .map((report) => ({
        report,
        parsed: parseTipReportContent(report.content),
      }));
  }, [timelineReports, aiHistoryParticipantId]);

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

  const summaryPath = useMemo(
    () => summaryMoves.map((move) => move.toPos),
    [summaryMoves],
  );

  const aiIntentionStorageKey = useMemo(() => {
    if (!state?.room.id || !session?.user?.id) return null;
    return `mahalilah:intention:${state.room.id}:${session.user.id}`;
  }, [state?.room.id, session?.user?.id]);

  useEffect(() => {
    if (!aiIntentionStorageKey) return;
    const saved = window.localStorage.getItem(aiIntentionStorageKey) || "";
    setAiIntention(saved);
    setAiIntentionSavedLabel(
      saved ? "Intenção carregada automaticamente." : "",
    );
  }, [aiIntentionStorageKey]);

  const persistAiIntention = () => {
    if (!aiIntentionStorageKey) return;
    window.localStorage.setItem(aiIntentionStorageKey, aiIntention.trim());
    setAiIntentionSavedLabel("Intenção salva automaticamente.");
  };

  const summaryTopHouses = useMemo(() => {
    const frequency = new Map<number, number>();
    summaryPath.forEach((house) => {
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

  const showSocketError = (fallback: string, resp: any) => {
    pushToast(resp?.error || fallback, "error");
  };

  const handleRoll = () => {
    if (!socket) return;
    socket.emit("game:roll", {}, (resp: any) => {
      if (!resp?.ok) {
        showSocketError("Erro ao rolar dado", resp);
      }
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
      !actionsBlockedByConsent,
  );

  const latestDrawnCard = useMemo(() => {
    if (!myParticipant || !state?.deckHistory?.length) return null;
    const mine = state.deckHistory
      .filter((draw) => draw.drawnBy.id === myParticipant.id && draw.card)
      .slice(-1)[0];
    return mine?.card || null;
  }, [myParticipant, state?.deckHistory]);

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
      if (!state) return false;

      setTimelineLoading(true);
      setTimelineError(null);

      const res = await fetch(`/api/mahalilah/rooms/${state.room.id}/timeline`);
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          payload.error || "Não foi possível carregar a timeline do jogador.";
        setTimelineError(message);
        setTimelineLoading(false);
        pushToast(message, "error");
        return false;
      }

      setTimelineMoves(payload.moves || []);
      setTimelineReports(payload.aiReports || []);
      setTimelineLoading(false);
      if (showSuccessToast) {
        pushToast("Timeline carregada.", "success");
      }
      return true;
    },
    [state, pushToast],
  );

  useEffect(() => {
    if (!["summary", "timeline", "ai"].includes(activePanel)) return;
    if (timelineLoading) return;
    if (timelineMoves.length > 0 || timelineReports.length > 0) return;
    void loadTimelineData();
  }, [
    activePanel,
    timelineLoading,
    timelineMoves.length,
    timelineReports.length,
    loadTimelineData,
  ]);

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

  return (
    <div className="grid" style={{ gap: 14 }}>
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
        className="card"
        style={{
          display: "grid",
          gap: 8,
          padding: "14px 16px",
          opacity: actionsBlockedByConsent ? 0.6 : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 2,
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
          <span className="pill">
            Casa Atual: <strong>{indicatorHouseNumber}</strong>
            {indicatorHouse ? ` • ${indicatorHouse.title}` : ""}
          </span>
          {lastMoveJump && indicatorHouseNumber === lastMoveJump.to && (
            <span className="pill" style={{ flex: "0 0 auto" }}>
              Veio de atalho:{" "}
              <strong>
                {lastMoveJump.from} {lastMoveJump.isUp ? "↗" : "↘"}{" "}
                {lastMoveJump.to}
              </strong>
            </span>
          )}
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
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 2,
          }}
        >
          <button
            onClick={handleRoll}
            disabled={!canRoll}
            style={{ flex: "0 0 auto" }}
          >
            {!state.room.therapistOnline
              ? "Aguardando terapeuta"
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
              onClick={() =>
                socket?.emit("room:close", {}, (resp: any) => {
                  if (!resp?.ok) showSocketError("Erro ao encerrar sala", resp);
                  else pushToast("Sala encerrada com sucesso.", "success");
                })
              }
              disabled={
                state.room.status !== "ACTIVE" || actionsBlockedByConsent
              }
              style={{ flex: "0 0 auto" }}
            >
              Encerrar sala
            </button>
          )}
          {canCloseRoom && (
            <Link
              href="/dashboard"
              className="btn-secondary"
              style={{ flex: "0 0 auto" }}
            >
              Voltar ao dashboard
            </Link>
          )}
        </div>

        {lastHouse && state.lastMove && (
          <div className="small-muted">
            Última jogada: casa {lastHouse.number} • dado{" "}
            {state.lastMove.diceValue}
          </div>
        )}
      </div>

      <div
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]"
        style={{
          opacity: actionsBlockedByConsent ? 0.6 : 1,
          alignItems: "start",
        }}
      >
        <div
          className="card"
          style={{ display: "grid", gap: 10, minWidth: 0, overflow: "hidden" }}
        >
          <div
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
              const tokens = state.participants
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
                    alignContent: "space-between",
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
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="card"
          style={{ display: "grid", gap: 10, alignSelf: "start", minWidth: 0 }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            <span>Intenção da sessão (opcional)</span>
            <input
              value={aiIntention}
              onChange={(event) => {
                setAiIntention(event.target.value);
                setAiIntentionSavedLabel("");
              }}
              onBlur={persistAiIntention}
              placeholder="Ex.: clareza sobre limites e comunicação"
            />
            <span className="small-muted">
              {aiIntentionSavedLabel ||
                "Salva automaticamente ao sair do campo."}
            </span>
          </label>

          <div
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
                  onClick={() => setActivePanel(item.key)}
                  title={item.label}
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
                  <div>
                    <strong>
                      Casa {selectedHouse.number} - {selectedHouse.title}
                    </strong>
                  </div>
                  <p className="small-muted">{selectedHouse.description}</p>
                  <div className="notice">
                    {getHousePrompt(selectedHouse.number)}
                  </div>
                  {lastHouse && (
                    <span className="small-muted">
                      Última jogada: casa {lastHouse.number} • dado{" "}
                      {state.lastMove?.diceValue}
                    </span>
                  )}
                  {lastMoveJump && selectedHouse.number === lastMoveJump.to && (
                    <span className="small-muted">
                      Chegou por atalho: casa {lastMoveJump.from}{" "}
                      {lastMoveJump.isUp ? "↗" : "↘"} casa {lastMoveJump.to} (
                      {lastMoveJump.isUp ? "subida" : "descida"}).
                    </span>
                  )}
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

              {latestDrawnCard && (
                <div
                  className="notice"
                  style={{
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "68px minmax(0, 1fr)",
                    alignItems: "start",
                  }}
                >
                  <img
                    src={latestDrawnCard.imageUrl}
                    alt={`Carta ${latestDrawnCard.cardNumber}`}
                    style={{
                      width: 68,
                      height: 92,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid rgba(217, 164, 65, 0.35)",
                      background: "rgba(9, 15, 24, 0.7)",
                    }}
                  />
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong style={{ fontSize: 13 }}>
                      Carta #{latestDrawnCard.cardNumber}
                    </strong>
                    <span className="small-muted">
                      {latestDrawnCard.description}
                    </span>
                    <span className="small-muted">
                      Palavras-chave: {latestDrawnCard.keywords}
                    </span>
                    {latestDrawnCard.observation && (
                      <span className="small-muted">
                        Observação: {latestDrawnCard.observation}
                      </span>
                    )}
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
                  state.deckHistory.map((draw) => (
                    <div
                      key={draw.id}
                      className="notice"
                      style={{ display: "grid", gap: 4 }}
                    >
                      <strong style={{ fontSize: 12 }}>
                        {draw.drawnBy.user.name || draw.drawnBy.user.email}
                      </strong>
                      <span className="small-muted">
                        {new Date(draw.createdAt).toLocaleString("pt-BR")}
                      </span>
                      {draw.moveId && (
                        <span className="small-muted">Jogada vinculada</span>
                      )}
                      {draw.card ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            gridTemplateColumns: "54px minmax(0, 1fr)",
                            alignItems: "start",
                          }}
                        >
                          <img
                            src={draw.card.imageUrl}
                            alt={`Carta ${draw.card.cardNumber}`}
                            style={{
                              width: 54,
                              height: 72,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid rgba(217, 164, 65, 0.3)",
                              background: "rgba(9, 15, 24, 0.7)",
                            }}
                          />
                          <div style={{ display: "grid", gap: 3 }}>
                            <span className="small-muted">
                              Carta #{draw.card.cardNumber}
                            </span>
                            <span className="small-muted">
                              {draw.card.description}
                            </span>
                            <span className="small-muted">
                              Palavras-chave: {draw.card.keywords}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="small-muted">
                          Carta(s): {draw.cards.join(", ")}
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
              <span className="small-muted">
                Ajudas usadas:{" "}
                <strong>
                  {aiTipUsage?.used ?? 0}/{aiTipUsage?.limit ?? "—"}
                </strong>
              </span>

              <button
                className="secondary"
                disabled={actionsBlockedByConsent || aiTipLoading}
                onClick={() =>
                  (() => {
                    if (!socket) return;
                    setAiTipLoading(true);
                    socket.emit(
                      "ai:tip",
                      { intention: aiIntention },
                      (resp: any) => {
                        setAiTipLoading(false);
                        if (!resp?.ok) {
                          showSocketError("Erro ao gerar dica", resp);
                        } else {
                          setAiTip(resp.content);
                          if (
                            typeof resp.tipsUsed === "number" &&
                            typeof resp.tipsLimit === "number"
                          ) {
                            setAiTipUsage({
                              used: resp.tipsUsed,
                              limit: resp.tipsLimit,
                            });
                          }
                          pushToast("Dica da IA gerada.", "success");
                        }
                      },
                    );
                  })()
                }
              >
                {aiTipLoading ? "Processando ajuda..." : "IA: me ajuda agora"}
              </button>

              {aiTipLoading && (
                <span className="small-muted">
                  Gerando orientação da IA, aguarde...
                </span>
              )}

              {aiTip && (
                <div className="notice" style={{ whiteSpace: "pre-wrap" }}>
                  {aiTip}
                </div>
              )}

              <div className="notice" style={{ display: "grid", gap: 6 }}>
                <strong>Histórico de ajudas da IA</strong>
                {timelineParticipants.length > 1 && (
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
                    {aiTipHistory.map(({ report, parsed }) => (
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
                            title: "Ajuda da IA",
                            subtitle: `Gerada em ${new Date(report.createdAt).toLocaleString("pt-BR")}`,
                            content: parsed.text,
                          })
                        }
                      >
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

              <button
                className="secondary"
                onClick={() =>
                  socket?.emit(
                    "ai:finalReport",
                    { intention: aiIntention },
                    (resp: any) => {
                      if (!resp?.ok)
                        showSocketError("Erro ao gerar resumo", resp);
                      else {
                        setAiSummary(resp.content);
                        pushToast("Resumo final gerado.", "success");
                      }
                    },
                  )
                }
                disabled={actionsBlockedByConsent}
              >
                Gerar resumo final
              </button>

              {aiSummary && (
                <div className="notice" style={{ whiteSpace: "pre-wrap" }}>
                  {aiSummary}
                </div>
              )}
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activePanel === "timeline" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Timeline</strong>

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
                <span className="small-muted">Carregando timeline...</span>
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
                          <span
                            className="small-muted"
                            style={{
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}
                          >
                            {(() => {
                              const hasJump =
                                move.appliedJumpFrom !== null &&
                                move.appliedJumpTo !== null;
                              if (!hasJump) {
                                return `Jogada #${move.turnNumber} • Dado ${move.diceValue} • ${move.fromPos} → ${move.toPos}`;
                              }

                              const jumpLabel =
                                move.appliedJumpTo > move.appliedJumpFrom
                                  ? "subida"
                                  : "descida";
                              return `Jogada #${move.turnNumber} • Dado ${move.diceValue} • ${move.fromPos} → ${move.appliedJumpFrom} • atalho (${jumpLabel}): ${move.appliedJumpTo}`;
                            })()}
                          </span>
                          <span className="small-muted">
                            {new Date(move.createdAt).toLocaleString("pt-BR")}
                          </span>
                          {move.cardDraws.length > 0 && (
                            <div style={{ display: "grid", gap: 2 }}>
                              {move.cardDraws.map((draw) => (
                                <span key={draw.id} className="small-muted">
                                  {draw.card
                                    ? `Carta #${draw.card.cardNumber} • ${draw.card.keywords}`
                                    : `Carta(s): ${draw.cards.join(", ")}`}
                                </span>
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
    </div>
  );
}
