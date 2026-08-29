import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";

export const metadata = {
  metadataBase: new URL("https://mojmestar.vercel.app"),
  title: {
    default: "MojMeštar",
    template: "%s | MojMeštar"
  },
  description:
    "Pronađite lokalne majstore, objavite posao i usporedite profile u Hrvatskoj.",
  applicationName: "MojMeštar",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "hr_HR",
    siteName: "MojMeštar",
    title: "MojMeštar",
    description:
      "Pronađite lokalne majstore, objavite posao i usporedite profile u Hrvatskoj.",
    url: "/"
  },
  twitter: {
    card: "summary",
    title: "MojMeštar",
    description:
      "Pronađite lokalne majstore i objavite posao u Hrvatskoj."
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
  colorScheme: "light"
};

export default function RootLayout({ children }) {
  return (
    <html lang="hr">
      <body>
        <a className="skipLink" href="#main-content">
          Preskoči na sadržaj
        </a>
        <Header />
        <div id="main-content" className="siteContent">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
