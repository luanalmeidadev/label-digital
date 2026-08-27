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
  type CartProduct,
} from "@/lib/cart";
import type {
  FoodCatalogConfiguration,
  ProductOptionGroup,
} from "@/lib/food-catalog/types";

import { useCart } from "./CartProvider";

type ProductConfiguratorDialogProps = {
  product: CartProduct;
  configuration: FoodCatalogConfiguration;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function groupSelectionLabel(group: ProductOptionGroup) {
  const maximum =
    group.selectionMode === "single"
      ? 1
      : group.maxSelections;

  if (group.minSelections > 0 && maximum === group.minSelections) {
    return group.minSelections === 1
      ? "Escolha 1"
      : `Escolha ${group.minSelections}`;
  }

  if (maximum !== null) {
    return `Escolha até ${maximum}`;
  }

  return group.minSelections > 0
    ? `Escolha pelo menos ${group.minSelections}`
    : "Opcional";
}

export default function ProductConfiguratorDialog({
  product,
  configuration,
}: ProductConfiguratorDialogProps) {
  const { addConfiguredItem } = useCart();
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const estimate = useMemo(
    () =>
      estimateCatalogSelection(product, configuration, {
        variantId,
        optionIds: selectedOptionIds,
        itemNotes,
        quantity,
      }),
    [configuration, itemNotes, product, quantity, selectedOptionIds, variantId]
  );

  function resetConfiguration() {
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

  function handleAddToCart() {
    setSubmitted(true);

    if (!estimate.valid) {
      return;
    }

    addConfiguredItem(
      createConfiguredCartItem({
        product,
        configuration,
        selection: {
          variantId,
          optionIds: selectedOptionIds,
          itemNotes,
          quantity,
        },
      })
    );
    setOpen(false);
    resetConfiguration();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          resetConfiguration();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
      >
        <SlidersHorizontal size={15} />
        Escolher opções
      </button>

      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-brand-border px-5 py-5 pr-14">
          <DialogTitle className="text-xl font-bold text-brand-foreground">
            {product.name}
          </DialogTitle>
          <DialogDescription className="leading-5 text-brand-muted-foreground">
            Personalize o item antes de adicionar à sacola.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-5 pb-6">
          {configuration.pricingMode === "variant" && (
            <fieldset
              className="space-y-3"
              aria-describedby={submitted && estimate.errors.variant ? "variant-error" : undefined}
            >
              <legend className="font-bold text-brand-foreground">
                Escolha uma opção <span className="text-brand-primary">*</span>
              </legend>

              <div className="space-y-2">
                {configuration.variants
                  .filter((variant) => variant.active)
                  .map((variant) => (
                    <label
                      key={variant.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-3 transition ${
                        variantId === variant.id
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-brand-border bg-white"
                      } ${variant.available ? "cursor-pointer" : "cursor-not-allowed opacity-55"}`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`variant-${product.id}`}
                          value={variant.id}
                          checked={variantId === variant.id}
                          disabled={!variant.available}
                          onChange={() => setVariantId(variant.id)}
                          className="accent-brand-primary"
                        />
                        <span className="text-sm font-semibold text-brand-foreground">
                          {variant.name}
                          {!variant.available && (
                            <span className="ml-2 text-xs font-normal text-brand-muted-foreground">
                              Indisponível
                            </span>
                          )}
                        </span>
                      </span>
                      <strong className="text-sm text-brand-primary">
                        {formatCurrency(variant.price)}
                      </strong>
                    </label>
                  ))}
              </div>

              {submitted && estimate.errors.variant && (
                <p id="variant-error" role="alert" className="text-xs font-semibold text-red-600">
                  {estimate.errors.variant}
                </p>
              )}
            </fieldset>
          )}

          {configuration.optionGroups
            .filter((group) => group.active)
            .map((group) => {
              const selectedInGroup = selectedOptionIds.filter((optionId) =>
                group.options.some((option) => option.id === optionId)
              );
              const maximum =
                group.selectionMode === "single"
                  ? 1
                  : group.maxSelections;
              const limitReached =
                maximum !== null && selectedInGroup.length >= maximum;
              const errorId = `group-error-${group.id}`;

              return (
                <fieldset
                  key={group.id}
                  className="space-y-3"
                  aria-describedby={
                    submitted && estimate.errors.groups[group.id]
                      ? errorId
                      : undefined
                  }
                >
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

                  <div className="space-y-2">
                    {group.selectionMode === "single" &&
                      group.minSelections === 0 && (
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-muted-foreground">
                          <input
                            type="radio"
                            name={`group-${group.id}`}
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
                            className={`flex items-center justify-between gap-4 rounded-xl border p-3 transition ${
                              selected
                                ? "border-brand-primary bg-brand-primary/5"
                                : "border-brand-border bg-white"
                            } ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
                          >
                            <span className="flex items-center gap-3">
                              <input
                                type={
                                  group.selectionMode === "single"
                                    ? "radio"
                                    : "checkbox"
                                }
                                name={`group-${group.id}`}
                                checked={selected}
                                disabled={disabled}
                                onChange={() =>
                                  updateGroupSelection(group, option.id)
                                }
                                className="accent-brand-primary"
                              />
                              <span className="text-sm font-semibold text-brand-foreground">
                                {option.name}
                                {!option.available && (
                                  <span className="ml-2 text-xs font-normal text-brand-muted-foreground">
                                    Indisponível
                                  </span>
                                )}
                              </span>
                            </span>
                            {option.priceDelta > 0 && (
                              <span className="shrink-0 text-sm font-bold text-brand-primary">
                                + {formatCurrency(option.priceDelta)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>

                  {submitted && estimate.errors.groups[group.id] && (
                    <p id={errorId} role="alert" className="text-xs font-semibold text-red-600">
                      {estimate.errors.groups[group.id]}
                    </p>
                  )}
                </fieldset>
              );
            })}

          {submitted && estimate.errors.options && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
              {estimate.errors.options}
            </p>
          )}

          <label className="block">
            <span className="font-bold text-brand-foreground">Observação do item</span>
            <textarea
              value={itemNotes}
              maxLength={MAX_ITEM_NOTES_LENGTH}
              onChange={(event) => setItemNotes(event.target.value)}
              placeholder="Ex.: sem cebola, cortar ao meio"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-foreground outline-none transition placeholder:text-brand-muted-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
            <span className="mt-1 block text-right text-[11px] text-brand-muted-foreground">
              {itemNotes.length}/{MAX_ITEM_NOTES_LENGTH}
            </span>
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
              <output
                aria-live="polite"
                className="min-w-10 text-center text-sm font-bold text-brand-foreground"
              >
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
                  O valor final será validado no servidor.
                </p>
              </div>
              <strong className="text-xl text-brand-primary">
                {formatCurrency(estimate.totalPrice)}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
            >
              <Check size={17} />
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
