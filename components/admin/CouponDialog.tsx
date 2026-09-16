"use client";

import { useTransition, useState } from "react";
import { Plus, X, Ticket } from "lucide-react";
import { updateCoupon, createCoupon } from "@/app/admin/(dashboard)/cupons/actions";

export default function CouponDialog({
  coupon,
}: {
  coupon?: {
    id: string;
    code: string;
    discountPercent: number;
    expiresAt: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [code, setCode] = useState(coupon?.code || "");
  const [discountPercent, setDiscountPercent] = useState(coupon ? String(coupon.discountPercent) : "");
  // Format to YYYY-MM-DD for the input
  const initialExpiresAt = coupon?.expiresAt
    ? new Date(coupon.expiresAt).toISOString().split('T')[0]
    : "";
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);

  function handleOpen() {
    setCode(coupon?.code || "");
    setDiscountPercent(coupon ? String(coupon.discountPercent) : "");
    setExpiresAt(initialExpiresAt);
    setError("");
    setOpen(true);
  }

  function handleClose() {
    if (!isPending) {
      setOpen(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError("");
    startTransition(async () => {
      try {
        if (coupon) {
          formData.append("id", coupon.id);
          await updateCoupon(formData);
        } else {
          await createCoupon(formData);
        }
        setOpen(false);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Ocorreu um erro ao criar o cupom.");
        }
      }
    });
  }

  return (
    <>
      {coupon ? (
        <button
          type="button"
          onClick={handleOpen}
          className="rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary transition hover:border-brand-secondary"
        >
          Editar
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
        >
          <Plus size={18} />
          Adicionar Cupom
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-brand-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  {coupon ? <Ticket size={20} /> : <Plus size={20} />}
                </div>
                <h2 className="font-bold text-brand-foreground">
                  {coupon ? "Editar Cupom" : "Novo Cupom"}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted-foreground hover:bg-brand-surface-muted hover:text-brand-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#49352C]">
                  Código do Cupom
                </span>
                <input
                  type="text"
                  name="code"
                  required
                  maxLength={20}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: BLACKFRIDAY10"
                  className="h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm uppercase outline-none focus:border-brand-primary"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#49352C]">
                  Desconto (%)
                </span>
                <input
                  type="number"
                  name="discount_percent"
                  required
                  min={1}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="Ex: 10"
                  className="h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none focus:border-brand-primary"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#49352C]">
                  Data de Validade (opcional)
                </span>
                <input
                  type="date"
                  name="expires_at"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none focus:border-brand-primary"
                />
                <span className="mt-1 block text-xs text-brand-muted-foreground">
                  O cupom será válido até as 23:59 da data selecionada.
                </span>
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleClose}
                  className="rounded-xl px-5 py-3 text-sm font-bold text-brand-muted-foreground hover:bg-brand-surface-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-foreground hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Salvar Cupom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
