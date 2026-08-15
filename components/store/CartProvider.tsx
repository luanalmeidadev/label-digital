"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

export type CartItem = CartProduct & {
  quantity: number;
};

type CatalogProduct = CartProduct & {
  available: boolean;
};

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (product: CartProduct) => void;
  increaseItem: (id: string) => void;
  decreaseItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext =
  createContext<CartContextType | null>(null);

const STORAGE_KEY = "label-cart";

function synchronizeCart(
  items: CartItem[],
  catalogProducts: CatalogProduct[]
) {
  const catalog = new Map(
    catalogProducts.map((product) => [product.id, product])
  );

  const synchronizedItems = items.flatMap((item) => {
    const product = catalog.get(item.id);

    if (!product?.available) {
      return [];
    }

    return [
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        quantity: item.quantity,
      },
    ];
  });

  const unchanged =
    synchronizedItems.length === items.length &&
    synchronizedItems.every((item, index) => {
      const current = items[index];

      return (
        current?.id === item.id &&
        current.name === item.name &&
        Number(current.price) === item.price &&
        current.image_url === item.image_url &&
        current.quantity === item.quantity
      );
    });

  return unchanged ? items : synchronizedItems;
}

export default function CartProvider({
  children,
  catalogProducts,
}: {
  children: React.ReactNode;
  catalogProducts?: CatalogProduct[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const savedCart =
          window.localStorage.getItem(STORAGE_KEY);

        if (savedCart) {
          const parsed = JSON.parse(savedCart);

          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch {
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
        synchronizeCart(current, catalogProducts)
      );
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [catalogProducts, loaded]);

  useEffect(() => {
    if (!loaded) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  }, [items, loaded]);

  function addItem(product: CartProduct) {
    setItems((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  function increaseItem(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseItem(id: string) {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.id !== id) {
          return [item];
        }

        if (item.quantity <= 1) {
          return [];
        }

        return [
          {
            ...item,
            quantity: item.quantity - 1,
          },
        ];
      })
    );
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.filter((item) => item.id !== id)
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
    (total, item) =>
      total + Number(item.price) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        addItem,
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
    throw new Error(
      "useCart precisa ser usado dentro de CartProvider."
    );
  }

  return context;
}
