"use client";

import Link from "next/link";

export default function ErrorPage({ reset }) {
  return (
    <main className="section">
      <div className="container">
        <div className="card centeredState">
          <span className="eyebrow">MOJMEŠTAR</span>
          <h1>Nešto nije u redu</h1>
          <p className="muted">
            Stranica se trenutačno ne može prikazati. Pokušajte ponovno.
          </p>

          <div className="actions centeredActions">
            <button type="button" className="button" onClick={() => reset()}>
              Pokušaj ponovno
            </button>
            <Link href="/" className="button secondary">
              Početna stranica
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
