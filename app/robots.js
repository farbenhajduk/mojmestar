export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/favoriti",
        "/profile",
        "/reset-password"
      ]
    },
    sitemap: "https://mojmestar.vercel.app/sitemap.xml"
  };
}
