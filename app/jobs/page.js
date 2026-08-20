"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [filterCity, setFilterCity] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function loadAll() {
    const { data: auth } = await supabase.auth.getUser();

    if (auth.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();

      setUserProfile(p);

      if (p?.role === "pro") {
        const { data: pp } = await supabase
          .from("pro_profiles")
          .select("*")
          .eq("user_id", auth.user.id)
          .maybeSingle();

        setProProfile(pp);
      }
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!error) setJobs(data || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function uploadImages(files, userId) {
    const urls = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("job-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("job-images")
        .getPublicUrl(fileName);

      urls.push(data.publicUrl);
    }

    return urls;
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");

    const formEl = e.currentTarget;
    const f = new FormData(formEl);

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return setMessage("Za objavu posla prvo se prijavi.");
    }

    let imageUrls = [];
    let latitude = null;
    let longitude = null;

    const files = Array.from(f.getAll("images")).filter(
      x => x && x.size
    );

    if (files.length > 5) {
      return setMessage("Možete dodati najviše 5 fotografija.");
    }

    try {
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: f.get("address"),
          city: f.get("city"),
          zip: f.get("zip")
        })
      });

      if (geoRes.ok) {
        const geo = await geoRes.json();
        latitude = geo.latitude;
        longitude = geo.longitude;
      }

      if (files.length) {
        imageUrls = await uploadImages(files, auth.user.id);
      }

      const { error } = await supabase.from("jobs").insert({
        customer_id: auth.user.id,
        category: f.get("category"),
        city: f.get("city"),
        zip: f.get("zip"),
        description: f.get("description"),
        address: f.get("address"),
        desired_start: f.get("desired_start"),
        latitude,
        longitude,
        image_urls: imageUrls,
        status: "open"
      });

      if (error) throw error;

      formEl.reset();
      setMessage("Posao je objavljen.");
      loadAll();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function showInterest(job) {
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return alert("Prvo se prijavite.");
    }

    if (userProfile?.role !== "pro") {
      return alert("Ova funkcija je za registrirane meštre.");
    }

    const note = window.prompt(
      "Kratka poruka naručitelju:",
      "Zainteresiran sam za ovaj posao."
    );

    if (note === null) return;

    const { error } = await supabase.from("interests").insert({
      job_id: job.id,
      pro_id: auth.user.id,
      message: note
    });

    if (error) {
      if (error.code === "23505") {
        alert("Već ste iskazali interes za ovaj posao.");
      } else {
        alert(error.message);
      }
    } else {
      alert("Interes je poslan naručitelju.");
    }
  }

  async function unlockContact(job) {
    const { data, error } = await supabase.rpc(
      "unlock_job_contact",
      {
        p_job_id: job.id
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    if (data?.already_unlocked) {
      alert("Kontakt je već otključan.");
    } else {
      alert(
        `Kontakt je otključan. Potrošeno kredita: ${
          data?.credits_spent ?? ""
        }`
      );
    }

    await loadAll();
  }

  const visibleJobs = useMemo(() => {
    return jobs.filter(j => {
      const cityOk =
        !filterCity ||
        j.city?.toLowerCase().includes(filterCity.toLowerCase());

      const catOk =
        !filterCategory || j.category === filterCategory;

      let radiusOk = true;

      if (
        userProfile?.role === "pro" &&
        proProfile?.latitude != null &&
        proProfile?.longitude != null &&
        j.latitude != null &&
        j.longitude != null
      ) {
        const d = haversineKm(
          proProfile.latitude,
          proProfile.longitude,
          j.latitude,
          j.longitude
        );

        radiusOk =
          d == null
            ? true
            : d <= (proProfile.service_radius_km || 50);
      }

      return cityOk && catOk && radiusOk;
    });
  }, [
    jobs,
    filterCity,
    filterCategory,
    userProfile,
    proProfile
  ]);

  return (
    <main className="section">
      <div className="container">
        <div className="twoCol">
          <div className="card stickyCard">
            <span className="eyebrow">Za naručitelje</span>
            <h1>Objavi posao</h1>

            <form onSubmit={submit} className="form">
              <label>
                Usluga
                <select name="category" required>
                  {categories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label>
                Grad
                <input name="city" required />
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
                <input name="zip" required />
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
                <select name="desired_start">
                  <option>Što prije</option>
                  <option>U roku od mjesec dana</option>
                  <option>Za 1–3 mjeseca</option>
                  <option>Samo prikupljam ponude</option>
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

              <button className="button">
                Objavi posao
              </button>

              <p>{message}</p>
            </form>
          </div>

          <div>
            <span className="eyebrow">Za meštre</span>
            <h2>Aktivni poslovi</h2>

            {userProfile?.role === "pro" && (
              <p className="muted">
                Ako su spremljene koordinate, prikazuju se
                samo poslovi unutar vašeg radijusa.
              </p>
            )}

            <div className="filters">
              <input
                placeholder="Filtriraj po gradu"
                value={filterCity}
                onChange={e =>
                  setFilterCity(e.target.value)
                }
              />

              <select
                value={filterCategory}
                onChange={e =>
                  setFilterCategory(e.target.value)
                }
              >
                <option value="">Sve usluge</option>

                {categories.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="jobList">
              {visibleJobs.map(j => (
                <article className="card" key={j.id}>
                  <span className="badge">
                    {j.category}
                  </span>

                  <h3>
                    {j.city} · {j.zip}
                  </h3>

                  <p>{j.description}</p>

                  {j.image_urls?.length > 0 && (
                    <div className="imageStrip">
                      {j.image_urls.map(url => (
                        <img
                          src={url}
                          key={url}
                          alt="Fotografija posla"
                        />
                      ))}
                    </div>
                  )}

                  <div className="rowBetween">
                    <small>{j.desired_start}</small>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap"
                      }}
                    >
                      <button
                        className="button small"
                        onClick={() => showInterest(j)}
                      >
                        Zanima me posao
                      </button>

                      {userProfile?.role === "pro" && (
                        <button
                          className="button small"
                          onClick={() =>
                            unlockContact(j)
                          }
                        >
                          Otključaj kontakt
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}

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
