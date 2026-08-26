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
            className="flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary transition hover:border-brand-secondary"
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
              className="text-sm font-bold text-brand-foreground"
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
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-brand-primary disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-muted-foreground disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}