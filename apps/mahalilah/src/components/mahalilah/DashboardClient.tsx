"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  maxParticipants: number;
  therapistPlays: boolean;
  isTrial?: boolean;
  createdAt: string;
  invites: RoomInvite[];
  participants: RoomParticipant[];
  participantsCount: number;
  stats: RoomStats;
};

type TimelineCardDraw = {
  id: string;
  cards: number[];
  createdAt: string;
  moveId: string | null;
  drawnBy: { id: string; user: { name: string | null; email: string } };
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

type DeckTimelineEntry = {
  id: string;
  cards: number[];
  createdAt: string;
  turnNumber: number | null;
  drawnBy: { id: string; user: { name: string | null; email: string } };
};

type DashboardToastKind = "info" | "success" | "warning" | "error";
type DashboardToast = { id: number; message: string; kind: DashboardToastKind };

type Filters = {
  status: string;
  from: string;
  to: string;
};

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

const DETAIL_TAB_BY_TUTORIAL_TARGET: Partial<
  Record<DashboardTutorialTarget, RoomDetailsTab>
> = {
  "room-tab-invites": "invites",
  "room-tab-participants": "participants",
  "room-tab-timeline": "timeline",
  "room-tab-deck": "deck",
  "room-tab-aiReports": "aiReports",
};

function getDashboardTutorialSteps({
  canCreateRoom,
  hasRooms,
}: {
  canCreateRoom: boolean;
  hasRooms: boolean;
}): TutorialStep[] {
  const steps: TutorialStep[] = [];

  if (canCreateRoom) {
    steps.push({
      title: "Criar sala",
      description:
        'Defina "Jogadores maximos", marque se o terapeuta joga junto e use "Criar sala" para iniciar uma nova sessao.',
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
        "Quando a primeira sala for criada, aqui voce acompanha indicadores e acessa as abas de detalhes (convites, participantes, timeline, deck e IA).",
      target: "sessions-list",
    });
    return steps;
  }

  steps.push(
    {
      title: "Acoes rapidas da sala",
      description:
        '"Abrir sala" entra na partida e "Ver detalhes" abre toda a gestao da sessao.',
      target: "room-actions",
    },
    {
      title: "Aba Convites",
      description:
        "Envie novos convites por e-mail, acompanhe quem esta pendente/aceito e use reenviar quando necessario.",
      target: "room-tab-invites",
    },
    {
      title: "Aba Participantes",
      description:
        "Veja terapeuta e jogadores da sala, confira consentimento e remova participantes quando precisar ajustar a turma.",
      target: "room-tab-participants",
    },
    {
      title: "Aba Timeline",
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
        "Consulte as ajudas e sinteses geradas pela IA durante a sessao para apoiar supervisao e fechamento terapeutico.",
      target: "room-tab-aiReports",
    },
  );

  return steps;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingTrial, setCreatingTrial] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [therapistPlays, setTherapistPlays] = useState(true);
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
  const [showDashboardTutorial, setShowDashboardTutorial] = useState(false);
  const [dashboardTutorialStep, setDashboardTutorialStep] = useState(0);
  const [dashboardTutorialTargetRect, setDashboardTutorialTargetRect] =
    useState<DOMRect | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState<boolean | null>(null);
  const dashboardTutorialSteps = useMemo(
    () =>
      getDashboardTutorialSteps({
        canCreateRoom,
        hasRooms: rooms.length > 0,
      }),
    [canCreateRoom, rooms.length],
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
      setRooms(data.rooms || []);
      setCanCreateRoom(Boolean(data.canCreateRoom));
      setHasUsedTrial(Boolean(data.hasUsedTrial));
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

        if (!payload.dashboardSeen) {
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
    await fetch("/api/mahalilah/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "dashboard" }),
    }).catch(() => null);
  };

  const handleCreateRoom = async () => {
    setCreating(true);
    const res = await fetch("/api/mahalilah/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxParticipants, therapistPlays }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao criar sala.", "error");
      setCreating(false);
      return;
    }

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
    if (roomCode) {
      window.location.href = `/rooms/${roomCode}`;
      return;
    }

    await loadRooms();
    setCreatingTrial(false);
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

  const handleExport = async (roomId: string, format: "json" | "txt") => {
    const res = await fetch(
      `/api/mahalilah/rooms/${roomId}/export?format=${format}`,
    );
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      pushToast(payload.error || "Erro ao exportar sessão.", "error");
      return;
    }

    if (format === "json") {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mahalilah_${roomId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mahalilah_${roomId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          error: payload.error || "Erro ao carregar timeline.",
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
    setOpenRooms((prev) => {
      const nextOpen = !prev[roomId];
      if (nextOpen && !details[roomId]) {
        void loadTimeline(roomId);
      }
      return { ...prev, [roomId]: nextOpen };
    });
    setActiveDetailTabs((prev) =>
      prev[roomId] ? prev : { ...prev, [roomId]: "invites" },
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

  const roomCards = rooms.map((room, index) => {
    const isOpen = !!openRooms[room.id];
    const activeTab = activeDetailTabs[room.id] || "invites";
    const roomDetails = details[room.id];
    const selectedParticipantId = timelineParticipantFilters[room.id] || "";

    const filteredMoves = (roomDetails?.moves || []).filter((move) =>
      selectedParticipantId
        ? move.participant.id === selectedParticipantId
        : true,
    );

    const deckDrawsFromMoves: DeckTimelineEntry[] = (
      roomDetails?.moves || []
    ).flatMap((move) =>
      move.cardDraws.map((draw) => ({
        id: draw.id,
        cards: draw.cards,
        createdAt: draw.createdAt,
        turnNumber: move.turnNumber,
        drawnBy: draw.drawnBy,
      })),
    );

    const standaloneDeckDraws: DeckTimelineEntry[] = (
      roomDetails?.cardDraws || []
    ).map((draw) => ({
      id: draw.id,
      cards: draw.cards,
      createdAt: draw.createdAt,
      turnNumber: null,
      drawnBy: draw.drawnBy,
    }));

    const filteredDeckDraws = [...deckDrawsFromMoves, ...standaloneDeckDraws]
      .filter((draw) =>
        selectedParticipantId
          ? draw.drawnBy.id === selectedParticipantId
          : true,
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const filteredAiReports = (roomDetails?.aiReports || []).filter((report) =>
      selectedParticipantId
        ? report.participant?.id === selectedParticipantId
        : true,
    );

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
              <span className={`pill ${statusClass(room.status)}`}>
                {room.status}
              </span>
            </div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              {new Date(room.createdAt).toLocaleString("pt-BR")} •{" "}
              {room.participantsCount}/{room.maxParticipants} jogadores •{" "}
              {room.therapistPlays
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
            <a href={`/rooms/${room.code}`} className="btn-secondary">
              Abrir sala
            </a>
            <button
              className="btn-secondary"
              onClick={() => toggleRoom(room.id)}
            >
              {isOpen ? "Fechar detalhes" : "Ver detalhes"}
            </button>
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
                Timeline
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

            {activeTab === "invites" && (
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
                  {room.participants.map((participant) => {
                    const isTherapist = participant.role === "THERAPIST";

                    return (
                      <div
                        key={participant.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
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
                        {participant.role === "PLAYER" && (
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
                  <strong>Timeline</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {room.participants.length > 1 && (
                      <select
                        value={selectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => loadTimeline(room.id)}
                    >
                      Atualizar timeline
                    </button>
                  </div>
                </div>
                {roomDetails?.loading ? (
                  <span className="small-muted">Carregando timeline...</span>
                ) : roomDetails?.error ? (
                  <span className="notice">{roomDetails.error}</span>
                ) : filteredMoves.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {filteredMoves.map((move) => (
                      <div
                        key={move.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "hsl(var(--temple-surface-2))",
                        }}
                      >
                        <div>
                          <strong>
                            {move.participant.user.name ||
                              move.participant.user.email}
                          </strong>
                          <div className="small-muted">
                            Jogada #{move.turnNumber} •{" "}
                            {new Date(move.createdAt).toLocaleString("pt-BR")} •
                            Dado {move.diceValue}
                          </div>
                          <div className="small-muted">
                            {move.fromPos} → {move.toPos}
                            {move.appliedJumpFrom
                              ? ` • Atalho ${move.appliedJumpFrom}→${move.appliedJumpTo}`
                              : ""}
                          </div>
                          {move.therapyEntries.length > 0 && (
                            <div className="small-muted">
                              Registros: {move.therapyEntries.length}
                            </div>
                          )}
                          {move.cardDraws.length > 0 && (
                            <div className="small-muted">
                              Cartas:{" "}
                              {move.cardDraws
                                .map((draw) => draw.cards.join(","))
                                .join(" | ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {selectedParticipantId
                      ? "Nenhuma jogada para o jogador selecionado."
                      : "Ainda não há jogadas."}
                  </span>
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
                    {room.participants.length > 1 && (
                      <select
                        value={selectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => loadTimeline(room.id)}
                    >
                      Atualizar timeline
                    </button>
                  </div>
                </div>
                {filteredDeckDraws.length ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {filteredDeckDraws.map((draw) => (
                      <div
                        key={draw.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "hsl(var(--temple-surface-2))",
                        }}
                      >
                        <div>
                          <strong>
                            {draw.drawnBy.user.name || draw.drawnBy.user.email}
                          </strong>
                          <div className="small-muted">
                            {new Date(draw.createdAt).toLocaleString("pt-BR")}
                            {draw.turnNumber
                              ? ` • Jogada #${draw.turnNumber}`
                              : " • Sem jogada"}{" "}
                            • {draw.cards.join(", ")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {selectedParticipantId
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
                    {room.participants.length > 1 && (
                      <select
                        value={selectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => loadTimeline(room.id)}
                    >
                      Atualizar timeline
                    </button>
                  </div>
                </div>
                {filteredAiReports.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {filteredAiReports.map((report) => (
                      <div
                        key={report.id}
                        className="card"
                        style={{ padding: 12 }}
                      >
                        <div className="small-muted">
                          {new Date(report.createdAt).toLocaleString("pt-BR")} •{" "}
                          {report.kind}
                          {report.participant
                            ? ` • ${report.participant.user.name || report.participant.user.email}`
                            : ""}
                        </div>
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                          {report.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {selectedParticipantId
                      ? "Nenhum relatório para o jogador selecionado."
                      : "Nenhum relatório ainda."}
                  </span>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn-secondary"
                onClick={() => handleExport(room.id, "json")}
              >
                Exportar JSON
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleExport(room.id, "txt")}
              >
                Exportar TXT
              </button>
            </div>
          </div>
        )}
      </div>
    );
  });

  const dashboardTutorialPopover = getTutorialPopoverPosition(
    dashboardTutorialTargetRect,
  );

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
      {hasUsedTrial === false && (
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
                onChange={(event) => setTherapistPlays(event.target.checked)}
              />
              <span>Terapeuta joga junto</span>
            </label>
            <button
              className="btn-primary"
              onClick={handleCreateRoom}
              disabled={creating}
            >
              {creating ? "Criando..." : "Criar sala"}
            </button>
          </div>
          <p className="small-muted">
            Defina se o terapeuta entra na fila. Quando ele jogar junto, ocupa 1
            vaga de jogador.
          </p>
        </div>
      )}

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
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h2 className="section-title">Filtros de sessão</h2>
          <button
            className="btn-secondary"
            onClick={() => {
              setFilters({ status: "", from: "", to: "" });
              loadRooms({ status: "", from: "", to: "" });
            }}
          >
            Limpar filtros
          </button>
        </div>
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
      </div>

      <div className="grid dashboard-sessions-section" style={{ gap: 16 }}>
        <h2 className="section-title">Minhas sessões</h2>
        {loading ? (
          <div className="card" data-tour-dashboard="sessions-list">
            Carregando...
          </div>
        ) : rooms.length === 0 ? (
          <div className="card" data-tour-dashboard="sessions-list">
            Nenhuma sala encontrada com os filtros atuais.
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
