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

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mahalilah/payments/history?page=${targetPage}&limit=20`,
        { cache: "no-store" },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Não foi possível carregar as faturas.");
        return;
      }
      setInvoices(Array.isArray(payload.payments) ? payload.payments : []);
      setPage(payload.page || 1);
      setTotalPages(payload.totalPages || 1);
    } catch {
      setError("Não foi possível carregar as faturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="card" style={{ display: "grid", gap: 14 }}>
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
