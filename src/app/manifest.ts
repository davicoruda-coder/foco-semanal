import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Foco Semanal",
    short_name: "Foco",
    description: "Sistema de estudo: grade, matérias, timer e lembretes.",
    start_url: "/hoje",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f8fc",
    theme_color: "#6d5ef8",
    lang: "pt-BR",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
