"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const categories = [
  "Soboslikarski radovi",
  "Knauf / suha gradnja",
  "Keramičarski radovi",
  "Vodoinstalaterski radovi",
  "Elektroinstalacije",
  "Fasaderski radovi",
  "Podovi i parket",
  "Kompletna adaptacija"
];

export default function MajstoriPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  const [pros, setPros] = useState([]);
  const [favoriteProIds, setFavoriteProIds] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortMode, setSortMode] = useState("recommended");

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    return createBrowserClient(
      supabaseUrl,
      supabaseKey
    );
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    loadPage();
  }, [supabase]);

  async function loadPage() {
    if (!supabase) {
      setLoading(false);
      setMessage(
        "Aplikacija nije ispravno konfigurirana."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const {
        data: authData,
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const authUser =
        authData?.user || null;

      setCurrentUser(
        authUser
      );

      let userProfile = null;

      if (authUser) {
        const {
          data: profileData,
          error: profileError
        } = await supabase
          .from("profiles")
          .select("id, role")
          .eq(
            "id",
            authUser.id
          )
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        userProfile =
          profileData || null;
      }

      setCurrentProfile(
        userProfile
      );

      const {
        data: directoryData,
        error: directoryError
      } = await supabase.rpc(
        "get_public_pro_directory"
      );

      if (directoryError) {
        throw directoryError;
      }

      setPros(
        Array.isArray(directoryData)
          ? directoryData
          : []
      );

      if (
        authUser &&
        userProfile?.role === "customer"
      ) {
        await loadFavorites(
          authUser.id
        );
      } else {
        setFavoriteProIds([]);
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Majstori se nisu mogli učitati."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFavorites(customerId) {
    const {
      data,
      error
    } = await supabase
      .from("favorite_pros")
      .select("pro_id")
      .eq(
        "customer_id",
        customerId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    setFavoriteProIds(
      (data || []).map(
        row => row.pro_id
      )
    );
  }

  async function toggleFavorite(proId) {
    if (
      !supabase ||
      !proId ||
      actionLoading
    ) {
      return;
    }

    if (!currentUser) {
      setMessage(
        "Za spremanje majstora prvo se prijavite."
      );
      return;
    }

    if (
      currentProfile?.role !== "customer"
    ) {
      setMessage(
        "Majstore mogu spremati samo naručitelji."
      );
      return;
    }

    const isFavorite =
      favoriteProIds.includes(
        proId
      );

    setActionLoading(
      proId
    );

    setMessage("");

    try {
      if (isFavorite) {
        const {
          error
        } = await supabase
          .from("favorite_pros")
          .delete()
          .eq(
            "customer_id",
            currentUser.id
          )
          .eq(
            "pro_id",
            proId
          );

        if (error) {
          throw error;
        }

        setFavoriteProIds(
          current =>
            current.filter(
              id => id !== proId
            )
        );

        setMessage(
          "Majstor je uklonjen iz spremljenih."
        );
      } else {
        const {
          error
        } = await supabase
          .from("favorite_pros")
          .insert({
            customer_id:
              currentUser.id,
            pro_id:
              proId
          });

        if (error) {
          if (
            error.code === "23505"
          ) {
            setFavoriteProIds(
              current =>
                current.includes(proId)
                  ? current
                  : [
                      ...current,
                      proId
                    ]
            );

            return;
          }

          throw error;
        }

        setFavoriteProIds(
          current => [
            ...current,
            proId
          ]
        );

        setMessage(
          "Majstor je spremljen."
        );
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Promjena nije spremljena."
      );
    } finally {
      setActionLoading("");
    }
  }

  function renderStars(value) {
    const rounded =
      Math.round(
        Number(value) || 0
      );

    return Array.from(
      { length: 5 },
      (_, index) =>
        index < rounded
          ? "★"
          : "☆"
    ).join("");
  }

  function ratingText(pro) {
    const count =
      Number(
        pro.review_count
      ) || 0;

    const rating =
      Number(
        pro.average_rating
      ) || 0;

    if (!count) {
      return "Još nema ocjena";
    }

    return `${rating.toFixed(1)} · ${count} recenzija`;
  }

  function locationText(pro) {
    const parts = [];

    if (pro.address) {
      parts.push(
        pro.address
      );
    }

    if (pro.zip) {
      parts.push(
        pro.zip
      );
    }

    return parts.length
      ? parts.join(" · ")
      : "Lokacija nije navedena";
  }

  const visiblePros =
    useMemo(() => {
      const term =
        searchText
          .trim()
          .toLowerCase();

      let rows =
        pros.filter(
          pro => {
            const services =
              Array.isArray(
                pro.categories
              )
                ? pro.categories
                : [];

            const categoryOk =
              !categoryFilter ||
              services.includes(
                categoryFilter
              );

            const verifiedOk =
              !onlyVerified ||
              Boolean(
                pro.verified
              );

            const searchable =
              [
                pro.company_name,
                pro.address,
                pro.zip,
                pro.bio,
                ...services
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const textOk =
              !term ||
              searchable.includes(
                term
              );

            return (
              categoryOk &&
              verifiedOk &&
              textOk
            );
          }
        );

      rows = [...rows];

      if (
        sortMode === "rating"
      ) {
        rows.sort(
          (a, b) =>
            Number(
              b.average_rating || 0
            ) -
            Number(
              a.average_rating || 0
            )
        );
      }

      if (
        sortMode === "reviews"
      ) {
        rows.sort(
          (a, b) =>
            Number(
              b.review_count || 0
            ) -
            Number(
              a.review_count || 0
            )
        );
      }

      if (
        sortMode === "name"
      ) {
        rows.sort(
          (a, b) =>
            String(
              a.company_name ||
                "Majstor"
            ).localeCompare(
              String(
                b.company_name ||
                  "Majstor"
              ),
              "hr"
            )
        );
      }

      return rows;
    }, [
      pros,
      searchText,
      categoryFilter,
      onlyVerified,
      sortMode
    ]);

  const favoritePros =
    useMemo(
      () =>
        pros.filter(
          pro =>
            favoriteProIds.includes(
              pro.user_id
            )
        ),
      [
        pros,
        favoriteProIds
      ]
    );

  function MajstorCard({
    pro,
    savedSection = false
  }) {
    const isFavorite =
      favoriteProIds.includes(
        pro.user_id
      );

    const reviewCount =
      Number(
        pro.review_count
      ) || 0;

    const averageRating =
      Number(
        pro.average_rating
      ) || 0;

    const portfolioCount =
      Array.isArray(
        pro.portfolio_urls
      )
        ? pro.portfolio_urls.length
        : 0;

    const serviceCount =
      Array.isArray(
        pro.categories
      )
        ? pro.categories.length
        : 0;

    return (
      <article
        className="card"
        style={{
          display: "grid",
          gap: "16px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: 1
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom:
                  "8px"
              }}
            >
              {pro.verified ? (
                <span className="badge">
                  ✓ Verificirani majstor
                </span>
              ) : (
                <span className="badge">
                  Majstor
                </span>
              )}

              {savedSection && (
                <span className="badge">
                  Spremljen
                </span>
              )}
            </div>

            <h3
              style={{
                margin:
                  "0 0 6px"
              }}
            >
              {pro.company_name ||
                "Majstor"}
            </h3>

            <p
              className="muted"
              style={{
                margin: 0
              }}
            >
              📍{" "}
              {locationText(
                pro
              )}
            </p>
          </div>

          {reviewCount >
          0 ? (
            <div
              style={{
                textAlign:
                  "right"
              }}
            >
              <div
                style={{
                  fontSize:
                    "22px",
                  lineHeight: 1
                }}
              >
                {renderStars(
                  averageRating
                )}
              </div>

              <small className="muted">
                {ratingText(
                  pro
                )}
              </small>
            </div>
          ) : (
            <small className="muted">
              Još nema ocjena
            </small>
          )}
        </div>

        {pro.bio && (
          <p
            style={{
              margin: 0
            }}
          >
            {pro.bio}
          </p>
        )}

        {Array.isArray(
          pro.categories
        ) &&
          pro.categories.length >
            0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "7px"
              }}
            >
              {pro.categories.map(
                category => (
                  <span
                    key={
                      category
                    }
                    className="badge"
                  >
                    {category}
                  </span>
                )
              )}
            </div>
          )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "8px"
          }}
        >
          <div
            style={{
              padding:
                "12px 8px",
              background:
                "#f7f8fa",
              borderRadius:
                "12px",
              textAlign:
                "center"
            }}
          >
            <strong>
              {reviewCount}
            </strong>

            <div
              className="muted"
              style={{
                fontSize:
                  "12px",
                marginTop:
                  "3px"
              }}
            >
              Recenzije
            </div>
          </div>

          <div
            style={{
              padding:
                "12px 8px",
              background:
                "#f7f8fa",
              borderRadius:
                "12px",
              textAlign:
                "center"
            }}
          >
            <strong>
              {portfolioCount}
            </strong>

            <div
              className="muted"
              style={{
                fontSize:
                  "12px",
                marginTop:
                  "3px"
              }}
            >
              Fotografije
            </div>
          </div>

          <div
            style={{
              padding:
                "12px 8px",
              background:
                "#f7f8fa",
              borderRadius:
                "12px",
              textAlign:
                "center"
            }}
          >
            <strong>
              {serviceCount}
            </strong>

            <div
              className="muted"
              style={{
                fontSize:
                  "12px",
                marginTop:
                  "3px"
              }}
            >
              Usluge
            </div>
          </div>
        </div>

        {pro.service_radius_km !=
          null && (
          <p
            className="muted"
            style={{
              margin: 0
            }}
          >
            Radijus rada:{" "}
            <strong>
              {
                pro.service_radius_km
              }{" "}
              km
            </strong>
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <Link
            href={`/majstor/${pro.user_id}`}
            className="button"
          >
            Pogledaj profil
          </Link>

          {currentProfile?.role ===
            "customer" && (
            <button
              type="button"
              className="button secondary"
              disabled={
                actionLoading ===
                pro.user_id
              }
              onClick={() =>
                toggleFavorite(
                  pro.user_id
                )
              }
            >
              {actionLoading ===
              pro.user_id
                ? "Spremam..."
                : isFavorite
                  ? "★ Spremljen"
                  : "☆ Spremi majstora"}
            </button>
          )}
        </div>
      </article>
    );
  }

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <h1>
              Majstori
            </h1>

            <p>
              Aplikacija nije ispravno konfigurirana.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <span className="eyebrow">
              MOJMEŠTAR
            </span>

            <h1>
              Pronađi majstora
            </h1>

            <p className="muted">
              Učitavanje majstora...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div
          style={{
            marginBottom:
              "24px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1>
            Pronađi majstora
          </h1>

          <p className="muted">
            Pretražite majstore prema usluzi, lokaciji, ocjenama i statusu verifikacije.
          </p>
        </div>

        {message && (
          <div
            className="card"
            style={{
              padding: "14px",
              marginBottom:
                "18px"
            }}
          >
            {message}
          </div>
        )}

        {currentProfile?.role ===
          "customer" &&
          favoritePros.length >
            0 && (
            <section
              style={{
                marginBottom:
                  "34px"
              }}
            >
              <span className="eyebrow">
                Favoriti
              </span>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-end",
                  gap: "10px",
                  flexWrap:
                    "wrap",
                  marginBottom:
                    "14px"
                }}
              >
                <div>
                  <h2
                    style={{
                      marginBottom:
                        "4px"
                    }}
                  >
                    Spremljeni majstori
                  </h2>

                  <p
                    className="muted"
                    style={{
                      margin: 0
                    }}
                  >
                    Majstori koje ste spremili za kasnije.
                  </p>
                </div>

                <span className="badge">
                  {
                    favoritePros.length
                  }
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "14px"
                }}
              >
                {favoritePros.map(
                  pro => (
                    <MajstorCard
                      key={
                        pro.user_id
                      }
                      pro={pro}
                      savedSection
                    />
                  )
                )}
              </div>
            </section>
          )}

        <section>
          <span className="eyebrow">
            Pretraga
          </span>

          <h2>
            Svi majstori
          </h2>

          <div
            className="card"
            style={{
              marginBottom:
                "18px"
            }}
          >
            <div
              style={{
                display: "grid",
                gap: "12px"
              }}
            >
              <label>
                Pretraži

                <input
                  value={
                    searchText
                  }
                  onChange={e =>
                    setSearchText(
                      e.target.value
                    )
                  }
                  placeholder="Naziv, usluga, lokacija ili poštanski broj"
                />
              </label>

              <label>
                Usluga

                <select
                  value={
                    categoryFilter
                  }
                  onChange={e =>
                    setCategoryFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Sve usluge
                  </option>

                  {categories.map(
                    category => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Sortiranje

                <select
                  value={
                    sortMode
                  }
                  onChange={e =>
                    setSortMode(
                      e.target.value
                    )
                  }
                >
                  <option value="recommended">
                    Preporučeno
                  </option>

                  <option value="rating">
                    Najbolje ocijenjeni
                  </option>

                  <option value="reviews">
                    Najviše recenzija
                  </option>

                  <option value="name">
                    Naziv A–Ž
                  </option>
                </select>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  cursor:
                    "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    onlyVerified
                  }
                  onChange={e =>
                    setOnlyVerified(
                      e.target.checked
                    )
                  }
                  style={{
                    width: "20px",
                    height: "20px"
                  }}
                />

                Samo verificirani majstori
              </label>

              {(searchText ||
                categoryFilter ||
                onlyVerified ||
                sortMode !==
                  "recommended") && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setSearchText("");
                    setCategoryFilter("");
                    setOnlyVerified(false);
                    setSortMode(
                      "recommended"
                    );
                  }}
                >
                  Poništi filtre
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom:
                "14px"
            }}
          >
            <p
              className="muted"
              style={{
                margin: 0
              }}
            >
              Pronađeno:{" "}
              <strong>
                {
                  visiblePros.length
                }
              </strong>
            </p>

            {!currentUser && (
              <p
                className="muted"
                style={{
                  margin: 0
                }}
              >
                Za spremanje majstora potrebno je prijaviti se.
              </p>
            )}
          </div>

          {visiblePros.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px"
              }}
            >
              {visiblePros.map(
                pro => (
                  <MajstorCard
                    key={
                      pro.user_id
                    }
                    pro={pro}
                  />
                )
              )}
            </div>
          ) : (
            <div className="card">
              <h3>
                Nema rezultata
              </h3>

              <p
                className="muted"
                style={{
                  marginBottom:
                    "12px"
                }}
              >
                Nema majstora koji odgovaraju odabranim kriterijima.
              </p>

              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSearchText("");
                  setCategoryFilter("");
                  setOnlyVerified(false);
                  setSortMode(
                    "recommended"
                  );
                }}
              >
                Prikaži sve majstore
              </button>
            </div>
          )}
        </section>

        <div
          className="card"
          style={{
            marginTop:
              "30px"
          }}
        >
          <span className="eyebrow">
            Trebate pomoć?
          </span>

          <h2>
            Objavite posao
          </h2>

          <p className="muted">
            Ako ne želite sami tražiti majstora, objavite posao i zainteresirani majstori mogu vam se javiti.
          </p>

          <Link
            href="/jobs"
            className="button"
          >
            Objavi posao
          </Link>
        </div>
      </div>
    </main>
  );
}
