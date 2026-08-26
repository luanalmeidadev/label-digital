import { defineInstallationProfile } from "@/config/installation/validate";
import { demoBurgerInstallationModules } from "@/config/installation/module-presets.mjs";

export const demoBurgerInstallationPreset = defineInstallationProfile({
  schemaVersion: 3,
  preset: {
    id: "demo-burger",
    version: 1,
  },
  identity: {
    name: "Brasa Burger Demo",
    shortName: "Brasa Burger",
    slug: "brasa-burger-demo",
    businessSegment: "hamburger",
    slogan: "Burger artesanal, do nosso fogo para a sua mesa.",
    assets: {
      logos: {
        default: "/demo-burger/logo-dark.svg",
        onPrimary: "/demo-burger/logo-light.svg",
      },
      icon: "/demo-burger/icon.svg",
      brandIcons: {
        default: "/demo-burger/icon.svg",
        onPrimary: "/demo-burger/icon.svg",
      },
      monograms: {
        default: "/demo-burger/icon.svg",
        onPrimary: "/demo-burger/icon.svg",
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
    instagram: "@brasaburger_demo",
    email: "contato@brasaburger.example",
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
    title: "Brasa Burger Demo | Burgers artesanais",
    titleTemplate: "%s | Brasa Burger Demo",
    description:
      "Hamburgueria fictícia usada para validar o tema white-label do Label Digital.",
    keywords: [
      "hamburgueria demo",
      "burger artesanal",
      "cardápio digital demo",
    ],
    siteName: "Brasa Burger Demo",
    schemaOrgType: "FastFoodRestaurant",
    manifestDescription:
      "Cardápio digital fictício da Brasa Burger Demo.",
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: "Brasa Burger Demo | Burgers artesanais",
      description:
        "Burgers artesanais em uma instalação fictícia de demonstração.",
      image: {
        alt: "Brasa Burger Demo — cardápio digital fictício",
        eyebrow: "Cardápio digital",
        description: "Burgers artesanais preparados na brasa.",
        footerItems: ["Burgers", "Combos", "Curitiba/PR"],
      },
    },
    twitter: {
      card: "summary_large_image",
      title: "Brasa Burger Demo | Burgers artesanais",
      description:
        "Burgers artesanais em uma instalação fictícia de demonstração.",
    },
  },
  publicContent: {
    hero: {
      eyebrow: "Brasa Burger Demo",
      title: "Sabor de verdade começa na brasa.",
      description:
        "Escolha seu burger, monte o pedido e continue o atendimento pelo WhatsApp.",
      primaryCta: null,
    },
    fulfillment: {
      pickupAndDelivery: {
        title: "Retirada ou entrega",
        description: "Escolha como prefere receber seu pedido.",
      },
      pickupOnly: {
        title: "Retirada no balcão",
        description: "Retire seu pedido diretamente na hamburgueria.",
      },
      deliveryOnly: {
        title: "Entrega",
        description: "Receba seu pedido em uma região atendida.",
      },
      unavailable: {
        title: "Recebimento indisponível",
        description:
          "Entre em contato com a hamburgueria para mais informações.",
      },
    },
    preorders: {
      banner: {
        eyebrow: "Pedidos programados",
        title: "Vai reunir a turma?",
        description:
          "Consulte opções de burgers e combos para o seu evento.",
        ctaLabel: "Ver pedidos programados",
      },
      categoryShortcut: {
        eyebrow: "Pedidos programados",
        title: "Quero programar",
        description: "Burgers e combos para grupos e eventos",
      },
    },
  },
  legal: {
    controllerName: "Brasa Burger Demo",
    contactChannel: "whatsapp",
    locality: {
      city: "Curitiba",
      state: "PR",
      country: "BR",
    },
    privacyNoticePath: "/privacidade",
    privacyNoticeLastUpdated: "2026-08-26",
  },
  modules: demoBurgerInstallationModules,
} as const);
