import { type FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { CashierCartItem } from "@/components/admin/CashRegisterPOS";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CashierManualDiscountDialog({
  item,
  open,
  onOpenChange,
  onApply,
}: {
  item: CashierCartItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (discount: { type: "fixed" | "percent"; value: number; reason?: string }) => void;
}) {
  const [type, setType] = useState<"fixed" | "percent">("fixed");
  const [valueStr, setValueStr] = useState("");
  const [reason, setReason] = useState("");
  const [prevItemKey, setPrevItemKey] = useState<string | null>(null);

  const currentItemKey = item?.lineKey ?? null;

  if (currentItemKey !== prevItemKey) {
    setPrevItemKey(currentItemKey);
    if (item && item.manualDiscount) {
      setType(item.manualDiscount.type);
      setValueStr(String(item.manualDiscount.value));
      setReason(item.manualDiscount.reason ?? "");
    } else {
      setType("fixed");
      setValueStr("");
      setReason("");
    }
  }

  if (!item) return null;

  const grossTotal = item.price * item.quantity;
  const parsedValue = Number(valueStr.replace(",", "."));
  const value = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;

  let discountAmount = 0;
  if (type === "percent" && value <= 100) {
    discountAmount = grossTotal * (value / 100);
  } else if (type === "fixed" && value <= grossTotal) {
    discountAmount = value;
  }

  const netTotal = Math.max(0, grossTotal - discountAmount);
  const isValid = value > 0 && (type === "percent" ? value <= 100 : value <= grossTotal);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid) return;

    onApply({
      type,
      value,
      reason: reason.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm gap-4 rounded-3xl p-6 shadow-xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold text-brand-foreground">
            Aplicar desconto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="rounded-xl border border-brand-border bg-brand-background p-3">
              <p className="text-sm font-semibold text-brand-foreground">{item.quantity}x {item.name}</p>
              <p className="text-sm text-brand-muted-foreground">Preço original (linha): {formatCurrency(grossTotal)}</p>
            </div>

            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer rounded-xl border border-brand-border p-3 text-center font-semibold text-brand-foreground has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5">
                <input
                  type="radio"
                  name="type"
                  className="sr-only"
                  checked={type === "fixed"}
                  onChange={() => setType("fixed")}
                />
                R$
              </label>
              <label className="flex-1 cursor-pointer rounded-xl border border-brand-border p-3 text-center font-semibold text-brand-foreground has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5">
                <input
                  type="radio"
                  name="type"
                  className="sr-only"
                  checked={type === "percent"}
                  onChange={() => setType("percent")}
                />
                %
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-[#49352C]">Valor</span>
              <input
                type="text"
                inputMode="decimal"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value.replace(/[^0-9,.]/g, ""))}
                placeholder={type === "fixed" ? "0,00" : "10"}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-brand-primary"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[#49352C]">Motivo (opcional)</span>
              <input
                type="text"
                maxLength={160}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Produto com pequena avaria"
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-brand-primary"
              />
            </label>

            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="flex justify-between text-sm text-emerald-800">
                <span>Preço original</span>
                <span>{formatCurrency(grossTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Desconto</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="mt-1 flex justify-between font-bold text-emerald-900">
                <span>Total líquido</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-brand-primary font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:opacity-50"
            >
              Aplicar desconto
            </button>
          </form>
      </DialogContent>
    </Dialog>
  );
}
