"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/admin/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DeckEditPageProps {
  params: {
    id: string;
  };
}

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

type DeckCard = {
  id: string;
  deckId: string;
  cardNumber: number;
  description: string;
  keywords: string;
  observation: string | null;
};

type DeckForm = {
  name: string;
  imageDirectory: string;
  imageExtension: string;
  useInMahaLilah: boolean;
};

type CardForm = {
  cardNumber: string;
  description: string;
  keywords: string;
  observation: string;
};

const emptyCardForm: CardForm = {
  cardNumber: "",
  description: "",
  keywords: "",
  observation: "",
};

const CARD_IMPORT_JSON_TEMPLATE = JSON.stringify(
  {
    cards: [
      {
        cardNumber: 1,
        description: "Descritivo da carta",
        keywords: "palavra-chave 1; palavra-chave 2",
        observation: "Observacao opcional",
      },
      {
        cardNumber: 2,
        description: "Outro descritivo da carta",
        keywords: "palavra-chave 3; palavra-chave 4",
        observation: "",
      },
    ],
  },
  null,
  2,
);

const CARD_IMPORT_CSV_TEMPLATE = [
  "cardNumber,description,keywords,observation",
  '1,"Descritivo da carta","palavra-chave 1; palavra-chave 2","Observacao opcional"',
  '2,"Outro descritivo da carta","palavra-chave 3; palavra-chave 4",""',
].join("\n");

export default function DeckEditPage({ params }: DeckEditPageProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingDeck, setSavingDeck] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [formData, setFormData] = useState<DeckForm | null>(null);

  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);

  const [importing, setImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");

  const [deckImageFiles, setDeckImageFiles] = useState<string[]>([]);
  const [loadingDeckImages, setLoadingDeckImages] = useState(false);
  const [uploadingDeckImages, setUploadingDeckImages] = useState(false);
  const [deletingDeckImageName, setDeletingDeckImageName] = useState<
    string | null
  >(null);
  const [deletingAllDeckImages, setDeletingAllDeckImages] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const loadDeck = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/mahalilah/decks/${params.id}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.deck) {
        toast.error(data.error || "Baralho nao encontrado");
        router.push("/admin/mahalilah/baralhos");
        return;
      }

      const deckData = data.deck as Deck;
      setDeck(deckData);
      setFormData({
        name: deckData.name,
        imageDirectory: deckData.imageDirectory,
        imageExtension: deckData.imageExtension,
        useInMahaLilah: deckData.useInMahaLilah,
      });
    } catch {
      toast.error("Erro ao carregar baralho");
      router.push("/admin/mahalilah/baralhos");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  const loadCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      const response = await fetch(
        `/api/admin/mahalilah/decks/${params.id}/cards`,
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao carregar cartas");
        return;
      }

      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      toast.error("Erro ao carregar cartas");
    } finally {
      setLoadingCards(false);
    }
  }, [params.id]);

  const loadDeckImages = useCallback(async () => {
    try {
      setLoadingDeckImages(true);
      const response = await fetch(
        `/api/admin/mahalilah/decks/${params.id}/images`,
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao carregar imagens");
        return;
      }

      setDeckImageFiles(Array.isArray(data.files) ? data.files : []);
    } catch {
      toast.error("Erro ao carregar imagens");
    } finally {
      setLoadingDeckImages(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadDeck();
    loadCards();
    loadDeckImages();
  }, [loadDeck, loadCards, loadDeckImages]);

  const handleSaveDeck = async () => {
    if (!deck || !formData) return;
    if (!formData.name.trim()) {
      toast.error("Nome do baralho e obrigatorio");
      return;
    }

    try {
      setSavingDeck(true);
      const response = await fetch(`/api/admin/mahalilah/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          imageExtension: formData.imageExtension,
          useInMahaLilah: formData.useInMahaLilah,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao atualizar baralho");
        return;
      }

      toast.success("Baralho atualizado");
      await loadDeck();
    } catch {
      toast.error("Erro ao atualizar baralho");
    } finally {
      setSavingDeck(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deck) return;
    const confirmed = window.confirm(
      `Excluir o baralho "${deck.name}" e todas as cartas?`,
    );
    if (!confirmed) return;

    try {
      setDeletingDeck(true);
      const response = await fetch(`/api/admin/mahalilah/decks/${deck.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao excluir baralho");
        return;
      }

      toast.success(data.message || "Baralho excluido");
      router.push("/admin/mahalilah/baralhos");
    } catch {
      toast.error("Erro ao excluir baralho");
    } finally {
      setDeletingDeck(false);
    }
  };

  const handleSaveCard = async () => {
    if (!deck) return;
    if (
      !cardForm.cardNumber ||
      !cardForm.description.trim() ||
      !cardForm.keywords.trim()
    ) {
      toast.error("Preencha numero, descritivo e palavra-chave");
      return;
    }

    const payload = {
      cardNumber: Number(cardForm.cardNumber),
      description: cardForm.description,
      keywords: cardForm.keywords,
      observation: cardForm.observation || null,
    };

    const endpoint = editingCardId
      ? `/api/admin/mahalilah/decks/${deck.id}/cards/${editingCardId}`
      : `/api/admin/mahalilah/decks/${deck.id}/cards`;
    const method = editingCardId ? "PATCH" : "POST";

    try {
      setSavingCard(true);
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao salvar carta");
        return;
      }

      toast.success(editingCardId ? "Carta atualizada" : "Carta criada");
      setCardForm(emptyCardForm);
      setEditingCardId(null);
      await loadCards();
      await loadDeck();
    } catch {
      toast.error("Erro ao salvar carta");
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (card: DeckCard) => {
    if (!deck) return;
    const confirmed = window.confirm(`Excluir a carta #${card.cardNumber}?`);
    if (!confirmed) return;

    try {
      setDeletingCardId(card.id);
      const response = await fetch(
        `/api/admin/mahalilah/decks/${deck.id}/cards/${card.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao excluir carta");
        return;
      }

      toast.success(data.message || "Carta excluida");
      await loadCards();
      await loadDeck();
    } catch {
      toast.error("Erro ao excluir carta");
    } finally {
      setDeletingCardId(null);
    }
  };

  const handleImport = async () => {
    if (!deck) return;
    const textContent = importFile
      ? await importFile.text()
      : importText.trim();
    if (!textContent) {
      toast.error("Selecione um arquivo ou cole o conteudo para importar");
      return;
    }

    try {
      setImporting(true);
      const detectedFormat = importFile?.name.toLowerCase().endsWith(".csv")
        ? "csv"
        : importFormat;

      const response = await fetch(
        `/api/admin/mahalilah/decks/${deck.id}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: detectedFormat,
            content: textContent,
            replaceExisting,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro na importacao");
        return;
      }

      toast.success(
        `Importacao concluida. Inseridas: ${data.inserted || 0} • Atualizadas: ${data.updated || 0}`,
      );
      setImportFile(null);
      setImportText("");
      await loadCards();
      await loadDeck();
    } catch {
      toast.error("Erro na importacao");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadImportTemplate = (format: "json" | "csv") => {
    const content =
      format === "json" ? CARD_IMPORT_JSON_TEMPLATE : CARD_IMPORT_CSV_TEMPLATE;
    const blob = new Blob([content], {
      type:
        format === "json"
          ? "application/json;charset=utf-8"
          : "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (deck?.name || "baralho")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    link.href = url;
    link.download = `modelo-cartas-${safeName || "baralho"}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadDeckImages = async () => {
    if (!deck) return;
    if (uploadFiles.length === 0) {
      toast.error("Selecione pelo menos uma imagem");
      return;
    }

    try {
      setUploadingDeckImages(true);
      const formDataUpload = new FormData();
      uploadFiles.forEach((file) => formDataUpload.append("files", file));

      const response = await fetch(
        `/api/admin/mahalilah/decks/${deck.id}/images`,
        {
          method: "POST",
          body: formDataUpload,
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao enviar imagens");
        return;
      }

      toast.success(data.message || "Imagens enviadas com sucesso");
      if (Array.isArray(data.skipped) && data.skipped.length > 0) {
        toast.warning(`Arquivos ignorados: ${data.skipped.join(", ")}`);
      }
      setUploadFiles([]);
      await loadDeckImages();
    } catch {
      toast.error("Erro ao enviar imagens");
    } finally {
      setUploadingDeckImages(false);
    }
  };

  const handleDeleteDeckImage = async (fileName: string) => {
    if (!deck) return;
    const confirmed = window.confirm(`Excluir o arquivo "${fileName}"?`);
    if (!confirmed) return;

    try {
      setDeletingDeckImageName(fileName);
      const response = await fetch(
        `/api/admin/mahalilah/decks/${deck.id}/images?file=${encodeURIComponent(fileName)}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao excluir arquivo");
        return;
      }

      toast.success(data.message || "Arquivo excluido");
      await loadDeckImages();
    } catch {
      toast.error("Erro ao excluir arquivo");
    } finally {
      setDeletingDeckImageName(null);
    }
  };

  const handleDeleteAllDeckImages = async () => {
    if (!deck || deckImageFiles.length === 0) return;
    const confirmed = window.confirm(
      `Apagar todos os ${deckImageFiles.length} arquivo(s) deste baralho?`,
    );
    if (!confirmed) return;

    try {
      setDeletingAllDeckImages(true);
      const response = await fetch(
        `/api/admin/mahalilah/decks/${deck.id}/images?all=true`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao apagar arquivos");
        return;
      }

      toast.success(data.message || "Arquivos apagados");
      await loadDeckImages();
    } catch {
      toast.error("Erro ao apagar arquivos");
    } finally {
      setDeletingAllDeckImages(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!deck || !formData) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-300">
        Baralho nao encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/mahalilah/baralhos")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Editar Baralho
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{deck.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteDeck}
            disabled={deletingDeck}
            className="flex items-center gap-2 px-4 py-2 text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            {deletingDeck ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Excluir
          </button>

          <button
            onClick={handleSaveDeck}
            disabled={savingDeck}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {savingDeck ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alteracoes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Cartas cadastradas
          </div>
          <p className="text-2xl font-bold mt-1">{cards.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Atualizado em
          </div>
          <p className="text-sm font-medium mt-1">
            {new Date(deck.updatedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Diretorio de imagens
          </div>
          <code className="text-xs mt-1 block">{deck.imageDirectory}</code>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="cards">Cartas</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="images">Imagens</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <input
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev,
                  )
                }
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Diretorio das imagens
                </label>
                <input
                  value={formData.imageDirectory}
                  disabled
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Campo fixo apos a criacao do baralho.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Extensao da imagem
                </label>
                <input
                  value={formData.imageExtension}
                  onChange={(event) =>
                    setFormData((prev) =>
                      prev
                        ? {
                            ...prev,
                            imageExtension: event.target.value.replace(
                              /^\./,
                              "",
                            ),
                          }
                        : prev,
                    )
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Usar no Maha Lilah</label>
              <label className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 px-3 flex items-center gap-2 text-sm w-fit pr-4">
                <input
                  type="checkbox"
                  checked={formData.useInMahaLilah}
                  onChange={(event) =>
                    setFormData((prev) =>
                      prev
                        ? {
                            ...prev,
                            useInMahaLilah: event.target.checked,
                          }
                        : prev,
                    )
                  }
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                {formData.useInMahaLilah ? "Sim" : "Nao"}
              </label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="font-semibold">
              {editingCardId ? "Editar carta" : "Cadastrar carta"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Numero</label>
                <input
                  type="number"
                  min={1}
                  value={cardForm.cardNumber}
                  onChange={(event) =>
                    setCardForm((prev) => ({
                      ...prev,
                      cardNumber: event.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-medium">Palavra-chave</label>
                <input
                  value={cardForm.keywords}
                  onChange={(event) =>
                    setCardForm((prev) => ({
                      ...prev,
                      keywords: event.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descritivo</label>
              <textarea
                value={cardForm.description}
                onChange={(event) =>
                  setCardForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observacao</label>
              <textarea
                value={cardForm.observation}
                onChange={(event) =>
                  setCardForm((prev) => ({
                    ...prev,
                    observation: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCard}
                disabled={savingCard}
                className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingCard ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingCardId ? "Atualizar Carta" : "Criar Carta"}
              </button>
              {editingCardId && (
                <button
                  onClick={() => {
                    setEditingCardId(null);
                    setCardForm(emptyCardForm);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            {loadingCards ? (
              <div className="flex items-center justify-center h-40">
                <LoadingSpinner size="lg" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                Nenhuma carta cadastrada.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Numero
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Palavra-chave
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Descritivo
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr
                      key={card.id}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <td className="px-4 py-3">#{card.cardNumber}</td>
                      <td className="px-4 py-3">{card.keywords}</td>
                      <td
                        className="px-4 py-3 max-w-[560px] truncate"
                        title={card.description}
                      >
                        {card.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCardId(card.id);
                              setCardForm({
                                cardNumber: String(card.cardNumber),
                                description: card.description,
                                keywords: card.keywords,
                                observation: card.observation || "",
                              });
                            }}
                            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card)}
                            disabled={deletingCardId === card.id}
                            className="px-3 py-1.5 text-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                          >
                            {deletingCardId === card.id
                              ? "Excluindo..."
                              : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="import">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="font-semibold">Importar cartas (JSON/CSV)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Baixe um modelo, preencha as cartas e importe o arquivo.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadImportTemplate("json")}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download className="w-4 h-4" />
                Baixar modelo JSON
              </button>
              <button
                type="button"
                onClick={() => handleDownloadImportTemplate("csv")}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download className="w-4 h-4" />
                Baixar modelo CSV
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Colunas esperadas:{" "}
              <code>cardNumber,description,keywords,observation</code>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo</label>
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  onChange={(event) =>
                    setImportFile(event.target.files?.[0] || null)
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm pt-1.5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Formato do texto colado
                </label>
                <select
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                  value={importFormat}
                  onChange={(event) =>
                    setImportFormat(event.target.value as "json" | "csv")
                  }
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <label className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 px-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                Substituir existentes
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ou cole JSON/CSV</label>
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Cole aqui o conteudo JSON ou CSV..."
                rows={8}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Importar Cartas
            </button>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="font-semibold">Imagens do baralho</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Diretorio: <code>{deck.imageDirectory}</code>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_auto] gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Selecionar multiplas imagens
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) =>
                    setUploadFiles(Array.from(event.target.files || []))
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm pt-1.5"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadFiles.length > 0
                    ? `${uploadFiles.length} arquivo(s) selecionado(s).`
                    : "Nenhum arquivo selecionado."}
                </p>
              </div>

              <button
                onClick={handleUploadDeckImages}
                disabled={uploadingDeckImages}
                className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploadingDeckImages ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enviar Imagens
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Arquivos no diretorio</div>
                <button
                  type="button"
                  onClick={handleDeleteAllDeckImages}
                  disabled={deletingAllDeckImages || deckImageFiles.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                >
                  {deletingAllDeckImages ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Apagar tudo
                </button>
              </div>
              {loadingDeckImages ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Carregando imagens...
                </div>
              ) : deckImageFiles.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma imagem enviada ainda.
                </div>
              ) : (
                <div className="grid gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 max-h-56 overflow-auto">
                  {deckImageFiles.map((fileName) => (
                    <div
                      key={fileName}
                      className="flex items-center justify-between gap-3"
                    >
                      <code className="text-xs">{fileName}</code>
                      <button
                        type="button"
                        onClick={() => handleDeleteDeckImage(fileName)}
                        disabled={
                          deletingAllDeckImages ||
                          deletingDeckImageName === fileName
                        }
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30 disabled:opacity-50"
                        aria-label={`Excluir ${fileName}`}
                        title={`Excluir ${fileName}`}
                      >
                        {deletingDeckImageName === fileName ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
