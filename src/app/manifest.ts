import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fit Coach",
    short_name: "Fit Coach",
    description: "Nutrition and training tracking with an AI coach.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f9b8e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
