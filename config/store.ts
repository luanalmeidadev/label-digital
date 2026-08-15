export const storeConfig = {
  name: "La'Bel Confeitaria",

  whatsapp: "5548988681096",

  instagram: "@label_confeitaria",

  address: {
    street: "Rua Capitão Augusto Vidal",
    number: "3600",
    city: "Palhoça",
    state: "SC",
  },

  deliveryCities: ["Palhoça", "São José"],

  orderTypes: {
    pickup: true,
    delivery: true,
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
