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
    cards: number[];
    createdAt: string;
    drawnBy: { user: { name: string | null; email: string } };
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
  therapyEntries: Array<{ id: string }>;
  cardDraws: Array<{ id: string; cards: number[] }>;
};

type ActionPanel = "house" | "deck" | "therapy" | "ai";
type ToastKind = "info" | "success" | "warning" | "error";

type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
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
  { key: "deck", label: "Puxar Cartas", icon: "♢", shortLabel: "Cartas" },
  {
    key: "therapy",
    label: "Registro Terapêutico",
    icon: "✎",
    shortLabel: "Registro",
  },
  { key: "ai", label: "IA Terapêutica", icon: "✦", shortLabel: "IA" },
];

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
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineMoves, setTimelineMoves] = useState<TimelineMove[]>([]);
  const [timelineTargetParticipantId, setTimelineTargetParticipantId] =
    useState("");

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

  const filteredTimelineMoves = useMemo(() => {
    if (!timelineTargetParticipantId) return timelineMoves;
    return timelineMoves.filter(
      (move) => move.participant.id === timelineTargetParticipantId,
    );
  }, [timelineMoves, timelineTargetParticipantId]);

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

  const handleDraw = (count: number) => {
    if (!socket || !state) return;
    const payload: { count: number; moveId?: string } = { count };

    if (
      state.lastMove &&
      myParticipant &&
      state.lastMove.participantId === myParticipant.id
    ) {
      payload.moveId = state.lastMove.id;
    }

    socket.emit("deck:draw", payload, (resp: any) => {
      if (!resp?.ok) {
        showSocketError("Erro ao puxar carta", resp);
      } else {
        pushToast("Cartas puxadas com sucesso.", "success");
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

  const handleLoadPlayerTimeline = async () => {
    if (!state) return;

    if (timelineOpen) {
      setTimelineOpen(false);
      return;
    }

    setTimelineOpen(true);

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
      return;
    }

    setTimelineMoves(payload.moves || []);
    setTimelineLoading(false);
    pushToast("Timeline carregada.", "success");
  };

  if (loading) {
    return <div className="card">Carregando sala...</div>;
  }

  if (!state) {
    return <div className="card">{fatalError || "Sala indisponível."}</div>;
  }

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
          <span className="badge" style={{ flex: "0 0 auto" }}>
            Sala {state.room.code}
          </span>
          <span
            className={`pill status-pill ${state.room.status === "ACTIVE" ? "active" : state.room.status === "COMPLETED" ? "completed" : "closed"}`}
            style={{ flex: "0 0 auto" }}
          >
            {state.room.status}
          </span>
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
            Terapeuta:{" "}
            <strong>{state.room.therapistOnline ? "online" : "offline"}</strong>
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
            <Link
              href="/dashboard"
              className="btn-secondary"
              style={{ flex: "0 0 auto" }}
            >
              Voltar ao dashboard
            </Link>
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
        style={{ opacity: actionsBlockedByConsent ? 0.6 : 1 }}
      >
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BOARD_ROWS}, minmax(0, 1fr))`,
              gap: 4,
              aspectRatio: "9 / 10",
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
              const isSelected = selectedHouseNumber === cell.houseNumber;
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
                <button
                  key={`${cell.row}-${cell.col}-${cell.houseNumber}`}
                  type="button"
                  onClick={() => {
                    setSelectedHouseNumber(cell.houseNumber);
                    setActivePanel("house");
                  }}
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
                        {jumpTarget > cell.houseNumber ? "↗" : "↘"}
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
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="card"
          style={{ display: "grid", gap: 10, alignSelf: "start" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
                    gap: 4,
                    minHeight: 62,
                    padding: "8px 6px",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      lineHeight: 1.2,
                      textAlign: "center",
                    }}
                  >
                    {item.shortLabel}
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
                  Selecione uma casa no tabuleiro para ver os detalhes.
                </span>
              )}
            </div>
          )}

          {activePanel === "deck" && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>Puxar cartas</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="secondary"
                  onClick={() => handleDraw(1)}
                  disabled={actionsBlockedByConsent}
                >
                  Puxar 1
                </button>
                <button
                  className="secondary"
                  onClick={() => handleDraw(2)}
                  disabled={actionsBlockedByConsent}
                >
                  Puxar 2
                </button>
                <button
                  className="secondary"
                  onClick={() => handleDraw(3)}
                  disabled={actionsBlockedByConsent}
                >
                  Puxar 3
                </button>
              </div>

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
                      <span className="small-muted">
                        {draw.cards.join(", ")}
                      </span>
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
                <span>Emoção</span>
                <input
                  value={therapy.emotion}
                  onChange={(event) =>
                    setTherapy((prev) => ({
                      ...prev,
                      emotion: event.target.value,
                    }))
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>Intensidade (0-10)</span>
                <input
                  type="number"
                  min={0}
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
                <span>Insight</span>
                <textarea
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
                <span>Corpo</span>
                <textarea
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
                <span>Micro-ação</span>
                <textarea
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

              <label style={{ display: "grid", gap: 4 }}>
                <span>Intenção da sessão (opcional)</span>
                <input
                  value={aiIntention}
                  onChange={(event) => setAiIntention(event.target.value)}
                />
              </label>

              <button
                className="secondary"
                onClick={() =>
                  socket?.emit(
                    "ai:tip",
                    { intention: aiIntention },
                    (resp: any) => {
                      if (!resp?.ok)
                        showSocketError("Erro ao gerar dica", resp);
                      else {
                        setAiTip(resp.content);
                        pushToast("Dica da IA gerada.", "success");
                      }
                    },
                  )
                }
                disabled={actionsBlockedByConsent}
              >
                IA: me ajuda agora
              </button>

              {aiTip && (
                <div className="notice" style={{ whiteSpace: "pre-wrap" }}>
                  {aiTip}
                </div>
              )}

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

          <div className="divider" />

          <button className="btn-secondary" onClick={handleLoadPlayerTimeline}>
            {timelineOpen
              ? "Ocultar timeline do jogador"
              : "Timeline do jogador"}
          </button>

          {timelineOpen && (
            <div className="grid" style={{ gap: 8 }}>
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
              ) : filteredTimelineMoves.length === 0 ? (
                <span className="small-muted">
                  Nenhuma jogada para o jogador selecionado.
                </span>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    maxHeight: 280,
                    overflow: "auto",
                    paddingRight: 2,
                  }}
                >
                  {filteredTimelineMoves.map((move) => (
                    <div
                      key={move.id}
                      className="notice"
                      style={{ display: "grid", gap: 4 }}
                    >
                      <strong style={{ fontSize: 12 }}>
                        {move.participant.user.name ||
                          move.participant.user.email}
                      </strong>
                      <span className="small-muted">
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
                        <span className="small-muted">
                          Cartas:{" "}
                          {move.cardDraws
                            .map((draw) => draw.cards.join(","))
                            .join(" | ")}
                        </span>
                      )}
                      {move.therapyEntries.length > 0 && (
                        <span className="small-muted">
                          Registros: {move.therapyEntries.length}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
