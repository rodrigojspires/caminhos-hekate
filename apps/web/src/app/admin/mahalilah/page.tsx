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
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
  orderId: string | null;
  participantsCount: number;
  invitesCount: number;
  stats: { moves: number; therapyEntries: number; cardDraws: number };
};

type PlanType = "SINGLE_SESSION" | "SUBSCRIPTION" | "SUBSCRIPTION_LIMITED";
type PricingMode = "UNIT_PER_PARTICIPANT" | "FIXED_TOTAL";

type SingleSessionTier = {
  id?: string;
  participantsFrom: number;
  participantsTo: number;
  pricingMode: PricingMode;
  unitPrice: number | null;
  fixedPrice: number | null;
  sortOrder: number;
  isActive: boolean;
};

type CatalogPlan = {
  id: string;
  planType: PlanType;
  name: string;
  description: string;
  billingType: "ONE_TIME" | "RECURRING";
  subscriptionPlanId: string | null;
  maxParticipants: number;
  roomsPerMonth: number | null;
  tipsPerPlayer: number;
  summaryLimit: number;
  durationDays: number;
  isActive: boolean;
  singleSessionPriceTiers: SingleSessionTier[];
  subscriptionPlan?: {
    id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    isActive: boolean;
  } | null;
};

type AvailableSubscriptionPlan = {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  appScope: string;
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

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function createEmptyTier(index: number): SingleSessionTier {
  return {
    participantsFrom: 1,
    participantsTo: 1,
    pricingMode: "FIXED_TOTAL",
    unitPrice: null,
    fixedPrice: 100,
    sortOrder: index,
    isActive: true,
  };
}

export default function AdminMahaLilahPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [therapistEmail, setTherapistEmail] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [planType, setPlanType] = useState("SINGLE_SESSION");
  const [therapistPlays, setTherapistPlays] = useState(true);

  const [catalogPlans, setCatalogPlans] = useState<CatalogPlan[]>([]);
  const [subscriptionPlanOptions, setSubscriptionPlanOptions] = useState<
    AvailableSubscriptionPlan[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [simulatedParticipants, setSimulatedParticipants] = useState(4);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://mahalilahonline.com.br";
    return (
      process.env.NEXT_PUBLIC_MAHALILAH_URL || "https://mahalilahonline.com.br"
    );
  }, []);

  const plansByType = useMemo(() => {
    const map = new Map<PlanType, CatalogPlan>();
    catalogPlans.forEach((plan) => {
      map.set(plan.planType, plan);
    });
    return map;
  }, [catalogPlans]);

  const singleSessionPlan = plansByType.get("SINGLE_SESSION") || null;
  const subscriptionPlan = plansByType.get("SUBSCRIPTION") || null;
  const subscriptionLimitedPlan =
    plansByType.get("SUBSCRIPTION_LIMITED") || null;

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

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    const res = await fetch("/api/admin/mahalilah/plans", { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao carregar catálogo Maha Lilah");
      setCatalogLoading(false);
      return;
    }

    setCatalogPlans(payload.plans || []);
    setSubscriptionPlanOptions(payload.availableSubscriptionPlans || []);
    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

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

    toast.success("Sala criada com sucesso.");
    setTherapistEmail("");
    setTherapistPlays(true);
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

  const updatePlan = (
    planTypeToUpdate: PlanType,
    updater: (plan: CatalogPlan) => CatalogPlan,
  ) => {
    setCatalogPlans((prev) =>
      prev.map((plan) =>
        plan.planType === planTypeToUpdate ? updater(plan) : plan,
      ),
    );
  };

  const updateTier = (
    index: number,
    updater: (tier: SingleSessionTier) => SingleSessionTier,
  ) => {
    if (!singleSessionPlan) return;
    updatePlan("SINGLE_SESSION", (plan) => ({
      ...plan,
      singleSessionPriceTiers: plan.singleSessionPriceTiers.map((tier, tierIndex) =>
        tierIndex === index ? updater(tier) : tier,
      ),
    }));
  };

  const addTier = () => {
    if (!singleSessionPlan) return;
    updatePlan("SINGLE_SESSION", (plan) => ({
      ...plan,
      singleSessionPriceTiers: [
        ...plan.singleSessionPriceTiers,
        createEmptyTier(plan.singleSessionPriceTiers.length),
      ],
    }));
  };

  const removeTier = (index: number) => {
    if (!singleSessionPlan) return;
    updatePlan("SINGLE_SESSION", (plan) => ({
      ...plan,
      singleSessionPriceTiers: plan.singleSessionPriceTiers.filter(
        (_, tierIndex) => tierIndex !== index,
      ),
    }));
  };

  const getSubscriptionPlanPriceLabel = (subscriptionPlanId: string | null) => {
    if (!subscriptionPlanId) return "Não vinculado";
    const linked = subscriptionPlanOptions.find((plan) => plan.id === subscriptionPlanId);
    if (!linked) return "Plano não encontrado";
    const status = linked.isActive ? "ativo" : "inativo";
    return `${currency.format(linked.monthlyPrice)} / mês (${linked.name}, ${status})`;
  };

  const simulatedPrice = useMemo(() => {
    if (!singleSessionPlan) return null;
    const tier = singleSessionPlan.singleSessionPriceTiers.find(
      (item) =>
        item.isActive &&
        simulatedParticipants >= item.participantsFrom &&
        simulatedParticipants <= item.participantsTo,
    );
    if (!tier) return null;
    if (tier.pricingMode === "UNIT_PER_PARTICIPANT") {
      if (!tier.unitPrice) return null;
      return Number((tier.unitPrice * simulatedParticipants).toFixed(2));
    }
    return tier.fixedPrice;
  }, [singleSessionPlan, simulatedParticipants]);

  const saveCatalog = async () => {
    if (catalogPlans.length === 0) return;

    setCatalogSaving(true);
    const payload = {
      plans: catalogPlans.map((plan) => ({
        planType: plan.planType,
        name: plan.name,
        description: plan.description,
        maxParticipants: plan.maxParticipants,
        roomsPerMonth: plan.roomsPerMonth,
        tipsPerPlayer: plan.tipsPerPlayer,
        summaryLimit: plan.summaryLimit,
        durationDays: plan.durationDays,
        isActive: plan.isActive,
        subscriptionPlanId: plan.subscriptionPlanId,
        singleSessionPriceTiers: plan.planType === "SINGLE_SESSION"
          ? plan.singleSessionPriceTiers.map((tier, index) => ({
              participantsFrom: tier.participantsFrom,
              participantsTo: tier.participantsTo,
              pricingMode: tier.pricingMode,
              unitPrice: tier.pricingMode === "UNIT_PER_PARTICIPANT" ? tier.unitPrice : null,
              fixedPrice: tier.pricingMode === "FIXED_TOTAL" ? tier.fixedPrice : null,
              sortOrder: index,
              isActive: tier.isActive,
            }))
          : [],
      })),
    };

    const res = await fetch("/api/admin/mahalilah/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = Array.isArray(response.details)
        ? response.details.map((d: any) => d.message).join(" • ")
        : "";
      toast.error(
        [response.error || "Erro ao salvar catálogo", details]
          .filter(Boolean)
          .join(": "),
      );
      setCatalogSaving(false);
      return;
    }

    setCatalogPlans(response.plans || []);
    setSubscriptionPlanOptions(response.availableSubscriptionPlans || []);
    toast.success("Catálogo Maha Lilah atualizado com sucesso.");
    setCatalogSaving(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Maha Lilah", current: true }]} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Catálogo Maha Lilah</CardTitle>
              <CardDescription>
                Configure preços, limites de IA por jogador/sala e faixas da sessão avulsa sem editar variáveis de ambiente.
              </CardDescription>
            </div>
            <Button onClick={saveCatalog} disabled={catalogSaving || catalogLoading || catalogPlans.length === 0}>
              {catalogSaving ? "Salvando..." : "Publicar alterações"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {catalogLoading ? (
            <div className="text-sm text-muted-foreground">Carregando catálogo...</div>
          ) : (
            <>
              {singleSessionPlan && (
                <div className="rounded-xl border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm uppercase tracking-wide text-muted-foreground">Plano avulso</div>
                      <div className="font-semibold">{singleSessionPlan.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={singleSessionPlan.isActive}
                        onCheckedChange={(value) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({ ...plan, isActive: value }))
                        }
                      />
                      <span className="text-sm text-muted-foreground">Ativo</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        value={singleSessionPlan.name}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Máx. participantes</label>
                      <Input
                        type="number"
                        min={1}
                        value={singleSessionPlan.maxParticipants}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            maxParticipants: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duração (dias)</label>
                      <Input
                        type="number"
                        min={1}
                        value={singleSessionPlan.durationDays}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            durationDays: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <Input
                        value={singleSessionPlan.description}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            description: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dicas IA / jogador</label>
                      <Input
                        type="number"
                        min={0}
                        value={singleSessionPlan.tipsPerPlayer}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            tipsPerPlayer: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Resumo final / jogador</label>
                      <Input
                        type="number"
                        min={0}
                        value={singleSessionPlan.summaryLimit}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            summaryLimit: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="font-medium">Faixas de preço da sessão avulsa</div>
                      <Button type="button" variant="secondary" size="sm" onClick={addTier}>
                        Adicionar faixa
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>De</TableHead>
                          <TableHead>Até</TableHead>
                          <TableHead>Modo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Ativa</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {singleSessionPlan.singleSessionPriceTiers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              Nenhuma faixa cadastrada.
                            </TableCell>
                          </TableRow>
                        ) : (
                          singleSessionPlan.singleSessionPriceTiers.map((tier, index) => (
                            <TableRow key={tier.id || `${tier.participantsFrom}-${tier.participantsTo}-${index}`}>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  value={tier.participantsFrom}
                                  onChange={(event) =>
                                    updateTier(index, (current) => ({
                                      ...current,
                                      participantsFrom: Number(event.target.value || 1),
                                    }))
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  value={tier.participantsTo}
                                  onChange={(event) =>
                                    updateTier(index, (current) => ({
                                      ...current,
                                      participantsTo: Number(event.target.value || 1),
                                    }))
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={tier.pricingMode}
                                  onValueChange={(value: PricingMode) =>
                                    updateTier(index, (current) => ({
                                      ...current,
                                      pricingMode: value,
                                      unitPrice:
                                        value === "UNIT_PER_PARTICIPANT"
                                          ? current.unitPrice ?? 10
                                          : null,
                                      fixedPrice:
                                        value === "FIXED_TOTAL"
                                          ? current.fixedPrice ?? 100
                                          : null,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FIXED_TOTAL">Preço fixo por faixa</SelectItem>
                                    <SelectItem value="UNIT_PER_PARTICIPANT">Valor por participante</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {tier.pricingMode === "UNIT_PER_PARTICIPANT" ? (
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={tier.unitPrice ?? ""}
                                    onChange={(event) =>
                                      updateTier(index, (current) => ({
                                        ...current,
                                        unitPrice: Number(event.target.value || 0),
                                      }))
                                    }
                                  />
                                ) : (
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={tier.fixedPrice ?? ""}
                                    onChange={(event) =>
                                      updateTier(index, (current) => ({
                                        ...current,
                                        fixedPrice: Number(event.target.value || 0),
                                      }))
                                    }
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={tier.isActive}
                                  onCheckedChange={(value) =>
                                    updateTier(index, (current) => ({
                                      ...current,
                                      isActive: value,
                                    }))
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeTier(index)}
                                >
                                  Remover
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    <div className="rounded-lg border p-3 grid gap-3 md:grid-cols-[180px_1fr] items-center">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Simular participantes</label>
                        <Input
                          type="number"
                          min={1}
                          value={simulatedParticipants}
                          onChange={(event) =>
                            setSimulatedParticipants(Number(event.target.value || 1))
                          }
                        />
                      </div>
                      <div className="text-sm">
                        {simulatedPrice == null ? (
                          <span className="text-amber-600">
                            Sem faixa ativa para {simulatedParticipants} participante(s).
                          </span>
                        ) : (
                          <span>
                            Valor calculado: <strong>{currency.format(simulatedPrice)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {subscriptionPlan && (
                  <div className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm uppercase tracking-wide text-muted-foreground">Assinatura ilimitada</div>
                        <div className="font-semibold">{subscriptionPlan.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={subscriptionPlan.isActive}
                          onCheckedChange={(value) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({ ...plan, isActive: value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">Ativo</span>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Nome</label>
                        <Input
                          value={subscriptionPlan.name}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Descrição</label>
                        <Input
                          value={subscriptionPlan.description}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              description: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Plano de cobrança vinculado</label>
                        <Select
                          value={subscriptionPlan.subscriptionPlanId || "none"}
                          onValueChange={(value) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              subscriptionPlanId: value === "none" ? null : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não vinculado</SelectItem>
                            {subscriptionPlanOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name} ({option.tier})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {getSubscriptionPlanPriceLabel(subscriptionPlan.subscriptionPlanId)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Máx. participantes</label>
                        <Input
                          type="number"
                          min={1}
                          value={subscriptionPlan.maxParticipants}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              maxParticipants: Number(event.target.value || 1),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Duração (dias)</label>
                        <Input
                          type="number"
                          min={1}
                          value={subscriptionPlan.durationDays}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              durationDays: Number(event.target.value || 1),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dicas IA / jogador</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionPlan.tipsPerPlayer}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              tipsPerPlayer: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Resumo final / jogador</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionPlan.summaryLimit}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              summaryLimit: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {subscriptionLimitedPlan && (
                  <div className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm uppercase tracking-wide text-muted-foreground">Assinatura limitada</div>
                        <div className="font-semibold">{subscriptionLimitedPlan.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={subscriptionLimitedPlan.isActive}
                          onCheckedChange={(value) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({ ...plan, isActive: value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">Ativo</span>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Nome</label>
                        <Input
                          value={subscriptionLimitedPlan.name}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Descrição</label>
                        <Input
                          value={subscriptionLimitedPlan.description}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              description: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Plano de cobrança vinculado</label>
                        <Select
                          value={subscriptionLimitedPlan.subscriptionPlanId || "none"}
                          onValueChange={(value) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              subscriptionPlanId: value === "none" ? null : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não vinculado</SelectItem>
                            {subscriptionPlanOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name} ({option.tier})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {getSubscriptionPlanPriceLabel(
                            subscriptionLimitedPlan.subscriptionPlanId,
                          )}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Máx. participantes</label>
                        <Input
                          type="number"
                          min={1}
                          value={subscriptionLimitedPlan.maxParticipants}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              maxParticipants: Number(event.target.value || 1),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Salas por mês</label>
                        <Input
                          type="number"
                          min={1}
                          value={subscriptionLimitedPlan.roomsPerMonth ?? ""}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              roomsPerMonth: Number(event.target.value || 1),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Duração (dias)</label>
                        <Input
                          type="number"
                          min={1}
                          value={subscriptionLimitedPlan.durationDays}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              durationDays: Number(event.target.value || 1),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dicas IA / jogador</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionLimitedPlan.tipsPerPlayer}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              tipsPerPlayer: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Resumo final / jogador</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionLimitedPlan.summaryLimit}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              summaryLimit: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Salas Maha Lilah</CardTitle>
              <CardDescription>
                Visão global das salas e criação manual sem pagamento.
              </CardDescription>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/admin/mahalilah/baralhos">Gerenciar baralhos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-end">
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
                  onCheckedChange={setTherapistPlays}
                />
                <span className="text-sm text-muted-foreground">
                  {therapistPlays ? "Sim, joga junto" : "Não, só conduz"}
                </span>
              </div>
            </div>
            <Button
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
            <Button variant="secondary" onClick={() => loadRooms()}>
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
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
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
                        <Link
                          href={`${baseUrl}/rooms/${room.code}`}
                          className="text-xs text-purple-500 hover:underline"
                        >
                          Abrir sala
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {room.createdBy.name || room.createdBy.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {room.createdBy.email}
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
                          {room.therapistPlays
                            ? "Terapeuta joga junto"
                            : "Terapeuta não joga"}
                        </div>
                      </TableCell>
                      <TableCell>{room.invitesCount}</TableCell>
                      <TableCell>{room.stats.moves}</TableCell>
                      <TableCell>{room.orderId ? "Pago" : "Admin"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRoom(room)}
                          disabled={deletingRoomId === room.id}
                        >
                          {deletingRoomId === room.id
                            ? "Excluindo..."
                            : "Excluir"}
                        </Button>
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
