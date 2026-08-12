"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
};

type EditProductDialogProps = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  available: boolean;
  featured: boolean;
  active: boolean;
  categories: Category[];
  updateAction: (formData: FormData) => Promise<void>;
};

export default function EditProductDialog({
  id,
  name,
  description,
  price,
  categoryId,
  available,
  featured,
  active,
  categories,
  updateAction,
}: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      setSaving(true);
      await updateAction(formData);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-[#EEE6DF] px-3 py-2 text-xs font-bold text-[#8B0000] transition hover:border-[#D2B48C]"
          />
        }
      >
        <Pencil size={15} />
        Editar
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>

          <DialogDescription>
            Atualize as informações do produto.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="mt-4 space-y-5">
          <input type="hidden" name="id" value={id} />

          <div>
            <label className="text-sm font-bold text-[#241B19]">
              Nome do produto
            </label>

            <input
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              defaultValue={name}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-[#241B19]">
              Categoria
            </label>

            <select
              name="category_id"
              required
              defaultValue={categoryId ?? ""}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-[#241B19]">
              Descrição
            </label>

            <textarea
              name="description"
              rows={4}
              maxLength={500}
              defaultValue={description ?? ""}
              disabled={saving}
              className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CB] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-[#241B19]">
              Preço
            </label>

            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={price}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="available"
                defaultChecked={available}
                disabled={saving}
                className="h-4 w-4 accent-[#8B0000]"
              />

              <div>
                <p className="text-sm font-bold text-[#241B19]">
                  Disponível
                </p>
                <p className="text-xs text-[#756A66]">
                  Pode ser pedido hoje
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={featured}
                disabled={saving}
                className="h-4 w-4 accent-[#8B0000]"
              />

              <div>
                <p className="text-sm font-bold text-[#241B19]">
                  Destaque
                </p>
                <p className="text-xs text-[#756A66]">
                  Aparece em evidência
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="active"
                defaultChecked={active}
                disabled={saving}
                className="h-4 w-4 accent-[#8B0000]"
              />

              <div>
                <p className="text-sm font-bold text-[#241B19]">
                  Ativo
                </p>
                <p className="text-xs text-[#756A66]">
                  Exibido no sistema
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="rounded-xl border border-[#EEE6DF] px-4 py-2.5 text-sm font-bold text-[#756A66]"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}