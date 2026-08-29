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
      <section
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #172554 55%, #0f766e 100%)",
          color: "#ffffff",
          padding: "54px 0 42px"
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "30px",
            alignItems: "center"
          }}
        >
          <div>
            <span
              className="eyebrow"
              style={{
                color: "#99f6e4"
              }}
            >
              Platforma za majstore u Hrvatskoj
            </span>

            <h1
              style={{
                color: "#ffffff",
                fontSize: "clamp(38px, 7vw, 66px)",
                lineHeight: 1.02,
                maxWidth: "760px",
                marginBottom: "18px"
              }}
            >
              Pronađi pravog majstora bez kompliciranja.
            </h1>

            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.82)",
                maxWidth: "680px",
                margin: 0
              }}
            >
              Pretraži majstore u svojoj blizini ili objavi posao i pričekaj
              da ti se zainteresirani majstori jave.
            </p>

            <div
              className="actions"
              style={{
                marginTop: "26px",
                flexWrap: "wrap"
              }}
            >
              <Link
                href="/jobs"
                className="button"
                style={{
                  background: "#ef4444",
                  borderColor: "#ef4444",
                  color: "#ffffff"
                }}
              >
                Objavi posao
              </Link>

              <Link
                href="/majstori"
                className="button secondary"
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  borderColor: "#ffffff"
                }}
              >
                Pronađi majstora
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: "18px",
                flexWrap: "wrap",
                marginTop: "28px",
                fontSize: "14px",
                color: "rgba(255,255,255,0.82)"
              }}
            >
              <span>✓ Verificirani profili</span>
              <span>★ Ocjene korisnika</span>
              <span>📷 Portfolio radova</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "22px",
              padding: "22px",
              backdropFilter: "blur(8px)"
            }}
          >
            <span
              className="eyebrow"
              style={{
                color: "#99f6e4"
              }}
            >
              Trebate majstora?
            </span>

            <h2
              style={{
                color: "#ffffff",
                marginBottom: "14px"
              }}
            >
              Jednostavno u 3 koraka
            </h2>

            <div
              style={{
                display: "grid",
                gap: "10px"
              }}
            >
              <div
                style={{
                  padding: "15px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.10)"
                }}
              >
                <strong>1. Objavite posao</strong>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "rgba(255,255,255,0.75)"
                  }}
                >
                  Opišite što trebate i dodajte lokaciju.
                </p>
              </div>

              <div
                style={{
                  padding: "15px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.10)"
                }}
              >
                <strong>2. Majstori se javljaju</strong>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "rgba(255,255,255,0.75)"
                  }}
                >
                  Zainteresirani majstori šalju svoj interes.
                </p>
              </div>

              <div
                style={{
                  padding: "15px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.10)"
                }}
              >
                <strong>3. Odaberite majstora</strong>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "rgba(255,255,255,0.75)"
                  }}
                >
                  Usporedite profile i odaberite onoga koji vam odgovara.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          background: "#ffffff",
          padding: "34px 0",
          borderBottom: "1px solid #eef0f3"
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px"
          }}
        >
          <div
            style={{
              borderLeft: "4px solid #14b8a6",
              paddingLeft: "16px"
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "34px",
                lineHeight: 1
              }}
            >
              8
            </strong>

            <span className="muted">
              glavnih kategorija usluga
            </span>
          </div>

          <div
            style={{
              borderLeft: "4px solid #14b8a6",
              paddingLeft: "16px"
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "34px",
                lineHeight: 1
              }}
            >
              ★
            </strong>

            <span className="muted">
              profili, ocjene i portfolio
            </span>
          </div>

          <div
            style={{
              borderLeft: "4px solid #14b8a6",
              paddingLeft: "16px"
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "34px",
                lineHeight: 1
              }}
            >
              0 €
            </strong>

            <span className="muted">
              besplatno za naručitelje
            </span>
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
                Odaberite uslugu i pogledajte dostupne majstore.
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
                    cursor: "pointer",
                    borderTop: "3px solid #14b8a6"
                  }}
                >
                  <div
                    style={{
                      fontSize: "28px"
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

      <section
        className="section"
        style={{
          background: "#f4f7f9"
        }}
      >
        <div className="container">
          <div
            style={{
              textAlign: "center",
              maxWidth: "760px",
              margin: "0 auto 28px"
            }}
          >
            <span className="eyebrow">
              Kako funkcionira
            </span>

            <h2>
              Do majstora u samo nekoliko koraka
            </h2>

            <p className="muted">
              Bez kompliciranih postupaka. Objavite posao, usporedite majstore
              i dogovorite detalje.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px"
            }}
          >
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "24px"
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  background: "#ccfbf1",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "20px",
                  color: "#0f766e"
                }}
              >
                1
              </div>

              <h3>
                Objavite posao
              </h3>

              <p className="muted">
                Opišite što trebate, odaberite kategoriju i lokaciju.
              </p>
            </div>

            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "24px"
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  background: "#ccfbf1",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "20px",
                  color: "#0f766e"
                }}
              >
                2
              </div>

              <h3>
                Majstori se javljaju
              </h3>

              <p className="muted">
                Pogledajte profile, ocjene i portfolio zainteresiranih majstora.
              </p>
            </div>

            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "24px"
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  background: "#ccfbf1",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "20px",
                  color: "#0f766e"
                }}
              >
                3
              </div>

              <h3>
                Odaberite majstora
              </h3>

              <p className="muted">
                Odaberite najboljeg kandidata i dogovorite detalje posla.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px"
            }}
          >
            <div
              className="card"
              style={{
                padding: "24px",
                background: "#0f172a",
                color: "#ffffff"
              }}
            >
              <span
                className="eyebrow"
                style={{
                  color: "#99f6e4"
                }}
              >
                Za naručitelje
              </span>

              <h2
                style={{
                  color: "#ffffff"
                }}
              >
                Pronađite majstora koji vam odgovara.
              </h2>

              <p
                style={{
                  color: "rgba(255,255,255,0.75)"
                }}
              >
                Pretražite profile ili objavite posao i pričekajte da vam se
                majstori jave.
              </p>

              <div
                className="actions"
                style={{
                  flexWrap: "wrap",
                  marginTop: "18px"
                }}
              >
                <Link
                  href="/jobs"
                  className="button"
                  style={{
                    background: "#ef4444",
                    borderColor: "#ef4444"
                  }}
                >
                  Objavi posao
                </Link>

                <Link
                  href="/majstori"
                  className="button secondary"
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    borderColor: "#ffffff"
                  }}
                >
                  Majstori
                </Link>
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
                background: "#f0fdfa"
              }}
            >
              <span className="eyebrow">
                Za majstore
              </span>

              <h2>
                Novi poslovi u vašoj blizini.
              </h2>

              <p className="muted">
                Izradite profil, dodajte usluge i portfolio te pronađite nove
                poslove.
              </p>

              <div
                className="actions"
                style={{
                  flexWrap: "wrap",
                  marginTop: "18px"
                }}
              >
                <Link
                  href="/register"
                  className="button"
                >
                  Registriraj se
                </Link>

                <Link
                  href="/jobs"
                  className="button secondary"
                >
                  Pogledaj poslove
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              textAlign: "center",
              borderRadius: "22px",
              padding: "40px 22px",
              background:
                "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
              color: "#ffffff"
            }}
          >
            <span
              className="eyebrow"
              style={{
                color: "#ccfbf1"
              }}
            >
              MOJMEŠTAR
            </span>

            <h2
              style={{
                color: "#ffffff",
                maxWidth: "700px",
                margin: "0 auto 12px"
              }}
            >
              Spremni za sljedeći posao?
            </h2>

            <p
              style={{
                maxWidth: "650px",
                margin: "0 auto 22px",
                color: "rgba(255,255,255,0.80)"
              }}
            >
              Pronađite majstora ili objavite posao i dopustite majstorima da se
              jave vama.
            </p>

            <div
              className="actions"
              style={{
                justifyContent: "center",
                flexWrap: "wrap"
              }}
            >
              <Link
                href="/jobs"
                className="button"
                style={{
                  background: "#ef4444",
                  borderColor: "#ef4444"
                }}
              >
                Objavi posao
              </Link>

              <Link
                href="/majstori"
                className="button secondary"
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  borderColor: "#ffffff"
                }}
              >
                Pronađi majstora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
