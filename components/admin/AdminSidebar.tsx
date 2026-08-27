"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BadgeDollarSign,
  BarChart3,
  CakeSlice,
  Calculator,
  History,
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
import { isInstallationModuleEnabled } from "@/config/installation/modules";
import type { InstallationModuleKey } from "@/config/installation/types";
import BrandLogo from "@/components/brand/BrandLogo";
import { logoutAdmin } from "@/app/admin/logout/actions";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: AdminPermission;
  adminOnly?: boolean;
  module?: InstallationModuleKey;
};

const menuSections: Array<{
  label: string;
  items: MenuItem[];
}> = [
  {
    label: "Início",
    items: [
      {
        label: "Visão geral",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Operação",
    items: [
      {
        label: "Caixa",
        href: "/admin/caixa",
        icon: Calculator,
        permission: "cashier",
      },
      {
        label: "Pedidos",
        href: "/admin/pedidos",
        icon: ShoppingBag,
        permission: "orders",
      },
      {
        label: "Entregas",
        href: "/admin/entregas",
        icon: Truck,
        permission: "deliveries",
      },
    ],
  },
  {
    label: "Cardápios",
    items: [
      {
        label: "Produtos",
        href: "/admin/produtos",
        icon: Package,
        permission: "catalog",
      },
      {
        label: "Categorias",
        href: "/admin/categorias",
        icon: Tags,
        permission: "catalog",
      },
      {
        label: "Encomendas",
        href: "/admin/encomendas",
        icon: CakeSlice,
        permission: "catalog",
        module: "preorders",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        label: "Clientes",
        href: "/admin/clientes",
        icon: Users,
        permission: "customers",
      },
      {
        label: "Faturamento",
        href: "/admin/faturamento",
        icon: BadgeDollarSign,
        permission: "billing",
      },
      {
        label: "Relatórios",
        href: "/admin/relatorios",
        icon: BarChart3,
        permission: "billing",
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        label: "Configurações",
        href: "/admin/configuracoes",
        icon: Settings,
        permission: "settings",
      },
      {
        label: "Atividades",
        href: "/admin/atividades",
        icon: History,
        adminOnly: true,
      },
    ],
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
    <nav className="space-y-5" aria-label="Menu administrativo">
      {menuSections.map((section) => {
        const visibleItems = section.items.filter(
          (item) =>
            (!item.adminOnly || role === "admin") &&
            (!item.permission || permissions.includes(item.permission)) &&
            (!item.module || isInstallationModuleEnabled(item.module))
        );

        if (visibleItems.length === 0) {
          return null;
        }

        return (
          <div key={section.label}>
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary">
                {section.label}
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-[#F7E8D2] text-brand-primary shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                        active
                          ? "bg-brand-primary text-brand-primary-foreground"
                          : "bg-white/10 text-[#E8C79C] group-hover:bg-white/15 group-hover:text-white"
                      }`}
                    >
                      <Icon size={17} strokeWidth={2.2} />
                    </span>

                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  const logoutButton = (
    <form action={logoutAdmin}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-xl border border-white/20 px-3 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-brand-primary"
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

      <aside className="hidden h-screen w-64 shrink-0 border-r border-white/10 bg-brand-primary print:hidden lg:sticky lg:top-0 lg:block">
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 px-3">
            <BrandLogo variant="sidebar" eager />

            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary">
              {role === "admin"
                ? "Administração"
                : "Atendimento"}
            </p>
            <p className="mt-1 truncate text-xs text-white/60">
              {name}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {navigation}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            {logoutButton}
          </div>
        </div>
      </aside>

      {/* =====================================
          MOBILE - BARRA SUPERIOR
      ===================================== */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-brand-border bg-brand-primary px-4 print:hidden lg:hidden">
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

          <aside className="relative z-10 flex h-full w-[84%] max-w-xs flex-col bg-brand-primary px-4 py-5 shadow-2xl">
            <div className="mb-7 flex items-start justify-between gap-4 px-2">
              <div>
                <BrandLogo variant="drawer" eager />

                <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary">
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
