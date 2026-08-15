"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  ShoppingBag,
  Store,
  Truck,
  X,
} from "lucide-react";

import { createOrder } from "@/app/store/checkout/actions";
import { createClientRequestId } from "@/lib/client-request-id";
import type { StoreCheckoutSettings } from "./CartUI";

import { useCart } from "./CartProvider";
import TurnstileWidget from "./TurnstileWidget";

export type FulfillmentType =
  | "pickup"
  | "delivery";

type CheckoutDrawerProps = {
  storeSettings: StoreCheckoutSettings;
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
  open,
  onClose,
  onBack,
}: CheckoutDrawerProps) {
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
                "📍 *ENTREGA*",

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
                "📍 *RETIRADA NA LOJA*",
                storeSettings.pickupAddress,
              ].join("\n");

        /*
         * =====================================
         * MENSAGEM WHATSAPP
         * =====================================
         */

        const message = [
          "🍰 *LA'BEL CONFEITARIA*",

          `*Pedido #${result.orderNumber}*`,

          "",

          "👤 *CLIENTE*",

          `${firstName} ${lastName}`,

          `📱 ${customerPhone}`,

          "",

          "🛍️ *ITENS*",

          itemLines,

          "",

          receivingText,

          "",

          "🔎 *ACOMPANHE SEU PEDIDO*",

          `${window.location.origin}/pedido/${result.orderId}`,

          "",

          "💰 *RESUMO*",

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

          "Podemos confirmar o pedido? 😊",
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

        const encodedMessage =
          encodeURIComponent(
            message
          );

        const whatsappAppUrl =
          `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;

        const whatsappWebUrl =
          `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        /*
         * Pedido criado.
         */
        clearCart();
        idempotencyKeyRef.current = "";
        setTurnstileToken("");

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
      <aside className="absolute bottom-0 right-0 flex max-h-[95vh] w-full flex-col rounded-t-3xl bg-[#FFFDF9] shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none">
        {/* =====================================
            CABEÇALHO
        ===================================== */}

        <div className="flex items-center justify-between border-b border-[#EEE6DF] p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={
                handleBack
              }
              aria-label="Voltar"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] bg-white text-[#8B0000]"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B0000]">
                Checkout
              </p>

              <h2 className="font-bold text-[#241B19]">
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] bg-white text-[#756A66]"
          >
            <X size={19} />
          </button>
        </div>

        {/* =====================================
            CONTEÚDO
        ===================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* RESUMO */}
          <div className="flex items-center justify-between rounded-2xl bg-[#F7F0EA] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#8B0000]">
                <ShoppingBag
                  size={18}
                />
              </div>

              <div>
                <p className="text-xs text-[#756A66]">
                  Sua sacola
                </p>

                <p className="text-sm font-bold text-[#241B19]">
                  {totalItems}{" "}
                  item(ns)
                </p>
              </div>
            </div>

            <p className="font-bold text-[#8B0000]">
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
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                  Seus dados
                </p>

                <h3 className="mt-1 text-lg font-bold text-[#241B19]">
                  Identifique seu pedido
                </h3>

                <p className="mt-1 text-sm leading-6 text-[#756A66]">
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
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-[#241B19] outline-none transition focus:border-[#8B0000]"
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
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-[#241B19] outline-none focus:border-[#8B0000]"
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
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-[#241B19] outline-none focus:border-[#8B0000]"
                    />
                  </label>
                </div>
              </section>

              {/* RECEBIMENTO */}
              <section className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                  Recebimento
                </p>

                <h3 className="mt-1 text-lg font-bold text-[#241B19]">
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
                        ? "border-[#8B0000] bg-[#8B0000]/5"
                        : "border-[#EEE6DF] bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        fulfillmentType ===
                        "pickup"
                          ? "bg-[#8B0000] text-white"
                          : "bg-[#F7F0EA] text-[#8B0000]"
                      }`}
                    >
                      <Store
                        size={
                          19
                        }
                      />
                    </div>

                    <p className="mt-3 text-sm font-bold text-[#241B19]">
                      Retirada
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#756A66]">
                      Retirar na
                      La&apos;bel.
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
                        ? "border-[#8B0000] bg-[#8B0000]/5"
                        : "border-[#EEE6DF] bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        fulfillmentType ===
                        "delivery"
                          ? "bg-[#8B0000] text-white"
                          : "bg-[#F7F0EA] text-[#8B0000]"
                      }`}
                    >
                      <Truck
                        size={
                          19
                        }
                      />
                    </div>

                    <p className="mt-3 text-sm font-bold text-[#241B19]">
                      Entrega
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#756A66]">
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
                      contato com a confeitaria para mais informações.
                    </p>
                  )}

                {fulfillmentType ===
                  "pickup" && (
                  <div className="mt-4 flex gap-3 rounded-2xl bg-[#F7F0EA] p-4">
                    <MapPin
                      size={
                        18
                      }
                      className="mt-0.5 shrink-0 text-[#8B0000]"
                    />

                    <div>
                      <p className="text-xs font-bold text-[#241B19]">
                        Endereço para
                        retirada
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#756A66]">
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
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                Entrega
              </p>

              <h3 className="mt-1 text-lg font-bold text-[#241B19]">
                Onde devemos entregar?
              </h3>

              <div className="mt-5">
                <p className="font-bold text-[#241B19]">
                  Informe seu endereço
                </p>

                  <p className="mt-1 text-sm leading-6 text-[#756A66]">
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
                        className="h-12 min-w-0 flex-1 rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm text-[#241B19] outline-none transition focus:border-[#8B0000]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          void searchCep()
                        }
                        disabled={
                          cepLoading
                        }
                        className="h-12 rounded-xl bg-[#8B0000] px-4 text-sm font-bold text-white disabled:opacity-50"
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
                          className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
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
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
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
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
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
                          className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
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
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-[#F7F0EA] px-4 text-sm text-[#756A66]"
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
                            className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-[#F7F0EA] px-4 text-sm text-[#756A66]"
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
                          className="w-full resize-none rounded-xl border border-[#E6DDD6] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
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
              <section className="rounded-2xl border border-[#EEE6DF] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                  Cliente
                </p>

                <p className="mt-2 font-bold text-[#241B19]">
                  {firstName}{" "}
                  {lastName}
                </p>

                <p className="mt-1 text-sm text-[#756A66]">
                  {phone}
                </p>
              </section>

              {/* RECEBIMENTO */}
              <section className="rounded-2xl border border-[#EEE6DF] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                  Recebimento
                </p>

                {fulfillmentType ===
                "pickup" ? (
                  <>
                    <p className="mt-2 font-bold text-[#241B19]">
                      Retirada na
                      loja
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#756A66]">
                      {storeSettings.pickupAddress}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="font-bold text-[#241B19]">
                        Entrega
                      </p>

                      <span className="rounded-full bg-[#F7F0EA] px-2 py-1 text-[10px] font-bold text-[#8B0000]">
                        Endereço informado
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-[#756A66]">
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
                      <p className="mt-2 text-xs text-[#756A66]">
                        Referência:{" "}
                        {
                          reference
                        }
                      </p>
                    )}

                    <div className="mt-3 rounded-xl bg-[#F7F0EA] p-3">
                      <p className="text-xs text-[#756A66]">
                        Taxa de
                        entrega
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#8B0000]">
                        A consultar
                      </p>
                    </div>
                  </>
                )}
              </section>

              {/* VALORES */}
              <section className="rounded-2xl border border-[#EEE6DF] bg-white p-4">
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-[#756A66]">
                    Produtos
                  </span>

                  <span className="font-bold text-[#241B19]">
                    {formatCurrency(
                      subtotal
                    )}
                  </span>
                </div>

                {fulfillmentType ===
                  "delivery" && (
                  <div className="mt-3 flex justify-between gap-4">
                    <span className="text-sm text-[#756A66]">
                      Entrega
                    </span>

                    <span className="text-sm font-bold text-[#8B0000]">
                      A consultar
                    </span>
                  </div>
                )}

                <div className="mt-4 flex justify-between gap-4 border-t border-[#EEE6DF] pt-4">
                  <span className="font-bold text-[#241B19]">
                    Subtotal
                  </span>

                  <span className="text-xl font-bold text-[#8B0000]">
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

        <div className="border-t border-[#EEE6DF] bg-white p-5">
          {/* CLIENTE */}
          {step ===
            "customer" && (
            <button
              type="button"
              disabled={!customerValid}
              onClick={
                handleCustomerContinue
              }
              className="h-12 w-full rounded-xl bg-[#8B0000] text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-40"
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
              className="h-12 w-full rounded-xl bg-[#8B0000] text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-40"
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

              <p className="text-center text-[11px] leading-4 text-[#756A66]">
                Ao enviar, seus dados serão usados para atender e acompanhar
                o pedido, conforme o{" "}
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
                type="button"
                onClick={
                  handleCreateOrder
                }
                disabled={
                  isPending ||
                  !turnstileToken
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-60"
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
