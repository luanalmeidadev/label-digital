"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BadgeDollarSign,
  CakeSlice,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  X,
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
    label: "Encomendas",
    href: "/admin/encomendas",
    icon: CakeSlice,
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
    label: "Faturamento",
    href: "/admin/faturamento",
    icon: BadgeDollarSign,
  },
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: Settings,
  },
];

export default function AdminSidebar() {
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
      {menuItems.map((item) => {
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

  return (
    <>
      {/* =====================================
          DESKTOP
      ===================================== */}

      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/10 bg-[#8B0000] lg:block">
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 px-3">
            <Image
              src="/brand/logo-creme.svg"
              alt="La'bel Confeitaria"
              width={150}
              height={60}
              className="h-[60px] w-[150px]"
              priority
            />

            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D2B48C]">
              Administração
            </p>
          </div>

          {navigation}
        </div>
      </aside>

      {/* =====================================
          MOBILE - BARRA SUPERIOR
      ===================================== */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#EEE6DF] bg-[#8B0000] px-4 lg:hidden">
        <Image
          src="/brand/logo-creme.svg"
          alt="La'bel Confeitaria"
          width={105}
          height={42}
          className="h-[42px] w-[105px]"
          priority
        />

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
                <Image
                  src="/brand/logo-creme.svg"
                  alt="La'bel Confeitaria"
                  width={135}
                  height={55}
                  className="h-[55px] w-[135px]"
                  priority
                />

                <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D2B48C]">
                  Administração
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
          </aside>
        </div>
      )}
    </>
  );
}
