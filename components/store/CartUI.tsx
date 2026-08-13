"use client";

import { useState } from "react";

import CartDrawer from "./CartDrawer";
import CheckoutDrawer from "./CheckoutDrawer";
import FloatingCartButton from "./FloatingCartButton";

type View =
  | "closed"
  | "cart"
  | "checkout";

export default function CartUI() {
  const [view, setView] =
    useState<View>("closed");

  return (
    <>
      <FloatingCartButton
        onClick={() =>
          setView("cart")
        }
      />

      <CartDrawer
        open={view === "cart"}
        onClose={() =>
          setView("closed")
        }
        onContinue={() =>
          setView("checkout")
        }
      />

      <CheckoutDrawer
        open={view === "checkout"}
        onClose={() =>
          setView("closed")
        }
        onBack={() =>
          setView("cart")
        }
      />
    </>
  );
}