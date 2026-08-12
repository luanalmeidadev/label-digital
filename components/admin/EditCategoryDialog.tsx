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

type EditCategoryDialogProps = {
  id: string;
  name: string;
  updateAction: (formData: FormData) => Promise<void>;
};

export default function EditCategoryDialog({
  id,
  name,
  updateAction,
}: EditCategoryDialogProps) {
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

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar categoria</DialogTitle>

          <DialogDescription>
            Altere o nome da categoria. O endereço da categoria será atualizado
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="mt-4 space-y-5">
          <input type="hidden" name="id" value={id} />

          <div>
            <label
              htmlFor={`category-${id}`}
              className="text-sm font-bold text-[#241B19]"
            >
              Nome da categoria
            </label>

            <input
              id={`category-${id}`}
              type="text"
              name="name"
              defaultValue={name}
              minLength={2}
              maxLength={50}
              required
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="rounded-xl border border-[#EEE6DF] px-4 py-2.5 text-sm font-bold text-[#756A66] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}