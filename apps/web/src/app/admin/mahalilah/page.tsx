"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

type Room = {
  id: string;
  code: string;
  status: string;
  planType: string;
  isTrial?: boolean;
  maxParticipants: number;
  therapistPlays: boolean;
  therapistSoloPlay?: boolean;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
  therapist: {
    name: string | null;
    email: string;
    status: "ACTIVE" | "PENDING_INVITE";
  };
  orderId: string | null;
  participantsCount: number;
  invitesCount: number;
  stats: { moves: number; therapyEntries: number; cardDraws: number };
  lastMove: {
    turnNumber: number;
    diceValue: number;
    fromPos: number;
    toPos: number;
    appliedJumpFrom: number | null;
    appliedJumpTo: number | null;
    createdAt: string;
    participant: {
      name: string | null;
      email: string;
    };
  } | null;
};

const statusBadge: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-100 text-slate-800",
  COMPLETED: "bg-purple-100 text-purple-800",
};

const planLabel: Record<string, string> = {
  SINGLE_SESSION: "Avulsa",
  SUBSCRIPTION: "Assinatura",
  SUBSCRIPTION_LIMITED: "Assinatura limitada",
};

export default function AdminMahaLilahRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [openingRoomId, setOpeningRoomId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [therapistEmail, setTherapistEmail] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [planType, setPlanType] = useState("SINGLE_SESSION");
  const [therapistPlays, setTherapistPlays] = useState(true);
  const [therapistSoloPlay, setTherapistSoloPlay] = useState(false);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://mahalilahonline.com.br";
    return (
      process.env.NEXT_PUBLIC_MAHALILAH_URL || "https://mahalilahonline.com.br"
    );
  }, []);

  const loadRooms = useCallback(
    async (status?: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      const activeStatus = status ?? filterStatus;
      if (activeStatus && activeStatus !== "all") {
        params.set("status", activeStatus);
      }
      const res = await fetch(
        `/api/admin/mahalilah/rooms${params.toString() ? `?${params.toString()}` : ""}`,
      );
      if (!res.ok) {
        toast.error("Erro ao carregar salas");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRooms(data.rooms || []);
      setLoading(false);
    },
    [filterStatus],
  );

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreateRoom = async () => {
    const email = therapistEmail.trim();
    if (!email) {
      toast.error("Informe o e-mail do terapeuta.");
      return;
    }
    if (
      maxParticipants < 1 ||
      maxParticipants > 12 ||
      Number.isNaN(maxParticipants)
    ) {
      toast.error("Jogadores devem estar entre 1 e 12.");
      return;
    }

    setCreating(true);
    const res = await fetch("/api/admin/mahalilah/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapistEmail: email,
        maxParticipants,
        planType,
        therapistPlays,
        therapistSoloPlay,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = Array.isArray(payload.details)
        ? payload.details.map((d: any) => d.message).join(" • ")
        : "";
      toast.error(
        [payload.error || "Erro ao criar sala", details]
          .filter(Boolean)
          .join(": "),
      );
      setCreating(false);
      return;
    }

    if (payload.awaitingTherapistAcceptance) {
      toast.success(
        "Sala criada e convite enviado. O terapeuta precisa concluir cadastro/login para assumir a sala.",
      );
    } else {
      toast.success("Sala criada com sucesso.");
    }
    setTherapistEmail("");
    setTherapistPlays(true);
    setTherapistSoloPlay(false);
    await loadRooms();
    setCreating(false);
  };

  const handleDeleteRoom = async (room: Room) => {
    const confirmed = window.confirm(
      `Excluir a sala ${room.code}? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setDeletingRoomId(room.id);
    const res = await fetch(`/api/admin/mahalilah/rooms/${room.id}`, {
      method: "DELETE",
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao excluir sala");
      setDeletingRoomId(null);
      return;
    }

    toast.success(payload.message || "Sala excluída com sucesso.");
    await loadRooms();
    setDeletingRoomId(null);
  };

  const handleOpenRoom = async (room: Room) => {
    const popup = window.open("", "_blank");
    if (!popup) {
      toast.error(
        "Nao foi possivel abrir nova aba. Permita pop-ups para este site.",
      );
      return;
    }

    popup.opener = null;
    setOpeningRoomId(room.id);
    try {
      const res = await fetch(`/api/admin/mahalilah/rooms/${room.id}/open`, {
        method: "POST",
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || "Erro ao abrir sala");
        popup.close();
        return;
      }

      const roomUrl = payload.roomUrl || `${baseUrl}/rooms/${room.code}`;
      popup.location.href = roomUrl;

      toast.success("Sala aberta no tabuleiro.");
      await loadRooms();
    } catch (error) {
      popup.close();
      console.error("Erro ao abrir sala Maha Lilah pelo dashboard admin:", error);
      toast.error("Erro ao abrir sala");
    } finally {
      setOpeningRoomId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Salas de Maha Lilah", current: true }]} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Salas de Maha Lilah</CardTitle>
              <CardDescription>
                Visão global das salas e criação manual sem pagamento.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/mahalilah/catalogo">Catálogo Maha Lilah</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/mahalilah/intervencoes">Intervenções</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/admin/mahalilah/baralhos">Gerenciar baralhos</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email do terapeuta</label>
              <Input
                type="email"
                value={therapistEmail}
                onChange={(event) => setTherapistEmail(event.target.value)}
                placeholder="terapeuta@dominio.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jogadores</label>
              <Input
                type="number"
                min={1}
                max={12}
                value={maxParticipants}
                onChange={(event) =>
                  setMaxParticipants(Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plano</label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_SESSION">
                    Avulsa (sem pagamento)
                  </SelectItem>
                  <SelectItem value="SUBSCRIPTION">Assinatura</SelectItem>
                  <SelectItem value="SUBSCRIPTION_LIMITED">
                    Assinatura limitada
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Terapeuta joga</label>
              <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                <Switch
                  checked={therapistPlays}
                  onCheckedChange={(checked) => {
                    if (therapistSoloPlay && !checked) return;
                    setTherapistPlays(checked);
                  }}
                  disabled={therapistSoloPlay}
                />
                <span className="text-sm text-muted-foreground">
                  {therapistPlays ? "Sim, joga junto" : "Não, só conduz"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modo visualizador</label>
              <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                <Switch
                  checked={therapistSoloPlay}
                  onCheckedChange={(checked) => {
                    setTherapistSoloPlay(checked);
                    if (checked) {
                      setTherapistPlays(true);
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {therapistSoloPlay
                    ? "Só terapeuta joga"
                    : "Todos jogam normalmente"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleCreateRoom}
              disabled={creating || !therapistEmail}
            >
              {creating ? "Criando..." : "Criar sala avulsa"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value);
                loadRooms(value);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Ativas</SelectItem>
                <SelectItem value="CLOSED">Encerradas</SelectItem>
                <SelectItem value="COMPLETED">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={() => loadRooms()}>
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">
              Carregando salas...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Jogadores</TableHead>
                  <TableHead>Convites</TableHead>
                  <TableHead>Jogadas</TableHead>
                  <TableHead>Última jogada</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-muted-foreground"
                    >
                      Nenhuma sala encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>
                        <div className="font-medium">{room.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {room.therapist.name || room.therapist.email}
                          </div>
                          {room.therapist.status === "PENDING_INVITE" && (
                            <Badge className="bg-amber-100 text-amber-800">
                              Convite pendente
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {room.therapist.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusBadge[room.status] ||
                            "bg-slate-100 text-slate-800"
                          }
                        >
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{planLabel[room.planType] || room.planType}</span>
                          {room.isTrial && (
                            <Badge className="bg-amber-100 text-amber-800">
                              Trial
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {room.participantsCount}/{room.maxParticipants}
                        <div className="text-xs text-muted-foreground">
                          {room.therapistSoloPlay
                            ? "Só terapeuta joga (demais visualizam)"
                            : room.therapistPlays
                            ? "Terapeuta joga junto"
                            : "Terapeuta não joga"}
                        </div>
                      </TableCell>
                      <TableCell>{room.invitesCount}</TableCell>
                      <TableCell>{room.stats.moves}</TableCell>
                      <TableCell>
                        {room.lastMove ? (
                          <div className="text-xs leading-5">
                            <div className="font-medium text-foreground">
                              #{room.lastMove.turnNumber} • dado {room.lastMove.diceValue}
                            </div>
                            <div className="text-muted-foreground">
                              {room.lastMove.appliedJumpFrom !== null &&
                              room.lastMove.appliedJumpTo !== null
                                ? `${room.lastMove.fromPos} → ${room.lastMove.appliedJumpFrom} → ${room.lastMove.appliedJumpTo}`
                                : `${room.lastMove.fromPos} → ${room.lastMove.toPos}`}
                            </div>
                            <div className="text-muted-foreground">
                              {room.lastMove.participant.name ||
                                room.lastMove.participant.email}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(room.lastMove.createdAt).toLocaleString(
                                "pt-BR",
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sem jogadas
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{room.orderId ? "Pago" : "Admin"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRoom(room)}
                            disabled={openingRoomId === room.id}
                          >
                            {openingRoomId === room.id
                              ? "Abrindo..."
                              : "Abrir sala"}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRoom(room)}
                            disabled={deletingRoomId === room.id}
                          >
                            {deletingRoomId === room.id
                              ? "Excluindo..."
                              : "Excluir"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
