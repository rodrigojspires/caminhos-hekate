"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type AppScope = "CAMINHOS" | "MAHALILAH" | "SHARED"
type Tier = "FREE" | "INICIADO" | "ADEPTO" | "SACERDOCIO"
type Interval = "MONTHLY" | "QUARTERLY" | "YEARLY"

type Plan = {
  id: string
  name: string
  description: string
  tier: Tier
  appScope: AppScope
  interval: Interval
  intervalCount: number
  trialDays: number
  monthlyPrice: number
  yearlyPrice: number
  maxCourses: number | null
  maxDownloads: number | null
  features: unknown
  metadata?: unknown
  isActive: boolean
  usersCount?: number
}

type PlanForm = {
  name: string
  description: string
  tier: Tier
  appScope: AppScope
  interval: Interval
  intervalCount: string
  trialDays: string
  monthlyPrice: string
  yearlyPrice: string
  maxCourses: string
  maxDownloads: string
  isActive: boolean
  featuresJson: string
}

const EMPTY_FORM: PlanForm = {
  name: "",
  description: "",
  tier: "FREE",
  appScope: "CAMINHOS",
  interval: "MONTHLY",
  intervalCount: "1",
  trialDays: "0",
  monthlyPrice: "0",
  yearlyPrice: "0",
  maxCourses: "",
  maxDownloads: "",
  isActive: true,
  featuresJson: "{}",
}

const SCOPE_LABEL: Record<AppScope, string> = {
  CAMINHOS: "Caminhos",
  MAHALILAH: "Maha Lilah",
  SHARED: "Compartilhado",
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<"ALL" | AppScope>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM)

  const loadPlans = useCallback(async (scope = scopeFilter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        all: "true",
        includeUsage: "true",
        appScope: scope,
      })
      const res = await fetch(`/api/payments/plans?${params.toString()}`, {
        cache: "no-store",
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || "Falha ao carregar planos")
      setPlans(payload.data || [])
    } catch (error: any) {
      toast.error(error.message || "Falha ao carregar planos")
    } finally {
      setLoading(false)
    }
  }, [scopeFilter])

  useEffect(() => {
    void loadPlans(scopeFilter)
  }, [loadPlans, scopeFilter])

  const activePlansCount = useMemo(
    () => plans.filter((plan) => plan.isActive).length,
    [plans]
  )

  const openCreate = () => {
    setEditingPlan(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description || "",
      tier: plan.tier,
      appScope: plan.appScope,
      interval: plan.interval,
      intervalCount: String(plan.intervalCount ?? 1),
      trialDays: String(plan.trialDays ?? 0),
      monthlyPrice: String(Number(plan.monthlyPrice ?? 0)),
      yearlyPrice: String(Number(plan.yearlyPrice ?? 0)),
      maxCourses: plan.maxCourses == null ? "" : String(plan.maxCourses),
      maxDownloads: plan.maxDownloads == null ? "" : String(plan.maxDownloads),
      isActive: plan.isActive,
      featuresJson: JSON.stringify(plan.features || {}, null, 2),
    })
    setDialogOpen(true)
  }

  const submitForm = async () => {
    let parsedFeatures: unknown = {}
    try {
      parsedFeatures = form.featuresJson.trim() ? JSON.parse(form.featuresJson) : {}
    } catch {
      toast.error("O JSON de features é inválido.")
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      tier: form.tier,
      appScope: form.appScope,
      interval: form.interval,
      intervalCount: Number(form.intervalCount || "1"),
      trialDays: Number(form.trialDays || "0"),
      monthlyPrice: Number(form.monthlyPrice || "0"),
      yearlyPrice: Number(form.yearlyPrice || "0"),
      maxCourses: form.maxCourses.trim() === "" ? null : Number(form.maxCourses),
      maxDownloads: form.maxDownloads.trim() === "" ? null : Number(form.maxDownloads),
      isActive: form.isActive,
      features: parsedFeatures,
    }

    if (!payload.name || !payload.description) {
      toast.error("Nome e descrição são obrigatórios.")
      return
    }

    setSaving(true)
    try {
      const endpoint = editingPlan
        ? `/api/payments/plans/${editingPlan.id}`
        : "/api/payments/plans"
      const method = editingPlan ? "PUT" : "POST"
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const response = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(response.error || "Falha ao salvar plano")
      toast.success(editingPlan ? "Plano atualizado." : "Plano criado.")
      setDialogOpen(false)
      await loadPlans(scopeFilter)
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar plano")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (plan: Plan) => {
    try {
      const res = await fetch(`/api/payments/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Falha ao alterar status")
      toast.success(plan.isActive ? "Plano desativado." : "Plano ativado.")
      await loadPlans(scopeFilter)
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status")
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Planos de assinatura</CardTitle>
            <Button onClick={openCreate}>Adicionar plano</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={scopeFilter} onValueChange={(value: "ALL" | AppScope) => setScopeFilter(value)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os escopos</SelectItem>
                <SelectItem value="CAMINHOS">Caminhos</SelectItem>
                <SelectItem value="MAHALILAH">Maha Lilah</SelectItem>
                <SelectItem value="SHARED">Compartilhado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => void loadPlans(scopeFilter)}>
              Atualizar
            </Button>
            <span className="text-sm text-muted-foreground">
              {activePlansCount} plano(s) ativo(s)
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando planos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum plano encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {plan.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{SCOPE_LABEL[plan.appScope]}</Badge>
                      </TableCell>
                      <TableCell>{plan.tier}</TableCell>
                      <TableCell>
                        <div>R$ {Number(plan.monthlyPrice).toFixed(2)}/mês</div>
                        <div className="text-xs text-muted-foreground">
                          R$ {Number(plan.yearlyPrice).toFixed(2)}/ano
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.interval} x {plan.intervalCount}
                      </TableCell>
                      <TableCell>
                        <strong>{plan.usersCount ?? 0}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge className={plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
                          {plan.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => void toggleActive(plan)}>
                          {plan.isActive ? "Desativar" : "Ativar"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar plano" : "Adicionar plano"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nome do plano"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrição comercial do plano"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Escopo</label>
              <Select value={form.appScope} onValueChange={(value: AppScope) => setForm((prev) => ({ ...prev, appScope: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAMINHOS">Caminhos</SelectItem>
                  <SelectItem value="MAHALILAH">Maha Lilah</SelectItem>
                  <SelectItem value="SHARED">Compartilhado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={form.tier} onValueChange={(value: Tier) => setForm((prev) => ({ ...prev, tier: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="INICIADO">INICIADO</SelectItem>
                  <SelectItem value="ADEPTO">ADEPTO</SelectItem>
                  <SelectItem value="SACERDOCIO">SACERDOCIO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preço mensal (R$)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.monthlyPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preço anual (R$)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.yearlyPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, yearlyPrice: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Intervalo</label>
              <Select value={form.interval} onValueChange={(value: Interval) => setForm((prev) => ({ ...prev, interval: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                  <SelectItem value="QUARTERLY">QUARTERLY</SelectItem>
                  <SelectItem value="YEARLY">YEARLY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Interval Count</label>
              <Input
                type="number"
                min={1}
                value={form.intervalCount}
                onChange={(event) => setForm((prev) => ({ ...prev, intervalCount: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trial (dias)</label>
              <Input
                type="number"
                min={0}
                value={form.trialDays}
                onChange={(event) => setForm((prev) => ({ ...prev, trialDays: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max cursos</label>
              <Input
                type="number"
                placeholder="vazio = sem limite definido"
                value={form.maxCourses}
                onChange={(event) => setForm((prev) => ({ ...prev, maxCourses: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max downloads</label>
              <Input
                type="number"
                placeholder="vazio = sem limite definido"
                value={form.maxDownloads}
                onChange={(event) => setForm((prev) => ({ ...prev, maxDownloads: event.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Features (JSON)</label>
              <Textarea
                value={form.featuresJson}
                onChange={(event) => setForm((prev) => ({ ...prev, featuresJson: event.target.value }))}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
              />
              <span className="text-sm text-muted-foreground">
                Plano ativo
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void submitForm()} disabled={saving}>
              {saving ? "Salvando..." : editingPlan ? "Salvar alterações" : "Criar plano"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
