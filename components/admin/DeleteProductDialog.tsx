"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteProductDialogProps = {
  id: string;
  name: string;
  deleteAction: (formData: FormData) => Promise<void>;
};

export default function DeleteProductDialog({
  id,
  name,
  deleteAction,
}: DeleteProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(formData: FormData) {
    try {
      setDeleting(true);

      await deleteAction(formData);

      setOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            title="Excluir produto"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50"
          />
        }
      >
        <Trash2 size={15} />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={22} />
          </div>

          <DialogTitle>Excluir produto?</DialogTitle>

          <DialogDescription>
            Você está prestes a excluir o produto{" "}
            <strong className="text-[#241B19]">{name}</strong>. Essa ação não
            poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <form action={handleDelete} className="mt-5">
          <input type="hidden" name="id" value={id} />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={deleting}
              className="rounded-xl border border-[#EEE6DF] px-4 py-2.5 text-sm font-bold text-[#756A66]"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={deleting}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Excluindo..." : "Excluir produto"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}