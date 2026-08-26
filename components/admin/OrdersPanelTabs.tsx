import Link from "next/link";
import {
  CakeSlice,
  ShoppingBag,
} from "lucide-react";

type OrdersPanelTabsProps = {
  active: "daily" | "preorders";
};

export default function OrdersPanelTabs({
  active,
}: OrdersPanelTabsProps) {
  const tabs = [
    {
      id: "daily" as const,
      label: "Pedidos do dia",
      description: "Cardápio diário",
      href: "/admin/pedidos",
      icon: ShoppingBag,
    },
    {
      id: "preorders" as const,
      label: "Encomendas",
      description: "Datas futuras",
      href: "/admin/pedidos/encomendas",
      icon: CakeSlice,
    },
  ];

  return (
    <nav
      aria-label="Tipo de pedido"
      className="mt-7 grid gap-3 sm:max-w-2xl sm:grid-cols-2"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={
              selected ? "page" : undefined
            }
            className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
              selected
                ? "border-brand-primary bg-brand-primary text-brand-primary-foreground shadow-sm"
                : "border-brand-border bg-white text-brand-foreground hover:border-brand-secondary"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                selected
                  ? "bg-white/15 text-brand-secondary"
                  : "bg-brand-primary/10 text-brand-primary"
              }`}
            >
              <Icon size={19} />
            </span>
            <span>
              <span className="block text-sm font-bold">
                {tab.label}
              </span>
              <span
                className={`mt-0.5 block text-xs ${
                  selected
                    ? "text-white/70"
                    : "text-brand-muted-foreground"
                }`}
              >
                {tab.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
