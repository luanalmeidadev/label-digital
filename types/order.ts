export type OrderStatus =
  | "created"
  | "sent_to_whatsapp"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type OrderType = "pickup" | "delivery";

export type OrderItem = {
  productId: string;

  productName: string;

  quantity: number;

  unitPrice: number;
};

export type Order = {
  id: string;

  customerId: string;

  type: OrderType;

  items: OrderItem[];

  subtotal: number;

  deliveryFee: number;

  total: number;

  status: OrderStatus;

  notes?: string;

  createdAt: string;
};