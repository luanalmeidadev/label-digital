import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La'Bel Confeitaria",
    short_name: "La'Bel",
    description:
      "Cardápio do dia e encomendas artesanais da La'Bel Confeitaria.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF9",
    theme_color: "#8B0000",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
