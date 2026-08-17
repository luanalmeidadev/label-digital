"use client";

import Image from "next/image";

import {
  Clock3,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import type { StoreOpenStatus } from "@/lib/store-open-status";
import { useCart } from "./CartProvider";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  storeStatus: StoreOpenStatus | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CartDrawer({
  open,
  onClose,
  onContinue,
  storeStatus,
}: CartDrawerProps) {
  const {
    items,
    subtotal,
    increaseItem,
    decreaseItem,
    removeItem,
  } = useCart();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* OVERLAY */}
      <button
        type="button"
        aria-label="Fechar sacola"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* DRAWER */}
      <aside className="absolute bottom-0 right-0 flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-[#FFFDF9] shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b border-[#EEE6DF] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <ShoppingBag size={20} />
            </div>

            <div>
              <h2 className="font-bold text-[#241B19]">
                Sua sacola
              </h2>

              <p className="text-xs text-[#756A66]">
                {items.length} produto(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sacola"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] text-[#756A66]"
          >
            <X size={19} />
          </button>
        </div>

        {/* ITENS */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#EEE6DF] bg-white p-4"
                >
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F7F0EA]">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">
                          🍰
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-[#241B19]">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-sm font-bold text-[#8B0000]">
                            {formatCurrency(
                              item.price
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(item.id)
                          }
                          aria-label={`Remover ${item.name}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center rounded-xl border border-[#EEE6DF]">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseItem(
                                item.id
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center text-[#8B0000]"
                          >
                            <Minus size={15} />
                          </button>

                          <span className="min-w-8 text-center text-sm font-bold text-[#241B19]">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseItem(
                                item.id
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center text-[#8B0000]"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <p className="font-bold text-[#241B19]">
                          {formatCurrency(
                            item.price *
                              item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <ShoppingBag
                size={36}
                className="mx-auto text-[#D2B48C]"
              />

              <p className="mt-4 font-bold text-[#241B19]">
                Sua sacola está vazia
              </p>

              <p className="mt-2 text-sm text-[#756A66]">
                Adicione alguns produtos para continuar.
              </p>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        {items.length > 0 && (
          <div className="border-t border-[#EEE6DF] bg-white p-5">
            {!storeStatus?.isOpen && (
              <div
                role="status"
                className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"
              >
                <Clock3 size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">
                    {storeStatus ? "Loja fechada" : "Verificando horário"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {storeStatus
                      ? `${storeStatus.detail}. Seu carrinho está salvo e poderá ser finalizado quando abrirmos.`
                      : "Aguarde um instante. Seu carrinho continua salvo."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#756A66]">
                Subtotal
              </span>

              <span className="text-xl font-bold text-[#8B0000]">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={onContinue}
              disabled={!storeStatus?.isOpen}
              className="mt-4 h-12 w-full rounded-xl bg-[#8B0000] text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:bg-[#B9ACA8]"
            >
              {storeStatus?.isOpen
                ? "Continuar pedido"
                : storeStatus
                  ? "Carrinho salvo — loja fechada"
                  : "Verificando horário..."}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
