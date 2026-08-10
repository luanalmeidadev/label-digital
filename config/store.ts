export const storeConfig = {
  whatsapp: "5548988681096",

  instagram: "@label_confeitaria",

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