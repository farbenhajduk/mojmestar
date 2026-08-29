"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import Link from "next/link";

import {
  createBrowserClient
} from "@supabase/ssr";

export default function FavoritiPage() {
  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [
    favoriteIds,
    setFavoriteIds
  ] = useState([]);

  const [
    favoritePros,
    setFavoritePros
  ] = useState([]);

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      return null;
    }

    return createBrowserClient(
      supabaseUrl,
      supabaseKey
    );
  }, [
    supabaseUrl,
    supabaseKey
  ]);

  useEffect(() => {
    loadPage();
  }, [supabase]);

  async function loadPage() {
    if (!supabase) {
      setMessage(
        "Aplikacija nije ispravno konfigurirana."
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const {
        data: authData
      } =
        await supabase.auth.getSession();

      const authUser =
        authData?.session?.user ||
        null;

      setUser(authUser);

      if (!authUser) {
        setProfile(null);
        setFavoriteIds([]);
        setFavoritePros([]);

        return;
      }

      const {
        data: profileData,
        error: profileError
      } =
        await supabase
          .from("profiles")
          .select(
            "id, role"
          )
          .eq(
            "id",
            authUser.id
          )
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setProfile(
        profileData || null
      );

      if (
        profileData?.role !==
        "customer"
      ) {
        setFavoriteIds([]);
        setFavoritePros([]);

        return;
      }

      const {
        data: favoriteRows,
        error: favoriteError
      } =
        await supabase
          .from("favorite_pros")
          .select(
            "pro_id, created_at"
          )
          .eq(
            "customer_id",
            authUser.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );

      if (favoriteError) {
        throw favoriteError;
      }

      const ids =
        (favoriteRows || [])
          .map(
            row =>
              row.pro_id
          )
          .filter(Boolean);

      setFavoriteIds(ids);

      if (!ids.length) {
        setFavoritePros([]);

        return;
      }

      const {
        data: directoryData,
        error: directoryError
      } =
        await supabase.rpc(
          "get_public_pro_directory"
        );

      if (directoryError) {
        throw directoryError;
      }

      const directory =
        Array.isArray(
          directoryData
        )
          ? directoryData
          : [];

      const prosById =
        Object.fromEntries(
          directory.map(
            pro => [
              pro.user_id,
              pro
            ]
          )
        );

      const ordered =
        ids
          .map(
            id =>
              prosById[id]
          )
          .filter(Boolean);

      setFavoritePros(
        ordered
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Spremljeni majstori nisu se mogli učitati."
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(
    proId
  ) {
    if (
      !supabase ||
      !user?.id ||
      !proId ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li ukloniti ovog majstora iz spremljenih?"
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      proId
    );

    setMessage("");

    try {
      const {
        error
      } =
        await supabase
          .from("favorite_pros")
          .delete()
          .eq(
            "customer_id",
            user.id
          )
          .eq(
            "pro_id",
            proId
          );

      if (error) {
        throw error;
      }

      setFavoriteIds(
        current =>
          current.filter(
            id =>
              id !== proId
          )
      );

      setFavoritePros(
        current =>
          current.filter(
            pro =>
              pro.user_id !==
              proId
          )
      );

      setMessage(
        "Majstor je uklonjen iz spremljenih."
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Majstora nije moguće ukloniti."
      );
    } finally {
      setActionLoading("");
    }
  }

  function renderStars(
    value
  ) {
    const rounded =
      Math.round(
        Number(value) || 0
      );

    return Array.from(
      {
        length: 5
      },
      (_, index) =>
        index < rounded
          ? "★"
          : "☆"
    ).join("");
  }

  function ratingText(
    pro
  ) {
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

    return `${rating.toFixed(
      1
    )} · ${count} recenzija`;
  }

  function locationText(
    pro
  ) {
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

  function FavoriteCard({
    pro
  }) {
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
              flex: 1,
              minWidth: 0
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
              <span className="badge">
                ★ Spremljen
              </span>

              {pro.verified && (
                <span className="badge">
                  ✓ Verificirani majstor
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

          <div
            style={{
              textAlign:
                "right"
            }}
          >
            {reviewCount >
            0 ? (
              <>
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
            gap: "8px",
            flexWrap: "wrap"
          }}
        >
          <Link
            href={`/majstor/${pro.user_id}`}
            className="button"
          >
            Pogledaj profil
          </Link>

          <button
            type="button"
            className="button secondary"
            disabled={
              actionLoading ===
              pro.user_id
            }
            onClick={() =>
              removeFavorite(
                pro.user_id
              )
            }
          >
            {actionLoading ===
            pro.user_id
              ? "Uklanjam..."
              : "Ukloni iz spremljenih"}
          </button>
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
              Spremljeni majstori
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
              Spremljeni majstori
            </h1>

            <p className="muted">
              Učitavanje...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <span className="eyebrow">
              Favoriti
            </span>

            <h1>
              Spremljeni majstori
            </h1>

            <p className="muted">
              Za pregled spremljenih majstora prvo se prijavite.
            </p>

            <div className="actions">
              <Link
                href="/login"
                className="button"
              >
                Prijava
              </Link>

              <Link
                href="/register"
                className="button secondary"
              >
                Registracija
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (
    profile?.role !==
    "customer"
  ) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <span className="eyebrow">
              Favoriti
            </span>

            <h1>
              Spremljeni majstori
            </h1>

            <p className="muted">
              Ova funkcija namijenjena je naručiteljima.
            </p>

            <Link
              href="/jobs"
              className="button"
            >
              Pronađi posao
            </Link>
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
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: "14px",
            flexWrap: "wrap",
            marginBottom:
              "24px"
          }}
        >
          <div>
            <span className="eyebrow">
              Favoriti
            </span>

            <h1>
              Spremljeni majstori
            </h1>

            <p
              className="muted"
              style={{
                marginBottom: 0
              }}
            >
              Majstori koje ste spremili za kasnije.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
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
              href="/dashboard"
              className="button secondary"
            >
              Moj pregled
            </Link>
          </div>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom:
              "24px"
          }}
        >
          <div
            className="card"
            style={{
              textAlign:
                "center",
              padding: "16px"
            }}
          >
            <div
              style={{
                fontSize:
                  "30px",
                fontWeight: 800
              }}
            >
              {
                favoritePros.length
              }
            </div>

            <div
              className="muted"
              style={{
                marginTop:
                  "6px"
              }}
            >
              Spremljeni majstori
            </div>
          </div>

          <div
            className="card"
            style={{
              textAlign:
                "center",
              padding: "16px"
            }}
          >
            <div
              style={{
                fontSize:
                  "30px",
                fontWeight: 800
              }}
            >
              {
                favoritePros.filter(
                  pro =>
                    pro.verified
                ).length
              }
            </div>

            <div
              className="muted"
              style={{
                marginTop:
                  "6px"
              }}
            >
              Verificirani
            </div>
          </div>

          <div
            className="card"
            style={{
              textAlign:
                "center",
              padding: "16px"
            }}
          >
            <div
              style={{
                fontSize:
                  "30px",
                fontWeight: 800
              }}
            >
              {
                favoritePros.filter(
                  pro =>
                    Number(
                      pro.review_count
                    ) > 0
                ).length
              }
            </div>

            <div
              className="muted"
              style={{
                marginTop:
                  "6px"
              }}
            >
              S ocjenama
            </div>
          </div>
        </div>

        {favoritePros.length ? (
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
                <FavoriteCard
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
            <span className="eyebrow">
              Još nema favorita
            </span>

            <h2>
              Spremite majstore koji vam se sviđaju
            </h2>

            <p className="muted">
              Na stranici za pretragu majstora možete spremiti profile i kasnije ih brzo pronaći ovdje.
            </p>

            <Link
              href="/majstori"
              className="button"
            >
              Pregledaj majstore
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
