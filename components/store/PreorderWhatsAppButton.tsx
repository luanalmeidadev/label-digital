"use client";

import Link from "next/link";
import {
  type FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  Check,
  MessageCircle,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  createPreorderRequest,
  type CreatePreorderRequestResult,
} from "@/app/encomendas/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TurnstileWidget from "@/components/store/TurnstileWidget";
import { createClientRequestId } from "@/lib/client-request-id";
import { normalizeWhatsAppPhone } from "@/lib/order-status";
import type { PreorderProduct } from "@/lib/preorder-menu";
import {
  calculatePreorderTotal,
  formatPreorderCurrency,
  getPreorderMaxFlavors,
  isAllowedPreorderQuantity,
} from "@/lib/preorder-request";
import {
  buildWhatsAppAppUrl,
  buildWhatsAppShortUrl,
  buildWhatsAppWebUrl,
} from "@/lib/whatsapp-link";

type RequestProduct = Pick<
  PreorderProduct,
  | "name"
  | "prices"
  | "flavors"
  | "leadTimeDays"
  | "minimumQuantity"
  | "allowedQuantities"
  | "quantityIncrement"
  | "quantityUnit"
  | "priceBaseQuantity"
  | "maxFlavors"
  | "flavorQuantityStep"
>;

type PreorderWhatsAppButtonProps = {
  phone: string;
  product?: RequestProduct;
  label?: string;
  className?: string;
};

type FulfillmentType =
  | "pickup"
  | "delivery";

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function getMinimumDate(leadTimeDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(
    date.getDate() + leadTimeDays
  );
  return toInputDate(date);
}

function formatDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(year, month - 1, day, 12)
  );
}

function formatPhone(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function buildPreorderMessage({
  requestNumber,
  customerName,
  customerPhone,
  productName,
  selectedOption,
  quantity,
  quantityUnit,
  estimatedTotal,
  selectedFlavors,
  desiredDate,
  fulfillmentType,
  deliveryAddress,
  notes,
}: {
  requestNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  selectedOption: string;
  quantity: number;
  quantityUnit: string;
  estimatedTotal: number;
  selectedFlavors: string[];
  desiredDate: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string;
  notes: string;
}) {
  return [
    "\u{1F370} *SOLICITAÇÃO DE ENCOMENDA - LA\u2019BEL*",
    "",
    `*Código:* ${requestNumber}`,
    `*Cliente:* ${customerName}`,
    `*WhatsApp:* ${customerPhone}`,
    `*Produto:* ${productName}`,
    selectedOption
      ? `*Opção:* ${selectedOption}`
      : null,
    `*Quantidade:* ${quantity} ${quantityUnit}`,
    estimatedTotal > 0
      ? `*Valor estimado:* ${formatPreorderCurrency(
          estimatedTotal
        )}`
      : null,
    selectedFlavors.length > 0
      ? `*Sabores:* ${selectedFlavors.join(", ")}`
      : null,
    `*Data desejada:* ${formatDate(desiredDate)}`,
    `*Recebimento:* ${
      fulfillmentType === "delivery"
        ? "Entrega"
        : "Retirada na loja"
    }`,
    fulfillmentType === "delivery"
      ? `*Endereço:* ${deliveryAddress}`
      : null,
    "",
    "*Observações:*",
    notes.trim() || "Nenhuma.",
    "",
    "Gostaria de confirmar a disponibilidade e combinar os detalhes.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export default function PreorderWhatsAppButton({
  phone,
  product,
  label = "Quero encomendar",
  className = "",
}: PreorderWhatsAppButtonProps) {
  const leadTimeDays =
    product?.leadTimeDays ?? 2;
  const minimumQuantity =
    product?.minimumQuantity ?? 1;
  const quantityUnit =
    product?.quantityUnit ?? "item(ns)";

  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] =
    useState("");
  const [customerPhone, setCustomerPhone] =
    useState("");
  const [selectedOption, setSelectedOption] =
    useState(product?.prices[0]?.label ?? "");
  const [quantity, setQuantity] = useState(
    String(minimumQuantity)
  );
  const [customQuantitySelected, setCustomQuantitySelected] =
    useState(false);
  const [selectedFlavors, setSelectedFlavors] =
    useState<string[]>([]);
  const [desiredDate, setDesiredDate] =
    useState("");
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("pickup");
  const [deliveryAddress, setDeliveryAddress] =
    useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [turnstileToken, setTurnstileToken] =
    useState("");
  const [turnstileResetKey, setTurnstileResetKey] =
    useState(0);
  const idempotencyKeyRef = useRef("");

  const minimumDate = useMemo(
    () => getMinimumDate(leadTimeDays),
    [leadTimeDays]
  );
  const estimatedTotal = useMemo(() => {
    if (!product) {
      return 0;
    }

    const selectedPrice = product.prices.find(
      (price) => price.label === selectedOption
    );

    return calculatePreorderTotal(
      product,
      selectedPrice?.value ?? "",
      Number(quantity)
    );
  }, [product, quantity, selectedOption]);
  const maxFlavors = useMemo(
    () =>
      product
        ? getPreorderMaxFlavors(
            product,
            Number(quantity)
          )
        : 0,
    [product, quantity]
  );
  const maximumPresetQuantity = Math.max(
    ...(product?.allowedQuantities?.length
      ? product.allowedQuantities
      : [minimumQuantity])
  );
  const customQuantityEnabled = Boolean(
    product?.allowedQuantities?.length &&
      product.quantityIncrement
  );
  const isCustomQuantity =
    customQuantityEnabled &&
    (customQuantitySelected ||
      Number(quantity) > maximumPresetQuantity);

  function updateQuantity(nextQuantity: string) {
    setQuantity(nextQuantity);

    if (product) {
      const nextMaxFlavors =
        getPreorderMaxFlavors(
          product,
          Number(nextQuantity)
        );
      setSelectedFlavors((current) =>
        current.slice(0, nextMaxFlavors)
      );
    }
  }

  function toggleFlavor(flavor: string) {
    setError("");

    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(
        selectedFlavors.filter(
          (item) => item !== flavor
        )
      );
      return;
    }

    if (
      maxFlavors > 0 &&
      selectedFlavors.length >= maxFlavors
    ) {
      setError(
        `Para esta quantidade, escolha no máximo ${maxFlavors} ${
          maxFlavors === 1 ? "sabor" : "sabores"
        }.`
      );
      return;
    }

    setSelectedFlavors([
      ...selectedFlavors,
      flavor,
    ]);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const normalizedStorePhone =
      normalizeWhatsAppPhone(phone);
    const normalizedCustomerPhone =
      normalizeWhatsAppPhone(customerPhone);
    const parsedQuantity = Number(quantity);

    if (!customerName.trim()) {
      setError("Informe o seu nome.");
      return;
    }

    if (
      normalizedCustomerPhone.length < 12 ||
      normalizedCustomerPhone.length > 13
    ) {
      setError("Informe um WhatsApp válido.");
      return;
    }

    if (
      product
        ? !isAllowedPreorderQuantity(
            product,
            parsedQuantity
          )
        : !Number.isInteger(parsedQuantity) ||
          parsedQuantity < minimumQuantity
    ) {
      setError(
        product?.allowedQuantities?.length
          ? product.quantityIncrement
            ? `Escolha ${product.allowedQuantities.join(
                ", "
              )} ou use múltiplos de ${product.quantityIncrement} acima de ${maximumPresetQuantity}.`
            : `Escolha uma destas quantidades: ${product.allowedQuantities.join(
                ", "
              )} ${quantityUnit}.`
          : `A quantidade mínima é ${minimumQuantity} ${quantityUnit}.`
      );
      return;
    }

    if (
      product?.flavors?.length &&
      selectedFlavors.length === 0
    ) {
      setError("Escolha pelo menos um sabor.");
      return;
    }

    if (selectedFlavors.length > maxFlavors) {
      setError(
        `Para esta quantidade, escolha no máximo ${maxFlavors} ${
          maxFlavors === 1 ? "sabor" : "sabores"
        }.`
      );
      return;
    }

    if (!desiredDate) {
      setError("Escolha a data desejada.");
      return;
    }

    if (desiredDate < minimumDate) {
      setError(
        `Escolha uma data com pelo menos ${leadTimeDays} dias de antecedência.`
      );
      return;
    }

    if (
      fulfillmentType === "delivery" &&
      deliveryAddress.trim().length < 8
    ) {
      setError("Informe o endereço de entrega.");
      return;
    }

    if (!normalizedStorePhone) {
      setError(
        "O WhatsApp da loja não está configurado."
      );
      return;
    }

    if (!turnstileToken) {
      setError(
        "Confirme a verificação de segurança."
      );
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        createClientRequestId();
    }

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );
    const whatsappWindow = isMobile
      ? null
      : window.open("about:blank", "_blank");

    if (whatsappWindow) {
      whatsappWindow.opener = null;
    }

    setSaving(true);

    const formData = new FormData();
    formData.set(
      "idempotency_key",
      idempotencyKeyRef.current
    );
    formData.set(
      "turnstile_token",
      turnstileToken
    );
    formData.set(
      "customer_name",
      customerName.trim()
    );
    formData.set(
      "customer_phone",
      customerPhone
    );
    formData.set(
      "product_name",
      product?.name ??
        "Encomenda personalizada"
    );
    formData.set("option_label", selectedOption);
    formData.set("quantity", String(parsedQuantity));
    formData.set("desired_date", desiredDate);
    formData.set(
      "fulfillment_type",
      fulfillmentType
    );
    formData.set(
      "delivery_address",
      deliveryAddress.trim()
    );
    formData.set("notes", notes.trim());
    formData.set(
      "flavors",
      JSON.stringify(selectedFlavors)
    );

    let result: CreatePreorderRequestResult;

    try {
      result =
        await createPreorderRequest(formData);
    } catch (requestError) {
      whatsappWindow?.close();
      setSaving(false);
      setTurnstileToken("");
      setTurnstileResetKey(
        (current) => current + 1
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível registrar a encomenda."
      );
      return;
    }

    if (
      !result.success ||
      !result.requestNumber
    ) {
      idempotencyKeyRef.current = "";
      whatsappWindow?.close();
      setSaving(false);
      setTurnstileToken("");
      setTurnstileResetKey(
        (current) => current + 1
      );
      setError(
        result.error ??
          "Não foi possível registrar a encomenda."
      );
      return;
    }

    idempotencyKeyRef.current = "";
    setTurnstileToken("");

    const message = buildPreorderMessage({
      requestNumber: result.requestNumber,
      customerName: customerName.trim(),
      customerPhone,
      productName:
        product?.name ??
        "Encomenda personalizada",
      selectedOption: selectedOption
        ? `${selectedOption} — ${
            product?.prices.find(
              (price) =>
                price.label === selectedOption
            )?.value ?? "valor a confirmar"
          }`
        : "",
      quantity: parsedQuantity,
      quantityUnit,
      estimatedTotal,
      selectedFlavors,
      desiredDate,
      fulfillmentType,
      deliveryAddress:
        deliveryAddress.trim(),
      notes,
    });

    if (isMobile) {
      window.location.href = buildWhatsAppAppUrl(
        normalizedStorePhone,
        message
      );
      setSaving(false);
      return;
    }

    if (whatsappWindow) {
      whatsappWindow.location.href = buildWhatsAppWebUrl(
        normalizedStorePhone,
        message
      );
    } else {
      window.location.href = buildWhatsAppShortUrl(
        normalizedStorePhone,
        message
      );
    }

    setSaving(false);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) {
          return;
        }

        setOpen(nextOpen);
        setError("");

        if (!nextOpen) {
          idempotencyKeyRef.current = "";
          setTurnstileToken("");
          setTurnstileResetKey(
            (current) => current + 1
          );
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#700000] ${className}`}
      >
        <MessageCircle size={18} />
        {label}
      </button>

      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[#EEE6DF] px-5 py-5 pr-14 sm:px-6">
          <DialogTitle className="text-xl font-bold text-[#241B19]">
            {product?.name ??
              "Encomenda personalizada"}
          </DialogTitle>
          <DialogDescription className="leading-5">
            Monte a sua solicitação. A encomenda será confirmada pela equipe no WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 px-5 pb-6 sm:px-6"
        >
          <div className="rounded-2xl border border-[#E8D2C1] bg-[#FFF9F3] p-4 text-xs leading-5 text-[#756A66]">
            Solicite com pelo menos{" "}
            <strong className="text-[#8B0000]">
              {leadTimeDays} dias de antecedência
            </strong>
            . A reserva é confirmada após o pagamento de 50% do pedido.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Seu nome
              </span>
              <input
                type="text"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value
                  )
                }
                placeholder="Como podemos chamar você?"
                autoComplete="name"
                disabled={saving}
                className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CC] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Seu WhatsApp
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(
                    formatPhone(event.target.value)
                  )
                }
                placeholder="(48) 99999-9999"
                autoComplete="tel"
                disabled={saving}
                className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CC] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 disabled:opacity-60"
              />
            </label>
          </div>

          {product?.prices.length ? (
            <fieldset>
              <legend className="text-sm font-bold text-[#241B19]">
                Tamanho ou opção
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {product.prices.map((price) => {
                  const selected =
                    selectedOption === price.label;

                  return (
                    <label
                      key={`${price.label}-${price.value}`}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                        selected
                          ? "border-[#8B0000] bg-[#FFF7F5]"
                          : "border-[#DDD3CC] bg-white hover:border-[#D2B48C]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`option-${product.name}`}
                        value={price.label}
                        checked={selected}
                        onChange={() =>
                          setSelectedOption(
                            price.label
                          )
                        }
                        className="sr-only"
                      />
                      <span>
                        <span className="block text-xs font-semibold text-[#756A66]">
                          {price.label}
                        </span>
                        <span className="mt-0.5 block text-sm font-bold text-[#8B0000]">
                          {price.value}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          selected
                            ? "bg-[#8B0000] text-white"
                            : "border border-[#DDD3CC]"
                        }`}
                      >
                        {selected && <Check size={13} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Quantidade
              </span>
              <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-[#DDD3CC] bg-white focus-within:border-[#8B0000] focus-within:ring-2 focus-within:ring-[#8B0000]/10">
                {product?.allowedQuantities?.length ? (
                  <select
                    value={
                      isCustomQuantity
                        ? "__more__"
                        : quantity
                    }
                    onChange={(event) => {
                      const selectedCustomQuantity =
                        event.target.value === "__more__";
                      setCustomQuantitySelected(
                        selectedCustomQuantity
                      );
                      const nextQuantity =
                        selectedCustomQuantity
                          ? String(
                              maximumPresetQuantity +
                                (product.quantityIncrement ?? 1)
                            )
                          : event.target.value;
                      updateQuantity(nextQuantity);
                    }}
                    className="min-w-0 flex-1 bg-white px-4 text-sm outline-none"
                  >
                    {product.allowedQuantities.map(
                      (allowedQuantity) => (
                        <option
                          key={allowedQuantity}
                          value={allowedQuantity}
                        >
                          {allowedQuantity}
                        </option>
                      )
                    )}
                    {customQuantityEnabled && (
                      <option value="__more__">
                        Mais de {maximumPresetQuantity}
                      </option>
                    )}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={minimumQuantity}
                    step="1"
                    value={quantity}
                    onChange={(event) =>
                      updateQuantity(event.target.value)
                    }
                    className="min-w-0 flex-1 px-4 text-sm outline-none"
                  />
                )}
                <span className="flex items-center border-l border-[#EEE6DF] bg-[#FFF9F3] px-3 text-xs font-semibold text-[#756A66]">
                  {quantityUnit}
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Data desejada
              </span>
              <div className="relative mt-2">
                <CalendarDays
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B0000]"
                />
                <input
                  type="date"
                  min={minimumDate}
                  value={desiredDate}
                  onChange={(event) =>
                    setDesiredDate(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-[#DDD3CC] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
                />
              </div>
            </label>
          </div>

          {isCustomQuantity && (
            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Quantidade acima de {maximumPresetQuantity}
              </span>
              <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-[#DDD3CC] bg-white focus-within:border-[#8B0000] focus-within:ring-2 focus-within:ring-[#8B0000]/10">
                <input
                  type="number"
                  min={
                    maximumPresetQuantity +
                    (product?.quantityIncrement ?? 1)
                  }
                  step={product?.quantityIncrement ?? 1}
                  value={quantity}
                  onChange={(event) =>
                    updateQuantity(event.target.value)
                  }
                  className="min-w-0 flex-1 px-4 text-sm outline-none"
                />
                <span className="flex items-center border-l border-[#EEE6DF] bg-[#FFF9F3] px-3 text-xs font-semibold text-[#756A66]">
                  {quantityUnit}
                </span>
              </div>
              <span className="mt-1 block text-xs text-[#756A66]">
                Use múltiplos de {product?.quantityIncrement ?? 1}.
              </span>
            </label>
          )}

          {estimatedTotal > 0 && (
            <div className="rounded-xl border border-[#E8D2C1] bg-[#FFF9F3] px-4 py-3">
              <p className="text-xs font-semibold text-[#756A66]">
                Valor estimado
              </p>
              <p className="mt-1 text-lg font-bold text-[#8B0000]">
                {formatPreorderCurrency(
                  estimatedTotal
                )}
              </p>
            </div>
          )}

          {product?.flavors?.length ? (
            <fieldset>
              <legend className="text-sm font-bold text-[#241B19]">
                Sabores · escolha até {maxFlavors}{" "}
                {maxFlavors === 1 ? "sabor" : "sabores"}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.flavors.map((flavor) => {
                  const selected =
                    selectedFlavors.includes(flavor);

                  return (
                    <label
                      key={flavor}
                      className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        selected
                          ? "border-[#8B0000] bg-[#8B0000] text-white"
                          : "border-[#DDD3CC] bg-white text-[#756A66] hover:border-[#D2B48C]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleFlavor(flavor)
                        }
                        className="sr-only"
                      />
                      {flavor}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend className="text-sm font-bold text-[#241B19]">
              Como deseja receber?
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                {
                  value: "pickup" as const,
                  label: "Retirada",
                  icon: ShoppingBag,
                },
                {
                  value: "delivery" as const,
                  label: "Entrega",
                  icon: Truck,
                },
              ].map((option) => {
                const Icon = option.icon;
                const selected =
                  fulfillmentType === option.value;

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                      selected
                        ? "border-[#8B0000] bg-[#FFF7F5] text-[#8B0000]"
                        : "border-[#DDD3CC] text-[#756A66]"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`fulfillment-${
                        product?.name ?? "custom"
                      }`}
                      value={option.value}
                      checked={selected}
                      onChange={() =>
                        setFulfillmentType(
                          option.value
                        )
                      }
                      className="sr-only"
                    />
                    <Icon size={17} />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {fulfillmentType === "delivery" && (
            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Endereço de entrega
              </span>
              <textarea
                value={deliveryAddress}
                onChange={(event) =>
                  setDeliveryAddress(
                    event.target.value
                  )
                }
                rows={3}
                maxLength={300}
                disabled={saving}
                placeholder="Rua, número, bairro, cidade, complemento e referência"
                className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CC] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 disabled:opacity-60"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">
              Detalhes e observações
            </span>
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={4}
              placeholder="Tema, cores, massa, decoração, referência ou alguma restrição alimentar..."
              className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CC] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
            />
          </label>

          <TurnstileWidget
            action="preorder"
            onTokenChange={
              setTurnstileToken
            }
            resetKey={
              turnstileResetKey
            }
          />

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          )}

          <p className="text-center text-[11px] leading-4 text-[#756A66]">
            Ao enviar, seus dados serão usados para atender e acompanhar a
            encomenda, conforme o{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="font-bold text-[#8B0000] underline underline-offset-2"
            >
              Aviso de Privacidade
            </Link>
            .
          </p>

          <button
            type="submit"
            disabled={
              saving || !turnstileToken
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageCircle size={18} />
            {saving
              ? "Registrando encomenda..."
              : "Registrar e enviar pelo WhatsApp"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
