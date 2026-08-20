import "./globals.css";

export const metadata = {
  title: "MojMeštar",
  description: "Pronađi lokalne majstore u Hrvatskoj."
};

export default function RootLayout({ children }) {
  return (
    <html lang="hr">
      <body>
        <header className="siteHeader">
          <div className="container headerInner">
            <a href="/" className="brand">
              MOJMEŠTAR
            </a>

            <nav className="nav">
              <a href="/jobs">Poslovi</a>
              <a href="/login">Prijava</a>
              <a href="/register" className="button small">
                Registracija
              </a>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
