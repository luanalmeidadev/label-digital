"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
};

type CreateOrderInput = {
  firstName: string;
  lastName: string;
  phone: string;

  orderType: "pickup" | "delivery";

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
    }
  | {
      success: false;
      error: string;
    };

type FindCustomerResult =
  | {
      success: true;
      found: false;
    }
  | {
      success: true;
      found: true;
      customer: {
        id: string;
        firstName: string;
        lastName: string;
      };
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

/*
 * =========================================
 * BUSCAR CLIENTE PELO TELEFONE
 * =========================================
 */

export async function findCustomerByPhone(
  phoneInput: string
): Promise<FindCustomerResult> {
  try {
    const phone =
      phoneInput.replace(/\D/g, "");

    if (phone.length < 10) {
      return {
        success: true,
        found: false,
      };
    }

    const supabase =
      createSupabaseAdminClient();

    const {
      data: customer,
      error,
    } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name"
      )
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error(
        "Erro ao buscar cliente:",
        error
      );

      return {
        success: false,
        error:
          "Não foi possível consultar seus dados.",
      };
    }

    if (!customer) {
      return {
        success: true,
        found: false,
      };
    }

    return {
      success: true,
      found: true,
      customer: {
        id: customer.id,
        firstName:
          customer.first_name,
        lastName:
          customer.last_name,
      },
    };
  } catch (error) {
    console.error(
      "Erro inesperado ao buscar cliente:",
      error
    );

    return {
      success: false,
      error:
        "Não foi possível consultar seus dados.",
    };
  }
}

/*
 * =========================================
 * CRIAR PEDIDO
 * =========================================
 */

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  try {
    const supabase =
      createSupabaseAdminClient();

    /*
     * =========================
     * 1. VALIDAR DADOS
     * =========================
     */

    const firstName =
      input.firstName.trim();

    const lastName =
      input.lastName.trim();

    const phone =
      input.phone.replace(/\D/g, "");

    if (
      firstName.length < 2 ||
      lastName.length < 2
    ) {
      return {
        success: false,
        error:
          "Informe seu nome e sobrenome.",
      };
    }

    if (phone.length < 10) {
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

    if (!input.items.length) {
      return {
        success: false,
        error:
          "Sua sacola está vazia.",
      };
    }

    /*
     * =========================
     * 2. NORMALIZAR ITENS
     * =========================
     */

    const normalizedItems =
      input.items
        .map((item) => ({
          productId: item.productId,
          quantity: Math.floor(
            Number(item.quantity)
          ),
        }))
        .filter(
          (item) =>
            item.productId &&
            item.quantity > 0
        );

    if (!normalizedItems.length) {
      return {
        success: false,
        error:
          "Nenhum produto válido foi informado.",
      };
    }

    const quantities =
      new Map<string, number>();

    for (const item of normalizedItems) {
      quantities.set(
        item.productId,
        (quantities.get(
          item.productId
        ) ?? 0) + item.quantity
      );
    }

    const productIds = [
      ...quantities.keys(),
    ];

    /*
     * =========================
     * 3. BUSCAR PRODUTOS REAIS
     * =========================
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
          product_name: product.name,
          quantity,
          unit_price: unitPrice,
        };
      });

    /*
     * =========================
     * 4. VALIDAR ENTREGA
     * =========================
     */

    let deliveryFee = 0;

    let addressInput:
      | CheckoutAddress
      | undefined;

    if (
      input.orderType ===
      "delivery"
    ) {
      addressInput =
        input.address;

      if (!addressInput) {
        return {
          success: false,
          error:
            "Informe o endereço de entrega.",
        };
      }

      const zipCode =
        addressInput.zipCode.replace(
          /\D/g,
          ""
        );

      if (zipCode.length !== 8) {
        return {
          success: false,
          error:
            "CEP inválido.",
        };
      }

      if (
        !addressInput.street.trim() ||
        !addressInput.number.trim() ||
        !addressInput.neighborhood.trim() ||
        !addressInput.city.trim()
      ) {
        return {
          success: false,
          error:
            "Preencha o endereço de entrega.",
        };
      }

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
          addressInput.city
        );

      const zone =
        zones?.find(
          (item) =>
            normalizeText(
              item.neighborhood
            ) === cityNormalized
        );

      if (!zone) {
        return {
          success: false,
          error:
            "Ainda não realizamos entregas nesta região.",
        };
      }

      if (
        zone.fee_type === "fixed"
      ) {
        deliveryFee = Number(
          zone.delivery_fee ?? 0
        );
      } else {
        deliveryFee = 0;
      }
    }

    /*
     * =========================
     * 5. LOCALIZAR CLIENTE
     * =========================
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

    let customerId =
      existingCustomer?.id;

    /*
     * =========================
     * 6. CRIAR CLIENTE
     *
     * Se já existir, NÃO alteramos
     * nome nem sobrenome.
     * =========================
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

        return {
          success: false,
          error:
            "Não foi possível cadastrar o cliente.",
        };
      }

      customerId =
        newCustomer.id;
    }

    /*
     * =========================
     * 7. CRIAR ENDEREÇO
     * =========================
     */

    let addressId:
      | string
      | null = null;

    if (
      input.orderType ===
        "delivery" &&
      addressInput
    ) {
      const {
        data: newAddress,
        error: addressError,
      } = await supabase
        .from("addresses")
        .insert({
          customer_id:
            customerId,
          label: "Entrega",
          zip_code:
            addressInput.zipCode.replace(
              /\D/g,
              ""
            ),
          street:
            addressInput.street.trim(),
          number:
            addressInput.number.trim(),
          complement:
            addressInput.complement?.trim() ||
            null,
          neighborhood:
            addressInput.neighborhood.trim(),
          city:
            addressInput.city.trim(),
          reference:
            addressInput.reference?.trim() ||
            null,
          is_default: false,
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

        return {
          success: false,
          error:
            "Não foi possível salvar o endereço.",
        };
      }

      addressId =
        newAddress.id;
    }

    /*
     * =========================
     * 8. CRIAR PEDIDO
     * =========================
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
        address_id: addressId,

        order_type:
          input.orderType,

        status: "created",

        subtotal,
        delivery_fee:
          deliveryFee,
        total,

        notes:
          input.notes?.trim() ||
          null,
      })
      .select(
        "id, order_number"
      )
      .single();

    if (orderError || !order) {
      console.error(
        "Erro ao criar pedido:",
        orderError
      );

      return {
        success: false,
        error:
          "Não foi possível criar o pedido.",
      };
    }

    /*
     * =========================
     * 9. CRIAR ITENS
     * =========================
     */

    const itemsToInsert =
      orderItems.map((item) => ({
        order_id: order.id,
        ...item,
      }));

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

      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return {
        success: false,
        error:
          "Não foi possível salvar os itens do pedido.",
      };
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: Number(
        order.order_number
      ),
      total,
    };
  } catch (error) {
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

/*
 * =========================================
 * MARCAR COMO ENVIADO AO WHATSAPP
 * =========================================
 */

export async function markOrderAsSentToWhatsapp(
  orderId: string
) {
  const supabase =
    createSupabaseAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({
      status:
        "sent_to_whatsapp",
    })
    .eq("id", orderId)
    .eq("status", "created");

  if (error) {
    console.error(
      "Erro ao atualizar pedido para WhatsApp:",
      error
    );

    return {
      success: false,
      error:
        "Não foi possível atualizar o status do pedido.",
    };
  }

  return {
    success: true,
  };
}