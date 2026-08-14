export type PreorderPrice = {
  label: string;
  value: string;
};

export type PreorderProduct = {
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  imagePositionX?: number;
  imagePositionY?: number;
  prices: PreorderPrice[];
  flavors?: string[];
  details?: string[];
  notice?: string;
  leadTimeDays?: number;
  minimumQuantity?: number;
  allowedQuantities?: number[];
  quantityIncrement?: number;
  quantityUnit?: string;
  priceBaseQuantity?: number;
  maxFlavors?: number;
  flavorQuantityStep?: number;
};

export type PreorderCategory = {
  id: string;
  name: string;
  eyebrow: string;
  products: PreorderProduct[];
};

export const preorderCategories: PreorderCategory[] = [
  {
    id: "doces",
    name: "Doces",
    eyebrow: "Cento de doces",
    products: [
      {
        name: "Linha premium",
        description:
          "Escolha 25, 50, 75, 100 docinhos ou quantidades maiores em múltiplos de 25.",
        image:
          "/encomendas/doces-premium.jpeg",
        imageAlt:
          "Doces premium da La'Bel Confeitaria",
        prices: [
          {
            label: "Valor do cento",
            value: "R$ 190,00",
          },
        ],
        flavors: [
          "Ninho com Nutella",
          "Ferrero Rocher",
          "Moranguinho com Nutella",
          "Churros",
          "Crème brûlée",
          "Maracujá",
          "Romeu e Julieta",
        ],
        minimumQuantity: 25,
        allowedQuantities: [25, 50, 75, 100],
        quantityIncrement: 25,
        quantityUnit: "docinho(s)",
        priceBaseQuantity: 100,
        flavorQuantityStep: 25,
      },
      {
        name: "Linha gourmet",
        description:
          "Escolha 25, 50, 75, 100 docinhos ou quantidades maiores em múltiplos de 25.",
        image:
          "/encomendas/doces-gourmet.jpeg",
        imageAlt:
          "Brigadeiros gourmet da La'Bel Confeitaria",
        prices: [
          {
            label: "Valor do cento",
            value: "R$ 150,00",
          },
        ],
        flavors: [
          "Brigadeiro",
          "Ninho",
          "Morango",
          "Beijinho",
          "Prestígio",
          "Meio amargo",
          "Paçoca",
          "Chocolate branco",
        ],
        minimumQuantity: 25,
        allowedQuantities: [25, 50, 75, 100],
        quantityIncrement: 25,
        quantityUnit: "docinho(s)",
        priceBaseQuantity: 100,
        flavorQuantityStep: 25,
      },
      {
        name: "Doces personalizados",
        description:
          "Você escolhe a cor, o molde e o carimbo de acordo com o tema da festa. Produzidos no sabor ninho.",
        image:
          "/encomendas/doces-personalizados.jpeg",
        imageAlt:
          "Doces personalizados com carimbo",
        prices: [
          {
            label: "Unidade",
            value: "R$ 2,00",
          },
        ],
        details: ["Pedido mínimo de 25 unidades"],
        notice:
          "Solicite com pelo menos 7 dias de antecedência.",
        leadTimeDays: 7,
        minimumQuantity: 25,
        quantityUnit: "unidade(s)",
      },
    ],
  },
  {
    id: "brownies",
    name: "Brownies",
    eyebrow: "Para presentear e celebrar",
    products: [
      {
        name: "Mini brownie",
        description:
          "Escolha 25, 50, 75, 100 mini brownies ou quantidades maiores em múltiplos de 25.",
        image:
          "/encomendas/mini-brownie.jpeg",
        imageAlt:
          "Cento de mini brownies recheados",
        prices: [
          {
            label: "Valor do cento",
            value: "R$ 160,00",
          },
        ],
        flavors: [
          "Doce de leite",
          "Ninho",
          "Brigadeiro",
          "Nutella",
        ],
        minimumQuantity: 25,
        allowedQuantities: [25, 50, 75, 100],
        quantityIncrement: 25,
        quantityUnit: "mini brownie(s)",
        priceBaseQuantity: 100,
        flavorQuantityStep: 25,
      },
      {
        name: "Brownie para evento",
        description:
          "Envie a sua arte e personalizamos cada brownie para combinar com o seu evento.",
        image:
          "/encomendas/brownie-evento.jpeg",
        imageAlt:
          "Brownies personalizados para evento",
        prices: [
          {
            label: "Tradicional",
            value: "R$ 5,50",
          },
          {
            label: "Recheado",
            value: "R$ 7,00",
          },
        ],
        flavors: [
          "Ninho",
          "Brigadeiro",
          "Nutella",
          "Doce de leite",
        ],
        details: ["Pedido mínimo de 10 unidades"],
        minimumQuantity: 10,
        quantityUnit: "unidade(s)",
      },
    ],
  },
  {
    id: "caseiros",
    name: "Caseiros",
    eyebrow: "Linha caseiros",
    products: [
      {
        name: "Caseirinho decorado",
        description:
          "Escolha massa de baunilha ou chocolate e finalize com cobertura de ninho ou brigadeiro.",
        image:
          "/encomendas/caseirinho-decorado.jpeg",
        imageAlt:
          "Bolo caseirinho decorado com morangos",
        prices: [
          {
            label: "Pequeno",
            value: "R$ 50,00",
          },
          {
            label: "Médio",
            value: "R$ 80,00",
          },
        ],
        details: [
          "A cobertura de ninho pode ser personalizada na cor escolhida",
          "A cobertura de brigadeiro recebe decoração com morangos",
        ],
        quantityUnit: "bolo(s)",
      },
    ],
  },
  {
    id: "comemorar",
    name: "Comemorar",
    eyebrow: "Bolos para momentos especiais",
    products: [
      {
        name: "Nata com morango",
        description:
          "Massa amanteigada leve, nata batida com pedaços de morango fresco e finalização em chantininho.",
        image:
          "/encomendas/nata-com-morango.jpeg",
        imageAlt:
          "Bolo de nata com morangos frescos",
        prices: [
          {
            label: "P · 12 a 15 fatias",
            value: "R$ 150,00",
          },
          {
            label: "M · 20 a 25 fatias",
            value: "R$ 220,00",
          },
          {
            label: "G · cerca de 35 fatias",
            value: "R$ 260,00",
          },
        ],
        quantityUnit: "bolo(s)",
      },
      {
        name: "Chocolate com KitKat",
        description:
          "Três camadas de massa de chocolate, duas de brigadeiro 50%, KitKat e laço na cor escolhida.",
        image:
          "/encomendas/chocolate-kitkat.jpeg",
        imageAlt:
          "Bolo de chocolate decorado com KitKat",
        prices: [
          {
            label: "P · 12 a 15 fatias",
            value: "R$ 150,00",
          },
          {
            label: "M · 20 a 25 fatias",
            value: "R$ 220,00",
          },
          {
            label: "G · cerca de 35 fatias",
            value: "R$ 270,00",
          },
        ],
        quantityUnit: "bolo(s)",
      },
    ],
  },
  {
    id: "naked",
    name: "Naked cakes",
    eyebrow: "Linha naked",
    products: [
      {
        name: "Naked de brownie",
        description:
          "Três camadas de brownie úmido, três camadas de brigadeiro e finalização com morangos frescos.",
        image:
          "/encomendas/naked-brownie.jpeg",
        imageAlt:
          "Naked cake feito com camadas de brownie",
        prices: [
          {
            label: "P · 12 a 15 fatias",
            value: "R$ 130,00",
          },
          {
            label: "M · 20 a 25 fatias",
            value: "R$ 220,00",
          },
          {
            label: "G · cerca de 35 fatias",
            value: "R$ 260,00",
          },
        ],
        quantityUnit: "bolo(s)",
      },
      {
        name: "Naked de cupuaçu",
        description:
          "Massa amanteigada, camadas de creme de cupuaçu, uvas frescas e fita na cor escolhida.",
        image:
          "/encomendas/naked-cupuacu.jpeg",
        imageAlt:
          "Naked cake de cupuaçu com uvas",
        prices: [
          {
            label: "P · 12 a 15 fatias",
            value: "R$ 160,00",
          },
          {
            label: "M · 20 a 25 fatias",
            value: "R$ 230,00",
          },
          {
            label: "G · cerca de 35 fatias",
            value: "R$ 280,00",
          },
        ],
        quantityUnit: "bolo(s)",
      },
      {
        name: "Naked cake",
        description:
          "Monte o seu naked cake escolhendo a massa, o recheio e a cor da fita.",
        image:
          "/encomendas/naked-cake.jpeg",
        imageAlt:
          "Naked cake decorado com frutas",
        prices: [
          {
            label: "Pequeno",
            value: "R$ 150,00",
          },
          {
            label: "Médio",
            value: "R$ 220,00",
          },
          {
            label: "Grande",
            value: "R$ 260,00",
          },
        ],
        flavors: [
          "Ninho",
          "Brigadeiro 50%",
          "Brigadeiro com maracujá",
          "Abacaxi com coco",
          "Ninho com geleia de morango",
          "Limão-siciliano com geleia de morango",
        ],
        details: [
          "Massas: chocolate, amanteigada ou ninho",
          "Decoração com morangos: adicional de R$ 20,00",
        ],
        quantityUnit: "bolo(s)",
      },
    ],
  },
  {
    id: "festa",
    name: "Festa",
    eyebrow: "Bolos espatulados",
    products: [
      {
        name: "Bolo espatulado",
        description:
          "Bolo personalizado para a sua celebração, com opções de massa, recheio e acabamento.",
        image:
          "/encomendas/bolo-espatulado.jpeg",
        imageAlt:
          "Bolo espatulado personalizado",
        prices: [
          {
            label: "Bentô",
            value: "R$ 50,00",
          },
          {
            label: "P · cerca de 15 fatias",
            value: "R$ 150,00",
          },
          {
            label: "M · cerca de 25 fatias",
            value: "R$ 230,00",
          },
          {
            label: "G · cerca de 35 fatias",
            value: "R$ 280,00",
          },
        ],
        flavors: [
          "Ninho",
          "Brigadeiro 50%",
          "Ninho com morango",
          "Maracujá com brigadeiro",
          "Nata com morango",
          "Limão-siciliano com geleia de morango",
          "Brigadeiro com doce de cupuaçu",
        ],
        details: [
          "Massas: chocolate, red velvet ou amanteigada",
          "Topo personalizado: adicional de R$ 25,00",
        ],
        quantityUnit: "bolo(s)",
      },
    ],
  },
  {
    id: "zero",
    name: "Linha zero",
    eyebrow: "Opções especiais",
    products: [
      {
        name: "Bolo zero",
        description:
          "Bolo inglês de aproximadamente 400 g, preparado sem glúten, lactose ou açúcar.",
        image: "/encomendas/bolo-zero.png",
        imageAlt:
          "Bolo zero da La'Bel em embalagem para presente",
        prices: [
          {
            label: "Sem cobertura",
            value: "R$ 30,00",
          },
          {
            label: "Com cobertura",
            value: "R$ 35,00",
          },
        ],
        flavors: [
          "Massa de baunilha",
          "Massa de cacau 100%",
          "Recheio de brigadeiro",
        ],
        notice:
          "Informe se a escolha é por restrição alimentar ou por preferência.",
        quantityUnit: "bolo(s)",
      },
    ],
  },
  {
    id: "sobremesas",
    name: "Sobremesas",
    eyebrow: "Para compartilhar",
    products: [
      {
        name: "Sobremesa na travessa",
        description:
          "Travessa de 2 litros, perfeita para reuniões e almoços em família. Serve aproximadamente 15 pessoas.",
        image:
          "/encomendas/sobremesa-travessa.jpeg",
        imageAlt:
          "Sobremesa de chocolate servida na travessa",
        prices: [
          {
            label: "Travessa · 2 litros",
            value: "R$ 140,00",
          },
        ],
        flavors: [
          "Banoffee",
          "La'Bel — a mais pedida",
          "Maracujá com brigadeiro",
          "Torta de limão",
          "Paraense com cupuaçu",
        ],
        quantityUnit: "travessa(s)",
      },
    ],
  },
];
