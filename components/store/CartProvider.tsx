"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  createSimpleCartItem,
  deserializeCart,
  MAX_CART_ITEM_QUANTITY,
  mergeCartItem,
  serializeCart,
  synchronizeCartWithCatalog,
  type CartCatalogProduct,
  type CartItem,
  type CartProduct,
} from "@/lib/cart";

export type { CartItem, CartProduct } from "@/lib/cart";

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (product: CartProduct) => void;
  addConfiguredItem: (item: CartItem) => void;
  increaseItem: (lineKey: string) => void;
  decreaseItem: (lineKey: string) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "label-cart";

export default function CartProvider({
  children,
  catalogProducts,
}: {
  children: React.ReactNode;
  catalogProducts?: CartCatalogProduct[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const savedCart = window.localStorage.getItem(STORAGE_KEY);
      const restoredItems = deserializeCart(savedCart);

      setItems(restoredItems);

      if (savedCart && restoredItems.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!loaded || !catalogProducts) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      setItems((current) =>
        synchronizeCartWithCatalog(current, catalogProducts)
      );
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [catalogProducts, loaded]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, serializeCart(items));
  }, [items, loaded]);

  function addItem(product: CartProduct) {
    setItems((current) =>
      mergeCartItem(current, createSimpleCartItem(product))
    );
  }

  function addConfiguredItem(item: CartItem) {
    setItems((current) => mergeCartItem(current, item));
  }

  function increaseItem(lineKey: string) {
    setItems((current) =>
      current.map((item) =>
        item.lineKey === lineKey
          ? {
              ...item,
              quantity: Math.min(
                MAX_CART_ITEM_QUANTITY,
                item.quantity + 1
              ),
            }
          : item
      )
    );
  }

  function decreaseItem(lineKey: string) {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.lineKey !== lineKey) {
          return [item];
        }

        if (item.quantity <= 1) {
          return [];
        }

        return [{ ...item, quantity: item.quantity - 1 }];
      })
    );
  }

  function removeItem(lineKey: string) {
    setItems((current) =>
      current.filter((item) => item.lineKey !== lineKey)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const subtotal = items.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        addItem,
        addConfiguredItem,
        increaseItem,
        decreaseItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart precisa ser usado dentro de CartProvider.");
  }

  return context;
}
