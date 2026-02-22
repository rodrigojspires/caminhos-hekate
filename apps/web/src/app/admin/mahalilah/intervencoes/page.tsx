"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Severity = "INFO" | "ATTENTION" | "CRITICAL";

type InterventionPrompt = {
  id?: string;
  locale: string;
  name: string;
  isActive: boolean;
  systemPrompt: string | null;
  userPromptTemplate: string;
};

type InterventionThresholds = {
  houseRepeatCount?: number | null;
  repeatedHouseWindowMoves?: number | null;
  snakeStreakCount?: number | null;
  preStartRollCount?: number | null;
  inactivityMinutes?: number | null;
};

type InterventionConfig = {
  id?: string;
  triggerId: string;
  title: string;
  description: string | null;
  enabled: boolean;
  useAi: boolean;
  sensitive: boolean;
  requireTherapistApproval: boolean;
  autoApproveWhenTherapistSolo: boolean;
  severity: Severity;
  cooldownMoves: number;
  cooldownMinutes: number;
  thresholds: InterventionThresholds;
  metadata: Record<string, unknown>;
  prompts: InterventionPrompt[];
};

const THRESHOLD_FIELDS: Array<{
  key: keyof InterventionThresholds;
  label: string;
}> = [
  { key: "houseRepeatCount", label: "Repetições de casa" },
  { key: "repeatedHouseWindowMoves", label: "Janela de jogadas (repetição)" },
  { key: "snakeStreakCount", label: "Sequência de cobras" },
  { key: "preStartRollCount", label: "Tentativas antes de iniciar" },
  { key: "inactivityMinutes", label: "Inatividade (min)" },
];

function buildNextTriggerId(configs: InterventionConfig[]) {
  let index = configs.length + 1;
  while (configs.some((config) => config.triggerId === `CUSTOM_TRIGGER_${index}`)) {
    index += 1;
  }
  return `CUSTOM_TRIGGER_${index}`;
}

function createEmptyPrompt(index: number): InterventionPrompt {
  return {
    locale: "pt-BR",
    name: `Prompt ${index + 1}`,
    isActive: true,
    systemPrompt: "",
    userPromptTemplate: "",
  };
}

function createEmptyConfig(configs: InterventionConfig[]): InterventionConfig {
  return {
    triggerId: buildNextTriggerId(configs),
    title: "Novo gatilho",
    description: "",
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: "INFO",
    cooldownMoves: 2,
    cooldownMinutes: 10,
    thresholds: {},
    metadata: {},
    prompts: [],
  };
}

function toNullableInt(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

export default function AdminMahaLilahInterventionsPage() {
  const [configs, setConfigs] = useState<InterventionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const updateConfig = useCallback(
    (index: number, updater: (prev: InterventionConfig) => InterventionConfig) => {
      setConfigs((prev) => prev.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
    },
    [],
  );

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/mahalilah/interventions", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(payload.error || "Erro ao carregar catálogo de intervenções");
        return;
      }

      setConfigs(payload.configs || []);
    } catch (error) {
      console.error("Erro ao carregar catálogo de intervenções:", error);
      toast.error("Não foi possível carregar o catálogo de intervenções.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      configs: configs.map((config) => ({
        id: config.id,
        triggerId: config.triggerId.trim().toUpperCase(),
        title: config.title.trim(),
        description: (config.description || "").trim() || null,
        enabled: config.enabled,
        useAi: config.useAi,
        sensitive: config.sensitive,
        requireTherapistApproval: config.requireTherapistApproval,
        autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
        severity: config.severity,
        cooldownMoves: toNullableInt(config.cooldownMoves) ?? 0,
        cooldownMinutes: toNullableInt(config.cooldownMinutes) ?? 0,
        thresholds: {
          houseRepeatCount: toNullableInt(config.thresholds.houseRepeatCount),
          repeatedHouseWindowMoves: toNullableInt(config.thresholds.repeatedHouseWindowMoves),
          snakeStreakCount: toNullableInt(config.thresholds.snakeStreakCount),
          preStartRollCount: toNullableInt(config.thresholds.preStartRollCount),
          inactivityMinutes: toNullableInt(config.thresholds.inactivityMinutes),
        },
        metadata: config.metadata || {},
        prompts: config.prompts.map((prompt) => ({
          id: prompt.id,
          locale: prompt.locale.trim() || "pt-BR",
          name: prompt.name.trim() || "Prompt",
          isActive: prompt.isActive,
          systemPrompt: (prompt.systemPrompt || "").trim() || null,
          userPromptTemplate: prompt.userPromptTemplate.trim(),
        })),
      })),
    };

    try {
      const response = await fetch("/api/admin/mahalilah/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = Array.isArray(data.details)
          ? data.details.map((item: any) => item.message).join(" • ")
          : "";
        toast.error(
          [data.error || "Erro ao salvar catálogo de intervenções", details]
            .filter(Boolean)
            .join(": "),
        );
        return;
      }

      setConfigs(data.configs || []);
      toast.success("Catálogo de intervenções salvo com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar catálogo de intervenções:", error);
      toast.error("Não foi possível salvar o catálogo de intervenções.");
    } finally {
      setSaving(false);
    }
  };

  const addConfig = () => {
    setConfigs((prev) => [...prev, createEmptyConfig(prev)]);
  };

  const removeConfig = (index: number) => {
    const target = configs[index];
    const confirmed = window.confirm(
      `Remover o gatilho ${target.triggerId}? Essa ação será aplicada ao salvar.`,
    );
    if (!confirmed) return;
    setConfigs((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const setMetadataField = (index: number, key: string, value: string) => {
    updateConfig(index, (config) => {
      const metadata = { ...config.metadata };
      if (value.trim()) {
        metadata[key] = value;
      } else {
        delete metadata[key];
      }
      return { ...config, metadata };
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Salas de Maha Lilah", href: "/admin/mahalilah" },
          { label: "Intervenções", current: true },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Intervenções do Maha Lilah</CardTitle>
              <CardDescription>
                Gerencie gatilhos, limiares e prompts usados no motor de intervenção.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/mahalilah">Voltar para salas</Link>
              </Button>
              <Button variant="secondary" onClick={addConfig}>
                Novo gatilho
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando gatilhos...</div>
          ) : configs.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Nenhum gatilho encontrado.
            </div>
          ) : (
            configs.map((config, index) => {
              return (
                <div key={config.id || config.triggerId} className="rounded-xl border p-4 space-y-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-2 min-w-[260px]">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Trigger ID
                      </label>
                      <Input
                        value={config.triggerId}
                        onChange={(event) =>
                          updateConfig(index, (prev) => ({
                            ...prev,
                            triggerId: event.target.value.toUpperCase().replace(/\s+/g, "_"),
                          }))
                        }
                        placeholder="EX: HOUSE_REPEAT_PATTERN"
                      />
                    </div>

                    <div className="flex items-center gap-5 flex-wrap">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig(index, (prev) => ({ ...prev, enabled: checked }))
                          }
                        />
                        Ativo
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={config.useAi}
                          onCheckedChange={(checked) =>
                            updateConfig(index, (prev) => ({ ...prev, useAi: checked }))
                          }
                        />
                        Usa IA
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={config.sensitive}
                          onCheckedChange={(checked) =>
                            updateConfig(index, (prev) => ({ ...prev, sensitive: checked }))
                          }
                        />
                        Sensível
                      </label>
                      <Button variant="destructive" onClick={() => removeConfig(index)}>
                        Remover
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Título</label>
                      <Input
                        value={config.title}
                        onChange={(event) =>
                          updateConfig(index, (prev) => ({ ...prev, title: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Severidade</label>
                      <Select
                        value={config.severity}
                        onValueChange={(value: Severity) =>
                          updateConfig(index, (prev) => ({ ...prev, severity: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INFO">INFO</SelectItem>
                          <SelectItem value="ATTENTION">ATTENTION</SelectItem>
                          <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <Textarea
                        rows={2}
                        value={config.description || ""}
                        onChange={(event) =>
                          updateConfig(index, (prev) => ({ ...prev, description: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cooldown (jogadas)</label>
                      <Input
                        type="number"
                        min={0}
                        value={config.cooldownMoves}
                        onChange={(event) =>
                          updateConfig(index, (prev) => ({
                            ...prev,
                            cooldownMoves: toNullableInt(event.target.value) ?? 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cooldown (minutos)</label>
                      <Input
                        type="number"
                        min={0}
                        value={config.cooldownMinutes}
                        onChange={(event) =>
                          updateConfig(index, (prev) => ({
                            ...prev,
                            cooldownMinutes: toNullableInt(event.target.value) ?? 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Aprovação terapeuta</label>
                      <div className="h-10 rounded-md border px-3 flex items-center">
                        <Switch
                          checked={config.requireTherapistApproval}
                          onCheckedChange={(checked) =>
                            updateConfig(index, (prev) => ({
                              ...prev,
                              requireTherapistApproval: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Autoaprovar no modo solo</label>
                      <div className="h-10 rounded-md border px-3 flex items-center">
                        <Switch
                          checked={config.autoApproveWhenTherapistSolo}
                          onCheckedChange={(checked) =>
                            updateConfig(index, (prev) => ({
                              ...prev,
                              autoApproveWhenTherapistSolo: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">Limiares</div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {THRESHOLD_FIELDS.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            {field.label}
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={config.thresholds[field.key] ?? ""}
                            onChange={(event) =>
                              updateConfig(index, (prev) => ({
                                ...prev,
                                thresholds: {
                                  ...prev.thresholds,
                                  [field.key]: toNullableInt(event.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">Templates padrão (metadata)</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          titleTemplate
                        </label>
                        <Input
                          value={metadataString(config.metadata, "titleTemplate")}
                          onChange={(event) =>
                            setMetadataField(index, "titleTemplate", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          reflectionQuestion
                        </label>
                        <Input
                          value={metadataString(config.metadata, "reflectionQuestion")}
                          onChange={(event) =>
                            setMetadataField(index, "reflectionQuestion", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          messageTemplate
                        </label>
                        <Textarea
                          rows={3}
                          value={metadataString(config.metadata, "messageTemplate")}
                          onChange={(event) =>
                            setMetadataField(index, "messageTemplate", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          microAction
                        </label>
                        <Textarea
                          rows={2}
                          value={metadataString(config.metadata, "microAction")}
                          onChange={(event) =>
                            setMetadataField(index, "microAction", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">Prompts de IA</div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateConfig(index, (prev) => ({
                            ...prev,
                            prompts: [...prev.prompts, createEmptyPrompt(prev.prompts.length)],
                          }))
                        }
                      >
                        Adicionar prompt
                      </Button>
                    </div>

                    {config.prompts.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Sem prompts cadastrados para este gatilho.
                      </div>
                    ) : (
                      config.prompts.map((prompt, promptIndex) => (
                        <div key={prompt.id || `${config.triggerId}-${promptIndex}`} className="rounded-lg border p-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Locale
                              </label>
                              <Input
                                value={prompt.locale}
                                onChange={(event) =>
                                  updateConfig(index, (prev) => ({
                                    ...prev,
                                    prompts: prev.prompts.map((item, itemIndex) =>
                                      itemIndex === promptIndex
                                        ? { ...item, locale: event.target.value }
                                        : item,
                                    ),
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Nome
                              </label>
                              <Input
                                value={prompt.name}
                                onChange={(event) =>
                                  updateConfig(index, (prev) => ({
                                    ...prev,
                                    prompts: prev.prompts.map((item, itemIndex) =>
                                      itemIndex === promptIndex
                                        ? { ...item, name: event.target.value }
                                        : item,
                                    ),
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              System prompt (opcional)
                            </label>
                            <Textarea
                              rows={2}
                              value={prompt.systemPrompt || ""}
                              onChange={(event) =>
                                updateConfig(index, (prev) => ({
                                  ...prev,
                                  prompts: prev.prompts.map((item, itemIndex) =>
                                    itemIndex === promptIndex
                                      ? { ...item, systemPrompt: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              Template do usuário
                            </label>
                            <Textarea
                              rows={4}
                              value={prompt.userPromptTemplate}
                              onChange={(event) =>
                                updateConfig(index, (prev) => ({
                                  ...prev,
                                  prompts: prev.prompts.map((item, itemIndex) =>
                                    itemIndex === promptIndex
                                      ? { ...item, userPromptTemplate: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={prompt.isActive}
                                onCheckedChange={(checked) =>
                                  updateConfig(index, (prev) => ({
                                    ...prev,
                                    prompts: prev.prompts.map((item, itemIndex) =>
                                      itemIndex === promptIndex
                                        ? { ...item, isActive: checked }
                                        : item,
                                    ),
                                  }))
                                }
                              />
                              Prompt ativo
                            </label>
                            <Button
                              variant="destructive"
                              onClick={() =>
                                updateConfig(index, (prev) => ({
                                  ...prev,
                                  prompts: prev.prompts.filter(
                                    (_, itemIndex) => itemIndex !== promptIndex,
                                  ),
                                }))
                              }
                            >
                              Remover prompt
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
