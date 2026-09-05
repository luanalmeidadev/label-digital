"use client";

import { useEffect, useState } from "react";

import {
  getStoreOpenStatus,
  type StoreBusinessHour,
  type StoreOpenStatus,
} from "@/lib/store-open-status";

import CartDrawer from "./CartDrawer";
import CheckoutDrawer from "./CheckoutDrawer";
import FloatingCartButton from "./FloatingCartButton";

type View =
  | "closed"
  | "cart"
  | "checkout";

export type StoreCheckoutSettings = {
  storeName: string;
  storeShortName: string;
  locale: string;
  whatsapp: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress: string;
  address: {
    city: string | null;
    state: string | null;
    street: string | null;
    number?: string | null;
  };
  deliveryCities: string[];
  businessHours: StoreBusinessHour[];
  isDemo: boolean;
};

export default function CartUI({
  storeSettings,
}: {
  storeSettings: StoreCheckoutSettings;
}) {
  const [view, setView] =
    useState<View>("closed");
  const [storeStatus, setStoreStatus] =
    useState<StoreOpenStatus | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setStoreStatus(
        getStoreOpenStatus(storeSettings.businessHours, new Date())
      );
    };
    const initialTimer = window.setTimeout(updateStatus, 0);
    const interval = window.setInterval(updateStatus, 30_000);

    document.addEventListener("visibilitychange", updateStatus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateStatus);
    };
  }, [storeSettings.businessHours]);

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
        storeStatus={storeStatus}
        isDemo={storeSettings.isDemo}
      />

      <CheckoutDrawer
        storeSettings={storeSettings}
        storeStatus={storeStatus}
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
