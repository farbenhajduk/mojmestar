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
        data: authData
      } = await supabase.auth.getSession();

      const authUser =
        authData?.session?.user || null;

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

  async function loadFavorites(
    customerId
  ) {
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
        row =>
          row.pro_id
      )
    );
  }

  async function toggleFavorite(
    proId
  ) {
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
      currentProfile?.role !==
      "customer"
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
              id =>
                id !== proId
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
                current.includes(
                  proId
                )
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
            const categoriesList =
              Array.isArray(
                pro.categories
              )
                ? pro.categories
                : [];

            const categoryOk =
              !categoryFilter ||
              categoriesList.includes(
                categoryFilter
              );

            const verifiedOk =
              !onlyVerified ||
              Boolean(
                pro.verified
              );

            const searchableText = [
              pro.company_name,
              pro.address,
              pro.zip,
              pro.bio,
              ...categoriesList
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            const textOk =
              !term ||
              searchableText.includes(
                term
              );

            return (
              categoryOk &&
              verifiedOk &&
              textOk
            );
          }
        );

      rows = [
        ...rows
      ];

      if (
        sortMode ===
        "rating"
      ) {
        rows.sort(
          (a, b) =>
            Number(
              b.average_rating ||
                0
            ) -
            Number(
              a.average_rating ||
                0
            )
        );
      }

      if (
        sortMode ===
        "reviews"
      ) {
        rows.sort(
          (a, b) =>
            Number(
              b.review_count ||
                0
            ) -
            Number(
              a.review_count ||
                0
            )
        );
      }

      if (
        sortMode ===
        "name"
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

    const services =
      Array.isArray(
        pro.categories
      )
        ? pro.categories.slice(
            0,
            3
          )
        : [];

    const extraServices =
      Array.isArray(
        pro.categories
      )
        ? Math.max(
            pro.categories.length -
              services.length,
            0
          )
        : 0;

    return (
      <article
        className="card"
        style={{
          display: "grid",
          gap: "14px"
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
                gap: "7px",
                flexWrap: "wrap",
                marginBottom:
                  "7px"
              }}
            >
              {pro.verified && (
                <span className="badge">
                  ✓ Verificirani
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
                  "0 0 5px"
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
              {locationText(
                pro
              )}
            </p>
          </div>

          <div
            style={{
              textAlign:
                "right",
              minWidth:
                "92px"
            }}
          >
            {reviewCount >
            0 ? (
              <>
                <div
                  style={{
                    fontSize:
                      "18px",
                    lineHeight:
                      1
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
              </>
            ) : (
              <small className="muted">
                Još nema ocjena
              </small>
            )}
          </div>
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

        {services.length >
          0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "7px"
            }}
          >
            {services.map(
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

            {extraServices >
              0 && (
              <span className="muted">
                +{extraServices}
              </span>
            )}
          </div>
        )}

        {pro.service_radius_km !=
          null && (
          <small className="muted">
            Radijus rada:{" "}
            {
              pro.service_radius_km
            }{" "}
            km
          </small>
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
            Profil
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
                  : "☆ Spremi"}
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
            marginBottom: "22px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1>
            Pronađi majstora
          </h1>

          <p className="muted">
            Pronađite majstora prema usluzi, lokaciji i ocjenama.
          </p>
        </div>

        {message && (
          <div
            className="card"
            style={{
              padding: "12px",
              marginBottom: "16px"
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
                marginBottom: "28px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <span className="eyebrow">
                    Favoriti
                  </span>

                  <h2
                    style={{
                      marginBottom: 0
                    }}
                  >
                    Spremljeni majstori
                  </h2>
                </div>

                <Link
                  href="/favoriti"
                  className="button secondary small"
                >
                  Prikaži sve
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "12px"
                }}
              >
                {favoritePros
                  .slice(0, 3)
                  .map(
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
          <div
            style={{
              marginBottom: "14px"
            }}
          >
            <span className="eyebrow">
              Pretraga
            </span>

            <h2>
              Svi majstori
            </h2>
          </div>

          <div
            className="card"
            style={{
              marginBottom: "16px",
              padding: "14px"
            }}
          >
            <div
              style={{
                display: "grid",
                gap: "10px"
              }}
            >
              <input
                value={
                  searchText
                }
                onChange={e =>
                  setSearchText(
                    e.target.value
                  )
                }
                placeholder="Naziv, usluga ili lokacija"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px"
                }}
              >
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
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap"
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer"
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
                      width: "18px",
                      height: "18px"
                    }}
                  />

                  Samo verificirani
                </label>

                {(searchText ||
                  categoryFilter ||
                  onlyVerified ||
                  sortMode !==
                    "recommended") && (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={
                      resetFilters
                    }
                  >
                    Poništi filtre
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "12px"
            }}
          >
            <p
              className="muted"
              style={{
                margin: 0
              }}
            >
              {visiblePros.length}{" "}
              {visiblePros.length === 1
                ? "majstor"
                : "majstora"}
            </p>

            {!currentUser && (
              <Link
                href="/login"
                className="button secondary small"
              >
                Prijavi se za spremanje
              </Link>
            )}
          </div>

          {visiblePros.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "12px"
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
                  marginBottom: "12px"
                }}
              >
                Nema majstora koji odgovaraju odabranim kriterijima.
              </p>

              <button
                type="button"
                className="button secondary"
                onClick={
                  resetFilters
                }
              >
                Prikaži sve
              </button>
            </div>
          )}
        </section>

        <div
          className="card"
          style={{
            marginTop: "26px",
            padding: "18px"
          }}
        >
          <h2
            style={{
              marginBottom: "6px"
            }}
          >
            Ne želite sami tražiti?
          </h2>

          <p
            className="muted"
            style={{
              marginTop: 0
            }}
          >
            Objavite posao i zainteresirani majstori mogu vam se javiti.
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
