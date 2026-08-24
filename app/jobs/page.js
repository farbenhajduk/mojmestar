"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { haversineKm } from "../../lib/geo";

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

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [proProfile, setProProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [filterCity, setFilterCity] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [unlockedPhones, setUnlockedPhones] = useState({});
  const [interestsByJob, setInterestsByJob] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  async function ensureProfile(authUser) {
    if (!supabase) return null;

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

  async function loadAll() {
    if (!supabase) {
      setMessage(
        "Aplikacija nije ispravno konfigurirana."
      );
      return;
    }

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const authUser =
        authData?.user || null;

      setCurrentUserId(
        authUser?.id || null
      );

      let profile = null;

      if (authUser) {
        profile =
          await ensureProfile(authUser);

        setUserProfile(profile);

        if (profile?.role === "pro") {
          const {
            data: pp,
            error: ppError
          } = await supabase
            .from("pro_profiles")
            .select("*")
            .eq(
              "user_id",
              authUser.id
            )
            .maybeSingle();

          if (!ppError) {
            setProProfile(
              pp || null
            );
          }
        } else {
          setProProfile(null);
        }
      } else {
        setUserProfile(null);
        setProProfile(null);
      }

      const {
        data,
        error
      } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        throw error;
      }

      const loadedJobs =
        data || [];

      setJobs(loadedJobs);

      if (
        authUser &&
        profile?.role === "customer"
      ) {
        const ownJobIds =
          loadedJobs
            .filter(
              job =>
                job.customer_id ===
                authUser.id
            )
            .map(
              job => job.id
            );

        if (ownJobIds.length) {
          const {
            data: interestRows,
            error: interestError
          } = await supabase
            .from("interests")
            .select(
              "id, job_id, pro_id, message, created_at"
            )
            .in(
              "job_id",
              ownJobIds
            )
            .order(
              "created_at",
              {
                ascending: false
              }
            );

          if (interestError) {
            throw interestError;
          }

          const grouped = {};

          for (
            const interest of
            interestRows || []
          ) {
            if (
              !grouped[
                interest.job_id
              ]
            ) {
              grouped[
                interest.job_id
              ] = [];
            }

            grouped[
              interest.job_id
            ].push(interest);
          }

          setInterestsByJob(
            grouped
          );
        } else {
          setInterestsByJob({});
        }
      } else {
        setInterestsByJob({});
      }

      if (
        authUser &&
        profile?.role === "pro"
      ) {
        const results =
          await Promise.all(
            loadedJobs.map(
              async job => {
                const {
                  data: contactData,
                  error: contactError
                } =
                  await supabase.rpc(
                    "get_unlocked_job_contact",
                    {
                      p_job_id:
                        job.id
                    }
                  );

                if (
                  contactError ||
                  !contactData?.phone
                ) {
                  return null;
                }

                return [
                  job.id,
                  contactData.phone
                ];
              }
            )
          );

        setUnlockedPhones(
          Object.fromEntries(
            results.filter(Boolean)
          )
        );
      } else {
        setUnlockedPhones({});
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Greška pri učitavanju."
      );
    }
  }

  useEffect(() => {
    loadAll();
  }, [supabase]);

  async function uploadImages(
    files,
    userId
  ) {
    const urls = [];

    for (const file of files) {
      const ext =
        file.name
          .split(".")
          .pop() || "jpg";

      const fileName =
        `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error } =
        await supabase.storage
          .from("job-images")
          .upload(
            fileName,
            file
          );

      if (error) {
        throw error;
      }

      const { data } =
        supabase.storage
          .from("job-images")
          .getPublicUrl(
            fileName
          );

      if (data?.publicUrl) {
        urls.push(
          data.publicUrl
        );
      }
    }

    return urls;
  }

  async function submit(e) {
    e.preventDefault();

    if (
      !supabase ||
      submitting
    ) {
      return;
    }

    setMessage("");
    setSubmitting(true);

    const formEl =
      e.currentTarget;

    const f =
      new FormData(formEl);

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const authUser =
        authData?.user;

      if (!authUser) {
        setMessage(
          "Za objavu posla prvo se prijavi."
        );
        return;
      }

      const profile =
        await ensureProfile(
          authUser
        );

      if (
        profile?.role === "pro"
      ) {
        setMessage(
          "Profil majstora ne može objavljivati posao."
        );
        return;
      }

      const files =
        Array.from(
          f.getAll("images")
        ).filter(
          file =>
            file &&
            file.size
        );

      if (
        files.length > 5
      ) {
        setMessage(
          "Možete dodati najviše 5 fotografija."
        );
        return;
      }

      let imageUrls = [];
      let latitude = null;
      let longitude = null;

      try {
        const geoRes =
          await fetch(
            "/api/geocode",
            {
              method: "POST",
              headers: {
                "content-type":
                  "application/json"
              },
              body:
                JSON.stringify({
                  address:
                    f.get(
                      "address"
                    ),
                  city:
                    f.get(
                      "city"
                    ),
                  zip:
                    f.get(
                      "zip"
                    )
                })
            }
          );

        if (geoRes.ok) {
          const geo =
            await geoRes.json();

          latitude =
            geo?.latitude ??
            null;

          longitude =
            geo?.longitude ??
            null;
        }
      } catch (geoError) {
        console.warn(
          "Geocoding nije uspio:",
          geoError
        );
      }

      if (files.length) {
        imageUrls =
          await uploadImages(
            files,
            authUser.id
          );
      }

      const { error } =
        await supabase
          .from("jobs")
          .insert({
            customer_id:
              authUser.id,
            category:
              f.get(
                "category"
              ),
            city:
              f
                .get("city")
                ?.trim(),
            zip:
              f
                .get("zip")
                ?.trim(),
            description:
              f
                .get(
                  "description"
                )
                ?.trim(),
            address:
              f
                .get(
                  "address"
                )
                ?.trim() ||
              null,
            desired_start:
              f.get(
                "desired_start"
              ),
            latitude,
            longitude,
            image_urls:
              imageUrls,
            status:
              "open"
          });

      if (error) {
        throw error;
      }

      formEl.reset();

      setMessage(
        "Posao je objavljen."
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Objava posla nije uspjela."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function closeJob(job) {
    if (!supabase) return;

    if (
      job.customer_id !==
      currentUserId
    ) {
      alert(
        "Možete zatvoriti samo svoj posao."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li zatvoriti ovaj posao? Posao će biti uklonjen iz aktivnih poslova."
      );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("jobs")
          .delete()
          .eq(
            "id",
            job.id
          )
          .eq(
            "customer_id",
            currentUserId
          );

      if (error) {
        throw error;
      }

      setMessage(
        "Posao je zatvoren."
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Posao se nije mogao zatvoriti."
      );
    }
  }

  async function deleteJob(job) {
    if (!supabase) return;

    if (
      job.customer_id !==
      currentUserId
    ) {
      alert(
        "Možete izbrisati samo svoj posao."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Stvarno želite trajno izbrisati ovaj posao?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("jobs")
          .delete()
          .eq(
            "id",
            job.id
          )
          .eq(
            "customer_id",
            currentUserId
          );

      if (error) {
        throw error;
      }

      setMessage(
        "Posao je izbrisan."
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Posao se nije mogao izbrisati."
      );
    }
  }

  async function showInterest(job) {
    if (!supabase) return;

    const { data: authData } =
      await supabase.auth.getUser();

    const authUser =
      authData?.user;

    if (!authUser) {
      alert(
        "Prvo se prijavite."
      );
      return;
    }

    let profile =
      userProfile;

    if (!profile) {
      profile =
        await ensureProfile(
          authUser
        );

      setUserProfile(
        profile
      );
    }

    if (
      profile?.role !== "pro"
    ) {
      alert(
        "Ova funkcija je za registrirane meštre."
      );
      return;
    }

    const note =
      window.prompt(
        "Kratka poruka naručitelju:",
        "Zainteresiran sam za ovaj posao."
      );

    if (
      note === null
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("interests")
        .insert({
          job_id:
            job.id,
          pro_id:
            authUser.id,
          message:
            note.trim()
        });

    if (error) {
      if (
        error.code ===
        "23505"
      ) {
        alert(
          "Već ste iskazali interes za ovaj posao."
        );
      } else {
        alert(
          error.message
        );
      }

      return;
    }

    alert(
      "Interes je poslan naručitelju."
    );
  }

  async function unlockContact(job) {
    if (!supabase) return;

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      if (
        !authData?.user
      ) {
        alert(
          "Prvo se prijavite."
        );
        return;
      }

      let profile =
        userProfile;

      if (!profile) {
        profile =
          await ensureProfile(
            authData.user
          );

        setUserProfile(
          profile
        );
      }

      if (
        profile?.role !== "pro"
      ) {
        alert(
          "Kontakt mogu otključati samo registrirani meštri."
        );
        return;
      }

      const { error } =
        await supabase.rpc(
          "unlock_job_contact",
          {
            p_job_id:
              job.id
          }
        );

      if (error) {
        throw error;
      }

      const {
        data: contactData,
        error: contactError
      } =
        await supabase.rpc(
          "get_unlocked_job_contact",
          {
            p_job_id:
              job.id
          }
        );

      if (contactError) {
        throw contactError;
      }

      const phone =
        contactData?.phone ||
        "Nije dostupan";

      setUnlockedPhones(
        prev => ({
          ...prev,
          [job.id]:
            phone
        })
      );
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Kontakt se nije mogao otključati."
      );
    }
  }

  const visibleJobs =
    useMemo(() => {
      return jobs.filter(
        job => {
          const cityOk =
            !filterCity ||
            job.city
              ?.toLowerCase()
              .includes(
                filterCity.toLowerCase()
              );

          const categoryOk =
            !filterCategory ||
            job.category ===
              filterCategory;

          let radiusOk =
            true;

          if (
            userProfile?.role ===
              "pro" &&
            proProfile?.latitude !=
              null &&
            proProfile?.longitude !=
              null &&
            job.latitude != null &&
            job.longitude != null
          ) {
            const distance =
              haversineKm(
                Number(
                  proProfile.latitude
                ),
                Number(
                  proProfile.longitude
                ),
                Number(
                  job.latitude
                ),
                Number(
                  job.longitude
                )
              );

            const radius =
              Number(
                proProfile.service_radius_km
              ) || 50;

            radiusOk =
              distance == null ||
              distance <=
                radius;
          }

          return (
            cityOk &&
            categoryOk &&
            radiusOk
          );
        }
      );
    }, [
      jobs,
      filterCity,
      filterCategory,
      userProfile,
      proProfile
    ]);

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <p>
            Aplikacija nije ispravno konfigurirana.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div className="twoCol">
          <div className="card stickyCard">
            <span className="eyebrow">
              Za naručitelje
            </span>

            <h1>
              Objavi posao
            </h1>

            <form
              onSubmit={submit}
              className="form"
            >
              <label>
                Usluga

                <select
                  name="category"
                  required
                >
                  {categories.map(
                    category => (
                      <option
                        key={category}
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
                Grad

                <input
                  name="city"
                  required
                />
              </label>

              <label>
                Adresa radova

                <input
                  name="address"
                  placeholder="Ulica i broj"
                />
              </label>

              <label>
                Poštanski broj

                <input
                  name="zip"
                  required
                />
              </label>

              <label>
                Opis

                <textarea
                  name="description"
                  rows="5"
                  required
                />
              </label>

              <label>
                Početak

                <select
                  name="desired_start"
                >
                  <option value="Što prije">
                    Što prije
                  </option>

                  <option value="U roku od mjesec dana">
                    U roku od mjesec dana
                  </option>

                  <option value="Za 1–3 mjeseca">
                    Za 1–3 mjeseca
                  </option>

                  <option value="Samo prikupljam ponude">
                    Samo prikupljam ponude
                  </option>
                </select>
              </label>

              <label>
                Fotografije (max 5)

                <input
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                />
              </label>

              <button
                className="button"
                type="submit"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "Objavljujem..."
                  : "Objavi posao"}
              </button>

              {message && (
                <p>
                  {message}
                </p>
              )}
            </form>
          </div>

          <div>
            <span className="eyebrow">
              Za meštre
            </span>

            <h2>
              Aktivni poslovi
            </h2>

            {userProfile?.role ===
              "pro" && (
              <p className="muted">
                Ako su spremljene koordinate, prikazuju se samo poslovi unutar vašeg radijusa.
              </p>
            )}

            <div className="filters">
              <input
                placeholder="Filtriraj po gradu"
                value={filterCity}
                onChange={e =>
                  setFilterCity(
                    e.target.value
                  )
                }
              />

              <select
                value={
                  filterCategory
                }
                onChange={e =>
                  setFilterCategory(
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
            </div>

            <div className="jobList">
              {visibleJobs.map(
                job => {
                  const isOwner =
                    currentUserId &&
                    job.customer_id ===
                      currentUserId;

                  const jobInterests =
                    interestsByJob[
                      job.id
                    ] || [];

                  return (
                    <article
                      className="card"
                      key={job.id}
                    >
                      <span className="badge">
                        {job.category}
                      </span>

                      <h3>
                        {job.city}
                        {" · "}
                        {job.zip}
                      </h3>

                      <p>
                        {job.description}
                      </p>

                      {job.image_urls
                        ?.length >
                        0 && (
                        <div className="imageStrip">
                          {job.image_urls.map(
                            url => (
                              <img
                                src={
                                  url
                                }
                                key={
                                  url
                                }
                                alt="Fotografija posla"
                              />
                            )
                          )}
                        </div>
                      )}

                      {isOwner &&
                        jobInterests.length >
                          0 && (
                          <div
                            style={{
                              marginTop:
                                "18px",
                              paddingTop:
                                "18px",
                              borderTop:
                                "1px solid var(--border)"
                            }}
                          >
                            <strong>
                              Zainteresirani majstori
                            </strong>

                            <div
                              style={{
                                display:
                                  "grid",
                                gap:
                                  "12px",
                                marginTop:
                                  "12px"
                              }}
                            >
                              {jobInterests.map(
                                interest => (
                                  <div
                                    key={
                                      interest.id
                                    }
                                    className="card"
                                    style={{
                                      padding:
                                        "14px"
                                    }}
                                  >
                                    <p
                                      style={{
                                        marginTop:
                                          0
                                      }}
                                    >
                                      {interest.message ||
                                        "Majstor je zainteresiran za posao."}
                                    </p>

                                    <Link
                                      href={`/majstor/${interest.pro_id}`}
                                      className="button secondary small"
                                    >
                                      Pogledaj profil
                                    </Link>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      <div className="rowBetween">
                        <small>
                          {
                            job.desired_start
                          }
                        </small>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                            flexWrap:
                              "wrap"
                          }}
                        >
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                className="button small"
                                onClick={() =>
                                  closeJob(
                                    job
                                  )
                                }
                              >
                                Zatvori posao
                              </button>

                              <button
                                type="button"
                                className="button small"
                                onClick={() =>
                                  deleteJob(
                                    job
                                  )
                                }
                              >
                                Izbriši posao
                              </button>
                            </>
                          )}

                          {!isOwner &&
                            userProfile?.role ===
                              "pro" && (
                              <>
                                <button
                                  type="button"
                                  className="button small"
                                  onClick={() =>
                                    showInterest(
                                      job
                                    )
                                  }
                                >
                                  Zanima me posao
                                </button>

                                {unlockedPhones[
                                  job.id
                                ] ? (
                                  <a
                                    className="button small"
                                    href={`tel:${unlockedPhones[
                                      job.id
                                    ].replace(
                                      /\s+/g,
                                      ""
                                    )}`}
                                  >
                                    Telefon:{" "}
                                    {
                                      unlockedPhones[
                                        job.id
                                      ]
                                    }
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    className="button small"
                                    onClick={() =>
                                      unlockContact(
                                        job
                                      )
                                    }
                                  >
                                    Otključaj kontakt
                                  </button>
                                )}
                              </>
                            )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}

              {!visibleJobs.length && (
                <p>
                  Nema poslova za odabrani filter.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
