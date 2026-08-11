"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  Users,
  Truck,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    label: "Visão geral",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: Package,
  },
  {
    label: "Categorias",
    href: "/admin/categorias",
    icon: Tags,
  },
  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: ShoppingBag,
  },
  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
  },
  {
    label: "Entregas",
    href: "/admin/entregas",
    icon: Truck,
  },
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: Settings,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/10 bg-[#8B0000] lg:block">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="mb-8 px-3">
          <Image
            src="/brand/logo-creme.svg"
            alt="La'bel Confeitaria"
            width={150}
            height={60}
            priority
          />

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D2B48C]">
            Administração
          </p>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#D2B48C] text-[#8B0000]"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}