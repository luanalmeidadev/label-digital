export type ProductType = "ready" | "preorder";

export type Product = {
  id: string;

  name: string;
  description: string;

  price: number;

  imageUrl?: string;

  categoryId: string;

  type: ProductType;

  available: boolean;

  featured: boolean;

  createdAt?: string;
};