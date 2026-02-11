"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/components/admin/SearchInput";
import { LoadingSpinner } from "@/components/admin/LoadingSpinner";

type Deck = {
  id: string;
  name: string;
  imageDirectory: string;
  imageExtension: string;
  useInMahaLilah: boolean;
  cardsCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/mahalilah/decks");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao carregar baralhos");
        return;
      }

      setDecks(Array.isArray(data.decks) ? data.decks : []);
    } catch {
      toast.error("Erro ao carregar baralhos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const filteredDecks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return decks;

    return decks.filter((deck) => {
      const normalized = `${deck.name} ${deck.imageDirectory}`.toLowerCase();
      return normalized.includes(query);
    });
  }, [decks, search]);

  const handleDelete = async (deck: Deck) => {
    const confirmed = window.confirm(
      `Excluir o baralho "${deck.name}" e todas as cartas?`,
    );
    if (!confirmed) return;

    try {
      setDeletingDeckId(deck.id);
      const response = await fetch(`/api/admin/mahalilah/decks/${deck.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao excluir baralho");
        return;
      }

      toast.success(data.message || "Baralho excluido");
      await fetchDecks();
    } catch {
      toast.error("Erro ao excluir baralho");
    } finally {
      setDeletingDeckId(null);
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Baralhos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Cadastre o baralho e depois gerencie cartas na tela de edicao.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/mahalilah/baralhos/new")}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Baralho
        </button>
      </div>

      <div className="max-w-xl">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou diretorio..."
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="mb-4">Nenhum baralho encontrado</p>
          <Link
            href="/admin/mahalilah/baralhos/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Criar Primeiro Baralho
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Baralho
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Diretorio
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Maha Lilah
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cartas
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Atualizado
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDecks.map((deck) => (
                <tr
                  key={deck.id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{deck.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      .{deck.imageExtension}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">{deck.imageDirectory}</code>
                  </td>
                  <td className="px-4 py-3">
                    {deck.useInMahaLilah ? "Sim" : "Nao"}
                  </td>
                  <td className="px-4 py-3">{deck.cardsCount}</td>
                  <td className="px-4 py-3">
                    {new Date(deck.updatedAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          router.push(`/admin/mahalilah/baralhos/${deck.id}`)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(deck)}
                        disabled={deletingDeckId === deck.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingDeckId === deck.id
                          ? "Excluindo..."
                          : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
