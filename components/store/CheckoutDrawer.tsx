"use client";

import {
  useEffect,
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
  UserCheck,
  X,
} from "lucide-react";

import {
  createOrder,
  findCustomerByPhone,
  markOrderAsSentToWhatsapp,
} from "@/app/store/checkout/actions";

import { useCart } from "./CartProvider";

export type FulfillmentType =
  | "pickup"
  | "delivery";

type CheckoutDrawerProps = {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type CheckoutStep =
  | "customer"
  | "address"
  | "review";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

function isSupportedCity(city: string) {
  const normalized =
    normalizeCity(city);

  return (
    normalized === "palhoca" ||
    normalized === "sao jose"
  );
}

export default function CheckoutDrawer({
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

  const [step, setStep] =
    useState<CheckoutStep>(
      "customer"
    );

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [
    existingCustomer,
    setExistingCustomer,
  ] = useState(false);

  const [
    customerLoading,
    setCustomerLoading,
  ] = useState(false);

  const [
    customerLookupMessage,
    setCustomerLookupMessage,
  ] = useState("");

  const [
    fulfillmentType,
    setFulfillmentType,
  ] =
    useState<FulfillmentType | null>(
      null
    );

  const [cep, setCep] =
    useState("");

  const [street, setStreet] =
    useState("");

  const [number, setNumber] =
    useState("");

  const [complement, setComplement] =
    useState("");

  const [neighborhood, setNeighborhood] =
    useState("");

  const [city, setCity] =
    useState("");

  const [uf, setUf] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [cepLoading, setCepLoading] =
    useState(false);

  const [cepError, setCepError] =
    useState("");

  const [
    citySupported,
    setCitySupported,
  ] = useState<boolean | null>(
    null
  );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    orderError,
    setOrderError,
  ] = useState("");

  /*
   * =========================================
   * BUSCA AUTOMÁTICA DO CLIENTE
   * =========================================
   */

  useEffect(() => {
    const digits =
      phone.replace(/\D/g, "");

    setCustomerLookupMessage("");

    if (digits.length < 10) {
      setExistingCustomer(false);
      return;
    }

    const timer =
      window.setTimeout(
        async () => {
          setCustomerLoading(true);

          const result =
            await findCustomerByPhone(
              digits
            );

          setCustomerLoading(false);

          if (!result.success) {
            setCustomerLookupMessage(
              result.error
            );

            return;
          }

          if (!result.found) {
            setExistingCustomer(false);

            setCustomerLookupMessage(
              "Novo cliente. Informe seu nome e sobrenome."
            );

            return;
          }

          setFirstName(
            result.customer.firstName
          );

          setLastName(
            result.customer.lastName
          );

          setExistingCustomer(true);

          setCustomerLookupMessage(
            "Cadastro encontrado."
          );
        },
        500
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [phone]);

  if (!open) {
    return null;
  }

  const customerValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    phone.replace(/\D/g, "")
      .length >= 10 &&
    fulfillmentType !== null;

  const addressValid =
    cep.replace(/\D/g, "")
      .length === 8 &&
    street.trim().length >= 2 &&
    number.trim().length >= 1 &&
    neighborhood.trim().length >= 2 &&
    city.trim().length >= 2 &&
    uf.trim().length === 2 &&
    citySupported === true;

  function clearAddress() {
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
      clearAddress();

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
        clearAddress();

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

      setCity(resolvedCity);
      setUf(data.uf ?? "");

      const supported =
        isSupportedCity(
          resolvedCity
        );

      setCitySupported(
        supported
      );

      if (!supported) {
        setCepError(
          "No momento realizamos entregas somente em Palhoça e São José."
        );
      }
    } catch {
      clearAddress();

      setCepError(
        "Não foi possível consultar o CEP agora. Tente novamente."
      );
    } finally {
      setCepLoading(false);
    }
  }

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
    if (!addressValid) {
      return;
    }

    setStep("review");
  }

  function handleBack() {
    if (step === "address") {
      setStep("customer");
      return;
    }

    if (step === "review") {
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

  function handleCreateOrder() {
    if (isPending) {
      return;
    }

    setOrderError("");

    startTransition(async () => {
      const result =
        await createOrder({
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
                  zipCode: cep,
                  street,
                  number,
                  complement,
                  neighborhood,
                  city,
                  reference,
                }
              : undefined,

          items: items.map(
            (item) => ({
              productId: item.id,
              quantity:
                item.quantity,
            })
          ),
        });

      if (!result.success) {
        setOrderError(
          result.error
        );

        return;
      }

      const itemLines =
        items
          .map(
            (item) =>
              `${item.quantity}x ${item.name} - ${formatCurrency(
                item.price *
                  item.quantity
              )}`
          )
          .join("\n");

      const receivingText =
        fulfillmentType ===
        "delivery"
          ? [
              "Entrega",
              `${street}, ${number}${
                complement
                  ? ` - ${complement}`
                  : ""
              }`,
              `${neighborhood} - ${city}/${uf}`,
              reference
                ? `Referência: ${reference}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          : [
              "Retirada na loja",
              "Rua Capitão Augusto Vidal, 3600 - Palhoça/SC",
            ].join("\n");

      const message = [
        `Olá! Gostaria de confirmar o Pedido #${result.orderNumber}.`,
        "",
        `Cliente: ${firstName} ${lastName}`,
        `WhatsApp: ${phone}`,
        "",
        "ITENS",
        itemLines,
        "",
        receivingText,
        "",
        `Subtotal: ${formatCurrency(
          subtotal
        )}`,
        fulfillmentType ===
        "delivery"
          ? "Taxa de entrega: a consultar"
          : "",
        "",
        "Podemos confirmar o pedido?",
      ]
        .filter(
          (line) =>
            line !== ""
        )
        .join("\n");

      const whatsappNumber =
        "5548988681096";

      const encodedMessage =
        encodeURIComponent(
          message
        );

      const whatsappAppUrl =
        `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;

      const whatsappWebUrl =
        `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

      const statusResult =
        await markOrderAsSentToWhatsapp(
          result.orderId
        );

      if (
        !statusResult.success
      ) {
        setOrderError(
          statusResult.error ??
            "Não foi possível atualizar o status do pedido."
        );

        return;
      }

      clearCart();

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
    });
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Fechar checkout"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <aside className="absolute bottom-0 right-0 flex max-h-[95vh] w-full flex-col rounded-t-3xl bg-[#FFFDF9] shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b border-[#EEE6DF] p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] bg-white text-[#8B0000]"
            >
              <ArrowLeft size={18} />
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
            onClick={onClose}
            aria-label="Fechar checkout"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] bg-white text-[#756A66]"
          >
            <X size={19} />
          </button>
        </div>

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
                  {totalItems} item(ns)
                </p>
              </div>
            </div>

            <p className="font-bold text-[#8B0000]">
              {formatCurrency(
                subtotal
              )}
            </p>
          </div>

          {/* CLIENTE */}
          {step === "customer" && (
            <>
              <section className="mt-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                  Seus dados
                </p>

                <h3 className="mt-1 text-lg font-bold text-[#241B19]">
                  Identifique seu pedido
                </h3>

                <p className="mt-1 text-sm text-[#756A66]">
                  Informe primeiro seu
                  WhatsApp. Se você já
                  comprou com a
                  La&apos;bel, buscamos
                  seu cadastro
                  automaticamente.
                </p>

                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-bold text-[#49352C]">
                    WhatsApp
                  </span>

                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(
                        event
                      ) => {
                        setPhone(
                          event.target
                            .value
                        );

                        if (
                          existingCustomer
                        ) {
                          setExistingCustomer(
                            false
                          );

                          setFirstName(
                            ""
                          );

                          setLastName(
                            ""
                          );
                        }
                      }}
                      placeholder="(48) 99999-9999"
                      autoComplete="tel"
                      inputMode="tel"
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 pr-12 text-sm text-[#241B19] outline-none transition focus:border-[#8B0000]"
                    />

                    {customerLoading && (
                      <Loader2
                        size={17}
                        className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#8B0000]"
                      />
                    )}

                    {!customerLoading &&
                      existingCustomer && (
                        <UserCheck
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600"
                        />
                      )}
                  </div>
                </label>

                {customerLookupMessage && (
                  <div
                    className={`mt-3 rounded-xl p-3 text-xs font-semibold ${
                      existingCustomer
                        ? "bg-green-50 text-green-700"
                        : "bg-[#F7F0EA] text-[#756A66]"
                    }`}
                  >
                    {customerLookupMessage}
                  </div>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      Nome
                    </span>

                    <input
                      type="text"
                      value={firstName}
                      onChange={(
                        event
                      ) =>
                        setFirstName(
                          event.target
                            .value
                        )
                      }
                      readOnly={
                        existingCustomer
                      }
                      placeholder="Seu nome"
                      autoComplete="given-name"
                      className={`h-12 w-full rounded-xl border border-[#E6DDD6] px-4 text-sm outline-none ${
                        existingCustomer
                          ? "cursor-not-allowed bg-[#F7F0EA] text-[#756A66]"
                          : "bg-white text-[#241B19] focus:border-[#8B0000]"
                      }`}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      Sobrenome
                    </span>

                    <input
                      type="text"
                      value={lastName}
                      onChange={(
                        event
                      ) =>
                        setLastName(
                          event.target
                            .value
                        )
                      }
                      readOnly={
                        existingCustomer
                      }
                      placeholder="Seu sobrenome"
                      autoComplete="family-name"
                      className={`h-12 w-full rounded-xl border border-[#E6DDD6] px-4 text-sm outline-none ${
                        existingCustomer
                          ? "cursor-not-allowed bg-[#F7F0EA] text-[#756A66]"
                          : "bg-white text-[#241B19] focus:border-[#8B0000]"
                      }`}
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

                <div className="mt-5 grid grid-cols-2 gap-3">
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
                        size={19}
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
                        size={19}
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
                </div>

                {fulfillmentType ===
                  "pickup" && (
                  <div className="mt-4 flex gap-3 rounded-2xl bg-[#F7F0EA] p-4">
                    <MapPin
                      size={18}
                      className="mt-0.5 shrink-0 text-[#8B0000]"
                    />

                    <div>
                      <p className="text-xs font-bold text-[#241B19]">
                        Endereço para
                        retirada
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#756A66]">
                        Rua Capitão
                        Augusto Vidal,
                        3600 — Palhoça,
                        Santa Catarina
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ENDEREÇO */}
          {step === "address" && (
            <section className="mt-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                Entrega
              </p>

              <h3 className="mt-1 text-lg font-bold text-[#241B19]">
                Onde devemos entregar?
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#756A66]">
                Informe seu CEP e
                preencheremos o endereço
                automaticamente.
              </p>

              <div className="mt-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#49352C]">
                    CEP
                  </span>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cep}
                      onChange={(
                        event
                      ) => {
                        setCep(
                          formatCep(
                            event.target
                              .value
                          )
                        );

                        setCepError("");
                      }}
                      onBlur={() => {
                        if (
                          cep.replace(
                            /\D/g,
                            ""
                          ).length === 8
                        ) {
                          void searchCep();
                        }
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={9}
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
                          size={18}
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
                    {cepError}
                  </p>
                )}

                {citySupported ===
                  true && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700">
                    <CheckCircle2
                      size={16}
                    />

                    Entregamos nesta
                    região. A taxa será
                    confirmada pelo
                    WhatsApp.
                  </div>
                )}
              </div>

              {(street ||
                city ||
                neighborhood) && (
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      Rua
                    </span>

                    <input
                      type="text"
                      value={street}
                      onChange={(
                        event
                      ) =>
                        setStreet(
                          event.target
                            .value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
                    />
                  </label>

                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <label>
                      <span className="mb-2 block text-xs font-bold text-[#49352C]">
                        Número
                      </span>

                      <input
                        type="text"
                        value={number}
                        onChange={(
                          event
                        ) =>
                          setNumber(
                            event.target
                              .value
                          )
                        }
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
                            event.target
                              .value
                          )
                        }
                        className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
                      />
                    </label>
                  </div>

                  <label>
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
                          event.target
                            .value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-[#E6DDD6] bg-white px-4 text-sm outline-none focus:border-[#8B0000]"
                    />
                  </label>

                  <div className="grid grid-cols-[1fr_80px] gap-3">
                    <input
                      type="text"
                      value={city}
                      readOnly
                      className="h-12 rounded-xl border border-[#E6DDD6] bg-[#F7F0EA] px-4 text-sm text-[#756A66]"
                    />

                    <input
                      type="text"
                      value={uf}
                      readOnly
                      className="h-12 rounded-xl border border-[#E6DDD6] bg-[#F7F0EA] px-4 text-sm text-[#756A66]"
                    />
                  </div>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-[#49352C]">
                      Referência
                    </span>

                    <textarea
                      value={reference}
                      onChange={(
                        event
                      ) =>
                        setReference(
                          event.target
                            .value
                        )
                      }
                      rows={3}
                      className="w-full resize-none rounded-xl border border-[#E6DDD6] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                    />
                  </label>
                </div>
              )}
            </section>
          )}

          {/* REVISÃO */}
          {step === "review" && (
            <div className="mt-7 space-y-5">
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

              <section className="rounded-2xl border border-[#EEE6DF] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                  Recebimento
                </p>

                {fulfillmentType ===
                "pickup" ? (
                  <>
                    <p className="mt-2 font-bold">
                      Retirada na loja
                    </p>

                    <p className="mt-1 text-sm text-[#756A66]">
                      Rua Capitão Augusto
                      Vidal, 3600 —
                      Palhoça/SC
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 font-bold">
                      Entrega
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#756A66]">
                      {street},{" "}
                      {number}
                      {complement
                        ? ` - ${complement}`
                        : ""}
                      <br />
                      {neighborhood} —{" "}
                      {city}/{uf}
                    </p>

                    {reference && (
                      <p className="mt-2 text-xs text-[#756A66]">
                        Referência:{" "}
                        {reference}
                      </p>
                    )}

                    <div className="mt-3 rounded-xl bg-[#F7F0EA] p-3">
                      <p className="text-xs text-[#756A66]">
                        Taxa de entrega
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#8B0000]">
                        A consultar
                      </p>
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-[#EEE6DF] bg-white p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-[#756A66]">
                    Produtos
                  </span>

                  <span className="font-bold">
                    {formatCurrency(
                      subtotal
                    )}
                  </span>
                </div>

                {fulfillmentType ===
                  "delivery" && (
                  <div className="mt-3 flex justify-between">
                    <span className="text-sm text-[#756A66]">
                      Entrega
                    </span>

                    <span className="text-sm font-bold text-[#8B0000]">
                      A consultar
                    </span>
                  </div>
                )}

                <div className="mt-4 flex justify-between border-t border-[#EEE6DF] pt-4">
                  <span className="font-bold">
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

        {/* RODAPÉ */}
        <div className="border-t border-[#EEE6DF] bg-white p-5">
          {step === "customer" && (
            <button
              type="button"
              disabled={
                !customerValid ||
                customerLoading
              }
              onClick={
                handleCustomerContinue
              }
              className="h-12 w-full rounded-xl bg-[#8B0000] text-sm font-bold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          )}

          {step === "address" && (
            <button
              type="button"
              disabled={
                !addressValid
              }
              onClick={
                handleAddressContinue
              }
              className="h-12 w-full rounded-xl bg-[#8B0000] text-sm font-bold text-white disabled:opacity-40"
            >
              Revisar pedido
            </button>
          )}

          {step === "review" && (
            <div>
              {orderError && (
                <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {orderError}
                </div>
              )}

              <button
                type="button"
                onClick={
                  handleCreateOrder
                }
                disabled={
                  isPending
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] text-sm font-bold text-white disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Criando pedido...
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