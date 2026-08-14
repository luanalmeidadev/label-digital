"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reserveNextDailyOrderNumber } from "@/lib/sales-number-store";

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
  firstName: string;
  lastName: string;
  phone: string;

  orderType: "pickup" | "delivery";

  /*
   * Se o cliente escolheu um endereço
   * já cadastrado, enviamos somente o id.
   */
  selectedAddressId?: string;

  /*
   * Usado quando o cliente está
   * cadastrando um endereço novo.
   */
  address?: CheckoutAddress;

  items: CheckoutItem[];

  notes?: string;
};

type SavedAddress = {
  id: string;
  label: string | null;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  reference: string | null;
  isDefault: boolean;
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
      addressId: string | null;
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
        addresses: SavedAddress[];
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

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeCep(value: string) {
  return value.replace(/\D/g, "");
}

/*
 * =========================================
 * BUSCAR CLIENTE + ENDEREÇOS
 * =========================================
 */

export async function findCustomerByPhone(
  phoneInput: string
): Promise<FindCustomerResult> {
  try {
    const phone =
      normalizePhone(phoneInput);

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
      error: customerError,
    } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name"
      )
      .eq("phone", phone)
      .maybeSingle();

    if (customerError) {
      console.error(
        "Erro ao buscar cliente:",
        customerError
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

    const {
      data: addresses,
      error: addressesError,
    } = await supabase
      .from("addresses")
      .select(`
        id,
        label,
        zip_code,
        street,
        number,
        complement,
        neighborhood,
        city,
        reference,
        is_default
      `)
      .eq(
        "customer_id",
        customer.id
      )
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (addressesError) {
      console.error(
        "Erro ao buscar endereços:",
        addressesError
      );

      return {
        success: false,
        error:
          "Não foi possível consultar seus endereços.",
      };
    }

    const savedAddresses: SavedAddress[] =
      (addresses ?? []).map(
        (address) => ({
          id: address.id,
          label: address.label,
          zipCode:
            address.zip_code,
          street: address.street,
          number: address.number,
          complement:
            address.complement,
          neighborhood:
            address.neighborhood,
          city: address.city,
          reference:
            address.reference,
          isDefault:
            address.is_default,
        })
      );

    return {
      success: true,
      found: true,
      customer: {
        id: customer.id,
        firstName:
          customer.first_name,
        lastName:
          customer.last_name,
        addresses:
          savedAddresses,
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
            item.productId &&
            item.quantity > 0
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

    /*
     * =========================================
     * 5. RESOLVER ENDEREÇO PARA VALIDAÇÃO
     * =========================================
     */

    let resolvedAddress:
      | CheckoutAddress
      | null = null;

    let selectedAddressId:
      | string
      | null = null;

    if (
      input.orderType ===
      "delivery"
    ) {
      /*
       * -----------------------------------------
       * ENDEREÇO JÁ SALVO
       * -----------------------------------------
       */

      if (
        input.selectedAddressId
      ) {
        if (
          !existingCustomer
        ) {
          return {
            success: false,
            error:
              "Não foi possível localizar o endereço selecionado.",
          };
        }

        const {
          data: savedAddress,
          error:
            savedAddressError,
        } = await supabase
          .from("addresses")
          .select(`
            id,
            customer_id,
            label,
            zip_code,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference,
            is_default
          `)
          .eq(
            "id",
            input.selectedAddressId
          )
          .eq(
            "customer_id",
            existingCustomer.id
          )
          .maybeSingle();

        if (
          savedAddressError
        ) {
          console.error(
            "Erro ao consultar endereço salvo:",
            savedAddressError
          );

          return {
            success: false,
            error:
              "Não foi possível consultar o endereço selecionado.",
          };
        }

        if (!savedAddress) {
          return {
            success: false,
            error:
              "Endereço selecionado não encontrado.",
          };
        }

        selectedAddressId =
          savedAddress.id;

        resolvedAddress = {
          zipCode:
            savedAddress.zip_code,
          street:
            savedAddress.street,
          number:
            savedAddress.number,
          complement:
            savedAddress.complement ??
            undefined,
          neighborhood:
            savedAddress.neighborhood,
          city:
            savedAddress.city,
          reference:
            savedAddress.reference ??
            undefined,
          label:
            savedAddress.label ??
            undefined,
          isDefault:
            savedAddress.is_default,
        };
      } else {
        /*
         * -----------------------------------------
         * ENDEREÇO NOVO
         * -----------------------------------------
         */

        if (!input.address) {
          return {
            success: false,
            error:
              "Informe o endereço de entrega.",
          };
        }

        resolvedAddress =
          input.address;
      }

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
     * =========================================
     * 8. RESOLVER / CRIAR ENDEREÇO
     * =========================================
     */

    let addressId:
      | string
      | null =
      selectedAddressId;

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

        return {
          success: false,
          error:
            "Não foi possível verificar seu endereço.",
        };
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

            return {
              success: false,
              error:
                "Não foi possível atualizar o endereço principal.",
            };
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

          return {
            success: false,
            error:
              "Não foi possível salvar o endereço.",
          };
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
    const orderNumber =
      await reserveNextDailyOrderNumber();

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        order_number:
          orderNumber,

        customer_id:
          customerId,

        address_id:
          addressId,

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

    if (
      orderError ||
      !order
    ) {
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

      return {
        success: false,
        error:
          "Não foi possível salvar os itens do pedido.",
      };
    }

    return {
      success: true,
      orderId: order.id,

      orderNumber:
        Number(
          order.order_number
        ),

      total,

      deliveryFee,

      deliveryFeeType,

      addressId,
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

  const { error } =
    await supabase
      .from("orders")
      .update({
        status:
          "sent_to_whatsapp",
      })
      .eq("id", orderId)
      .eq(
        "status",
        "created"
      );

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

export async function deleteCustomerAddress(
  addressId: string,
  phoneInput: string
) {
  try {
    const phone =
      phoneInput.replace(/\D/g, "");

    if (
      !addressId ||
      phone.length < 10
    ) {
      return {
        success: false,
        error:
          "Não foi possível identificar o endereço.",
      };
    }

    const supabase =
      createSupabaseAdminClient();

    const {
      data: customer,
      error: customerError,
    } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (
      customerError ||
      !customer
    ) {
      return {
        success: false,
        error:
          "Cliente não encontrado.",
      };
    }

    const {
      data: address,
      error: addressError,
    } = await supabase
      .from("addresses")
      .select(
        "id, customer_id, is_default"
      )
      .eq("id", addressId)
      .eq(
        "customer_id",
        customer.id
      )
      .maybeSingle();

    if (
      addressError ||
      !address
    ) {
      return {
        success: false,
        error:
          "Endereço não encontrado.",
      };
    }

    const {
      error: deleteError,
    } = await supabase
      .from("addresses")
      .delete()
      .eq("id", address.id)
      .eq(
        "customer_id",
        customer.id
      );

    if (deleteError) {
      console.error(
        "Erro ao excluir endereço:",
        deleteError
      );

      return {
        success: false,
        error:
          "Não foi possível excluir o endereço.",
      };
    }

    /*
     * Se o endereço excluído era o principal,
     * escolhemos outro endereço como principal.
     */
    if (address.is_default) {
      const {
        data: remainingAddresses,
      } = await supabase
        .from("addresses")
        .select("id")
        .eq(
          "customer_id",
          customer.id
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      const nextAddress =
        remainingAddresses?.[0];

      if (nextAddress) {
        await supabase
          .from("addresses")
          .update({
            is_default: true,
          })
          .eq(
            "id",
            nextAddress.id
          );
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Erro inesperado ao excluir endereço:",
      error
    );

    return {
      success: false,
      error:
        "Não foi possível excluir o endereço.",
    };
  }
}
