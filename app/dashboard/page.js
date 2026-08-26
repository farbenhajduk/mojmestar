"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
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

  async function completeJob(jobId) {
    if (
      !supabase ||
      !jobId ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li označiti ovaj posao kao završen?"
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(jobId);
    setMessage("");

    try {
      const {
        error
      } = await supabase.rpc(
        "close_job",
        {
          p_job_id: jobId
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        "Posao je uspješno označen kao završen."
      );

      await loadDashboard();
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Posao nije moguće završiti."
      );
    } finally {
      setActionLoading("");
    }
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

    if (status === "assigned") {
      return "U tijeku";
    }

    if (status === "completed") {
      return "Završen";
    }

    return status || "Nepoznato";
  }

  function statusBadge(status) {
    if (status === "open") {
      return "Aktivan";
    }

    if (status === "assigned") {
      return "Posao u tijeku";
    }

    if (status === "completed") {
      return "Završen";
    }

    return "Nepoznato";
  }

  /*
   * NARUČITELJ
   */

  const openJobs = useMemo(
    () =>
      myJobs.filter(
        job =>
          job.status === "open"
      ),
    [myJobs]
  );

  const assignedJobs = useMemo(
    () =>
      myJobs.filter(
        job =>
          job.status === "assigned"
      ),
    [myJobs]
  );

  const completedJobs = useMemo(
    () =>
      myJobs.filter(
        job =>
          job.status === "completed"
      ),
    [myJobs]
  );

  /*
   * MAJSTOR
   */

  const openInterests = useMemo(
    () =>
      myInterests.filter(
        interest =>
          interest.job &&
          interest.job.status ===
            "open"
      ),
    [myInterests]
  );

  const assignedToMeInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job.status ===
              "assigned" &&
            interest.job
              .selected_pro_id ===
              user?.id
        ),
      [
        myInterests,
        user?.id
      ]
    );

  const completedForMeInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job.status ===
              "completed" &&
            interest.job
              .selected_pro_id ===
              user?.id
        ),
      [
        myInterests,
        user?.id
      ]
    );

  const notSelectedInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .selected_pro_id &&
            interest.job
              .selected_pro_id !==
              user?.id &&
            (
              interest.job.status ===
                "assigned" ||
              interest.job.status ===
                "completed"
            )
        ),
      [
        myInterests,
        user?.id
      ]
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

  function CustomerJobCard({
    job
  }) {
    const isOpen =
      job.status === "open";

    const isAssigned =
      job.status ===
      "assigned";

    const isCompleted =
      job.status ===
      "completed";

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
            {statusBadge(
              job.status
            )}
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

        {isOpen && (
          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "#f7f8fa",
              marginBottom: "14px"
            }}
          >
            <strong>
              Posao je otvoren
            </strong>

            <p
              className="muted"
              style={{
                margin: "5px 0 0"
              }}
            >
              Majstori još mogu iskazati interes za ovaj posao.
            </p>
          </div>
        )}

        {isAssigned &&
          job.selected_pro_id && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Posao je u tijeku
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Majstor je odabran. Kada posao bude gotov, označite ga kao završen.
              </p>
            </div>
          )}

        {isCompleted &&
          job.selected_pro_id && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Posao je završen
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Sada možete ocijeniti odabranog majstora.
              </p>
            </div>
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
            {isOpen && (
              <Link
                href="/jobs"
                className="button small"
              >
                Otvori posao
              </Link>
            )}

            {isAssigned &&
              job.selected_pro_id && (
                <>
                  <Link
                    href={`/majstor/${job.selected_pro_id}`}
                    className="button secondary small"
                  >
                    Profil majstora
                  </Link>

                  <button
                    type="button"
                    className="button small"
                    disabled={
                      actionLoading ===
                      job.id
                    }
                    onClick={() =>
                      completeJob(
                        job.id
                      )
                    }
                  >
                    {actionLoading ===
                    job.id
                      ? "Spremanje..."
                      : "Završi posao"}
                  </button>
                </>
              )}

            {isCompleted &&
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

  function ProInterestCard({
    interest,
    mode = "open"
  }) {
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
            {statusBadge(
              job.status
            )}
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

        {mode === "open" && (
          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "#f7f8fa",
              marginBottom: "14px"
            }}
          >
            <strong>
              Interes je poslan
            </strong>

            <p
              className="muted"
              style={{
                margin: "5px 0 0"
              }}
            >
              Naručitelj još nije odabrao majstora.
            </p>
          </div>
        )}

        {mode === "assigned" &&
          isSelected && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Odabrani ste za posao
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Posao je u tijeku. Naručitelj će ga označiti kao završen kada radovi budu gotovi.
              </p>
            </div>
          )}

        {mode === "completed" &&
          isSelected && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Vi ste bili odabrani majstor
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Naručitelj je označio ovaj posao kao završen.
              </p>
            </div>
          )}

        {mode === "not-selected" && (
          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "#f7f8fa",
              marginBottom: "14px"
            }}
          >
            <strong>
              Odabran je drugi majstor
            </strong>

            <p
              className="muted"
              style={{
                margin: "5px 0 0"
              }}
            >
              Naručitelj je za ovaj posao odabrao drugog majstora.
            </p>
          </div>
        )}

        {interest.message && (
          <div
            style={{
              padding: "14px",
              background:
                "#f7f8fa",
              borderRadius: "12px"
            }}
          >
            <strong>
              Moja poruka
            </strong>

            <p
              style={{
                margin: "6px 0 0"
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

          {mode === "open" && (
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
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "12px",
                background:
                  "#f7f8fa"
              }}
            >
              {message}
            </div>
          )}
        </div>

        {profile?.role ===
          "customer" && (
          <>
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
                  openJobs.length
                }
                label="Otvoreni poslovi"
              />

              <StatCard
                value={
                  assignedJobs.length
                }
                label="Poslovi u tijeku"
              />

              <StatCard
                value={
                  completedJobs.length
                }
                label="Završeni poslovi"
              />
            </div>

            <section>
              <span className="eyebrow">
                Za naručitelje
              </span>

              <h2>
                Otvoreni poslovi
              </h2>

              <div className="jobList">
                {openJobs.map(
                  job => (
                    <CustomerJobCard
                      key={job.id}
                      job={job}
                    />
                  )
                )}

                {!openJobs.length && (
                  <div className="card">
                    <p className="muted">
                      Trenutno nemate otvorenih poslova.
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
                Aktivni radovi
              </span>

              <h2>
                Poslovi u tijeku
              </h2>

              <div className="jobList">
                {assignedJobs.map(
                  job => (
                    <CustomerJobCard
                      key={job.id}
                      job={job}
                    />
                  )
                )}

                {!assignedJobs.length && (
                  <div className="card">
                    <p className="muted">
                      Trenutno nemate poslova u tijeku.
                    </p>
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
                  job => (
                    <CustomerJobCard
                      key={job.id}
                      job={job}
                    />
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
                  openInterests.length
                }
                label="Aktivni interesi"
              />

              <StatCard
                value={
                  assignedToMeInterests.length
                }
                label="Poslovi u tijeku"
              />

              <StatCard
                value={
                  completedForMeInterests.length
                }
                label="Završeni poslovi"
              />
            </div>

            <section>
              <span className="eyebrow">
                Za meštre
              </span>

              <h2>
                Aktivni interesi
              </h2>

              <div className="jobList">
                {openInterests.map(
                  interest => (
                    <ProInterestCard
                      key={
                        interest.id
                      }
                      interest={
                        interest
                      }
                      mode="open"
                    />
                  )
                )}

                {!openInterests.length && (
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
                Aktivni radovi
              </span>

              <h2>
                Poslovi u tijeku
              </h2>

              <div className="jobList">
                {assignedToMeInterests.map(
                  interest => (
                    <ProInterestCard
                      key={
                        interest.id
                      }
                      interest={
                        interest
                      }
                      mode="assigned"
                    />
                  )
                )}

                {!assignedToMeInterests.length && (
                  <div className="card">
                    <p className="muted">
                      Trenutno nemate poslova u tijeku.
                    </p>
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
                {completedForMeInterests.map(
                  interest => (
                    <ProInterestCard
                      key={
                        interest.id
                      }
                      interest={
                        interest
                      }
                      mode="completed"
                    />
                  )
                )}

                {!completedForMeInterests.length && (
                  <div className="card">
                    <p className="muted">
                      Još nemate završenih poslova.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {notSelectedInterests.length >
              0 && (
              <section
                style={{
                  marginTop:
                    "30px"
                }}
              >
                <span className="eyebrow">
                  Ostali interesi
                </span>

                <h2>
                  Odabran je drugi majstor
                </h2>

                <div className="jobList">
                  {notSelectedInterests.map(
                    interest => (
                      <ProInterestCard
                        key={
                          interest.id
                        }
                        interest={
                          interest
                        }
                        mode="not-selected"
                      />
                    )
                  )}
                </div>
              </section>
            )}

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
