import { getPublicInstallationProfile } from "@/config/installation/public";

const installation = getPublicInstallationProfile();

export const storeConfig = {
  name: installation.identity.name,

  whatsapp: installation.contact.whatsapp,

  instagram: installation.contact.instagram,

  address: {
    street: installation.address.street,
    number: installation.address.number,
    city: installation.address.city,
    state: installation.address.state,
  },

  deliveryCities: ["Palhoça", "São José"],

  orderTypes: {
    pickup: installation.modules.pickup,
    delivery: installation.modules.delivery,
  },

  businessHours: {
    monday: null,

    tuesday: {
      open: "09:00",
      close: "19:00",
    },

    wednesday: {
      open: "09:00",
      close: "19:00",
    },

    thursday: {
      open: "09:00",
      close: "19:00",
    },

    friday: {
      open: "09:00",
      close: "19:00",
    },

    saturday: {
      open: "09:00",
      close: "17:00",
    },

    sunday: null,
  },
} as const;
