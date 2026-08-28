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
  const [proInfoById, setProInfoById] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [selectingPro, setSelectingPro] = useState("");
  const [closingJob, setClosingJob] = useState("");
  const [deletingJob, setDeletingJob] = useState("");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createBrowserClient(supabaseUrl, supabaseKey);
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    loadAll();
  }, [supabase]);

  async function ensureProfile(authUser) {
    if (!supabase) return null;

    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing;

    const role =
      authUser.user_metadata?.role === "pro"
        ? "pro"
        : "customer";

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        role
      })
      .select("id, role")
      .single();

    if (createError) throw createError;

    return created;
  }

  function statusLabel(status) {
    if (status === "open") return "Otvoren";
    if (status === "assigned") return "U tijeku";
    if (status === "completed") return "Završen";

    return status || "Nepoznato";
  }

  function renderStars(value) {
    const rounded = Math.round(
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

  async function loadAll() {
    if (!supabase) {
      setMessage(
        "Aplikacija nije ispravno konfigurirana."
      );
      return;
    }

    setMessage("");

    try {
      const {
        data: authData
      } = await supabase.auth.getUser();

      const authUser =
        authData?.user || null;

      setCurrentUserId(
        authUser?.id || null
      );

      let profile = null;

      if (authUser) {
        profile =
          await ensureProfile(
            authUser
          );

        setUserProfile(profile);

        if (
          profile?.role === "pro"
        ) {
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

          if (ppError) {
            console.error(
              ppError
            );

            setProProfile(null);
          } else {
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
        data: openRows,
        error: openError
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

      if (openError) {
        throw openError;
      }

      let loadedJobs =
        openRows || [];

      if (
        authUser &&
        profile?.role === "customer"
      ) {
        const {
          data: ownOtherJobs,
          error: ownOtherError
        } = await supabase
          .from("jobs")
          .select("*")
          .eq(
            "customer_id",
            authUser.id
          )
          .in(
            "status",
            [
              "assigned",
              "completed"
            ]
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );

        if (ownOtherError) {
          throw ownOtherError;
        }

        const allById =
          new Map();

        for (
          const job of [
            ...loadedJobs,
            ...(ownOtherJobs || [])
          ]
        ) {
          allById.set(
            job.id,
            job
          );
        }

        loadedJobs =
          Array.from(
            allById.values()
          ).sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          );
      }

      if (
        authUser &&
        profile?.role === "pro"
      ) {
        const {
          data: selectedAssignedJobs,
          error: selectedAssignedError
        } = await supabase
          .from("jobs")
          .select("*")
          .eq(
            "selected_pro_id",
            authUser.id
          )
          .eq(
            "status",
            "assigned"
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );

        if (
          selectedAssignedError
        ) {
          throw selectedAssignedError;
        }

        const allById =
          new Map();

        for (
          const job of [
            ...loadedJobs,
            ...(selectedAssignedJobs || [])
          ]
        ) {
          allById.set(
            job.id,
            job
          );
        }

        loadedJobs =
          Array.from(
            allById.values()
          ).sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          );
      }

      setJobs(
        loadedJobs
      );

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
              job =>
                job.id
            );

        if (
          ownJobIds.length
        ) {
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
            ].push(
              interest
            );
          }

          setInterestsByJob(
            grouped
          );

          const proIds = [
            ...new Set(
              (interestRows || [])
                .map(
                  row =>
                    row.pro_id
                )
                .filter(Boolean)
            )
          ];

          const proInfoEntries =
            await Promise.all(
              proIds.map(
                async proId => {
                  let publicProfile =
                    null;

                  let reviews = [];

                  try {
                    const {
                      data: profileData,
                      error: profileError
                    } =
                      await supabase.rpc(
                        "get_public_pro_profile",
                        {
                          p_user_id:
                            proId
                        }
                      );

                    if (
                      !profileError
                    ) {
                      publicProfile =
                        Array.isArray(
                          profileData
                        )
                          ? profileData[0] ||
                            null
                          : profileData ||
                            null;
                    }
                  } catch (
                    profileError
                  ) {
                    console.warn(
                      profileError
                    );
                  }

                  try {
                    const {
                      data: reviewRows,
                      error: reviewError
                    } =
                      await supabase
                        .from(
                          "pro_reviews"
                        )
                        .select(
                          "rating"
                        )
                        .eq(
                          "pro_id",
                          proId
                        );

                    if (
                      !reviewError
                    ) {
                      reviews =
                        reviewRows ||
                        [];
                    }
                  } catch (
                    reviewError
                  ) {
                    console.warn(
                      reviewError
                    );
                  }

                  const average =
                    reviews.length
                      ? reviews.reduce(
                          (
                            sum,
                            review
                          ) =>
                            sum +
                            Number(
                              review.rating ||
                                0
                            ),
                          0
                        ) /
                        reviews.length
                      : 0;

                  return [
                    proId,
                    {
                      companyName:
                        publicProfile?.company_name ||
                        "Majstor",

                      verified:
                        Boolean(
                          publicProfile?.verified
                        ),

                      categories:
                        publicProfile?.categories ||
                        [],

                      averageRating:
                        average,

                      reviewCount:
                        reviews.length
                    }
                  ];
                }
              )
            );

          setProInfoById(
            Object.fromEntries(
              proInfoEntries
            )
          );
        } else {
          setInterestsByJob(
            {}
          );

          setProInfoById(
            {}
          );
        }
      } else {
        setInterestsByJob(
          {}
        );

        setProInfoById(
          {}
        );
      }

      if (
        authUser &&
        profile?.role === "pro"
      ) {
        const contactJobs =
          loadedJobs.filter(
            job =>
              job.status === "open" ||
              (
                job.status ===
                  "assigned" &&
                job.selected_pro_id ===
                  authUser.id
              )
          );

        const results =
          await Promise.all(
            contactJobs.map(
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
            results.filter(
              Boolean
            )
          )
        );
      } else {
        setUnlockedPhones(
          {}
        );
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Greška pri učitavanju poslova."
      );
    }
  }

  async function uploadImages(
    files,
    userId
  ) {
    const urls = [];

    for (
      const file of files
    ) {
      const ext =
        file.name
          .split(".")
          .pop() ||
        "jpg";

      const fileName =
        `${userId}/${crypto.randomUUID()}.${ext}`;

      const {
        error
      } = await supabase.storage
        .from("job-images")
        .upload(
          fileName,
          file
        );

      if (error) {
        throw error;
      }

      const {
        data
      } = supabase.storage
        .from("job-images")
        .getPublicUrl(
          fileName
        );

      if (
        data?.publicUrl
      ) {
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

    const formData =
      new FormData(
        formEl
      );

    try {
      const {
        data: authData
      } =
        await supabase.auth.getUser();

      const authUser =
        authData?.user;

      if (!authUser) {
        setMessage(
          "Za objavu posla prvo se prijavite."
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
          "Majstorski račun ne može objavljivati poslove."
        );
        return;
      }

      const files =
        Array.from(
          formData.getAll(
            "images"
          )
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
                    formData.get(
                      "address"
                    ),

                  city:
                    formData.get(
                      "city"
                    ),

                  zip:
                    formData.get(
                      "zip"
                    )
                })
            }
          );

        if (
          geoRes.ok
        ) {
          const geo =
            await geoRes.json();

          latitude =
            geo?.latitude ??
            null;

          longitude =
            geo?.longitude ??
            null;
        }
      } catch (
        geoError
      ) {
        console.warn(
          "Geocoding nije uspio:",
          geoError
        );
      }

      if (
        files.length
      ) {
        imageUrls =
          await uploadImages(
            files,
            authUser.id
          );
      }

      const {
        error
      } = await supabase
        .from("jobs")
        .insert({
          customer_id:
            authUser.id,

          category:
            formData.get(
              "category"
            ),

          city:
            formData
              .get(
                "city"
              )
              ?.trim(),

          zip:
            formData
              .get(
                "zip"
              )
              ?.trim(),

          description:
            formData
              .get(
                "description"
              )
              ?.trim(),

          address:
            formData
              .get(
                "address"
              )
              ?.trim() ||
            null,

          desired_start:
            formData.get(
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
        "Posao je uspješno objavljen."
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Objava posla nije uspjela."
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  async function closeJob(
    job
  ) {
    if (
      !supabase ||
      closingJob
    ) {
      return;
    }

    if (
      job.customer_id !==
      currentUserId
    ) {
      alert(
        "Možete završiti samo svoj posao."
      );
      return;
    }

    if (
      job.status !==
        "assigned" ||
      !job.selected_pro_id
    ) {
      alert(
        "Najprije morate odabrati majstora."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li označiti ovaj posao kao završen?"
      );

    if (!confirmed) {
      return;
    }

    setClosingJob(
      job.id
    );

    try {
      const {
        error
      } = await supabase.rpc(
        "close_job",
        {
          p_job_id:
            job.id
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        "Posao je uspješno završen."
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Posao se nije mogao završiti."
      );
    } finally {
      setClosingJob(
        ""
      );
    }
  }

  async function deleteJob(
    job
  ) {
    if (
      !supabase ||
      deletingJob
    ) {
      return;
    }

    if (
      job.customer_id !==
      currentUserId
    ) {
      alert(
        "Možete izbrisati samo svoj posao."
      );
      return;
    }

    if (
      job.status !==
        "open"
    ) {
      alert(
        "Posao u tijeku ili završeni posao ne može se izbrisati."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li trajno izbrisati ovaj posao?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingJob(
      job.id
    );

    try {
      const {
        error
      } = await supabase
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
    } finally {
      setDeletingJob(
        ""
      );
    }
  }

  async function selectPro(
    job,
    interest
  ) {
    if (
      !supabase ||
      !currentUserId
    ) {
      return;
    }

    if (
      job.customer_id !==
      currentUserId
    ) {
      alert(
        "Majstora može odabrati samo naručitelj ovog posla."
      );
      return;
    }

    if (
      job.status !==
        "open"
    ) {
      alert(
        "Majstor se može odabrati samo za otvoreni posao."
      );
      return;
    }

    if (
      job.selected_pro_id
    ) {
      alert(
        "Majstor za ovaj posao već je odabran."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li odabrati ovog majstora za posao?"
      );

    if (!confirmed) {
      return;
    }

    const loadingKey =
      `${job.id}-${interest.pro_id}`;

    setSelectingPro(
      loadingKey
    );

    setMessage("");

    try {
      const {
        error
      } = await supabase.rpc(
        "select_job_pro",
        {
          p_job_id:
            job.id,

          p_pro_id:
            interest.pro_id
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        "Majstor je odabran. Posao je sada u tijeku."
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Majstor se nije mogao odabrati."
      );
    } finally {
      setSelectingPro(
        ""
      );
    }
  }

  async function showInterest(
    job
  ) {
    if (!supabase) {
      return;
    }

    if (
      job.status !== "open" ||
      job.selected_pro_id
    ) {
      alert(
        "Ovaj posao više nije otvoren za nove majstore."
      );
      return;
    }

    const {
      data: authData
    } =
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
      profile?.role !==
        "pro"
    ) {
      alert(
        "Ova funkcija dostupna je samo registriranim majstorima."
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

    const {
      error
    } = await supabase
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

    await loadAll();
  }

  async function unlockContact(
    job
  ) {
    if (!supabase) {
      return;
    }

    if (
      job.status !==
        "open"
    ) {
      alert(
        "Kontakt više nije moguće otključati jer posao nije otvoren."
      );
      return;
    }

    try {
      const {
        data: authData
      } =
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
        profile?.role !==
          "pro"
      ) {
        alert(
          "Kontakt mogu otključati samo registrirani majstori."
        );
        return;
      }

      const {
        error
      } = await supabase.rpc(
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

      if (
        contactError
      ) {
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
          const selectedAssignedForMe =
            userProfile?.role ===
              "pro" &&
            job.status ===
              "assigned" &&
            job.selected_pro_id ===
              currentUserId;

          if (
            userProfile?.role ===
              "pro" &&
            job.status !==
              "open" &&
            !selectedAssignedForMe
          ) {
            return false;
          }

          if (
            userProfile?.role !==
                          "pro" &&
            job.status !==
              "open" &&
            job.customer_id !==
              currentUserId
          ) {
            return false;
          }

          if (
            selectedAssignedForMe
          ) {
            return true;
          }

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
              ) ||
              50;

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
      proProfile,
      currentUserId
    ]);

  const selectedAssignedCount =
    visibleJobs.filter(
      job =>
        userProfile?.role ===
          "pro" &&
        job.status ===
          "assigned" &&
        job.selected_pro_id ===
          currentUserId
    ).length;

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <p>
              Aplikacija nije ispravno konfigurirana.
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
            {userProfile?.role === "pro"
              ? "Poslovi za majstore"
              : userProfile?.role === "customer"
                ? "Moji poslovi"
                : "Poslovi"}
          </h1>

          <p className="muted">
            {userProfile?.role === "pro"
              ? "Pronađite odgovarajući posao i pošaljite svoj interes."
              : userProfile?.role === "customer"
                ? "Objavite posao i pregledajte zainteresirane majstore."
                : "Objavite posao ili pronađite odgovarajući posao."}
          </p>
        </div>

        {userProfile?.role ===
          "pro" &&
          selectedAssignedCount >
            0 && (
          <div
            className="card"
            style={{
              marginBottom:
                "20px",
              padding:
                "16px"
            }}
          >
            <strong>
              {selectedAssignedCount ===
              1
                ? "Imate posao u tijeku"
                : `Imate ${selectedAssignedCount} poslova u tijeku`}
            </strong>

            <div
              style={{
                marginTop:
                  "10px"
              }}
            >
              <Link
                href="/dashboard"
                className="button small"
              >
                Moj pregled
              </Link>
            </div>
          </div>
        )}

        <div
          className={
            userProfile?.role === "pro"
              ? "jobsSingleColumn"
              : "twoCol"
          }
        >
          {userProfile?.role !== "pro" && (
          <div className="card stickyCard">
            <span className="eyebrow">
              Za naručitelje
            </span>

            <h2>
              Objavi posao
            </h2>

              <form
                onSubmit={
                  submit
                }
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
                  Grad

                  <input
                    name="city"
                    placeholder="npr. Split"
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
                    placeholder="21000"
                    required
                  />
                </label>

                <label>
                  Opis posla

                  <textarea
                    name="description"
                    rows="5"
                    placeholder="Opišite što je potrebno napraviti."
                    required
                  />
                </label>

                <label>
                  Željeni početak

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
                  Fotografije

                  <input
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                  />

                  <small className="muted">
                    Najviše 5 fotografija.
                  </small>
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
              </form>

            {message && (
              <div
                style={{
                  marginTop:
                    "14px",
                  padding:
                    "12px",
                  borderRadius:
                    "12px",
                  background:
                    "#f7f8fa"
                }}
              >
                {message}
              </div>
            )}
          </div>
          )}

          <div>
            <div
              style={{
                marginBottom:
                  "16px"
              }}
            >
              <h2>
                Dostupni poslovi
              </h2>

              {userProfile?.role ===
                "pro" && (
                <p className="muted">
                  Prikazuju se poslovi unutar vašeg spremljenog radijusa.
                </p>
              )}
            </div>

            <div
              className="filters"
              style={{
                marginBottom:
                  "18px"
              }}
            >
              <input
                placeholder="Grad"
                value={
                  filterCity
                }
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

                  const isOpen =
                    job.status ===
                    "open";

                  const isAssigned =
                    job.status ===
                    "assigned";

                  const isCompleted =
                    job.status ===
                    "completed";

                  const isSelectedPro =
                    userProfile?.role ===
                      "pro" &&
                    isAssigned &&
                    job.selected_pro_id ===
                      currentUserId;

                  const jobInterests =
                    interestsByJob[
                      job.id
                    ] || [];

                  return (
                    <article
                      className="card"
                      key={
                        job.id
                      }
                      style={{
                        marginBottom:
                          "14px"
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap:
                            "10px",
                          flexWrap:
                            "wrap"
                        }}
                      >
                        <div>
                          <span className="badge">
                            {job.category}
                          </span>

                          <h3
                            style={{
                              margin:
                                "10px 0 4px"
                            }}
                          >
                            {job.city}

                            {job.zip
                              ? ` · ${job.zip}`
                              : ""}
                          </h3>
                        </div>

                        <span className="badge">
                          {statusLabel(
                            job.status
                          )}
                        </span>
                      </div>

                      <p
                        className="muted"
                        style={{
                          margin:
                            "0 0 12px"
                        }}
                      >
                        {job.desired_start ||
                          "Po dogovoru"}
                      </p>

                      <p
                        style={{
                          marginBottom:
                            0
                        }}
                      >
                        {job.description}
                      </p>

                      {isSelectedPro && (
                        <p
                          style={{
                            margin:
                              "12px 0 0",
                            fontWeight:
                              700
                          }}
                        >
                          Odabrani ste za ovaj posao.
                        </p>
                      )}

                      {job.image_urls
                        ?.length >
                        0 && (
                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(95px, 1fr))",
                            gap:
                              "8px",
                            marginTop:
                              "14px"
                          }}
                        >
                          {job.image_urls.map(
                            (
                              url,
                              index
                            ) => (
                              <a
                                key={`${url}-${index}`}
                                href={
                                  url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display:
                                    "block",
                                  aspectRatio:
                                    "1 / 1",
                                  overflow:
                                    "hidden",
                                  borderRadius:
                                    "12px",
                                  border:
                                    "1px solid var(--border)"
                                }}
                              >
                                <img
                                  src={
                                    url
                                  }
                                  alt={`Fotografija posla ${index + 1}`}
                                  style={{
                                    width:
                                      "100%",
                                    height:
                                      "100%",
                                    objectFit:
                                      "cover",
                                    display:
                                      "block"
                                  }}
                                />
                              </a>
                            )
                          )}
                        </div>
                      )}

                      {isOwner && (
                        <div
                          style={{
                            marginTop:
                              "16px",
                            paddingTop:
                              "14px",
                            borderTop:
                              "1px solid var(--border)"
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              gap:
                                "10px"
                            }}
                          >
                            <strong>
                              Zainteresirani
                            </strong>

                            <span className="muted">
                              {
                                jobInterests.length
                              }
                            </span>
                          </div>

                          {!jobInterests.length ? (
                            <p
                              className="muted"
                              style={{
                                marginBottom:
                                  0
                              }}
                            >
                              Još nema zainteresiranih majstora.
                            </p>
                          ) : (
                            <div
                              style={{
                                display:
                                  "grid",
                                gap:
                                  "8px",
                                marginTop:
                                  "10px"
                              }}
                            >
                              {jobInterests.map(
                                interest => {
                                  const info =
                                    proInfoById[
                                      interest
                                        .pro_id
                                    ] || {};

                                  const isSelected =
                                    job.selected_pro_id ===
                                    interest.pro_id;

                                  const anotherSelected =
                                    Boolean(
                                      job.selected_pro_id &&
                                        !isSelected
                                    );

                                  const loadingKey =
                                    `${job.id}-${interest.pro_id}`;

                                  return (
                                    <div
                                      key={
                                        interest.id
                                      }
                                      style={{
                                        padding:
                                          "12px",
                                        border:
                                          "1px solid var(--border)",
                                        borderRadius:
                                          "12px"
                                      }}
                                    >
                                      <div
                                        style={{
                                          display:
                                            "flex",
                                          justifyContent:
                                            "space-between",
                                          gap:
                                            "10px",
                                          flexWrap:
                                            "wrap"
                                        }}
                                      >
                                        <div>
                                          <strong>
                                            {info.companyName ||
                                              "Majstor"}
                                          </strong>

                                          {info.verified && (
                                            <small
                                              className="muted"
                                              style={{
                                                display:
                                                  "block",
                                                marginTop:
                                                  "3px"
                                              }}
                                            >
                                              ✓ Verificirani
                                            </small>
                                          )}
                                        </div>

                                        <div
                                          style={{
                                            textAlign:
                                              "right"
                                          }}
                                        >
                                          {info.reviewCount >
                                          0 ? (
                                            <>
                                              <div>
                                                {renderStars(
                                                  info.averageRating
                                                )}
                                              </div>

                                              <small className="muted">
                                                {info.averageRating.toFixed(
                                                  1
                                                )}{" "}
                                                ·{" "}
                                                {
                                                  info.reviewCount
                                                }
                                              </small>
                                            </>
                                          ) : (
                                            <small className="muted">
                                              Bez ocjena
                                            </small>
                                          )}
                                        </div>
                                      </div>

                                      {isSelected && (
                                        <p
                                          style={{
                                            margin:
                                              "8px 0 0",
                                            fontWeight:
                                              700
                                          }}
                                        >
                                          Odabrani majstor
                                        </p>
                                      )}

                                      <p
                                        className="muted"
                                        style={{
                                          margin:
                                            "8px 0 10px"
                                        }}
                                      >
                                        {interest.message ||
                                          "Zainteresiran sam za ovaj posao."}
                                      </p>

                                      <div
                                        style={{
                                          display:
                                            "flex",
                                          flexWrap:
                                            "wrap",
                                          gap:
                                            "8px"
                                        }}
                                      >
                                        <Link
                                          href={`/majstor/${interest.pro_id}`}
                                          className="button secondary small"
                                        >
                                          Profil
                                        </Link>

                                        {isOpen &&
                                          !job.selected_pro_id && (
                                            <button
                                              type="button"
                                              className="button small"
                                              disabled={
                                                selectingPro ===
                                                loadingKey
                                              }
                                              onClick={() =>
                                                selectPro(
                                                  job,
                                                  interest
                                                )
                                              }
                                            >
                                              {selectingPro ===
                                              loadingKey
                                                ? "Odabirem..."
                                                : "Odaberi"}
                                            </button>
                                          )}

                                        {anotherSelected && (
                                          <small
                                            className="muted"
                                            style={{
                                              alignSelf:
                                                "center"
                                            }}
                                          >
                                            Odabran je drugi majstor.
                                          </small>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop:
                            "16px",
                          paddingTop:
                            "14px",
                          borderTop:
                            "1px solid var(--border)"
                        }}
                      >
                        {isOwner && (
                          <div
                            style={{
                              display:
                                "flex",
                              flexWrap:
                                "wrap",
                              gap:
                                "8px"
                            }}
                          >
                            {isOpen && (
                              <button
                                type="button"
                                className="button secondary small"
                                disabled={
                                  deletingJob ===
                                  job.id
                                }
                                onClick={() =>
                                  deleteJob(
                                    job
                                  )
                                }
                              >
                                {deletingJob ===
                                job.id
                                  ? "Brišem..."
                                  : "Izbriši"}
                              </button>
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
                                      closingJob ===
                                      job.id
                                    }
                                    onClick={() =>
                                      closeJob(
                                        job
                                      )
                                    }
                                  >
                                    {closingJob ===
                                    job.id
                                      ? "Spremam..."
                                      : "Završi posao"}
                                  </button>
                                </>
                              )}

                            {isCompleted &&
                              job.selected_pro_id && (
                                <>
                                  <Link
                                    href={`/majstor/${job.selected_pro_id}#ocijeni`}
                                    className="button small"
                                  >
                                    Ocijeni
                                  </Link>

                                  <Link
                                    href={`/majstor/${job.selected_pro_id}`}
                                    className="button secondary small"
                                  >
                                    Profil
                                  </Link>
                                </>
                              )}
                          </div>
                        )}

                        {!isOwner &&
                          userProfile?.role ===
                            "pro" &&
                          isOpen && (
                            <div
                              style={{
                                display:
                                  "grid",
                                gap:
                                  "8px"
                              }}
                            >
                              <button
                                type="button"
                                className="button"
                                onClick={() =>
                                  showInterest(
                                    job
                                  )
                                }
                              >
                                Zanima me
                              </button>

                              {unlockedPhones[
                                job.id
                              ] ? (
                                <a
                                  className="button secondary"
                                  href={`tel:${unlockedPhones[
                                    job.id
                                  ].replace(
                                    /\s+/g,
                                    ""
                                  )}`}
                                >
                                  Nazovi{" "}
                                  {
                                    unlockedPhones[
                                      job.id
                                    ]
                                  }
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="button secondary"
                                  onClick={() =>
                                    unlockContact(
                                      job
                                    )
                                  }
                                >
                                  Otključaj kontakt
                                </button>
                              )}
                            </div>
                          )}

                        {isSelectedPro && (
                          <div
                            style={{
                              display:
                                "grid",
                              gap:
                                "8px"
                            }}
                          >
                            {unlockedPhones[
                              job.id
                            ] && (
                              <a
                                className="button"
                                href={`tel:${unlockedPhones[
                                  job.id
                                ].replace(
                                  /\s+/g,
                                  ""
                                )}`}
                              >
                                Nazovi naručitelja
                              </a>
                            )}

                            <Link
                              href="/dashboard"
                              className="button secondary"
                            >
                              Moj pregled
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}

              {!visibleJobs.length && (
                <div className="card">
                  <h3>
                    Nema rezultata
                  </h3>

                  <p
                    className="muted"
                    style={{
                      marginBottom:
                        0
                    }}
                  >
                    Trenutno nema poslova koji odgovaraju odabranim kriterijima.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
            
