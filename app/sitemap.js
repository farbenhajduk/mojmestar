export default function sitemap() {
  const baseUrl = "https://mojmestar.vercel.app";

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${baseUrl}/jobs`,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/majstori`,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/login`,
      changeFrequency: "monthly",
      priority: 0.3
    },
    {
      url: `${baseUrl}/register`,
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];
}
