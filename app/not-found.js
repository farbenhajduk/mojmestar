import Link from "next/link";

export const metadata = {
  title: "Stranica nije pronađena"
};

export default function NotFound() {
  return (
    <main className="section">
      <div className="container">
        <div className="card centeredState">
          <span className="eyebrow">Greška 404</span>
          <h1>Stranica nije pronađena</h1>
          <p className="muted">
            Poveznica možda više nije aktivna ili je adresa pogrešno unesena.
          </p>

          <div className="actions centeredActions">
            <Link href="/" className="button">
              Početna stranica
            </Link>
            <Link href="/jobs" className="button secondary">
              Pogledaj poslove
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
