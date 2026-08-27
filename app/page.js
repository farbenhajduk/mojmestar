import Link from "next/link";

const categories = [
  {
    label: "Soboslikari",
    value: "Soboslikarski radovi",
    icon: "🎨"
  },
  {
    label: "Knauf / suha gradnja",
    value: "Knauf / suha gradnja",
    icon: "🧱"
  },
  {
    label: "Keramičari",
    value: "Keramičarski radovi",
    icon: "◼️"
  },
  {
    label: "Vodoinstalateri",
    value: "Vodoinstalaterski radovi",
    icon: "🔧"
  },
  {
    label: "Električari",
    value: "Elektroinstalacije",
    icon: "⚡"
  },
  {
    label: "Fasaderi",
    value: "Fasaderski radovi",
    icon: "🏠"
  },
  {
    label: "Podovi i parket",
    value: "Podovi i parket",
    icon: "🪵"
  },
  {
    label: "Kompletne adaptacije",
    value: "Kompletna adaptacija",
    icon: "🛠️"
  }
];

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
              Pronađi pouzdanog majstora za svoj posao.
            </h1>

            <p className="lead">
              Pretraži lokalne majstore, pogledaj ocjene i fotografije radova
              ili objavi posao i pričekaj da ti se zainteresirani majstori jave.
            </p>

            <div
              className="actions"
              style={{
                marginTop: "24px",
                flexWrap: "wrap"
              }}
            >
              <Link
                className="button"
                href="/majstori"
              >
                Pronađi majstora
              </Link>

              <Link
                className="button secondary"
                href="/jobs"
              >
                Objavi posao
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginTop: "28px"
              }}
            >
              <div
                className="card"
                style={{
                  padding: "14px"
                }}
              >
                <strong>
                  ✓ Verificirani profili
                </strong>

                <p
                  className="muted"
                  style={{
                    margin: "5px 0 0"
                  }}
                >
                  Lakše prepoznajte provjerene majstore.
                </p>
              </div>

              <div
                className="card"
                style={{
                  padding: "14px"
                }}
              >
                <strong>
                  ★ Ocjene naručitelja
                </strong>

                <p
                  className="muted"
                  style={{
                    margin: "5px 0 0"
                  }}
                >
                  Pogledajte iskustva nakon završenih poslova.
                </p>
              </div>

              <div
                className="card"
                style={{
                  padding: "14px"
                }}
              >
                <strong>
                  📷 Portfolio radova
                </strong>

                <p
                  className="muted"
                  style={{
                    margin: "5px 0 0"
                  }}
                >
                  Pogledajte fotografije prethodnih projekata.
                </p>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              display: "grid",
              gap: "18px"
            }}
          >
            <div>
              <span className="eyebrow">
                Trebate majstora?
              </span>

              <h2
                style={{
                  marginBottom: "8px"
                }}
              >
                Dva jednostavna načina
              </h2>

              <p
                className="muted"
                style={{
                  marginBottom: 0
                }}
              >
                Sami pronađite majstora ili objavite posao.
              </p>
            </div>

            <Link
              href="/majstori"
              style={{
                textDecoration: "none"
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "#f7f8fa"
                }}
              >
                <strong>
                  1. Pretraži majstore
                </strong>

                <p
                  className="muted"
                  style={{
                    margin: "6px 0 0"
                  }}
                >
                  Filtriraj prema usluzi, lokaciji, ocjeni i verifikaciji.
                </p>
              </div>
            </Link>

            <Link
              href="/jobs"
              style={{
                textDecoration: "none"
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "#f7f8fa"
                }}
              >
                <strong>
                  2. Objavi posao
                </strong>

                <p
                  className="muted"
                  style={{
                    margin: "6px 0 0"
                  }}
                >
                  Opiši što treba napraviti i pričekaj zainteresirane majstore.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "18px"
            }}
          >
            <div>
              <span className="eyebrow">
                Kategorije
              </span>

              <h2
                style={{
                  marginBottom: "5px"
                }}
              >
                Najtraženije usluge
              </h2>

              <p
                className="muted"
                style={{
                  margin: 0
                }}
              >
                Odaberite uslugu i odmah pogledajte dostupne majstore.
              </p>
            </div>

            <Link
              href="/majstori"
              className="button secondary"
            >
              Svi majstori
            </Link>
          </div>

          <div className="grid">
            {categories.map(category => (
              <Link
                key={category.value}
                href={`/majstori?category=${encodeURIComponent(
                  category.value
                )}`}
                style={{
                  textDecoration: "none"
                }}
              >
                <div
                  className="card category"
                  style={{
                    height: "100%",
                    display: "grid",
                    gap: "10px",
                    cursor: "pointer"
                  }}
                >
                  <div
                    style={{
                      fontSize: "26px"
                    }}
                  >
                    {category.icon}
                  </div>

                  <strong>
                    {category.label}
                  </strong>

                  <span
                    className="muted"
                    style={{
                      fontSize: "14px"
                    }}
                  >
                    Pogledaj majstore
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">
            Za naručitelje
          </span>

          <h2>
            Kako funkcionira MOJMEŠTAR?
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px"
            }}
          >
            <div className="card">
              <strong>
                1. Pronađite ili objavite
              </strong>

              <p className="muted">
                Pretražite profile majstora ili objavite posao koji trebate.
              </p>
            </div>

            <div className="card">
              <strong>
                2. Usporedite majstore
              </strong>

              <p className="muted">
                Pogledajte usluge, ocjene, portfolio i prethodna iskustva.
              </p>
            </div>

            <div className="card">
              <strong>
                3. Odaberite majstora
              </strong>

              <p className="muted">
                Odaberite zainteresiranog majstora i dogovorite detalje posla.
              </p>
            </div>

            <div className="card">
              <strong>
                4. Završite i ocijenite
              </strong>

              <p className="muted">
                Nakon završenog rada označite posao završenim i ostavite ocjenu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
              alignItems: "center"
            }}
          >
            <div>
              <span className="eyebrow">
                Za majstore
              </span>

              <h2>
                Pronađite nove poslove u svojoj blizini.
              </h2>

              <p className="muted">
                Izradite profil, odaberite usluge koje nudite, dodajte
                fotografije radova i pratite nove poslove.
              </p>

              <div
                className="actions"
                style={{
                  marginTop: "18px",
                  flexWrap: "wrap"
                }}
              >
                <Link
                  href="/register"
                  className="button"
                >
                  Registriraj se kao majstor
                </Link>

                <Link
                  href="/jobs"
                  className="button secondary"
                >
                  Pogledaj poslove
                </Link>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px"
              }}
            >
              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f7f8fa"
                }}
              >
                ✓ Profil i usluge
              </div>

              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f7f8fa"
                }}
              >
                ✓ Radijus rada
              </div>

              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f7f8fa"
                }}
              >
                ✓ Portfolio fotografija
              </div>

              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f7f8fa"
                }}
              >
                ✓ Ocjene nakon završenih poslova
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "32px 20px"
            }}
          >
            <span className="eyebrow">
              MOJMEŠTAR
            </span>

            <h2>
              Spremni za sljedeći posao?
            </h2>

            <p
              className="muted"
              style={{
                maxWidth: "650px",
                margin: "0 auto 20px"
              }}
            >
              Pronađite majstora koji odgovara vašim potrebama ili objavite
              posao i dopustite majstorima da se jave vama.
            </p>

            <div
              className="actions"
              style={{
                justifyContent: "center",
                flexWrap: "wrap"
              }}
            >
              <Link
                href="/majstori"
                className="button"
              >
                Pronađi majstora
              </Link>

              <Link
                href="/jobs"
                className="button secondary"
              >
                Objavi posao
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
