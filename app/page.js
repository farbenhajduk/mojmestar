export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container heroGrid">
          <div>
            <span className="eyebrow">
              Platforma za majstore u Hrvatskoj
            </span>

            <h1>
              Pronađi pravog meštra. Brzo i jednostavno.
            </h1>

            <p className="lead">
              Objavi posao, pronađi lokalne majstore i usporedi ponude.
            </p>

            <div className="actions">
              <a className="button" href="/jobs">
                Trebam meštra
              </a>

              <a className="button secondary" href="/register">
                Ja sam meštar
              </a>
            </div>
          </div>

          <div className="card">
            <h3>Kako radi</h3>

            <ol className="steps">
              <li>Objavi posao</li>
              <li>Majstori reagiraju</li>
              <li>Dogovori detalje</li>
              <li>Ocijeni izvršeni posao</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Kategorije</span>
          <h2>Najtraženije usluge</h2>

          <div className="grid">
            {[
              "Soboslikari",
              "Knauf / suha gradnja",
              "Keramičari",
              "Vodoinstalateri",
              "Električari",
              "Fasaderi",
              "Podovi / parket",
              "Kompletne adaptacije"
            ].map(x => (
              <div className="card category" key={x}>
                {x}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
