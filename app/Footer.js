import Link from "next/link";

export default function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div>
          <Link href="/" className="footerBrand">
            MOJMEŠTAR
          </Link>

          <p className="footerText">
            Jednostavno povezujemo naručitelje i majstore u Hrvatskoj.
          </p>
        </div>

        <nav className="footerNav" aria-label="Poveznice u podnožju">
          <Link href="/jobs">Poslovi</Link>
          <Link href="/majstori">Majstori</Link>
          <Link href="/login">Prijava</Link>
          <Link href="/register">Registracija</Link>
        </nav>
      </div>

      <div className="container footerBottom">
        © {new Date().getFullYear()} MojMeštar
      </div>
    </footer>
  );
}
