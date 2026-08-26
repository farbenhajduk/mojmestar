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

    if (status === "completed") {
      return "Završen";
    }

    return status || "Nepoznato";
  }

  const activeJobs = useMemo(
    () =>
      myJobs.filter(
        job =>
          job.status !==
          "completed"
      ),
    [myJobs]
  );

  const completedJobs = useMemo(
    () =>
      myJobs.filter(
        job =>
          job.status ===
          "completed"
      ),
    [myJobs]
  );

  const activeInterests = useMemo(
    () =>
      myInterests.filter(
        interest =>
          interest.job &&
          interest.job.status !==
            "completed"
      ),
    [myInterests]
  );

  const completedInterests = useMemo(
    () =>
      myInterests.filter(
        interest =>
          interest.job &&
          interest.job.status ===
            "completed"
      ),
    [myInterests]
  );

  const unavailableInterests = useMemo(
    () =>
      myInterests.filter(
        interest =>
          !interest.job
      ),
    [myInterests]
  );

  const selectedActiveInterests =
    useMemo(
      () =>
        activeInterests.filter(
          interest =>
            interest.job
              ?.selected_pro_id ===
            user?.id
        ).length,
      [
        activeInterests,
        user?.id
      ]
    );

  const selectedCompletedInterests =
    useMemo(
      () =>
        completedInterests.filter(
          interest =>
            interest.job
              ?.selected_pro_id ===
            user?.id
        ).length,
      [
        completedInterests,
        user?.id
      ]
    );

  function StatCard({
    value,
    label
  }) {
    return (
      <div
        className="card"
        style={{
          padding: "16px",
          textAlign: "center"
        }}
      >
        <div
          style={{
            fontSize: "30px",
            fontWeight: 800,
            lineHeight: 1
          }}
        >
          {value}
        </div>

        <div
          className="muted"
          style={{
            marginTop: "7px"
          }}
        >
          {label}
        </div>
      </div>
    );
  }

  function renderCustomerJob(
    job,
    completed = false
  ) {
    return (
      <article
        className="card"
        key={job.id}
        style={{
          marginBottom: "16px"
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

        {job.selected_pro_id ? (
          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "#f7f8fa",
              marginBottom:
                "14px"
            }}
          >
            <strong>
              Majstor je odabran
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              {completed
                ? "Posao je završen s odabranim majstorom."
                : "Za ovaj posao već ste odabrali majstora."}
            </p>
          </div>
        ) : (
          !completed && (
            <p className="muted">
              Majstor još nije odabran.
            </p>
          )
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
                Otvori posao
              </Link>
            )}

            {!completed &&
              job.selected_pro_id && (
                <Link
                  href={`/majstor/${job.selected_pro_id}`}
                  className="button secondary small"
                >
                  Profil majstora
                </Link>
              )}

            {completed &&
              job.selected_pro_id && (
                <>
                  <Link
                    href={`/majstor/${job.selected_pro_id}`}
                    className="button small"
                  >
                    Ocijeni majstora
                  </Link>

                  <Link
                    href={`/majstor/${job.selected_pro_id}`}
                    className="button secondary small"
                  >
                    Profil majstora
                  </Link>
                </>
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

    const anotherSelected =
      Boolean(
        job.selected_pro_id &&
          !isSelected
      );

    return (
      <article
        className="card"
        key={interest.id}
        style={{
          marginBottom: "16px"
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
            className="card"
            style={{
              padding: "12px",
              marginBottom:
                "14px",
              background:
                "#f7f8fa"
            }}
          >
            <strong>
              {completed
                ? "Vi ste odabrani majstor"
                : "Odabrani ste za posao"}
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              {completed
                ? "Ovaj posao je završen i vi ste bili odabrani izvođač."
                : "Naručitelj je odabrao vas za ovaj posao."}
            </p>
          </div>
        )}

        {anotherSelected && (
          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "#f7f8fa",
              marginBottom:
                "14px"
            }}
          >
            <strong>
              Odabran je drugi majstor
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              Naručitelj je za ovaj posao odabrao drugog majstora.
            </p>
          </div>
        )}

        {!job.selected_pro_id &&
          !completed && (
            <p className="muted">
              Naručitelj još nije odabrao majstora.
            </p>
          )}

        {interest.message && (
          <div
            style={{
              padding: "14px",
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
              {interest.message}
            </p>
          </div>
        )}

        <div
          className="rowBetween"
          style={{
            marginTop: "14px",
            gap: "12px",
            flexWrap: "wrap"
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
              Otvori posao
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
            marginBottom: "20px"
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
              Poslovi
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginBottom:
                "28px"
            }}
          >
            <StatCard
              value={
                activeJobs.length
              }
              label="Aktivni poslovi"
            />

            <StatCard
              value={
                completedJobs.length
              }
              label="Završeni poslovi"
            />

            <StatCard
              value={
                myJobs.filter(
                  job =>
                    Boolean(
                      job.selected_pro_id
                    )
                ).length
              }
              label="Odabrani majstori"
            />
          </div>
        )}

        {profile?.role ===
          "pro" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginBottom:
                "28px"
            }}
          >
            <StatCard
              value={
                activeInterests.length
              }
              label="Aktivni interesi"
            />

            <StatCard
              value={
                selectedActiveInterests
              }
              label="Odabrani poslovi"
            />

            <StatCard
              value={
                selectedCompletedInterests
              }
              label="Završeni poslovi"
            />
          </div>
        )}

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
                marginTop: "30px"
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
                marginTop: "30px"
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
                    "30px"
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
