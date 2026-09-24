"use client";

import { useTransition, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteEvent } from "./actions";

export default function DeleteEventButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await deleteEvent(id);
        setOpen(false);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-100"
        title="Excluir Evento"
      >
        <Trash2 size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isPending && setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-brand-background p-6 shadow-xl text-center">
            <h2 className="font-bold text-lg text-brand-foreground mb-2">Excluir evento?</h2>
            <p className="text-sm text-brand-muted-foreground mb-6">Este evento promocional será removido. Deseja continuar?</p>
            <form onSubmit={handleSubmit} className="flex justify-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="rounded-xl px-5 py-3 text-sm font-bold text-brand-muted-foreground hover:bg-brand-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir evento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
