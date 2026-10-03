import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Read & Learn",
    short_name: "Read & Learn",
    description:
      "Learn languages through reading with translations and focused explanations.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf6",
    theme_color: "#ba4935",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
