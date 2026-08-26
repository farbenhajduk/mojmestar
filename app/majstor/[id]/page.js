"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function PublicMajstorPage() {
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [hasCompletedJobWithPro, setHasCompletedJobWithPro] =
    useState(false);

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
  }, [supabase, params?.id]);

  async function loadPage() {
    if (!supabase || !params?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const {
        data: authData
      } = await supabase.auth.getUser();

      const authUser =
        authData?.user || null;

      setCurrentUser(authUser);

      if (authUser) {
        const {
          data: userProfileData,
          error: userProfileError
        } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", authUser.id)
          .maybeSingle();

        if (userProfileError) {
          throw userProfileError;
        }

        setCurrentUserProfile(
          userProfileData || null
        );

        if (
          userProfileData?.role === "customer" &&
          authUser.id !== params.id
        ) {
          const {
            data: completedJob,
            error: completedJobError
          } = await supabase
            .from("jobs")
            .select("id")
            .eq("customer_id", authUser.id)
            .eq("selected_pro_id", params.id)
            .eq("status", "completed")
            .limit(1)
            .maybeSingle();

          if (completedJobError) {
            throw completedJobError;
          }

          setHasCompletedJobWithPro(
            Boolean(completedJob)
          );
        } else {
          setHasCompletedJobWithPro(false);
        }
      } else {
        setCurrentUserProfile(null);
        setHasCompletedJobWithPro(false);
      }

      const {
        data,
        error
      } = await supabase.rpc(
        "get_public_pro_profile",
        {
          p_user_id: params.id
        }
      );

      if (error) {
        throw error;
      }

      const publicProfile =
        Array.isArray(data)
          ? data[0] || null
          : data || null;

      setProfile(publicProfile);

      if (!publicProfile) {
        setReviews([]);
        setExistingReview(null);

        setMessage(
          "Profil majstora nije pronađen."
        );

        return;
      }

      await loadReviews();

      if (authUser) {
        await loadExistingReview(
          authUser.id
        );
      } else {
        setExistingReview(null);
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Profil se nije mogao učitati."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    const {
      data,
      error
    } = await supabase
      .from("pro_reviews")
      .select(
        "id, rating, comment, created_at"
      )
      .eq(
        "pro_id",
        params.id
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

    setReviews(data || []);
  }

  async function loadExistingReview(userId) {
    const {
      data,
      error
    } = await supabase
      .from("pro_reviews")
      .select(
        "id, rating, comment, created_at"
      )
      .eq(
        "pro_id",
        params.id
      )
      .eq(
        "customer_id",
        userId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    setExistingReview(
      data || null
    );
  }

  async function submitReview(e) {
    e.preventDefault();

    if (
      !supabase ||
      !currentUser ||
      reviewSaving ||
      existingReview
    ) {
      return;
    }

    setReviewSaving(true);
    setMessage("");

    try {
      const {
        error
      } = await supabase
        .from("pro_reviews")
        .insert({
          pro_id: params.id,
          customer_id: currentUser.id,
          rating: Number(rating),
          comment:
            comment.trim() ||
            null
        });

      if (error) {
        if (
          error.code === "23505"
        ) {
          setMessage(
            "Već ste ocijenili ovog majstora."
          );

          await loadExistingReview(
            currentUser.id
          );
        } else {
          throw error;
        }

        return;
      }

      setComment("");
      setRating("5");

      setMessage(
        "Hvala! Vaša ocjena je spremljena."
      );

      await loadReviews();

      await loadExistingReview(
        currentUser.id
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Ocjena se nije mogla spremiti."
      );
    } finally {
      setReviewSaving(false);
    }
  }

  const averageRating =
    useMemo(() => {
      if (!reviews.length) {
        return 0;
      }

      const total =
        reviews.reduce(
          (sum, review) =>
            sum +
            Number(
              review.rating || 0
            ),
          0
        );

      return total / reviews.length;
    }, [reviews]);

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

  function formatDate(value) {
    if (!value) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(
        "hr-HR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }
      ).format(
        new Date(value)
      );
    } catch {
      return "";
    }
  }

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <h1>
              Majstor
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
              Profil majstora
            </h1>

            <p className="muted">
              Učitavanje...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <span className="eyebrow">
              MOJMEŠTAR
            </span>

            <h1>
              Profil nije pronađen
            </h1>

            <p>
              {message ||
                "Ovaj profil trenutno nije dostupan."}
            </p>

            <div className="actions">
              <Link
                href="/jobs"
                className="button"
              >
                Pogledaj poslove
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isCustomerViewer =
    currentUser &&
    currentUserProfile?.role ===
      "customer" &&
    currentUser.id !==
      params.id;

  const canReview =
    isCustomerViewer &&
    hasCompletedJobWithPro;

  return (
    <main className="section">
      <div className="container">
        <div
          className="card"
          style={{
            marginBottom: "18px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1
            style={{
              marginBottom: "12px"
            }}
          >
            {profile.company_name ||
              "Majstor"}
          </h1>

          {profile.verified && (
            <div
              className="badge"
              style={{
                marginBottom: "14px"
              }}
            >
              Verificirani majstor
            </div>
          )}

          {reviews.length ? (
            <div
              style={{
                marginBottom: "14px"
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  lineHeight: 1
                }}
              >
                {renderStars(
                  averageRating
                )}
              </div>

              <p
                style={{
                  margin: "7px 0 0"
                }}
              >
                <strong>
                  {averageRating.toFixed(
                    1
                  )}
                </strong>{" "}
                od 5 ·{" "}
                {reviews.length}{" "}
                ocjena
              </p>
            </div>
          ) : (
            <p className="muted">
              Još nema ocjena.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gap: "8px"
            }}
          >
            {(profile.address ||
              profile.zip) && (
              <p
                style={{
                  margin: 0
                }}
              >
                <strong>
                  Lokacija:
                </strong>{" "}
                {profile.address || ""}
                {profile.address &&
                profile.zip
                  ? ", "
                  : ""}
                {profile.zip || ""}
              </p>
            )}

            {profile.service_radius_km && (
              <p
                style={{
                  margin: 0
                }}
              >
                <strong>
                  Radijus usluge:
                </strong>{" "}
                {
                  profile.service_radius_km
                }{" "}
                km
              </p>
            )}
          </div>
        </div>

        <div
          className="card"
          style={{
            marginBottom: "18px"
          }}
        >
          <span className="eyebrow">
            O majstoru
          </span>

          <h2>
            Opis
          </h2>

          <p
            style={{
              marginBottom: 0
            }}
          >
            {profile.bio ||
              "Majstor još nije dodao opis profila."}
          </p>
        </div>

        <div
          className="card"
          style={{
            marginBottom: "18px"
          }}
        >
          <span className="eyebrow">
            Usluge
          </span>

          <h2>
            Područja rada
          </h2>

          {profile.categories?.length ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px"
              }}
            >
              {profile.categories.map(
                category => (
                  <span
                    key={category}
                    className="badge"
                  >
                    {category}
                  </span>
                )
              )}
            </div>
          ) : (
            <p className="muted">
              Usluge još nisu unesene.
            </p>
          )}
        </div>
        {profile.portfolio_urls?.length >
          0 && (
          <div
            className="card"
            style={{
              marginBottom: "18px"
            }}
          >
            <span className="eyebrow">
              Portfolio
            </span>

            <h2>
              Referentne fotografije
            </h2>

            <p
              className="muted"
              style={{
                marginBottom: "16px"
              }}
            >
              Pogledajte neke od završenih radova ovog majstora.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "12px"
              }}
            >
              {profile.portfolio_urls.map(
                (url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      borderRadius: "18px",
                      overflow: "hidden",
                      border:
                        "1px solid var(--border)",
                      background:
                        "var(--card)",
                      aspectRatio: "1 / 1"
                    }}
                  >
                    <img
                      src={url}
                      alt={`Referentna fotografija ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {canReview &&
          !existingReview && (
            <form
              onSubmit={submitReview}
              className="card form"
              style={{
                marginBottom: "18px"
              }}
            >
              <span className="eyebrow">
                Ocijeni majstora
              </span>

              <h2>
                Vaša ocjena
              </h2>

              <label>
                Broj zvjezdica

                <select
                  value={rating}
                  onChange={e =>
                    setRating(
                      e.target.value
                    )
                  }
                >
                  <option value="5">
                    5 ★★★★★
                  </option>

                  <option value="4">
                    4 ★★★★☆
                  </option>

                  <option value="3">
                    3 ★★★☆☆
                  </option>

                  <option value="2">
                    2 ★★☆☆☆
                  </option>

                  <option value="1">
                    1 ★☆☆☆☆
                  </option>
                </select>
              </label>

              <label>
                Komentar

                <textarea
                  rows="4"
                  value={comment}
                  onChange={e =>
                    setComment(
                      e.target.value
                    )
                  }
                  placeholder="Kako ste zadovoljni radom majstora?"
                />
              </label>

              <button
                type="submit"
                className="button"
                disabled={
                  reviewSaving
                }
              >
                {reviewSaving
                  ? "Spremam..."
                  : "Pošalji ocjenu"}
              </button>
            </form>
          )}

        {isCustomerViewer &&
          existingReview && (
            <div
              className="card"
              style={{
                marginBottom: "18px"
              }}
            >
              <span className="eyebrow">
                Vaša ocjena
              </span>

              <h2>
                Već ste ocijenili ovog majstora.
              </h2>

              <div
                style={{
                  fontSize: "26px",
                  marginBottom: "8px"
                }}
              >
                {renderStars(
                  existingReview.rating
                )}
              </div>

              <p>
                <strong>
                  {
                    existingReview.rating
                  }
                  /5
                </strong>
              </p>

              {existingReview.comment && (
                <p
                  style={{
                    marginBottom: 0
                  }}
                >
                  {
                    existingReview.comment
                  }
                </p>
              )}
            </div>
          )}

        <div
          className="card"
          style={{
            marginBottom: "18px"
          }}
        >
          <span className="eyebrow">
            Ocjene
          </span>

          <h2>
            Recenzije korisnika
          </h2>

          {!reviews.length ? (
            <p className="muted">
              Ovaj majstor još nema recenzija.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px"
              }}
            >
              {reviews.map(
                review => (
                  <div
                    key={review.id}
                    style={{
                      padding: "14px",
                      border:
                        "1px solid var(--border)",
                      borderRadius:
                        "16px"
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
                        review.rating
                      )}
                    </div>

                    <p
                      style={{
                        margin:
                          "8px 0"
                      }}
                    >
                      <strong>
                        {review.rating}/5
                      </strong>
                    </p>

                    {review.comment && (
                      <p>
                        {review.comment}
                      </p>
                    )}

                    <small
                      className="muted"
                    >
                      {formatDate(
                        review.created_at
                      )}
                    </small>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="card">
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h2>
            Trebate majstora?
          </h2>

          <p>
            Objavite posao i pronađite odgovarajućeg majstora.
          </p>

          <div className="actions">
            <Link
              href="/jobs"
              className="button"
            >
              Pogledaj poslove
            </Link>

            <Link
              href="/"
              className="button secondary"
            >
              Početna
            </Link>
          </div>
        </div>

        {message && (
          <p
            style={{
              marginTop: "16px"
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
