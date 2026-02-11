"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/admin/LoadingSpinner";

type DeckForm = {
  name: string;
  imageExtension: string;
  useInMahaLilah: boolean;
};

export default function NewDeckPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DeckForm>({
    name: "",
    imageExtension: "jpg",
    useInMahaLilah: true,
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do baralho e obrigatorio");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/admin/mahalilah/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar baralho");
        return;
      }

      toast.success("Baralho criado com sucesso");
      if (data.deck?.id) {
        router.push(`/admin/mahalilah/baralhos/${data.deck.id}`);
        return;
      }
      router.push("/admin/mahalilah/baralhos");
    } catch {
      toast.error("Erro ao criar baralho");
    } finally {
      setLoading(false);
    }
  };

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
              Novo Baralho
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Crie o baralho. As cartas serao adicionadas na tela de edicao.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Criar Baralho
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Nome
          </label>
          <input
            value={formData.name}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Ex.: Oraculo Terapeutico"
            className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Extensao da imagem
            </label>
            <input
              value={formData.imageExtension}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  imageExtension: event.target.value.replace(/^\./, ""),
                }))
              }
              placeholder="jpg"
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Usar no Maha Lilah
            </label>
            <label className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 px-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.useInMahaLilah}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    useInMahaLilah: event.target.checked,
                  }))
                }
                className="rounded border-gray-300 dark:border-gray-700"
              />
              {formData.useInMahaLilah ? "Sim" : "Nao"}
            </label>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-200">
          O diretorio das imagens e criado automaticamente no volume
          compartilhado. Depois da criacao, esse diretorio fica bloqueado para
          edicao.
        </p>
      </div>
    </div>
  );
}
