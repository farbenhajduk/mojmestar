export default function manifest() {
  return {
    name: "MojMeštar",
    short_name: "MojMeštar",
    description:
      "Pronađite lokalne majstore i objavite posao u Hrvatskoj.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f8",
    theme_color: "#0f766e",
    lang: "hr",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
