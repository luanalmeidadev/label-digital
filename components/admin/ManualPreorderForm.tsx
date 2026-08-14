"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Save, ShoppingBag, Truck } from "lucide-react";

import {
  createManualPreorderRequest,
  updatePreorderRequestDetails,
  type ManualPreorderFormState,
} from "@/app/admin/(dashboard)/pedidos/encomendas/actions";
import {
  type PreorderProduct,
} from "@/lib/preorder-menu";
import {
  parsePreorderPrice,
  type PreorderRequest,
} from "@/lib/preorder-request";

type ManualProduct = Pick<
  PreorderProduct,
  | "name"
  | "prices"
  | "flavors"
  | "minimumQuantity"
  | "quantityUnit"
  | "maxFlavors"
> & {
  categoryName: string;
};

const initialState: ManualPreorderFormState = {
  error: "",
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function displayPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return formatPhone(
    digits.startsWith("55")
      ? digits.slice(2)
      : digits
  );
}

export default function ManualPreorderForm({
  products,
  request,
}: {
  products: ManualProduct[];
  request?: PreorderRequest;
}) {
  const initialProduct = request
    ? products.find(
        (product) =>
          product.name === request.productName
      )
    : products[0];
  const initialProductName = initialProduct
    ? initialProduct.name
    : "__custom__";
  const initialOptionLabel =
    initialProduct?.prices.some(
      (price) =>
        price.label === request?.optionLabel
    )
      ? request!.optionLabel
      : initialProduct?.prices[0]?.label ?? "";
  const formHandler = request
    ? updatePreorderRequestDetails
    : createManualPreorderRequest;
  const [state, formAction, pending] = useActionState(
    formHandler,
    initialState
  );
  const [productName, setProductName] = useState(
    initialProductName
  );
  const selectedProduct = products.find(
    (product) => product.name === productName
  );
  const [optionLabel, setOptionLabel] = useState(
    initialOptionLabel
  );
  const [quantity, setQuantity] = useState(
    String(
      request?.quantity ??
        initialProduct?.minimumQuantity ??
        1
    )
  );
  const [total, setTotal] = useState(() =>
    request
      ? String(request.total)
      : String(
          parsePreorderPrice(
            initialProduct?.prices[0]?.value ?? ""
          ) *
            (initialProduct?.minimumQuantity ?? 1)
        )
  );
  const [customUnitPrice, setCustomUnitPrice] = useState(
    request && !initialProduct
      ? String(parsePreorderPrice(request.optionPrice))
      : ""
  );
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(
    request
      ? initialProduct?.flavors
        ? request.flavors.filter((flavor) =>
            initialProduct.flavors?.includes(flavor)
          )
        : request.flavors
      : []
  );
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">(
    request?.fulfillmentType ?? "pickup"
  );

  function calculateTotal(
    product: ManualProduct | undefined,
    nextOptionLabel: string,
    nextQuantity: number,
    customPrice = customUnitPrice
  ) {
    const unitPrice = product
      ? parsePreorderPrice(
          product.prices.find((price) => price.label === nextOptionLabel)?.value ?? ""
        )
      : Number(customPrice);

    if (Number.isFinite(unitPrice) && unitPrice > 0 && nextQuantity > 0) {
      setTotal(String(Number((unitPrice * nextQuantity).toFixed(2))));
    }
  }

  function selectProduct(nextName: string) {
    setProductName(nextName);
    setSelectedFlavors([]);

    const nextProduct = products.find((product) => product.name === nextName);

    if (nextProduct) {
      const nextOption = nextProduct.prices[0]?.label ?? "";
      const nextQuantity = nextProduct.minimumQuantity ?? 1;
      setOptionLabel(nextOption);
      setQuantity(String(nextQuantity));
      calculateTotal(nextProduct, nextOption, nextQuantity);
    } else {
      setOptionLabel("");
      setQuantity("1");
      setTotal("");
    }
  }

  function toggleFlavor(flavor: string) {
    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(selectedFlavors.filter((item) => item !== flavor));
      return;
    }

    if (
      selectedProduct?.maxFlavors !== undefined &&
      selectedFlavors.length >= selectedProduct.maxFlavors
    ) {
      return;
    }

    setSelectedFlavors([...selectedFlavors, flavor]);
  }

  const fieldClass =
    "mt-2 h-12 w-full rounded-xl border border-[#DDD3CC] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 disabled:opacity-60";

  return (
    <form action={formAction} className="space-y-6">
      {request && (
        <input type="hidden" name="id" value={request.id} />
      )}
      <input type="hidden" name="flavors" value={JSON.stringify(selectedFlavors)} />

      {request && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          Editando <strong>{request.requestNumber}</strong>. O status e os pagamentos já registrados serão preservados.
        </div>
      )}

      <section className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#241B19]">Cliente</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">Nome do cliente</span>
            <input name="customer_name" defaultValue={request?.customerName ?? ""} required maxLength={100} disabled={pending} className={fieldClass} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">WhatsApp</span>
            <input
              name="customer_phone"
              type="tel"
              required
              disabled={pending}
              placeholder="(48) 99999-9999"
              defaultValue={request ? displayPhone(request.customerPhone) : ""}
              onChange={(event) => {
                event.currentTarget.value = formatPhone(event.currentTarget.value);
              }}
              className={fieldClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#241B19]">Produto e valor</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-[#241B19]">Produto</span>
            <select
              name="product_name"
              value={productName}
              disabled={pending}
              onChange={(event) => selectProduct(event.target.value)}
              className={fieldClass}
            >
              {products.map((product) => (
                <option key={product.name} value={product.name}>
                  {product.categoryName} — {product.name}
                </option>
              ))}
              <option value="__custom__">Outro / encomenda personalizada</option>
            </select>
          </label>

          {selectedProduct ? (
            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">Tamanho ou opção</span>
              <select
                name="option_label"
                value={optionLabel}
                disabled={pending}
                onChange={(event) => {
                  const nextOption = event.target.value;
                  setOptionLabel(nextOption);
                  calculateTotal(selectedProduct, nextOption, Number(quantity));
                }}
                className={fieldClass}
              >
                {selectedProduct.prices.map((price) => (
                  <option key={price.label} value={price.label}>
                    {price.label} — {price.value}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="block sm:col-span-2">
                <span className="text-sm font-bold text-[#241B19]">Nome do produto personalizado</span>
                <input name="custom_product_name" defaultValue={request && !initialProduct ? request.productName : ""} required disabled={pending} maxLength={120} className={fieldClass} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#241B19]">Tamanho ou descrição</span>
                <input name="custom_option_label" defaultValue={request && !initialProduct ? request.optionLabel : ""} disabled={pending} maxLength={120} className={fieldClass} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#241B19]">Valor unitário</span>
                <input
                  name="custom_unit_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={customUnitPrice}
                  disabled={pending}
                  onChange={(event) => {
                    setCustomUnitPrice(event.target.value);
                    calculateTotal(undefined, "", Number(quantity), event.target.value);
                  }}
                  className={fieldClass}
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">Quantidade</span>
            <input
              name="quantity"
              type="number"
              min={selectedProduct?.minimumQuantity ?? 1}
              step="1"
              required
              value={quantity}
              disabled={pending}
              onChange={(event) => {
                setQuantity(event.target.value);
                calculateTotal(selectedProduct, optionLabel, Number(event.target.value));
              }}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-[#756A66]">
              {selectedProduct?.quantityUnit ?? "item(ns)"}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">Valor total da encomenda</span>
            <input
              name="total"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={total}
              disabled={pending}
              onChange={(event) => setTotal(event.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-[#756A66]">Pode ser ajustado manualmente.</span>
          </label>
          {!request && <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-[#241B19]">Valor já recebido</span>
            <input
              name="amount_paid"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              required
              disabled={pending}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-[#756A66]">
              Informe o sinal recebido. O sistema considera 50% como sinal completo.
            </span>
          </label>}
        </div>

        {selectedProduct?.flavors?.length ? (
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-[#241B19]">
              Sabores{selectedProduct.maxFlavors ? ` · até ${selectedProduct.maxFlavors}` : ""}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedProduct.flavors.map((flavor) => {
                const selected = selectedFlavors.includes(flavor);
                return (
                  <button
                    key={flavor}
                    type="button"
                    disabled={pending}
                    onClick={() => toggleFlavor(flavor)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                      selected
                        ? "border-[#8B0000] bg-[#8B0000] text-white"
                        : "border-[#DDD3CC] bg-white text-[#756A66] hover:border-[#D2B48C]"
                    }`}
                  >
                    {flavor}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : !selectedProduct ? (
          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#241B19]">Sabores</span>
            <input
              type="text"
              disabled={pending}
              placeholder="Separe os sabores por vírgula"
              onChange={(event) =>
                setSelectedFlavors(
                  event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                )
              }
              className={fieldClass}
            />
          </label>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#241B19]">Data e recebimento</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">Data desejada</span>
            <div className="relative mt-2">
              <CalendarDays size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B0000]" />
              <input
                name="desired_date"
                type="date"
                min={request ? undefined : todayInputValue()}
                defaultValue={request?.desiredDate ?? ""}
                required
                disabled={pending}
                className={`${fieldClass} mt-0 pl-11`}
              />
            </div>
          </label>
          {!request && <label className="block">
            <span className="text-sm font-bold text-[#241B19]">Situação inicial</span>
            <select name="status" defaultValue="confirmed" disabled={pending} className={fieldClass}>
              <option value="confirmed">Confirmada</option>
              <option value="new">Nova solicitação</option>
            </select>
          </label>}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-[#241B19]">Como será entregue?</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { value: "pickup" as const, label: "Retirada", icon: ShoppingBag },
              { value: "delivery" as const, label: "Entrega", icon: Truck },
            ].map((item) => {
              const Icon = item.icon;
              const selected = fulfillmentType === item.value;
              return (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    selected
                      ? "border-[#8B0000] bg-[#FFF7F5] text-[#8B0000]"
                      : "border-[#DDD3CC] text-[#756A66]"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment_type"
                    value={item.value}
                    checked={selected}
                    disabled={pending}
                    onChange={() => setFulfillmentType(item.value)}
                    className="sr-only"
                  />
                  <Icon size={17} /> {item.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {fulfillmentType === "delivery" && (
          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#241B19]">Endereço de entrega</span>
            <textarea name="delivery_address" defaultValue={request?.deliveryAddress ?? ""} required rows={3} maxLength={300} disabled={pending} className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CC] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10" />
          </label>
        )}

        <label className="mt-5 block">
          <span className="text-sm font-bold text-[#241B19]">Observações</span>
          <textarea name="notes" defaultValue={request?.notes ?? ""} rows={4} maxLength={1000} disabled={pending} className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CC] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10" />
        </label>
      </section>

      {state.error && (
        <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-6 text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {pending
            ? "Salvando..."
            : request
              ? "Salvar alterações"
              : "Cadastrar encomenda"}
        </button>
      </div>
    </form>
  );
}
