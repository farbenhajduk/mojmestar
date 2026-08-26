"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [myInterests, setMyInterests] = useState([]);

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
    loadDashboard();
  }, [supabase]);

  async function ensureProfile(authUser) {
    const {
      data: existing,
      error: readError
    } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (existing) {
      return existing;
    }

    const role =
      authUser.user_metadata?.role === "pro"
        ? "pro"
        : "customer";

    const {
      data: created,
      error: createError
    } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        role
      })
      .select("id, role")
      .single();

    if (createError) {
      throw createError;
    }

    return created;
  }

  async function loadDashboard() {
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
        data: authData,
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const authUser =
        authData?.user || null;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setMyJobs([]);
        setMyInterests([]);
        return;
      }

      setUser(authUser);

      const currentProfile =
        await ensureProfile(authUser);

      setProfile(currentProfile);

      if (
        currentProfile?.role ===
        "customer"
      ) {
        await loadCustomerJobs(
          authUser.id
        );
      }

      if (
        currentProfile?.role === "pro"
      ) {
        await loadProInterests(
          authUser.id
        );
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Greška pri učitavanju pregleda."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerJobs(
    userId
  ) {
    const {
      data,
      error
    } = await supabase
      .from("jobs")
      .select("*")
      .eq(
        "customer_id",
        userId
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

    setMyJobs(data || []);
    setMyInterests([]);
  }

  async function loadProInterests(
    userId
  ) {
    const {
      data: interests,
      error: interestsError
    } = await supabase
      .from("interests")
      .select("*")
      .eq(
        "pro_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (interestsError) {
      throw interestsError;
    }

    const interestRows =
      interests || [];

    if (!interestRows.length) {
      setMyInterests([]);
      setMyJobs([]);
      return;
    }

    const jobIds = [
      ...new Set(
        interestRows
          .map(
            item =>
              item.job_id
          )
          .filter(Boolean)
      )
    ];

    const {
      data: jobs,
      error: jobsError
    } = await supabase
      .from("jobs")
      .select("*")
      .in(
        "id",
        jobIds
      );

    if (jobsError) {
      throw jobsError;
    }

    const jobsById =
      Object.fromEntries(
        (jobs || []).map(
          job => [
            job.id,
            job
          ]
        )
      );

    const combined =
      interestRows.map(
        interest => ({
          ...interest,
          job:
            jobsById[
              interest.job_id
            ] || null
        })
      );

    setMyInterests(combined);
    setMyJobs([]);
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

  function statusLabel(status) {
    if (status === "open") {
      return "Aktivan";
    }

    if (
      status === "completed"
    ) {
      return "Završen";
    }

    return (
      status ||
      "Nepoznato"
    );
  }

  const activeJobs =
    useMemo(
      () =>
        myJobs.filter(
          job =>
            job.status !==
            "completed"
        ),
      [myJobs]
    );

  const completedJobs =
    useMemo(
      () =>
        myJobs.filter(
          job =>
            job.status ===
            "completed"
        ),
      [myJobs]
    );

  const activeInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .status !==
              "completed"
        ),
      [myInterests]
    );

  const completedInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .status ===
              "completed"
        ),
      [myInterests]
    );

  const unavailableInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            !interest.job
        ),
      [myInterests]
    );

  function renderCustomerJob(
    job,
    completed = false
  ) {
    return (
      <article
        className="card"
        key={job.id}
        style={{
          marginBottom:
            "16px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "10px",
            flexWrap: "wrap"
          }}
        >
          <span className="badge">
            {job.category}
          </span>

          <span className="badge">
            {completed
              ? "Završen"
              : "Aktivan"}
          </span>
        </div>

        <h3>
          {job.city}

          {job.zip
            ? ` · ${job.zip}`
            : ""}
        </h3>

        <p>
          {job.description}
        </p>

        {job.selected_pro_id && (
          <p className="muted">
            Majstor je odabran za ovaj posao.
          </p>
        )}

        <div
          className="rowBetween"
          style={{
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div>
            <small>
              Status:{" "}
              <strong>
                {statusLabel(
                  job.status
                )}
              </strong>
            </small>

            <br />

            <small>
              Objavljeno:{" "}
              {formatDate(
                job.created_at
              )}
            </small>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap"
            }}
          >
            {!completed && (
              <Link
                href="/jobs"
                className="button small"
              >
                Otvori poslove
              </Link>
            )}

            {completed &&
              job.selected_pro_id && (
                <Link
                  href={`/majstor/${job.selected_pro_id}`}
                  className="button small"
                >
                  Ocijeni majstora
                </Link>
              )}
          </div>
        </div>
      </article>
    );
  }

  function renderProInterest(
    interest,
    completed = false
  ) {
    if (!interest.job) {
      return null;
    }

    const job =
      interest.job;

    const isSelected =
      job.selected_pro_id ===
      user?.id;

    return (
      <article
        className="card"
        key={interest.id}
        style={{
          marginBottom:
            "16px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "10px",
            flexWrap: "wrap"
          }}
        >
          <span className="badge">
            {job.category}
          </span>

          <span className="badge">
            {completed
              ? "Završen"
              : "Aktivan"}
          </span>
        </div>

        <h3>
          {job.city}

          {job.zip
            ? ` · ${job.zip}`
            : ""}
        </h3>

        <p>
          {job.description}
        </p>

        {isSelected && (
          <div
            className="badge"
            style={{
              marginBottom:
                "12px"
            }}
          >
            {completed
              ? "Vi ste odabrani majstor"
              : "Odabrani ste za posao"}
          </div>
        )}

        {job.selected_pro_id &&
          !isSelected && (
            <p className="muted">
              Naručitelj je odabrao drugog majstora.
            </p>
          )}

        {interest.message && (
          <div
            style={{
              padding:
                "14px",
              background:
                "#f7f8fa",
              borderRadius:
                "12px"
            }}
          >
            <strong>
              Moja poruka
            </strong>

            <p
              style={{
                margin:
                  "6px 0 0"
              }}
            >
              {
                interest.message
              }
            </p>
          </div>
        )}

        <div
          className="rowBetween"
          style={{
            marginTop:
              "14px"
          }}
        >
          <div>
            <small>
              Status posla:{" "}
              <strong>
                {statusLabel(
                  job.status
                )}
              </strong>
            </small>

            <br />

            <small>
              Interes poslan:{" "}
              {formatDate(
                interest.created_at
              )}
            </small>
          </div>

          {!completed && (
            <Link
              href="/jobs"
              className="button small"
            >
              Otvori poslove
            </Link>
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
              Pregled
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
              Moj pregled
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
              MOJMEŠTAR
            </span>

            <h1>
              Moj pregled
            </h1>

            <p>
              Za pregled svojih poslova morate se prvo prijaviti.
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

  return (
    <main className="section">
      <div className="container">
        <div
          className="card"
          style={{
            marginBottom:
              "24px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1>
            Moj pregled
          </h1>

          <p className="muted">
            {user.email}
          </p>

          <p>
            Vrsta računa:{" "}
            <strong>
              {profile?.role ===
              "pro"
                ? "Majstor"
                : "Naručitelj"}
            </strong>
          </p>

          <div className="actions">
            <Link
              href="/profile"
              className="button secondary"
            >
              Uredi profil
            </Link>

            <Link
              href="/jobs"
              className="button"
            >
              Aktivni poslovi
            </Link>

            <button
              type="button"
              className="button secondary"
              onClick={
                loadDashboard
              }
            >
              Osvježi
            </button>
          </div>

          {message && (
            <p
              style={{
                marginTop:
                  "16px"
              }}
            >
              {message}
            </p>
          )}
        </div>

        {profile?.role ===
          "customer" && (
          <>
            <section>
              <span className="eyebrow">
                Za naručitelje
              </span>

              <h2>
                Aktivni poslovi
              </h2>

              <div className="jobList">
                {activeJobs.map(
                  job =>
                    renderCustomerJob(
                      job,
                      false
                    )
                )}

                {!activeJobs.length && (
                  <div className="card">
                    <p>
                      Trenutno nemate aktivnih poslova.
                    </p>

                    <Link
                      href="/jobs"
                      className="button"
                    >
                      Objavi posao
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  "28px"
              }}
            >
              <span className="eyebrow">
                Povijest poslova
              </span>

              <h2>
                Završeni poslovi
              </h2>

              <div className="jobList">
                {completedJobs.map(
                  job =>
                    renderCustomerJob(
                      job,
                      true
                    )
                )}

                {!completedJobs.length && (
                  <div className="card">
                    <p className="muted">
                      Još nemate završenih poslova.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {profile?.role ===
          "pro" && (
          <>
            <section>
              <span className="eyebrow">
                Za meštre
              </span>

              <h2>
                Aktivni interesi
              </h2>

              <div className="jobList">
                {activeInterests.map(
                  interest =>
                    renderProInterest(
                      interest,
                      false
                    )
                )}

                {!activeInterests.length && (
                  <div className="card">
                    <p>
                      Trenutno nemate aktivnih interesa.
                    </p>

                    <Link
                      href="/jobs"
                      className="button"
                    >
                      Pronađi posao
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  "28px"
              }}
            >
              <span className="eyebrow">
                Povijest
              </span>

              <h2>
                Završeni poslovi
              </h2>

              <div className="jobList">
                {completedInterests.map(
                  interest =>
                    renderProInterest(
                      interest,
                      true
                    )
                )}

                {!completedInterests.length && (
                  <div className="card">
                    <p className="muted">
                      Još nemate završenih poslova.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {unavailableInterests.length >
              0 && (
              <section
                style={{
                  marginTop:
                    "28px"
                }}
              >
                <span className="eyebrow">
                  Nedostupno
                </span>

                <h2>
                  Izbrisani ili nedostupni poslovi
                </h2>

                <div className="jobList">
                  {unavailableInterests.map(
                    interest => (
                      <article
                        className="card"
                        key={
                          interest.id
                        }
                        style={{
                          marginBottom:
                            "16px"
                        }}
                      >
                        <h3>
                          Posao više nije dostupan
                        </h3>

                        <p className="muted">
                          Posao za koji ste iskazali interes je izbrisan ili više nije dostupan.
                        </p>

                        <small>
                          Interes poslan:{" "}
                          {formatDate(
                            interest.created_at
                          )}
                        </small>
                      </article>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
