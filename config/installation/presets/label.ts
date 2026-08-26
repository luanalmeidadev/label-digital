import { defineInstallationProfile } from "@/config/installation/validate";

export const labelInstallationPreset = defineInstallationProfile({
  schemaVersion: 1,
  preset: {
    id: "label",
    version: 1,
  },
  identity: {
    name: "La'Bel Confeitaria",
    shortName: "La'Bel",
    slug: "label-confeitaria",
    businessSegment: "confectionery",
    slogan: "Um doce momento começa por aqui.",
    assets: {
      logos: {
        default: "/brand/logo-vinho.svg",
        onPrimary: "/brand/logo-creme.svg",
      },
      icon: "/icon.svg",
      brandIcons: {
        default: "/brand/Icon-vermelho.svg",
        onPrimary: "/brand/Icon-bege.svg",
      },
      monograms: {
        default: "/brand/monograma-vinho.svg",
        onPrimary: "/brand/monograma-bege.svg",
      },
    },
  },
  theme: {
    primary: "#8B0000",
    onPrimary: "#FFFFFF",
    accent: "#D2B48C",
    background: "#FFFDF9",
    surface: "#FFFFFF",
    text: "#241B19",
    mutedText: "#756A66",
    border: "#EEE6DF",
  },
  contact: {
    whatsapp: "5548988681096",
    instagram: "@label_confeitaria",
    email: null,
    phone: null,
  },
  address: {
    street: "Rua Capitão Augusto Vidal",
    number: "3600",
    complement: null,
    neighborhood: null,
    city: "Palhoça",
    state: "SC",
    postalCode: null,
    country: "BR",
  },
  regionalization: {
    locale: "pt-BR",
    currency: "BRL",
    timeZone: "America/Sao_Paulo",
  },
  seo: {
    title: "La'Bel Confeitaria | Doces e encomendas em Palhoça",
    titleTemplate: "%s | La'Bel Confeitaria",
    description:
      "Doces, sobremesas e encomendas artesanais em Palhoça. Consulte o cardápio, monte seu pedido e fale com a La'Bel pelo WhatsApp.",
    keywords: [
      "confeitaria em Palhoça",
      "doces em Palhoça",
      "bolos por encomenda",
      "sobremesas artesanais",
      "La'Bel Confeitaria",
    ],
    siteName: "La'Bel Confeitaria",
    schemaOrgType: "Bakery",
    manifestDescription:
      "Cardápio do dia e encomendas artesanais da La'Bel Confeitaria.",
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: "La'Bel Confeitaria | Doces e encomendas em Palhoça",
      description:
        "Cardápio do dia, doces, bolos e encomendas artesanais em Palhoça.",
    },
    twitter: {
      card: "summary_large_image",
      title: "La'Bel Confeitaria | Doces e encomendas em Palhoça",
      description:
        "Cardápio do dia, doces, bolos e encomendas artesanais em Palhoça.",
    },
  },
  publicContent: {
    hero: {
      eyebrow: "La'Bel Confeitaria",
      title: "Um doce momento começa por aqui.",
      description:
        "Escolha seus favoritos, monte seu pedido e continue o atendimento pelo WhatsApp.",
      primaryCta: null,
    },
    fulfillment: {
      pickupAndDelivery: {
        title: "Retirada ou entrega",
        description: "Escolha como prefere receber seu pedido.",
      },
      pickupOnly: {
        title: "Retirada no local",
        description: "Retire seu pedido diretamente na confeitaria.",
      },
      deliveryOnly: {
        title: "Entrega",
        description: "Receba seu pedido em uma região atendida.",
      },
      unavailable: {
        title: "Recebimento indisponível",
        description:
          "Entre em contato com a confeitaria para mais informações.",
      },
    },
  },
  legal: {
    controllerName: "La'Bel Confeitaria",
    contactChannel: "whatsapp",
    locality: {
      city: "Palhoça",
      state: "SC",
      country: "BR",
    },
    privacyNoticePath: "/privacidade",
    privacyNoticeLastUpdated: "2026-08-15",
  },
  modules: {
    preorders: true,
    preorderSchedule: true,
    delivery: true,
    pickup: true,
    cashRegister: true,
    financial: true,
    reports: true,
    tracking: true,
    advancedUsers: true,
    adminAudit: true,
  },
} as const);
