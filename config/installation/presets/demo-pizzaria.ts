import { defineInstallationProfile } from "@/config/installation/validate";
import { demoPizzariaInstallationModules } from "@/config/installation/module-presets.mjs";

export const demoPizzariaInstallationPreset = defineInstallationProfile({
  schemaVersion: 3,
  preset: {
    id: "demo-pizzaria",
    version: 1,
  },
  identity: {
    name: "Bella Napoli Demo",
    shortName: "Bella Napoli",
    slug: "bella-napoli-demo",
    businessSegment: "pizzeria",
    slogan: "Pizzas artesanais, do nosso forno para a sua mesa.",
    assets: {
      logos: {
        default: "/demo-pizzaria/logo-dark.svg",
        onPrimary: "/demo-pizzaria/logo-light.svg",
      },
      icon: "/demo-pizzaria/icon.svg",
      brandIcons: {
        default: "/demo-pizzaria/icon.svg",
        onPrimary: "/demo-pizzaria/icon.svg",
      },
      monograms: {
        default: "/demo-pizzaria/icon.svg",
        onPrimary: "/demo-pizzaria/icon.svg",
      },
    },
  },
  theme: {
    primary: "#1F4D3A",
    onPrimary: "#FFFFFF",
    primaryHover: "#173B2D",
    accent: "#F4A340",
    background: "#FFF9F0",
    surface: "#FFFFFF",
    mutedSurface: "#F4EBDD",
    text: "#241A14",
    mutedText: "#725F54",
    border: "#E7D8C9",
  },
  contact: {
    whatsapp: "5511999990000",
    instagram: "@bellanapoli_demo",
    email: "contato@bellanapoli.example",
    phone: "5511999990000",
  },
  address: {
    street: "Avenida Exemplo",
    number: "123",
    complement: "Loja Demo",
    neighborhood: "Centro",
    city: "Curitiba",
    state: "PR",
    postalCode: "80000-000",
    country: "BR",
  },
  regionalization: {
    locale: "pt-BR",
    currency: "BRL",
    timeZone: "America/Sao_Paulo",
  },
  seo: {
    title: "Bella Napoli Demo | Pizzas artesanais",
    titleTemplate: "%s | Bella Napoli Demo",
    description:
      "Pizzaria fictícia usada para validar o tema white-label do Label Digital.",
    keywords: [
      "pizzaria demo",
      "pizza artesanal",
      "cardápio digital demo",
    ],
    siteName: "Bella Napoli Demo",
    schemaOrgType: "FastFoodRestaurant",
    manifestDescription:
      "Cardápio digital fictício da Bella Napoli Demo.",
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: "Bella Napoli Demo | Pizzas artesanais",
      description:
        "Pizzas artesanais em uma instalação fictícia de demonstração.",
      image: {
        alt: "Bella Napoli Demo — cardápio digital fictício",
        eyebrow: "Cardápio digital",
        description: "Pizzas artesanais preparadas no forno a lenha.",
        footerItems: ["Pizzas", "Combos", "Curitiba/PR"],
      },
    },
    twitter: {
      card: "summary_large_image",
      title: "Bella Napoli Demo | Pizzas artesanais",
      description:
        "Pizzas artesanais em uma instalação fictícia de demonstração.",
    },
  },
  publicContent: {
    hero: {
      eyebrow: "Bella Napoli Demo",
      title: "Sabor de verdade em cada fatia.",
      description:
        "Escolha sua pizza favorita, monte seu pedido e continue o atendimento pelo WhatsApp.",
      primaryCta: null,
    },
    fulfillment: {
      pickupAndDelivery: {
        title: "Retirada ou entrega",
        description: "Escolha como prefere receber seu pedido.",
      },
      pickupOnly: {
        title: "Retirada no balcão",
        description: "Retire seu pedido diretamente na pizzaria.",
      },
      deliveryOnly: {
        title: "Entrega",
        description: "Receba seu pedido em uma região atendida.",
      },
      unavailable: {
        title: "Recebimento indisponível",
        description:
          "Entre em contato com a pizzaria para mais informações.",
      },
    },
    preorders: {
      banner: {
        eyebrow: "Pedidos programados",
        title: "Vai reunir a turma?",
        description:
          "Consulte opções de pizzas e combos para o seu evento.",
        ctaLabel: "Ver pedidos programados",
      },
      categoryShortcut: {
        eyebrow: "Pedidos programados",
        title: "Quero programar",
        description: "Pizzas e combos para grupos e eventos",
      },
    },
  },
  legal: {
    controllerName: "Bella Napoli Demo",
    contactChannel: "whatsapp",
    locality: {
      city: "Curitiba",
      state: "PR",
      country: "BR",
    },
    privacyNoticePath: "/privacidade",
    privacyNoticeLastUpdated: "2026-08-26",
  },
  modules: demoPizzariaInstallationModules,
} as const);
