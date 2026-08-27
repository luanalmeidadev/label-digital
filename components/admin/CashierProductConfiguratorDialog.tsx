"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, SlidersHorizontal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createConfiguredCartItem,
  estimateCatalogSelection,
  MAX_CART_ITEM_QUANTITY,
  MAX_ITEM_NOTES_LENGTH,
  type CartCatalogProduct,
  type CartItem,
} from "@/lib/cart";
import type { ProductOptionGroup } from "@/lib/food-catalog/types";

type CashierProductConfiguratorDialogProps = {
  product: CartCatalogProduct;
  onAdd: (item: CartItem) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function groupSelectionLabel(group: ProductOptionGroup) {
  const maximum =
    group.selectionMode === "single" ? 1 : group.maxSelections;

  if (group.minSelections > 0 && maximum === group.minSelections) {
    return group.minSelections === 1
      ? "Escolha 1"
      : `Escolha ${group.minSelections}`;
  }

  if (maximum !== null) {
    return `Até ${maximum}`;
  }

  return group.minSelections > 0
    ? `Mínimo ${group.minSelections}`
    : "Opcional";
}

export default function CashierProductConfiguratorDialog({
  product,
  onAdd,
}: CashierProductConfiguratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const estimate = useMemo(
    () =>
      estimateCatalogSelection(product, product.configuration, {
        variantId,
        optionIds: selectedOptionIds,
        itemNotes,
        quantity,
      }),
    [itemNotes, product, quantity, selectedOptionIds, variantId]
  );

  function reset() {
    setVariantId(null);
    setSelectedOptionIds([]);
    setItemNotes("");
    setQuantity(1);
    setSubmitted(false);
  }

  function updateGroupSelection(
    group: ProductOptionGroup,
    optionId: string | null
  ) {
    const groupOptionIds = new Set(group.options.map((option) => option.id));

    setSelectedOptionIds((current) => {
      const outsideGroup = current.filter(
        (currentId) => !groupOptionIds.has(currentId)
      );

      if (group.selectionMode === "single") {
        return optionId ? [...outsideGroup, optionId] : outsideGroup;
      }

      if (!optionId) {
        return current;
      }

      return current.includes(optionId)
        ? current.filter((currentId) => currentId !== optionId)
        : [...current, optionId];
    });
  }

  function addToSale() {
    setSubmitted(true);

    if (!estimate.valid) {
      return;
    }

    onAdd(
      createConfiguredCartItem({
        product,
        configuration: product.configuration,
        selection: {
          variantId,
          optionIds: selectedOptionIds,
          itemNotes,
          quantity,
        },
      })
    );
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-brand-border p-4 text-left transition hover:border-brand-secondary hover:bg-brand-background"
      >
        <p className="font-bold text-brand-foreground">{product.name}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-brand-primary">
            Configurar item
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
            <SlidersHorizontal size={15} />
          </span>
        </div>
      </button>

      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-brand-border px-5 py-5 pr-14">
          <DialogTitle className="text-xl font-bold text-brand-foreground">
            {product.name}
          </DialogTitle>
          <DialogDescription className="text-brand-muted-foreground">
            Configure rapidamente o item desta venda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-6">
          {product.configuration.pricingMode === "variant" && (
            <fieldset className="space-y-2">
              <legend className="font-bold text-brand-foreground">
                Variante <span className="text-brand-primary">*</span>
              </legend>
              {product.configuration.variants
                .filter((variant) => variant.active)
                .map((variant) => (
                  <label
                    key={variant.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                      variantId === variant.id
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-brand-border bg-white"
                    } ${variant.available ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <input
                        type="radio"
                        name={`cashier-variant-${product.id}`}
                        checked={variantId === variant.id}
                        disabled={!variant.available}
                        onChange={() => setVariantId(variant.id)}
                        className="accent-brand-primary"
                      />
                      {variant.name}
                    </span>
                    <strong className="text-sm text-brand-primary">
                      {formatCurrency(variant.price)}
                    </strong>
                  </label>
                ))}
              {submitted && estimate.errors.variant && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {estimate.errors.variant}
                </p>
              )}
            </fieldset>
          )}

          {product.configuration.optionGroups
            .filter((group) => group.active)
            .map((group) => {
              const selectedInGroup = selectedOptionIds.filter((optionId) =>
                group.options.some((option) => option.id === optionId)
              );
              const maximum =
                group.selectionMode === "single" ? 1 : group.maxSelections;
              const limitReached =
                maximum !== null && selectedInGroup.length >= maximum;

              return (
                <fieldset key={group.id} className="space-y-2">
                  <legend className="w-full">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-bold text-brand-foreground">
                        {group.name}
                        {group.minSelections > 0 && (
                          <span className="text-brand-primary"> *</span>
                        )}
                      </span>
                      <span className="text-xs font-semibold text-brand-muted-foreground">
                        {groupSelectionLabel(group)}
                      </span>
                    </span>
                  </legend>

                  {group.selectionMode === "single" &&
                    group.minSelections === 0 && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-border p-3 text-sm">
                        <input
                          type="radio"
                          name={`cashier-group-${group.id}`}
                          checked={selectedInGroup.length === 0}
                          onChange={() => updateGroupSelection(group, null)}
                          className="accent-brand-primary"
                        />
                        Nenhuma opção
                      </label>
                    )}

                  {group.options
                    .filter((option) => option.active)
                    .map((option) => {
                      const selected = selectedOptionIds.includes(option.id);
                      const disabled =
                        !option.available ||
                        (group.selectionMode === "multiple" &&
                          limitReached &&
                          !selected);

                      return (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                            selected
                              ? "border-brand-primary bg-brand-primary/5"
                              : "border-brand-border bg-white"
                          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                          <span className="flex items-center gap-3 text-sm font-semibold">
                            <input
                              type={
                                group.selectionMode === "single"
                                  ? "radio"
                                  : "checkbox"
                              }
                              name={`cashier-group-${group.id}`}
                              checked={selected}
                              disabled={disabled}
                              onChange={() =>
                                updateGroupSelection(group, option.id)
                              }
                              className="accent-brand-primary"
                            />
                            {option.name}
                          </span>
                          {option.priceDelta > 0 && (
                            <strong className="text-sm text-brand-primary">
                              + {formatCurrency(option.priceDelta)}
                            </strong>
                          )}
                        </label>
                      );
                    })}

                  {submitted && estimate.errors.groups[group.id] && (
                    <p role="alert" className="text-xs font-semibold text-red-600">
                      {estimate.errors.groups[group.id]}
                    </p>
                  )}
                </fieldset>
              );
            })}

          <label className="block">
            <span className="font-bold text-brand-foreground">
              Observação do item
            </span>
            <textarea
              value={itemNotes}
              maxLength={MAX_ITEM_NOTES_LENGTH}
              onChange={(event) => setItemNotes(event.target.value)}
              placeholder="Ex.: sem cebola"
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-primary"
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-brand-foreground">Quantidade</span>
            <div className="flex items-center rounded-xl border border-brand-border bg-white">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="flex h-10 w-10 items-center justify-center text-brand-primary disabled:opacity-35"
              >
                <Minus size={16} />
              </button>
              <output className="min-w-10 text-center text-sm font-bold">
                {quantity}
              </output>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={quantity >= MAX_CART_ITEM_QUANTITY}
                onClick={() =>
                  setQuantity((current) =>
                    Math.min(MAX_CART_ITEM_QUANTITY, current + 1)
                  )
                }
                className="flex h-10 w-10 items-center justify-center text-brand-primary disabled:opacity-35"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 border-t border-brand-border bg-brand-background px-5 pb-1 pt-4">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-brand-muted-foreground">
                  Total estimado
                </p>
                <p className="text-[11px] text-brand-muted-foreground">
                  Confirmado novamente ao finalizar.
                </p>
              </div>
              <strong className="text-xl text-brand-primary">
                {formatCurrency(estimate.totalPrice)}
              </strong>
            </div>
            <button
              type="button"
              onClick={addToSale}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-bold text-brand-primary-foreground"
            >
              <Check size={17} />
              Adicionar à venda
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
