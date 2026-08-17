"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BadgeDollarSign,
  CakeSlice,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminPermission,
  AdminRole,
} from "@/lib/admin-permissions";
import BrandLogo from "@/components/brand/BrandLogo";
import { logoutAdmin } from "@/app/admin/logout/actions";

const menuItems: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: AdminPermission;
}> = [
  {
    label: "Visão geral",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: Package,
    permission: "catalog",
  },
  {
    label: "Encomendas",
    href: "/admin/encomendas",
    icon: CakeSlice,
    permission: "catalog",
  },
  {
    label: "Categorias",
    href: "/admin/categorias",
    icon: Tags,
    permission: "catalog",
  },
  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: ShoppingBag,
    permission: "orders",
  },
  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
    permission: "customers",
  },
  {
    label: "Entregas",
    href: "/admin/entregas",
    icon: Truck,
    permission: "deliveries",
  },
  {
    label: "Faturamento",
    href: "/admin/faturamento",
    icon: BadgeDollarSign,
    permission: "billing",
  },
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: Settings,
    permission: "settings",
  },
];

export default function AdminSidebar({
  permissions,
  role,
  name,
}: {
  permissions: AdminPermission[];
  role: AdminRole;
  name: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function isActive(href: string) {
    return href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);
  }

  const navigation = (
    <nav className="space-y-1">
      {menuItems
        .filter(
          (item) =>
            !item.permission ||
            permissions.includes(item.permission)
        )
        .map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
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
  );

  const logoutButton = (
    <form action={logoutAdmin}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-xl border border-white/20 px-3 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-[#8B0000]"
      >
        <LogOut size={19} />
        Sair
      </button>
    </form>
  );

  return (
    <>
      {/* =====================================
          DESKTOP
      ===================================== */}

      <aside className="hidden h-screen w-64 shrink-0 border-r border-white/10 bg-[#8B0000] lg:sticky lg:top-0 lg:block">
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 px-3">
            <BrandLogo variant="sidebar" eager />

            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D2B48C]">
              {role === "admin"
                ? "Administração"
                : "Atendimento"}
            </p>
            <p className="mt-1 truncate text-xs text-white/60">
              {name}
            </p>
          </div>

          {navigation}

          <div className="mt-auto pt-6">
            {logoutButton}
          </div>
        </div>
      </aside>

      {/* =====================================
          MOBILE - BARRA SUPERIOR
      ===================================== */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#EEE6DF] bg-[#8B0000] px-4 lg:hidden">
        <BrandLogo variant="mobile" eager />

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white transition hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* =====================================
          MOBILE - OVERLAY
      ===================================== */}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* =================================
              MENU LATERAL MOBILE
          ================================= */}

          <aside className="relative z-10 flex h-full w-[84%] max-w-xs flex-col bg-[#8B0000] px-4 py-5 shadow-2xl">
            <div className="mb-7 flex items-start justify-between gap-4 px-2">
              <div>
                <BrandLogo variant="drawer" eager />

                <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D2B48C]">
                  {role === "admin"
                    ? "Administração"
                    : "Atendimento"}
                </p>
                <p className="mt-1 max-w-[190px] truncate text-xs text-white/60">
                  {name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white transition hover:bg-white/10"
              >
                <X size={21} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {navigation}
            </div>

            <div className="border-t border-white/10 pt-4">
              {logoutButton}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
