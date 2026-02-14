"use client";

import { useCallback, useEffect, useState } from "react";

type Invoice = {
  id: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  description?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  reasonKind?: string;
  reasonLabel?: string;
  planLabel?: string;
  billingInterval?: string;
  billingReason?: string;
  validityStart?: string;
  validityEnd?: string;
  createdAt: string;
  paidAt?: string;
  subscription?: { id: string; plan?: { name?: string } };
};

type InvoiceFilters = {
  status: string;
  reason: string;
  from: string;
  to: string;
};

type CurrentSubscription = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  planName?: string;
};

function formatBillingInterval(interval?: string) {
  if (interval === "MONTHLY") return "Mensal";
  if (interval === "YEARLY") return "Anual";
  return interval || "—";
}

function formatBillingReason(reason?: string) {
  if (reason === "INITIAL") return "Primeira cobrança";
  if (reason === "RENEWAL") return "Renovação";
  return reason || "—";
}

export function FaturasClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: "",
    reason: "",
    from: "",
    to: "",
  });
  const [activeFilters, setActiveFilters] = useState<InvoiceFilters>({
    status: "",
    reason: "",
    from: "",
    to: "",
  });
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null);

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
      });
      if (activeFilters.status) params.set("status", activeFilters.status);
      if (activeFilters.reason) params.set("reason", activeFilters.reason);
      if (activeFilters.from) params.set("from", activeFilters.from);
      if (activeFilters.to) params.set("to", activeFilters.to);

      const res = await fetch(
        `/api/mahalilah/payments/history?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Não foi possível carregar as faturas.");
        return;
      }
      setInvoices(Array.isArray(payload.payments) ? payload.payments : []);
      setCurrentSubscription(payload.currentSubscription || null);
      setPage(payload.page || 1);
      setTotalPages(payload.totalPages || 1);
    } catch {
      setError("Não foi possível carregar as faturas.");
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    void load(1);
  }, [load, activeFilters]);

  const handleCancelSubscription = async () => {
    if (!currentSubscription || cancelingSubscription) return;

    const confirmCancel = window.confirm(
      "Tem certeza que deseja cancelar sua assinatura?\n\nNão há reembolso e o acesso permanece até a data de vencimento atual.",
    );
    if (!confirmCancel) return;

    setCancelingSubscription(true);
    setSubscriptionNotice(null);

    try {
      const res = await fetch("/api/mahalilah/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: currentSubscription.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubscriptionNotice(
          payload.error || "Não foi possível cancelar sua assinatura.",
        );
        return;
      }

      setSubscriptionNotice(
        payload.message ||
          "Assinatura cancelada. Seu acesso permanece até o vencimento.",
      );
      await load(page);
    } catch {
      setSubscriptionNotice("Não foi possível cancelar sua assinatura.");
    } finally {
      setCancelingSubscription(false);
    }
  };

  return (
    <div className="card" style={{ display: "grid", gap: 14 }}>
      {currentSubscription && (
        <div
          className="notice"
          style={{
            display: "grid",
            gap: 8,
            borderColor: "rgba(217, 164, 65, 0.45)",
            background: "rgba(217, 164, 65, 0.08)",
          }}
        >
          <strong>Assinatura ativa</strong>
          <span className="small-muted">
            Plano: <strong>{currentSubscription.planName || "Assinatura Maha Lilah"}</strong>
          </span>
          <span className="small-muted">
            Política de cancelamento: não há reembolso. O acesso permanece até{" "}
            <strong>
              {currentSubscription.currentPeriodEnd
                ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString(
                    "pt-BR",
                  )
                : "o vencimento vigente"}
            </strong>
            .
          </span>
          {currentSubscription.cancelAtPeriodEnd ? (
            <span className="small-muted">
              Cancelamento já programado para o fim do ciclo.
            </span>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn-secondary"
                onClick={() => void handleCancelSubscription()}
                disabled={cancelingSubscription}
              >
                {cancelingSubscription
                  ? "Cancelando assinatura..."
                  : "Cancelar assinatura"}
              </button>
            </div>
          )}
          {subscriptionNotice ? (
            <span className="small-muted">{subscriptionNotice}</span>
          ) : null}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
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
            <option value="PENDING">Pendente</option>
            <option value="PROCESSING">Processando</option>
            <option value="COMPLETED">Concluído</option>
            <option value="FAILED">Falhou</option>
            <option value="CANCELED">Cancelado</option>
            <option value="REFUNDED">Reembolsado</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Motivo</span>
          <select
            value={filters.reason}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, reason: event.target.value }))
            }
          >
            <option value="">Todos</option>
            <option value="single_session">Compra avulsa</option>
            <option value="plan">Plano</option>
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
          className="btn-secondary"
          onClick={() => {
            setPage(1);
            setActiveFilters({ ...filters });
          }}
          disabled={loading}
        >
          Aplicar filtros
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            const empty = { status: "", reason: "", from: "", to: "" };
            setFilters(empty);
            setPage(1);
            setActiveFilters({ ...empty });
          }}
          disabled={loading}
        >
          Limpar filtros
        </button>
      </div>

      {loading ? (
        <span className="small-muted">Carregando faturas...</span>
      ) : error ? (
        <span className="small-muted">{error}</span>
      ) : invoices.length === 0 ? (
        <span className="small-muted">Nenhuma fatura encontrada.</span>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {invoices.map((invoice) => (
            <div key={invoice.id} className="notice" style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="pill">
                  Motivo:{" "}
                  <strong>{invoice.reasonLabel || invoice.description || "Pagamento"}</strong>
                </span>
                {invoice.planLabel && (
                  <span className="pill">
                    Plano: <strong>{invoice.planLabel}</strong>
                  </span>
                )}
                {invoice.reasonLabel === "Plano" && (
                  <>
                    <span className="pill">
                      Ciclo: <strong>{formatBillingInterval(invoice.billingInterval)}</strong>
                    </span>
                    <span className="pill">
                      Cobrança: <strong>{formatBillingReason(invoice.billingReason)}</strong>
                    </span>
                  </>
                )}
                <span className="pill">
                  Valor: <strong>R$ {Number(invoice.amount || 0).toFixed(2)}</strong>
                </span>
                <span className="pill">
                  Status: <strong>{invoice.status}</strong>
                </span>
                <span className="pill">
                  Método: <strong>{invoice.paymentMethod || "—"}</strong>
                </span>
              </div>
              <span className="small-muted">
                {new Date(invoice.createdAt).toLocaleString("pt-BR")}
              </span>
              {invoice.reasonLabel === "Plano" &&
                (invoice.validityStart || invoice.validityEnd) && (
                  <span className="small-muted">
                    Vigência do plano:{" "}
                    <strong>
                      {invoice.validityStart
                        ? new Date(invoice.validityStart).toLocaleDateString("pt-BR")
                        : "—"}
                    </strong>{" "}
                    até{" "}
                    <strong>
                      {invoice.validityEnd
                        ? new Date(invoice.validityEnd).toLocaleDateString("pt-BR")
                        : "—"}
                    </strong>
                  </span>
                )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {invoice.invoiceUrl && (
                  <button
                    className="btn-secondary"
                    onClick={() => window.open(invoice.invoiceUrl, "_blank")}
                  >
                    Ver cobrança
                  </button>
                )}
                {invoice.receiptUrl && (
                  <button
                    className="btn-secondary"
                    onClick={() => window.open(invoice.receiptUrl, "_blank")}
                  >
                    Ver recibo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn-secondary"
          disabled={loading || page <= 1}
          onClick={() => void load(page - 1)}
        >
          Anterior
        </button>
        <span className="small-muted">
          Página {page} de {totalPages}
        </span>
        <button
          className="btn-secondary"
          disabled={loading || page >= totalPages}
          onClick={() => void load(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
