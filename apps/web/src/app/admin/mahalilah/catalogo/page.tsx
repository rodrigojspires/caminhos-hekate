"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type PlanMarketing = {
  forWho: string;
  includes: string[];
  limits: string[];
  ctaLabel: string;
  ctaHref: string;
  aiSummaryLabel: string;
  highlight: boolean;
};

type CatalogPlan = {
  id: string;
  planType: PlanType;
  name: string;
  description: string;
  billingType: "ONE_TIME" | "RECURRING";
  subscriptionPlanId: string | null;
  maxParticipants: number;
  allowTherapistSoloPlay: boolean;
  roomsPerMonth: number | null;
  tipsPerPlayer: number;
  summaryLimit: number;
  progressSummaryEveryMoves: number;
  interventionLimitPerParticipant: number;
  durationDays: number;
  isActive: boolean;
  marketing: PlanMarketing;
  singleSessionPriceTiers: SingleSessionTier[];
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

function parseLineItems(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function stringifyLineItems(items: string[]) {
  return items.join("\n");
}

function PlanMarketingEditor({
  marketing,
  onChange,
}: {
  marketing: PlanMarketing;
  onChange: (marketing: PlanMarketing) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="font-medium">Conteúdo da página de planos</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Texto para quem</label>
          <Input
            value={marketing.forWho}
            onChange={(event) =>
              onChange({
                ...marketing,
                forWho: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Itens de inclui</label>
          <Textarea
            rows={5}
            value={stringifyLineItems(marketing.includes)}
            onChange={(event) =>
              onChange({
                ...marketing,
                includes: parseLineItems(event.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground">Um item por linha.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Itens de limites</label>
          <Textarea
            rows={5}
            value={stringifyLineItems(marketing.limits)}
            onChange={(event) =>
              onChange({
                ...marketing,
                limits: parseLineItems(event.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground">Um item por linha.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Texto do botão CTA</label>
          <Input
            value={marketing.ctaLabel}
            onChange={(event) =>
              onChange({
                ...marketing,
                ctaLabel: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Link do botão CTA</label>
          <Input
            value={marketing.ctaHref}
            onChange={(event) =>
              onChange({
                ...marketing,
                ctaHref: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Resumo no bloco de IA</label>
          <Input
            value={marketing.aiSummaryLabel}
            onChange={(event) =>
              onChange({
                ...marketing,
                aiSummaryLabel: event.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={marketing.highlight}
          onCheckedChange={(value) =>
            onChange({
              ...marketing,
              highlight: value,
            })
          }
        />
        <span className="text-sm text-muted-foreground">Destacar plano na vitrine</span>
      </div>
    </div>
  );
}

export default function AdminMahaLilahCatalogPage() {
  const [catalogPlans, setCatalogPlans] = useState<CatalogPlan[]>([]);
  const [subscriptionPlanOptions, setSubscriptionPlanOptions] = useState<
    AvailableSubscriptionPlan[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [simulatedParticipants, setSimulatedParticipants] = useState(4);

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
    loadCatalog();
  }, [loadCatalog]);

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
        allowTherapistSoloPlay: plan.allowTherapistSoloPlay,
        roomsPerMonth: plan.roomsPerMonth,
        tipsPerPlayer: plan.tipsPerPlayer,
        summaryLimit: plan.summaryLimit,
        progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
        interventionLimitPerParticipant: plan.interventionLimitPerParticipant,
        durationDays: plan.durationDays,
        isActive: plan.isActive,
        subscriptionPlanId: plan.subscriptionPlanId,
        marketing: plan.marketing,
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
      <Breadcrumbs
        items={[
          { label: "Salas de Maha Lilah", href: "/admin/mahalilah" },
          { label: "Catálogo Maha Lilah", current: true },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Catálogo Maha Lilah</CardTitle>
              <CardDescription>
                Configure preços, limites de IA por jogador/sala e faixas da sessão avulsa sem editar variáveis de ambiente.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/mahalilah">Salas de Maha Lilah</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/mahalilah/intervencoes">Intervenções</Link>
              </Button>
              <Button onClick={saveCatalog} disabled={catalogSaving || catalogLoading || catalogPlans.length === 0}>
                {catalogSaving ? "Salvando..." : "Publicar alterações"}
              </Button>
            </div>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Modo visualização para jogadores</label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch
                          checked={singleSessionPlan.allowTherapistSoloPlay}
                          onCheckedChange={(value) =>
                            updatePlan("SINGLE_SESSION", (plan) => ({
                              ...plan,
                              allowTherapistSoloPlay: value,
                            }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          Permitir: So o terapeuta joga (demais visualizam)
                        </span>
                      </div>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium">O Caminho até agora (a cada X jogadas)</label>
                      <Input
                        type="number"
                        min={0}
                        value={singleSessionPlan.progressSummaryEveryMoves}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            progressSummaryEveryMoves: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Intervenções / jogador / sessão</label>
                      <Input
                        type="number"
                        min={0}
                        value={singleSessionPlan.interventionLimitPerParticipant}
                        onChange={(event) =>
                          updatePlan("SINGLE_SESSION", (plan) => ({
                            ...plan,
                            interventionLimitPerParticipant: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <PlanMarketingEditor
                    marketing={singleSessionPlan.marketing}
                    onChange={(marketing) =>
                      updatePlan("SINGLE_SESSION", (plan) => ({
                        ...plan,
                        marketing,
                      }))
                    }
                  />

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
                        <label className="text-sm font-medium">Modo visualização para jogadores</label>
                        <div className="flex items-center gap-2 pt-2">
                          <Switch
                            checked={subscriptionPlan.allowTherapistSoloPlay}
                            onCheckedChange={(value) =>
                              updatePlan("SUBSCRIPTION", (plan) => ({
                                ...plan,
                                allowTherapistSoloPlay: value,
                              }))
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            Permitir: So o terapeuta joga (demais visualizam)
                          </span>
                        </div>
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium">O Caminho até agora (a cada X jogadas)</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionPlan.progressSummaryEveryMoves}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              progressSummaryEveryMoves: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Intervenções / jogador / sessão</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionPlan.interventionLimitPerParticipant}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION", (plan) => ({
                              ...plan,
                              interventionLimitPerParticipant: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <PlanMarketingEditor
                      marketing={subscriptionPlan.marketing}
                      onChange={(marketing) =>
                        updatePlan("SUBSCRIPTION", (plan) => ({
                          ...plan,
                          marketing,
                        }))
                      }
                    />
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
                        <label className="text-sm font-medium">Modo visualização para jogadores</label>
                        <div className="flex items-center gap-2 pt-2">
                          <Switch
                            checked={subscriptionLimitedPlan.allowTherapistSoloPlay}
                            onCheckedChange={(value) =>
                              updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                                ...plan,
                                allowTherapistSoloPlay: value,
                              }))
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            Permitir: So o terapeuta joga (demais visualizam)
                          </span>
                        </div>
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium">O Caminho até agora (a cada X jogadas)</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionLimitedPlan.progressSummaryEveryMoves}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              progressSummaryEveryMoves: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Intervenções / jogador / sessão</label>
                        <Input
                          type="number"
                          min={0}
                          value={subscriptionLimitedPlan.interventionLimitPerParticipant}
                          onChange={(event) =>
                            updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                              ...plan,
                              interventionLimitPerParticipant: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <PlanMarketingEditor
                      marketing={subscriptionLimitedPlan.marketing}
                      onChange={(marketing) =>
                        updatePlan("SUBSCRIPTION_LIMITED", (plan) => ({
                          ...plan,
                          marketing,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
