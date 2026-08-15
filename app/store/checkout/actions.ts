"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  createActionFingerprint,
  enforcePublicOrderRateLimit,
  inspectIdempotentRequest,
  releaseIdempotentRequest,
  validateIdempotencyKey,
  verifyTurnstileToken,
} from "@/lib/public-action-security";

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type CheckoutAddress = {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  reference?: string;

  label?: string;
  isDefault?: boolean;
};

type CreateOrderInput = {
  idempotencyKey: string;
  turnstileToken: string;
  firstName: string;
  lastName: string;
  phone: string;

  orderType: "pickup" | "delivery";

  /*
   * O endereço é sempre informado pelo cliente.
   * O servidor pode reutilizar internamente um
   * cadastro idêntico, sem expor dados salvos.
   */
  address?: CheckoutAddress;

  items: CheckoutItem[];

  notes?: string;
};

type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNumber: number;
      total: number;
      deliveryFee: number;
      deliveryFeeType:
        | "fixed"
        | "consult"
        | null;
    }
  | {
      success: false;
      error: string;
    };

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeCep(value: string) {
  return value.replace(/\D/g, "");
}

/*
 * =========================================
 * CRIAR PEDIDO
 * =========================================
 */

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const idempotencyKey = String(
    input?.idempotencyKey ?? ""
  );
  let idempotencyStarted = false;
  let requestFingerprint = "";

  try {
    const supabase =
      createSupabaseAdminClient();

    /*
     * =========================================
     * 1. DADOS BÁSICOS
     * =========================================
     */

    const firstName =
      input.firstName.trim();

    const lastName =
      input.lastName.trim();

    const phone =
      normalizePhone(input.phone);
    const notes = String(
      input.notes ?? ""
    ).trim();

    if (
      firstName.length < 2 ||
      firstName.length > 100 ||
      lastName.length < 2 ||
      lastName.length > 100
    ) {
      return {
        success: false,
        error:
          "Informe seu nome e sobrenome.",
      };
    }

    if (
      phone.length < 10 ||
      phone.length > 13
    ) {
      return {
        success: false,
        error:
          "Informe um WhatsApp válido.",
      };
    }

    if (
      input.orderType !== "pickup" &&
      input.orderType !== "delivery"
    ) {
      return {
        success: false,
        error:
          "Tipo de recebimento inválido.",
      };
    }

    if (
      !Array.isArray(input.items) ||
      !input.items.length ||
      input.items.length > 50
    ) {
      return {
        success: false,
        error:
          "Sua sacola está vazia.",
      };
    }

    /*
     * =========================================
     * 2. NORMALIZAR ITENS
     * =========================================
     */

    const normalizedItems =
      input.items
        .map((item) => ({
          productId:
            item.productId,
          quantity: Math.floor(
            Number(item.quantity)
          ),
        }))
        .filter(
          (item) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              item.productId
            ) &&
            item.quantity > 0 &&
            item.quantity <= 1000
        );

    if (
      !normalizedItems.length
    ) {
      return {
        success: false,
        error:
          "Nenhum produto válido foi informado.",
      };
    }

    /*
     * Soma produtos duplicados enviados
     * pelo navegador.
     */
    const quantities =
      new Map<string, number>();

    for (
      const item of normalizedItems
    ) {
      quantities.set(
        item.productId,
        (quantities.get(
          item.productId
        ) ?? 0) + item.quantity
      );
    }

    if (
      [...quantities.values()].some(
        (quantity) => quantity > 1000
      )
    ) {
      return {
        success: false,
        error:
          "A quantidade informada é muito alta. Revise sua sacola.",
      };
    }

    const productIds = [
      ...quantities.keys(),
    ];

    /*
     * =========================================
     * 3. PRODUTOS E PREÇOS REAIS
     * =========================================
     */

    const {
      data: products,
      error: productsError,
    } = await supabase
      .from("products")
      .select(
        "id, name, price, active, available"
      )
      .in("id", productIds);

    if (productsError) {
      console.error(
        "Erro ao consultar produtos:",
        productsError
      );

      return {
        success: false,
        error:
          "Não foi possível validar os produtos.",
      };
    }

    if (
      !products ||
      products.length !==
        productIds.length
    ) {
      return {
        success: false,
        error:
          "Um ou mais produtos não foram encontrados.",
      };
    }

    let subtotal = 0;

    const orderItems =
      products.map((product) => {
        if (
          !product.active ||
          !product.available
        ) {
          throw new Error(
            `PRODUCT_UNAVAILABLE:${product.name}`
          );
        }

        const quantity =
          quantities.get(
            product.id
          ) ?? 0;

        const unitPrice =
          Number(product.price);

        subtotal +=
          unitPrice * quantity;

        return {
          product_id: product.id,
          product_name:
            product.name,
          quantity,
          unit_price:
            unitPrice,
        };
      });

    /*
     * =========================================
     * 4. LOCALIZAR CLIENTE
     * =========================================
     */

    const {
      data: existingCustomer,
      error:
        existingCustomerError,
    } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name"
      )
      .eq("phone", phone)
      .maybeSingle();

    if (existingCustomerError) {
      console.error(
        "Erro ao consultar cliente:",
        existingCustomerError
      );

      return {
        success: false,
        error:
          "Não foi possível consultar o cliente.",
      };
    }

    if (notes.length > 1000) {
      return {
        success: false,
        error:
          "As observações podem ter no máximo 1.000 caracteres.",
      };
    }

    if (
      !validateIdempotencyKey(
        idempotencyKey
      )
    ) {
      return {
        success: false,
        error:
          "Não foi possível identificar esta solicitação. Atualize a página e tente novamente.",
      };
    }

    if (
      existingCustomer &&
      (normalizeText(
        existingCustomer.first_name
      ) !== normalizeText(firstName) ||
        normalizeText(
          existingCustomer.last_name
        ) !== normalizeText(lastName))
    ) {
      return {
        success: false,
        error:
          "Não foi possível confirmar os dados informados. Confira o nome, o sobrenome e o WhatsApp.",
      };
    }

    requestFingerprint =
      createActionFingerprint({
        firstName:
          normalizeText(firstName),
        lastName:
          normalizeText(lastName),
        phone,
        orderType: input.orderType,
        address: input.address ?? null,
        items: [...normalizedItems].sort(
          (first, second) =>
            first.productId.localeCompare(
              second.productId
            )
        ),
        notes,
      });

    const previousRequest =
      await inspectIdempotentRequest<CreateOrderResult>(
        "daily-order",
        idempotencyKey,
        requestFingerprint
      );

    if (
      previousRequest.state ===
      "completed"
    ) {
      return previousRequest.result;
    }

    if (
      previousRequest.state === "pending"
    ) {
      return {
        success: false,
        error:
          "Este pedido já está sendo processado. Aguarde alguns segundos.",
      };
    }

    if (
      previousRequest.state === "conflict"
    ) {
      return {
        success: false,
        error:
          "Esta solicitação não corresponde ao pedido atual. Atualize a página e tente novamente.",
      };
    }

    const rateLimit =
      await enforcePublicOrderRateLimit(phone);

    if (!rateLimit.success) {
      return rateLimit;
    }

    const turnstile =
      await verifyTurnstileToken(
        String(
          input.turnstileToken ?? ""
        ),
        "daily_order",
        rateLimit.ip
      );

    if (!turnstile.success) {
      return turnstile;
    }

    /*
     * =========================================
     * 5. RESOLVER ENDEREÇO PARA VALIDAÇÃO
     * =========================================
     */

    let resolvedAddress:
      | CheckoutAddress
      | null = null;

    if (
      input.orderType ===
      "delivery"
    ) {
      if (!input.address) {
        return {
          success: false,
          error:
            "Informe o endereço de entrega.",
        };
      }

      if (
        typeof input.address.zipCode !==
          "string" ||
        typeof input.address.street !==
          "string" ||
        typeof input.address.number !==
          "string" ||
        typeof input.address.neighborhood !==
          "string" ||
        typeof input.address.city !== "string" ||
        typeof (
          input.address.complement ?? ""
        ) !== "string" ||
        typeof (
          input.address.reference ?? ""
        ) !== "string" ||
        input.address.street.length > 200 ||
        input.address.number.length > 30 ||
        input.address.neighborhood.length >
          100 ||
        input.address.city.length > 100 ||
        (input.address.complement?.length ??
          0) > 100 ||
        (input.address.reference?.length ?? 0) >
          300
      ) {
        return {
          success: false,
          error:
            "Revise os dados do endereço de entrega.",
        };
      }

      resolvedAddress =
        input.address;

      /*
       * -----------------------------------------
       * VALIDAÇÃO DO ENDEREÇO
       * -----------------------------------------
       */

      const zipCode =
        normalizeCep(
          resolvedAddress.zipCode
        );

      if (
        zipCode.length !== 8
      ) {
        return {
          success: false,
          error: "CEP inválido.",
        };
      }

      if (
        !resolvedAddress.street.trim() ||
        !resolvedAddress.number.trim() ||
        !resolvedAddress.neighborhood.trim() ||
        !resolvedAddress.city.trim()
      ) {
        return {
          success: false,
          error:
            "Preencha o endereço de entrega.",
        };
      }
    }

    /*
     * =========================================
     * 6. VALIDAR REGIÃO + TAXA
     * =========================================
     */

    let deliveryFee = 0;

    let deliveryFeeType:
      | "fixed"
      | "consult"
      | null = null;

    if (
      input.orderType ===
        "delivery" &&
      resolvedAddress
    ) {
      const {
        data: zones,
        error: zonesError,
      } = await supabase
        .from("delivery_zones")
        .select(
          "id, neighborhood, delivery_fee, fee_type"
        )
        .eq("active", true);

      if (zonesError) {
        console.error(
          "Erro ao consultar regiões:",
          zonesError
        );

        return {
          success: false,
          error:
            "Não foi possível validar a região de entrega.",
        };
      }

      const cityNormalized =
        normalizeText(
          resolvedAddress.city
        );

      const zone =
        zones?.find(
          (item) =>
            normalizeText(
              item.neighborhood
            ) ===
            cityNormalized
        );

      if (!zone) {
        return {
          success: false,
          error:
            "Ainda não realizamos entregas nesta região.",
        };
      }

      if (
        zone.fee_type ===
        "fixed"
      ) {
        deliveryFeeType =
          "fixed";

        deliveryFee = Number(
          zone.delivery_fee ?? 0
        );
      } else {
        deliveryFeeType =
          "consult";

        deliveryFee = 0;
      }
    }

    const idempotency =
      await beginIdempotentRequest<CreateOrderResult>(
        "daily-order",
        idempotencyKey,
        requestFingerprint
      );

    if (idempotency.state === "completed") {
      return idempotency.result;
    }

    if (idempotency.state === "pending") {
      return {
        success: false,
        error:
          "Este pedido já está sendo processado. Aguarde alguns segundos.",
      };
    }

    if (idempotency.state === "conflict") {
      return {
        success: false,
        error:
          "Esta solicitação não corresponde ao pedido atual. Atualize a página e tente novamente.",
      };
    }

    idempotencyStarted = true;
    const failProtectedRequest = async (
      error: string
    ): Promise<CreateOrderResult> => {
      await releaseIdempotentRequest(
        "daily-order",
        idempotencyKey
      );
      idempotencyStarted = false;

      return {
        success: false,
        error,
      };
    };

    /*
     * =========================================
     * 7. CRIAR CLIENTE SE NECESSÁRIO
     * =========================================
     */

    let customerId =
      existingCustomer?.id;

    /*
     * Cliente existente:
     * NÃO alteramos nome/sobrenome.
     */

    if (!customerId) {
      const {
        data: newCustomer,
        error: customerError,
      } = await supabase
        .from("customers")
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone,
        })
        .select("id")
        .single();

      if (
        customerError ||
        !newCustomer
      ) {
        console.error(
          "Erro ao criar cliente:",
          customerError
        );

        return failProtectedRequest(
          "Não foi possível cadastrar o cliente."
        );
      }

      customerId =
        newCustomer.id;
    }

    /*
     * =========================================
     * 8. RESOLVER / CRIAR ENDEREÇO
     * =========================================
     */

    let addressId:
      | string
      | null = null;

    if (
      input.orderType ===
        "delivery" &&
      resolvedAddress &&
      !addressId
    ) {
      const normalizedZipCode =
        normalizeCep(
          resolvedAddress.zipCode
        );

      /*
       * Evita criar novamente o mesmo
       * endereço para o cliente.
       *
       * Critério:
       * CEP + rua + número.
       */
      const {
        data: matchingAddresses,
        error:
          matchingAddressesError,
      } = await supabase
        .from("addresses")
        .select("id")
        .eq(
          "customer_id",
          customerId
        )
        .eq(
          "zip_code",
          normalizedZipCode
        )
        .eq(
          "street",
          resolvedAddress.street.trim()
        )
        .eq(
          "number",
          resolvedAddress.number.trim()
        )
        .limit(1);

      if (
        matchingAddressesError
      ) {
        console.error(
          "Erro ao verificar endereço existente:",
          matchingAddressesError
        );

        return failProtectedRequest(
          "Não foi possível verificar seu endereço."
        );
      }

      const matchingAddress =
        matchingAddresses?.[0];

      if (matchingAddress) {
        /*
         * Já existe.
         * Reutiliza.
         */
        addressId =
          matchingAddress.id;
      } else {
        /*
         * Se este endereço será o padrão,
         * removemos o padrão anterior.
         */
        if (
          resolvedAddress.isDefault
        ) {
          const {
            error:
              clearDefaultError,
          } = await supabase
            .from("addresses")
            .update({
              is_default: false,
            })
            .eq(
              "customer_id",
              customerId
            )
            .eq(
              "is_default",
              true
            );

          if (
            clearDefaultError
          ) {
            console.error(
              "Erro ao atualizar endereço principal:",
              clearDefaultError
            );

            return failProtectedRequest(
              "Não foi possível atualizar o endereço principal."
            );
          }
        }

        /*
         * Primeiro endereço do cliente:
         * automaticamente vira principal.
         */
        const {
          count:
            customerAddressCount,
          error:
            addressCountError,
        } = await supabase
          .from("addresses")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "customer_id",
            customerId
          );

        if (
          addressCountError
        ) {
          console.error(
            "Erro ao contar endereços:",
            addressCountError
          );
        }

        const shouldBeDefault =
          resolvedAddress.isDefault ===
            true ||
          (customerAddressCount ??
            0) === 0;

        const {
          data: newAddress,
          error: addressError,
        } = await supabase
          .from("addresses")
          .insert({
            customer_id:
              customerId,

            label:
              resolvedAddress.label?.trim() ||
              "Casa",

            zip_code:
              normalizedZipCode,

            street:
              resolvedAddress.street.trim(),

            number:
              resolvedAddress.number.trim(),

            complement:
              resolvedAddress.complement?.trim() ||
              null,

            neighborhood:
              resolvedAddress.neighborhood.trim(),

            city:
              resolvedAddress.city.trim(),

            reference:
              resolvedAddress.reference?.trim() ||
              null,

            is_default:
              shouldBeDefault,
          })
          .select("id")
          .single();

        if (
          addressError ||
          !newAddress
        ) {
          console.error(
            "Erro ao criar endereço:",
            addressError
          );

          return failProtectedRequest(
            "Não foi possível salvar o endereço."
          );
        }

        addressId =
          newAddress.id;
      }
    }

    /*
     * =========================================
     * 9. CRIAR PEDIDO
     * =========================================
     */

    const total =
      subtotal + deliveryFee;

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        customer_id:
          customerId,

        address_id:
          addressId,

        order_type:
          input.orderType,

        status: "sent_to_whatsapp",

        subtotal,

        delivery_fee:
          deliveryFee,

        total,

        notes:
          notes || null,
      })
      .select(
        "id, order_number"
      )
      .single();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "Erro ao criar pedido:",
        orderError
      );

      return failProtectedRequest(
        "Não foi possível criar o pedido."
      );
    }

    /*
     * =========================================
     * 10. CRIAR ITENS
     * =========================================
     */

    const itemsToInsert =
      orderItems.map(
        (item) => ({
          order_id:
            order.id,
          ...item,
        })
      );

    const {
      error: itemsError,
    } = await supabase
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error(
        "Erro ao criar itens:",
        itemsError
      );

      /*
       * Evita deixar pedido sem itens.
       */
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return failProtectedRequest(
        "Não foi possível salvar os itens do pedido."
      );
    }

    const result: CreateOrderResult = {
      success: true,
      orderId: order.id,

      orderNumber:
        Number(
          order.order_number
        ),

      total,

      deliveryFee,

      deliveryFeeType,
    };

    await completeIdempotentRequest(
      "daily-order",
      idempotencyKey,
      requestFingerprint,
      result
    );
    idempotencyStarted = false;

    return result;
  } catch (error) {
    if (idempotencyStarted) {
      await releaseIdempotentRequest(
        "daily-order",
        idempotencyKey
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith(
        "PRODUCT_UNAVAILABLE:"
      )
    ) {
      const productName =
        error.message.replace(
          "PRODUCT_UNAVAILABLE:",
          ""
        );

      return {
        success: false,
        error: `${productName} não está mais disponível.`,
      };
    }

    console.error(
      "Erro inesperado ao criar pedido:",
      error
    );

    return {
      success: false,
      error:
        "Ocorreu um erro ao criar o pedido.",
    };
  }
}
