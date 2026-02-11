"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function AdminMahaLilahDecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [createDeckForm, setCreateDeckForm] = useState<DeckForm>({
    name: "",
    imageDirectory: "",
    imageExtension: "jpg",
    useInMahaLilah: true,
  });
  const [editDeckForm, setEditDeckForm] = useState<DeckForm | null>(null);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [savingDeck, setSavingDeck] = useState(false);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);

  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) || null,
    [decks, selectedDeckId],
  );

  const loadDecks = async () => {
    setLoadingDecks(true);
    const res = await fetch("/api/admin/mahalilah/decks");
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao carregar baralhos.");
      setLoadingDecks(false);
      return;
    }

    const nextDecks = payload.decks || [];
    setDecks(nextDecks);
    setLoadingDecks(false);

    setSelectedDeckId((prev) => {
      if (prev && nextDecks.some((deck: Deck) => deck.id === prev)) return prev;
      return nextDecks[0]?.id || "";
    });
  };

  const loadCards = async (deckId: string) => {
    if (!deckId) {
      setCards([]);
      return;
    }

    setLoadingCards(true);
    const res = await fetch(`/api/admin/mahalilah/decks/${deckId}/cards`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao carregar cartas.");
      setLoadingCards(false);
      return;
    }
    setCards(payload.cards || []);
    setLoadingCards(false);
  };

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    if (!selectedDeckId) {
      setCards([]);
      return;
    }

    const deck = decks.find((item) => item.id === selectedDeckId);
    if (!deck) return;

    setEditDeckForm({
      name: deck.name,
      imageDirectory: deck.imageDirectory,
      imageExtension: deck.imageExtension,
      useInMahaLilah: deck.useInMahaLilah,
    });
    setCardForm(emptyCardForm);
    setEditingCardId(null);
    loadCards(deck.id);
  }, [decks, selectedDeckId]);

  const handleCreateDeck = async () => {
    if (!createDeckForm.name.trim() || !createDeckForm.imageDirectory.trim()) {
      toast.error("Preencha nome e diretório das imagens.");
      return;
    }

    setCreatingDeck(true);
    const res = await fetch("/api/admin/mahalilah/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDeckForm),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao criar baralho.");
      setCreatingDeck(false);
      return;
    }

    toast.success("Baralho criado com sucesso.");
    setCreateDeckForm({
      name: "",
      imageDirectory: "",
      imageExtension: "jpg",
      useInMahaLilah: true,
    });
    await loadDecks();
    if (payload.deck?.id) setSelectedDeckId(payload.deck.id);
    setCreatingDeck(false);
  };

  const handleSaveDeck = async () => {
    if (!selectedDeck || !editDeckForm) return;
    setSavingDeck(true);

    const res = await fetch(`/api/admin/mahalilah/decks/${selectedDeck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDeckForm),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao atualizar baralho.");
      setSavingDeck(false);
      return;
    }

    toast.success("Baralho atualizado.");
    await loadDecks();
    setSavingDeck(false);
  };

  const handleDeleteDeck = async (deck: Deck) => {
    const confirmed = window.confirm(
      `Excluir o baralho "${deck.name}" e todas as cartas?`,
    );
    if (!confirmed) return;

    setDeletingDeckId(deck.id);
    const res = await fetch(`/api/admin/mahalilah/decks/${deck.id}`, {
      method: "DELETE",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao excluir baralho.");
      setDeletingDeckId(null);
      return;
    }

    toast.success(payload.message || "Baralho excluído.");
    await loadDecks();
    setDeletingDeckId(null);
  };

  const handleSaveCard = async () => {
    if (!selectedDeck) return;
    if (
      !cardForm.cardNumber ||
      !cardForm.description.trim() ||
      !cardForm.keywords.trim()
    ) {
      toast.error("Preencha número, descritivo e palavra-chave.");
      return;
    }

    setSavingCard(true);
    const payload = {
      cardNumber: Number(cardForm.cardNumber),
      description: cardForm.description,
      keywords: cardForm.keywords,
      observation: cardForm.observation || null,
    };

    const endpoint = editingCardId
      ? `/api/admin/mahalilah/decks/${selectedDeck.id}/cards/${editingCardId}`
      : `/api/admin/mahalilah/decks/${selectedDeck.id}/cards`;
    const method = editingCardId ? "PATCH" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error || "Erro ao salvar carta.");
      setSavingCard(false);
      return;
    }

    toast.success(editingCardId ? "Carta atualizada." : "Carta criada.");
    setCardForm(emptyCardForm);
    setEditingCardId(null);
    await loadCards(selectedDeck.id);
    await loadDecks();
    setSavingCard(false);
  };

  const handleDeleteCard = async (card: DeckCard) => {
    if (!selectedDeck) return;
    const confirmed = window.confirm(`Excluir a carta #${card.cardNumber}?`);
    if (!confirmed) return;

    setDeletingCardId(card.id);
    const res = await fetch(
      `/api/admin/mahalilah/decks/${selectedDeck.id}/cards/${card.id}`,
      {
        method: "DELETE",
      },
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro ao excluir carta.");
      setDeletingCardId(null);
      return;
    }

    toast.success(payload.message || "Carta excluída.");
    await loadCards(selectedDeck.id);
    await loadDecks();
    setDeletingCardId(null);
  };

  const handleImport = async () => {
    if (!selectedDeck) return;
    const textContent = importFile
      ? await importFile.text()
      : importText.trim();
    if (!textContent) {
      toast.error("Selecione um arquivo ou cole o conteúdo para importar.");
      return;
    }

    const detectedFormat = importFile?.name.toLowerCase().endsWith(".csv")
      ? "csv"
      : importFormat;

    setImporting(true);
    const res = await fetch(
      `/api/admin/mahalilah/decks/${selectedDeck.id}/import`,
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
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || "Erro na importação.");
      setImporting(false);
      return;
    }

    toast.success(
      `Importação concluída. Inseridas: ${payload.inserted || 0} • Atualizadas: ${payload.updated || 0}`,
    );
    setImportFile(null);
    setImportText("");
    await loadCards(selectedDeck.id);
    await loadDecks();
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Maha Lilah", href: "/admin/mahalilah" },
          { label: "Baralhos", current: true },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de baralhos</CardTitle>
          <CardDescription>
            Estrutura reutilizável para Maha Lilah e Caminhos de Hekate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1.2fr_2fr_auto_auto] items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={createDeckForm.name}
              onChange={(event) =>
                setCreateDeckForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Ex.: Oráculo Terapêutico"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Diretório das imagens</label>
            <Input
              value={createDeckForm.imageDirectory}
              onChange={(event) =>
                setCreateDeckForm((prev) => ({
                  ...prev,
                  imageDirectory: event.target.value,
                }))
              }
              placeholder="https://cdn.meusite.com/baralhos/oraculo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Extensão</label>
            <Input
              value={createDeckForm.imageExtension}
              onChange={(event) =>
                setCreateDeckForm((prev) => ({
                  ...prev,
                  imageExtension: event.target.value,
                }))
              }
              placeholder="jpg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Usar no Maha Lilah</label>
            <div className="flex h-10 items-center gap-3 rounded-md border px-3">
              <Switch
                checked={createDeckForm.useInMahaLilah}
                onCheckedChange={(checked) =>
                  setCreateDeckForm((prev) => ({
                    ...prev,
                    useInMahaLilah: checked,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">
                {createDeckForm.useInMahaLilah ? "Sim" : "Não"}
              </span>
            </div>
          </div>
          <Button onClick={handleCreateDeck} disabled={creatingDeck}>
            {creatingDeck ? "Criando..." : "Criar baralho"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baralhos cadastrados</CardTitle>
          <CardDescription>
            Selecione um baralho para gerenciar cartas ou importar lote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDecks ? (
            <div className="text-sm text-muted-foreground">
              Carregando baralhos...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Maha Lilah</TableHead>
                  <TableHead>Cartas</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      Nenhum baralho cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  decks.map((deck) => (
                    <TableRow
                      key={deck.id}
                      className={
                        selectedDeckId === deck.id ? "bg-accent/40" : undefined
                      }
                    >
                      <TableCell className="font-medium">{deck.name}</TableCell>
                      <TableCell>
                        {deck.useInMahaLilah ? "Sim" : "Não"}
                      </TableCell>
                      <TableCell>{deck.cardsCount}</TableCell>
                      <TableCell>
                        {new Date(deck.updatedAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedDeckId(deck.id)}
                        >
                          Gerenciar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDeck(deck)}
                          disabled={deletingDeckId === deck.id}
                        >
                          {deletingDeckId === deck.id
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

      {selectedDeck && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Configuração do baralho: {selectedDeck.name}
              </CardTitle>
              <CardDescription>
                Cartas serão exibidas com URL no formato:{" "}
                <code>{"{diretorio}/{numero}.{extensão}"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1.2fr_2fr_auto_auto] items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={editDeckForm?.name || ""}
                  onChange={(event) =>
                    setEditDeckForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            name: event.target.value,
                          }
                        : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Diretório das imagens
                </label>
                <Input
                  value={editDeckForm?.imageDirectory || ""}
                  onChange={(event) =>
                    setEditDeckForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            imageDirectory: event.target.value,
                          }
                        : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Extensão</label>
                <Input
                  value={editDeckForm?.imageExtension || ""}
                  onChange={(event) =>
                    setEditDeckForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            imageExtension: event.target.value,
                          }
                        : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Usar no Maha Lilah
                </label>
                <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                  <Switch
                    checked={Boolean(editDeckForm?.useInMahaLilah)}
                    onCheckedChange={(checked) =>
                      setEditDeckForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              useInMahaLilah: checked,
                            }
                          : prev,
                      )
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {editDeckForm?.useInMahaLilah ? "Sim" : "Não"}
                  </span>
                </div>
              </div>
              <Button onClick={handleSaveDeck} disabled={savingDeck}>
                {savingDeck ? "Salvando..." : "Salvar baralho"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Importar cartas (JSON/CSV)</CardTitle>
              <CardDescription>
                JSON aceito: array de objetos ou objeto com <code>cards</code>.
                CSV com cabeçalhos: <code>cardNumber</code>,{" "}
                <code>description</code>, <code>keywords</code>,{" "}
                <code>observation</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto] items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Arquivo</label>
                  <Input
                    type="file"
                    accept=".json,.csv,application/json,text/csv"
                    onChange={(event) =>
                      setImportFile(event.target.files?.[0] || null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Formato do texto colado
                  </label>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={importFormat}
                    onChange={(event) =>
                      setImportFormat(event.target.value as "json" | "csv")
                    }
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Substituir existentes
                  </label>
                  <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                    <Switch
                      checked={replaceExisting}
                      onCheckedChange={setReplaceExisting}
                    />
                    <span className="text-sm text-muted-foreground">
                      {replaceExisting ? "Sim" : "Não"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ou cole JSON/CSV</label>
                <Textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder="Cole aqui o conteúdo JSON ou CSV..."
                  rows={6}
                />
              </div>

              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : "Importar cartas"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {editingCardId ? "Editar carta" : "Cadastrar carta manualmente"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número</label>
                  <Input
                    type="number"
                    min={1}
                    value={cardForm.cardNumber}
                    onChange={(event) =>
                      setCardForm((prev) => ({
                        ...prev,
                        cardNumber: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-sm font-medium">Palavra-chave</label>
                  <Input
                    value={cardForm.keywords}
                    onChange={(event) =>
                      setCardForm((prev) => ({
                        ...prev,
                        keywords: event.target.value,
                      }))
                    }
                    placeholder="Ex.: coragem, verdade, limite"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descritivo</label>
                <Textarea
                  value={cardForm.description}
                  onChange={(event) =>
                    setCardForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observação</label>
                <Textarea
                  value={cardForm.observation}
                  onChange={(event) =>
                    setCardForm((prev) => ({
                      ...prev,
                      observation: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveCard} disabled={savingCard}>
                  {savingCard
                    ? "Salvando..."
                    : editingCardId
                      ? "Atualizar carta"
                      : "Criar carta"}
                </Button>
                {editingCardId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingCardId(null);
                      setCardForm(emptyCardForm);
                    }}
                  >
                    Cancelar edição
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cartas do baralho ({cards.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCards ? (
                <div className="text-sm text-muted-foreground">
                  Carregando cartas...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Palavra-chave</TableHead>
                      <TableHead>Descritivo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          Nenhuma carta cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cards.map((card) => (
                        <TableRow key={card.id}>
                          <TableCell>#{card.cardNumber}</TableCell>
                          <TableCell>{card.keywords}</TableCell>
                          <TableCell
                            className="max-w-[520px] truncate"
                            title={card.description}
                          >
                            {card.description}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingCardId(card.id);
                                setCardForm({
                                  cardNumber: String(card.cardNumber),
                                  description: card.description,
                                  keywords: card.keywords,
                                  observation: card.observation || "",
                                });
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCard(card)}
                              disabled={deletingCardId === card.id}
                            >
                              {deletingCardId === card.id
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
        </>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" asChild>
          <Link href="/admin/mahalilah">Voltar para salas</Link>
        </Button>
      </div>
    </div>
  );
}
