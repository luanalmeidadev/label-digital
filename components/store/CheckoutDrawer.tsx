"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  QrCode,
  ShoppingBag,
  Store,
  Truck,
  X,
} from "lucide-react";

import { createOrder } from "@/app/store/checkout/actions";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { createClientRequestId } from "@/lib/client-request-id";
import {
  paymentMethodLabels,
  type PaymentMethod,
} from "@/lib/payment-method";
import type { StoreOpenStatus } from "@/lib/store-open-status";
import {
  buildWhatsAppAppUrl,
  buildWhatsAppShortUrl,
} from "@/lib/whatsapp-link";
import type { StoreCheckoutSettings } from "./CartUI";

import { useCart } from "./CartProvider";
import TurnstileWidget from "./TurnstileWidget";

const installation = getPublicInstallationProfile();

export type FulfillmentType =
  | "pickup"
  | "delivery";

type CheckoutDrawerProps = {
  storeSettings: StoreCheckoutSettings;
  storeStatus: StoreOpenStatus | null;
  open: boolean;
  onClose: () => void;
  onBack: () => void;
};

type CheckoutStep =
  | "customer"
  | "address"
  | "review";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

function formatCep(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(
    0,
    5
  )}-${digits.slice(5)}`;
}

function normalizeCity(value: string) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function isSupportedCity(
  city: string,
  deliveryCities: string[]
) {
  const normalized =
    normalizeCity(city);

  return deliveryCities.some(
    (deliveryCity) => normalizeCity(deliveryCity) === normalized
  );
}

export default function CheckoutDrawer({
  storeSettings,
  storeStatus,
  open,
  onClose,
  onBack,
}: CheckoutDrawerProps) {
  const router = useRouter();
  const {
    items,
    totalItems,
    subtotal,
    clearCart,
  } = useCart();

  /*
   * =========================================
   * ETAPAS
   * =========================================
   */

  const [step, setStep] =
    useState<CheckoutStep>(
      "customer"
    );

  /*
   * =========================================
   * CLIENTE
   * =========================================
   */

  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [phone, setPhone] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [needsChange, setNeedsChange] =
    useState(false);
  const [cashChangeFor, setCashChangeFor] =
    useState("");

  /*
   * =========================================
   * RECEBIMENTO
   * =========================================
   */

  const [
    fulfillmentType,
    setFulfillmentType,
  ] =
    useState<FulfillmentType | null>(
      null
    );

  /*
   * =========================================
   * ENDEREÇO
   * =========================================
   */

  const [cep, setCep] =
    useState("");

  const [street, setStreet] =
    useState("");

  const [number, setNumber] =
    useState("");

  const [
    complement,
    setComplement,
  ] = useState("");

  const [
    neighborhood,
    setNeighborhood,
  ] = useState("");

  const [city, setCity] =
    useState("");

  const [uf, setUf] =
    useState("");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    cepLoading,
    setCepLoading,
  ] = useState(false);

  const [
    cepError,
    setCepError,
  ] = useState("");

  const [
    citySupported,
    setCitySupported,
  ] = useState<
    boolean | null
  >(null);

  /*
   * =========================================
   * PEDIDO
   * =========================================
   */

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    orderError,
    setOrderError,
  ] = useState("");
  const [
    turnstileToken,
    setTurnstileToken,
  ] = useState("");
  const [
    turnstileResetKey,
    setTurnstileResetKey,
  ] = useState(0);
  const idempotencyKeyRef =
    useRef("");


  /*
   * =========================================
   * VALIDAÇÕES
   * =========================================
   */

  const customerValid =
    firstName.trim().length >=
      2 &&
    lastName.trim().length >=
      2 &&
    phone.replace(/\D/g, "")
      .length >= 10 &&
    fulfillmentType !== null;

  const newAddressValid =
    cep.replace(/\D/g, "")
      .length === 8 &&
    street.trim().length >=
      2 &&
    number.trim().length >=
      1 &&
    neighborhood.trim()
      .length >= 2 &&
    city.trim().length >= 2 &&
    uf.trim().length === 2 &&
    citySupported === true;

  const deliveryAddressValid =
    newAddressValid;

  const parsedCashChangeFor = Number(
    cashChangeFor.replace(",", ".")
  );
  const paymentValid =
    paymentMethod !== null &&
    (paymentMethod !== "cash" ||
      !needsChange ||
      (Number.isFinite(parsedCashChangeFor) &&
        parsedCashChangeFor >= subtotal));

  /*
   * =========================================
   * CEP
   * =========================================
   */

  function clearCepAddress() {
    setStreet("");
    setNeighborhood("");
    setCity("");
    setUf("");
    setCitySupported(null);
  }

  async function searchCep() {
    const digits =
      cep.replace(/\D/g, "");

    setCepError("");

    if (digits.length !== 8) {
      clearCepAddress();

      setCepError(
        "Informe um CEP com 8 dígitos."
      );

      return;
    }

    setCepLoading(true);

    try {
      const response =
        await fetch(
          `https://viacep.com.br/ws/${digits}/json/`
        );

      if (!response.ok) {
        throw new Error();
      }

      const data =
        (await response.json()) as ViaCepResponse;

      if (data.erro) {
        clearCepAddress();

        setCepError(
          "CEP não encontrado."
        );

        return;
      }

      const resolvedCity =
        data.localidade ?? "";

      setStreet(
        data.logradouro ?? ""
      );

      setNeighborhood(
        data.bairro ?? ""
      );

      setCity(
        resolvedCity
      );

      setUf(
        data.uf ?? ""
      );

      const supported =
        isSupportedCity(
          resolvedCity,
          storeSettings.deliveryCities
        );

      setCitySupported(
        supported
      );

      if (!supported) {
        setCepError(
          storeSettings.deliveryCities.length > 0
            ? `No momento realizamos entregas somente em ${new Intl.ListFormat(
                "pt-BR",
                { style: "long", type: "conjunction" }
              ).format(storeSettings.deliveryCities)}.`
            : "No momento não há regiões de entrega disponíveis."
        );
      }
    } catch {
      clearCepAddress();

      setCepError(
        "Não foi possível consultar o CEP agora. Tente novamente."
      );
    } finally {
      setCepLoading(false);
    }
  }

  /*
   * =========================================
   * NAVEGAÇÃO
   * =========================================
   */

  function handleCustomerContinue() {
    if (!customerValid) {
      return;
    }

    if (
      fulfillmentType ===
      "delivery"
    ) {
      setStep("address");

      return;
    }

    setStep("review");
  }

  function handleAddressContinue() {
    if (
      !deliveryAddressValid
    ) {
      return;
    }

    setStep("review");
  }

  function handleBack() {
    if (
      step === "address"
    ) {
      setStep("customer");

      return;
    }

    if (
      step === "review"
    ) {
      if (
        fulfillmentType ===
        "delivery"
      ) {
        setStep("address");
      } else {
        setStep("customer");
      }

      return;
    }

    onBack();
  }

  /*
   * =========================================
   * CRIAR PEDIDO
   * =========================================
   */

  function handleCreateOrder() {
    if (isPending) {
      return;
    }

    if (!storeStatus?.isOpen) {
      setOrderError(
        storeStatus
          ? `A loja está fechada agora. ${storeStatus.detail}. Seu carrinho continua salvo.`
          : "Não foi possível confirmar o horário da loja. Seu carrinho continua salvo."
      );

      return;
    }

    if (items.length === 0) {
      setOrderError(
        "Sua sacola está vazia."
      );

      return;
    }

    if (!turnstileToken) {
      setOrderError(
        "Confirme a verificação de segurança."
      );

      return;
    }

    if (!paymentMethod || !paymentValid) {
      setOrderError(
        paymentMethod === "cash" && needsChange
          ? "Informe um valor para troco igual ou maior que o pedido."
          : "Escolha a forma de pagamento."
      );

      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        createClientRequestId();
    }

    setOrderError("");

    startTransition(
      async () => {
        let result: Awaited<
          ReturnType<typeof createOrder>
        >;

        try {
          result = await createOrder({
            idempotencyKey:
              idempotencyKeyRef.current,
            turnstileToken,
            firstName,
            lastName,
            phone,

            orderType:
              fulfillmentType ===
              "delivery"
                ? "delivery"
                : "pickup",

            paymentMethod,
            cashChangeFor:
              paymentMethod === "cash" &&
              needsChange
                ? parsedCashChangeFor
                : null,

            address:
              fulfillmentType ===
                "delivery"
                ? {
                    zipCode:
                      cep,
                    street,
                    number,
                    complement,
                    neighborhood,
                    city,
                    reference,

                    label: "Casa",
                    isDefault: false,
                  }
                : undefined,

            items: items.map(
              (item) => ({
                productId:
                  item.id,

                catalogVersion:
                  item.catalogVersion,

                variantId:
                  item.variant?.id ?? null,

                optionIds:
                  item.options.map((option) => option.id),

                itemNotes:
                  item.itemNotes,

                quantity:
                  item.quantity,
              })
            ),
          });
        } catch {
          setOrderError(
            "Não foi possível conectar ao servidor. Confira sua internet e tente novamente."
          );
          setTurnstileToken("");
          setTurnstileResetKey(
            (current) => current + 1
          );
          return;
        }

        if (!result.success) {
          idempotencyKeyRef.current = "";
          setOrderError(
            result.error
          );
          if (result.code === "CATALOG_REVIEW_REQUIRED") {
            router.refresh();
          }
          setTurnstileToken("");
          setTurnstileResetKey(
            (current) => current + 1
          );

          return;
        }

        /*
         * =====================================
         * ITENS DA MENSAGEM
         * =====================================
         */

        const itemLines =
          items
            .map(
              (item) =>
                `${item.quantity}x ${item.name} — ${formatCurrency(
                  item.price *
                    item.quantity
                )}`
            )
            .join("\n");

        const customerPhone =
          phone.replace(
            /\D/g,
            ""
          );

        /*
         * =====================================
         * ENDEREÇO USADO
         * =====================================
         */

        const deliveryStreet =
          street;

        const deliveryNumber =
          number;

        const deliveryComplement =
          complement;

        const deliveryNeighborhood =
          neighborhood;

        const deliveryCity =
          city;

        const deliveryReference =
          reference;

        const deliveryCep =
          cep;

        /*
         * =====================================
         * RECEBIMENTO
         * =====================================
         */

        const receivingText =
          fulfillmentType ===
          "delivery"
            ? [
                "\u{1F4CD} *ENTREGA*",

                `${deliveryStreet}, ${deliveryNumber}${
                  deliveryComplement
                    ? ` - ${deliveryComplement}`
                    : ""
                }`,

                `${deliveryNeighborhood} - ${deliveryCity}/SC`,

                `CEP: ${deliveryCep}`,

                deliveryReference
                  ? `Referência: ${deliveryReference}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n")
            : [
                "\u{1F4CD} *RETIRADA NA LOJA*",
                storeSettings.pickupAddress,
              ].join("\n");

        /*
         * =====================================
         * MENSAGEM WHATSAPP
         * =====================================
         */

        const message = [
          `\u{1F370} *${installation.identity.name.toLocaleUpperCase(
            installation.regionalization.locale
          )}*`,

          `*Pedido #${result.orderNumber}*`,

          "",

          "\u{1F464} *CLIENTE*",

          `${firstName} ${lastName}`,

          `\u{1F4F1} ${customerPhone}`,

          "",

          "\u{1F6CD}\uFE0F *ITENS*",

          itemLines,

          "",

          receivingText,

          "",

          "\u{1F50E} *ACOMPANHE SEU PEDIDO*",

          `${window.location.origin}/pedido/${result.orderId}?token=${encodeURIComponent(result.trackingToken)}`,

          "",

          "\u{1F4B3} *PAGAMENTO*",

          paymentMethodLabels[paymentMethod],

          paymentMethod === "cash"
            ? needsChange
              ? `Troco para: ${formatCurrency(parsedCashChangeFor)}`
              : "Não precisa de troco"
            : null,

          "",

          "\u{1F4B0} *RESUMO*",

          `Produtos: ${formatCurrency(
            subtotal
          )}`,

          fulfillmentType ===
          "delivery"
            ? result.deliveryFeeType ===
              "fixed"
              ? `Taxa de entrega: ${formatCurrency(
                  result.deliveryFee
                )}`
              : "Taxa de entrega: *a consultar*"
            : null,

          fulfillmentType ===
            "delivery" &&
          result.deliveryFeeType ===
            "fixed"
            ? `*Total: ${formatCurrency(
                result.total
              )}*`
            : `*Subtotal: ${formatCurrency(
                subtotal
              )}*`,

          "",

          "Podemos confirmar o pedido? \u{1F60A}",
        ]
          .filter(
            (line) =>
              line !== null
          )
          .join("\n");

        /*
         * =====================================
         * WHATSAPP
         * =====================================
         */

        const storeWhatsAppDigits = storeSettings.whatsapp.replace(/\D/g, "");
        const whatsappNumber =
          storeWhatsAppDigits.length === 10 || storeWhatsAppDigits.length === 11
            ? `55${storeWhatsAppDigits}`
            : storeWhatsAppDigits;

        const whatsappAppUrl =
          buildWhatsAppAppUrl(
            whatsappNumber,
            message
          );

        const whatsappWebUrl =
          buildWhatsAppShortUrl(
            whatsappNumber,
            message
          );

        /*
         * Pedido criado.
         */
        clearCart();
        idempotencyKeyRef.current = "";
        setTurnstileToken("");
        setPaymentMethod(null);
        setNeedsChange(false);
        setCashChangeFor("");

        const isMobile =
          /Android|iPhone|iPad|iPod/i.test(
            navigator.userAgent
          );

        if (isMobile) {
          window.location.href =
            whatsappAppUrl;
        } else {
          window.open(
            whatsappWebUrl,
            "_blank",
            "noopener,noreferrer"
          );
        }

        onClose();
      }
    );
  }

  /*
   * =========================================
   * RENDER
   * =========================================
   */

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* OVERLAY */}
      <button
        type="button"
        aria-label="Fechar checkout"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* DRAWER */}
      <aside className="absolute bottom-0 right-0 flex max-h-[95vh] w-full flex-col rounded-t-3xl bg-brand-background shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none">
        {/* =====================================
            CABEÇALHO
        ===================================== */}

        <div className="flex items-center justify-between border-b border-brand-border p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={
                handleBack
              }
              aria-label="Voltar"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-primary"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-primary">
                Checkout
              </p>

              <h2 className="font-bold text-brand-foreground">
                {step ===
                "customer"
                  ? "Finalizar pedido"
                  : step ===
                      "address"
                    ? "Endereço de entrega"
                    : "Revisar pedido"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Fechar checkout"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-muted-foreground"
          >
            <X size={19} />
          </button>
        </div>

        {/* =====================================
            CONTEÚDO
        ===================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* RESUMO */}
          <div className="flex items-center justify-between rounded-2xl bg-brand-surface-muted p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-primary">
                <ShoppingBag
                  size={18}
                />
              </div>

              <div>
                <p className="text-xs text-brand-muted-foreground">
                  Sua sacola
                </p>

                <p className="text-sm font-bold text-brand-foreground">
                  {totalItems}{" "}
                  item(ns)
                </p>
              </div>
            </div>

            <p className="font-bold text-brand-primary">
              {formatCurrency(
                subtotal
              )}
            </p>
          </div>

          {/* =================================
              ETAPA 1 - CLIENTE
          ================================= */}

          {step ===
            "customer" && (
            <>
              <section className="mt-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                  Seus dados
                </p>

                <h3 className="mt-1 text-lg font-bold text-brand-foreground">
                  Identifique seu pedido
                </h3>

                <p className="mt-1 text-sm leading-6 text-brand-muted-foreground">
                  Informe seu nome e o
                  WhatsApp que será usado
                  no atendimento do pedido.
                </p>

                {/* TELEFONE */}
                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-bold text-[#49352C]">
                    WhatsApp
                  </span>

                  <div className="relative">
                    <input
                      type="tel"
                      value={
                        phone
                      }
                      onChange={(
                        event
                      ) =>
                        setPhone(
                          event.target.value
                        )
                      }
                      placeholder="(48) 99999-9999"
                      autoComplete="tel"
                      inputMode="tel"
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-brand-foreground outline-none transition focus:border-brand-primary"
                    />
                  </div>
                </label>

                {/* NOME */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      Nome
                    </span>

                    <input
                      type="text"
                      value={
                        firstName
                      }
                      onChange={(
                        event
                      ) =>
                        setFirstName(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Seu nome"
                      autoComplete="given-name"
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-brand-foreground outline-none focus:border-brand-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      Sobrenome
                    </span>

                    <input
                      type="text"
                      value={
                        lastName
                      }
                      onChange={(
                        event
                      ) =>
                        setLastName(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Seu sobrenome"
                      autoComplete="family-name"
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-brand-foreground outline-none focus:border-brand-primary"
                    />
                  </label>
                </div>
              </section>

              {/* RECEBIMENTO */}
              <section className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                  Recebimento
                </p>

                <h3 className="mt-1 text-lg font-bold text-brand-foreground">
                  Como deseja receber?
                </h3>

                <div
                  className={`mt-5 grid gap-3 ${
                    storeSettings.pickupEnabled && storeSettings.deliveryEnabled
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {/* RETIRADA */}
                  {storeSettings.pickupEnabled && (
                  <button
                    type="button"
                    onClick={() =>
                      setFulfillmentType(
                        "pickup"
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      fulfillmentType ===
                      "pickup"
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-brand-border bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        fulfillmentType ===
                        "pickup"
                          ? "bg-brand-primary text-brand-primary-foreground"
                          : "bg-brand-surface-muted text-brand-primary"
                      }`}
                    >
                      <Store
                        size={
                          19
                        }
                      />
                    </div>

                    <p className="mt-3 text-sm font-bold text-brand-foreground">
                      Retirada
                    </p>

                    <p className="mt-1 text-xs leading-5 text-brand-muted-foreground">
                      Retirar na{" "}
                      {installation.identity.shortName}.
                    </p>
                  </button>
                  )}

                  {/* ENTREGA */}
                  {storeSettings.deliveryEnabled && (
                  <button
                    type="button"
                    onClick={() =>
                      setFulfillmentType(
                        "delivery"
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      fulfillmentType ===
                      "delivery"
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-brand-border bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        fulfillmentType ===
                        "delivery"
                          ? "bg-brand-primary text-brand-primary-foreground"
                          : "bg-brand-surface-muted text-brand-primary"
                      }`}
                    >
                      <Truck
                        size={
                          19
                        }
                      />
                    </div>

                    <p className="mt-3 text-sm font-bold text-brand-foreground">
                      Entrega
                    </p>

                    <p className="mt-1 text-xs leading-5 text-brand-muted-foreground">
                      Receber no seu
                      endereço.
                    </p>
                  </button>
                  )}
                </div>

                {!storeSettings.pickupEnabled &&
                  !storeSettings.deliveryEnabled && (
                    <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                      Os pedidos estão temporariamente indisponíveis. Entre em
                      contato com a {installation.identity.shortName} para mais informações.
                    </p>
                  )}

                {fulfillmentType ===
                  "pickup" && (
                  <div className="mt-4 flex gap-3 rounded-2xl bg-brand-surface-muted p-4">
                    <MapPin
                      size={
                        18
                      }
                      className="mt-0.5 shrink-0 text-brand-primary"
                    />

                    <div>
                      <p className="text-xs font-bold text-brand-foreground">
                        Endereço para
                        retirada
                      </p>

                      <p className="mt-1 text-xs leading-5 text-brand-muted-foreground">
                        {storeSettings.pickupAddress}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* =================================
              ETAPA 2 - ENDEREÇO
          ================================= */}

          {step ===
            "address" && (
            <section className="mt-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                Entrega
              </p>

              <h3 className="mt-1 text-lg font-bold text-brand-foreground">
                Onde devemos entregar?
              </h3>

              <div className="mt-5">
                <p className="font-bold text-brand-foreground">
                  Informe seu endereço
                </p>

                  <p className="mt-1 text-sm leading-6 text-brand-muted-foreground">
                    Informe seu CEP e
                    preencheremos os
                    dados automaticamente.
                  </p>

                  {/* CEP */}
                  <label className="mt-5 block">
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      CEP
                    </span>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={
                          cep
                        }
                        onChange={(
                          event
                        ) => {
                          setCep(
                            formatCep(
                              event
                                .target
                                .value
                            )
                          );

                          setCepError(
                            ""
                          );
                        }}
                        onBlur={() => {
                          if (
                            cep.replace(
                              /\D/g,
                              ""
                            )
                              .length ===
                            8
                          ) {
                            void searchCep();
                          }
                        }}
                        placeholder="00000-000"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={
                          9
                        }
                        className="h-12 min-w-0 flex-1 rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-brand-foreground outline-none transition focus:border-brand-primary"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          void searchCep()
                        }
                        disabled={
                          cepLoading
                        }
                        className="h-12 rounded-xl bg-brand-primary px-4 text-sm font-bold text-brand-primary-foreground disabled:opacity-50"
                      >
                        {cepLoading ? (
                          <Loader2
                            size={
                              18
                            }
                            className="animate-spin"
                          />
                        ) : (
                          "Buscar"
                        )}
                      </button>
                    </div>
                  </label>

                  {cepError && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {
                        cepError
                      }
                    </p>
                  )}

                  {citySupported ===
                    true && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700">
                      <CheckCircle2
                        size={
                          16
                        }
                      />

                      Entregamos nesta
                      região. A taxa
                      será confirmada
                      pelo WhatsApp.
                    </div>
                  )}

                  {/* CAMPOS */}
                  {(street ||
                    city ||
                    neighborhood) && (
                    <div className="mt-6 space-y-4">
                      {/* RUA */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-[#49352C]">
                          Rua
                        </span>

                        <input
                          type="text"
                          value={
                            street
                          }
                          onChange={(
                            event
                          ) =>
                            setStreet(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Rua"
                          className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-brand-primary"
                        />
                      </label>

                      {/* NÚMERO / COMPLEMENTO */}
                      <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-xs font-bold text-[#49352C]">
                            Número
                          </span>

                          <input
                            type="text"
                            value={
                              number
                            }
                            onChange={(
                              event
                            ) =>
                              setNumber(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="123"
                            inputMode="numeric"
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-brand-primary"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-bold text-[#49352C]">
                            Complemento
                          </span>

                          <input
                            type="text"
                            value={
                              complement
                            }
                            onChange={(
                              event
                            ) =>
                              setComplement(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Apto, bloco..."
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-brand-primary"
                          />
                        </label>
                      </div>

                      {/* BAIRRO */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-[#49352C]">
                          Bairro
                        </span>

                        <input
                          type="text"
                          value={
                            neighborhood
                          }
                          onChange={(
                            event
                          ) =>
                            setNeighborhood(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Bairro"
                          className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-brand-primary"
                        />
                      </label>

                      {/* CIDADE / UF */}
                      <div className="grid grid-cols-[1fr_80px] gap-3">
                        <label>
                          <span className="mb-2 block text-xs font-bold text-[#49352C]">
                            Cidade
                          </span>

                          <input
                            type="text"
                            value={
                              city
                            }
                            readOnly
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-brand-surface-muted px-4 text-sm text-brand-muted-foreground"
                          />
                        </label>

                        <label>
                          <span className="mb-2 block text-xs font-bold text-[#49352C]">
                            UF
                          </span>

                          <input
                            type="text"
                            value={
                              uf
                            }
                            readOnly
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-brand-surface-muted px-4 text-sm text-brand-muted-foreground"
                          />
                        </label>
                      </div>

                      {/* REFERÊNCIA */}
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-[#49352C]">
                          Referência
                        </span>

                        <textarea
                          value={
                            reference
                          }
                          onChange={(
                            event
                          ) =>
                            setReference(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Ex.: portão preto, próximo à farmácia..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-[#E6DDD6] bg-white px-4 py-3 text-sm outline-none focus:border-brand-primary"
                        />
                      </label>

                    </div>
                  )}
                </div>
            </section>
          )}

          {/* =================================
              ETAPA 3 - REVISÃO
          ================================= */}

          {step ===
            "review" && (
            <div className="mt-7 space-y-5">
              {/* CLIENTE */}
              <section className="rounded-2xl border border-brand-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                  Cliente
                </p>

                <p className="mt-2 font-bold text-brand-foreground">
                  {firstName}{" "}
                  {lastName}
                </p>

                <p className="mt-1 text-sm text-brand-muted-foreground">
                  {phone}
                </p>
              </section>

              {/* RECEBIMENTO */}
              <section className="rounded-2xl border border-brand-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                  Recebimento
                </p>

                {fulfillmentType ===
                "pickup" ? (
                  <>
                    <p className="mt-2 font-bold text-brand-foreground">
                      Retirada na
                      loja
                    </p>

                    <p className="mt-1 text-sm leading-6 text-brand-muted-foreground">
                      {storeSettings.pickupAddress}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="font-bold text-brand-foreground">
                        Entrega
                      </p>

                      <span className="rounded-full bg-brand-surface-muted px-2 py-1 text-[10px] font-bold text-brand-primary">
                        Endereço informado
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-brand-muted-foreground">
                      {street},{" "}
                      {number}

                      {complement
                        ? ` - ${complement}`
                        : ""}

                      <br />

                      {neighborhood}{" "}
                      — {city}/{uf}
                    </p>

                    {reference && (
                      <p className="mt-2 text-xs text-brand-muted-foreground">
                        Referência:{" "}
                        {
                          reference
                        }
                      </p>
                    )}

                    <div className="mt-3 rounded-xl bg-brand-surface-muted p-3">
                      <p className="text-xs text-brand-muted-foreground">
                        Taxa de
                        entrega
                      </p>

                      <p className="mt-1 text-sm font-bold text-brand-primary">
                        A consultar
                      </p>
                    </div>
                  </>
                )}
              </section>

              {/* VALORES */}
              <section className="rounded-2xl border border-brand-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                  Forma de pagamento
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: "cash",
                        label: "Dinheiro",
                        icon: Banknote,
                      },
                      {
                        id: "pix",
                        label: "Pix",
                        icon: QrCode,
                      },
                      {
                        id: "debit_card",
                        label: "Débito",
                        icon: CreditCard,
                      },
                      {
                        id: "credit_card",
                        label: "Crédito",
                        icon: CreditCard,
                      },
                    ] as const
                  ).map((method) => {
                    const Icon = method.icon;
                    const selected =
                      paymentMethod === method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id);

                          if (method.id !== "cash") {
                            setNeedsChange(false);
                            setCashChangeFor("");
                          }
                        }}
                        className={`flex min-h-16 items-center gap-2 rounded-xl border p-3 text-left text-sm font-bold transition ${
                          selected
                            ? "border-brand-primary bg-brand-primary text-brand-primary-foreground"
                            : "border-[#E6DDD6] text-[#49352C] hover:border-brand-secondary"
                        }`}
                      >
                        <Icon size={18} />
                        {method.label}
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === "cash" && (
                  <div className="mt-4 rounded-xl bg-[#FFF7F5] p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#49352C]">
                      <input
                        type="checkbox"
                        checked={needsChange}
                        onChange={(event) => {
                          setNeedsChange(event.target.checked);

                          if (!event.target.checked) {
                            setCashChangeFor("");
                          }
                        }}
                        className="h-4 w-4 accent-brand-primary"
                      />
                      Preciso de troco
                    </label>

                    {needsChange && (
                      <label className="mt-3 block">
                        <span className="mb-2 block text-xs font-bold text-brand-muted-foreground">
                          Troco para quanto?
                        </span>
                        <div className="flex h-11 items-center rounded-xl border border-[#E6DDD6] bg-white px-3 focus-within:border-brand-primary">
                          <span className="mr-2 text-sm font-bold text-brand-muted-foreground">
                            R$
                          </span>
                          <input
                            type="number"
                            min={subtotal}
                            step="0.01"
                            inputMode="decimal"
                            value={cashChangeFor}
                            onChange={(event) =>
                              setCashChangeFor(event.target.value)
                            }
                            placeholder="0,00"
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                          />
                        </div>
                        {cashChangeFor && !paymentValid && (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            O valor deve ser igual ou maior que o pedido.
                          </p>
                        )}
                      </label>
                    )}
                  </div>
                )}
              </section>

              {/* VALORES */}
              <section className="rounded-2xl border border-brand-border bg-white p-4">
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-brand-muted-foreground">
                    Produtos
                  </span>

                  <span className="font-bold text-brand-foreground">
                    {formatCurrency(
                      subtotal
                    )}
                  </span>
                </div>

                {fulfillmentType ===
                  "delivery" && (
                  <div className="mt-3 flex justify-between gap-4">
                    <span className="text-sm text-brand-muted-foreground">
                      Entrega
                    </span>

                    <span className="text-sm font-bold text-brand-primary">
                      A consultar
                    </span>
                  </div>
                )}

                <div className="mt-4 flex justify-between gap-4 border-t border-brand-border pt-4">
                  <span className="font-bold text-brand-foreground">
                    Subtotal
                  </span>

                  <span className="text-xl font-bold text-brand-primary">
                    {formatCurrency(
                      subtotal
                    )}
                  </span>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* =====================================
            RODAPÉ
        ===================================== */}

        <div className="border-t border-brand-border bg-white p-5">
          {/* CLIENTE */}
          {step ===
            "customer" && (
            <button
              type="button"
              disabled={!customerValid}
              onClick={
                handleCustomerContinue
              }
              className="h-12 w-full rounded-xl bg-brand-primary text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          )}

          {/* ENDEREÇO */}
          {step === "address" && (
            <button
              type="button"
              disabled={
                !deliveryAddressValid ||
                cepLoading
              }
              onClick={
                handleAddressContinue
              }
              className="h-12 w-full rounded-xl bg-brand-primary text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cepLoading
                ? "Consultando CEP..."
                : "Revisar pedido"}
            </button>
          )}

          {/* REVISÃO */}
          {step ===
            "review" && (
            <div className="space-y-3">
              {!storeStatus?.isOpen && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                  {storeStatus
                    ? `A loja está fechada agora. ${storeStatus.detail}. Seu carrinho está salvo e poderá ser finalizado quando abrirmos.`
                    : "Estamos verificando o horário da loja. Seu carrinho continua salvo."}
                </div>
              )}

              <TurnstileWidget
                action="daily_order"
                onTokenChange={
                  setTurnstileToken
                }
                resetKey={
                  turnstileResetKey
                }
              />

              {orderError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {
                    orderError
                  }
                </div>
              )}

              <p className="text-center text-[11px] leading-4 text-brand-muted-foreground">
                Ao enviar, seus dados serão usados para atender e acompanhar
                o pedido, conforme o{" "}
                <Link
                  href="/privacidade"
                  target="_blank"
                  className="font-bold text-brand-primary underline underline-offset-2"
                >
                  Aviso de Privacidade
                </Link>
                .
              </p>

              <button
                type="button"
                onClick={
                  handleCreateOrder
                }
                disabled={
                  isPending ||
                  !turnstileToken ||
                  !storeStatus?.isOpen ||
                  !paymentValid
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2
                      size={
                        17
                      }
                      className="animate-spin"
                    />

                    Criando
                    pedido...
                  </>
                ) : !storeStatus?.isOpen ? (
                  "Carrinho salvo — loja fechada"
                ) : (
                  "Enviar pedido pelo WhatsApp"
                )}
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
