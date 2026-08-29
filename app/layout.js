import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";

export const metadata = {
  title: {
    default: "MojMeštar",
    template: "%s | MojMeštar"
  },
  description:
    "Pronađite lokalne majstore, objavite posao i usporedite profile u Hrvatskoj.",
  applicationName: "MojMeštar",
  robots: {
    index: true,
    follow: true
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e"
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
