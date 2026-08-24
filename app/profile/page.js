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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [proProfile, setProProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [oib, setOib] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [bio, setBio] = useState("");
  const [serviceRadius, setServiceRadius] = useState("50");
  const [selectedCategories, setSelectedCategories] = useState([]);

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
    loadProfile();
  }, [supabase]);

  async function ensureProfile(authUser) {
    const {
      data: existing,
      error: readError
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (readError) throw readError;

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
      .select("*")
      .single();

    if (createError) throw createError;

    return created;
  }

  async function loadProfile() {
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

      if (authError) throw authError;

      const authUser = authData?.user || null;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setProProfile(null);
        return;
      }

      setUser(authUser);

      const currentProfile =
        await ensureProfile(authUser);

      setProfile(currentProfile);

      setFullName(currentProfile?.full_name || "");
      setCity(currentProfile?.city || "");
      setPhone(currentProfile?.phone || "");

      if (currentProfile?.role === "pro") {
        const {
          data: pp,
          error: ppError
        } = await supabase
          .from("pro_profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (ppError) throw ppError;

        const currentProProfile = pp || null;

        setProProfile(currentProProfile);

        setCompanyName(
          currentProProfile?.company_name || ""
        );

        setOib(
          currentProProfile?.oib || ""
        );

        setAddress(
          currentProProfile?.address || ""
        );

        setZip(
          currentProProfile?.zip || ""
        );

        setBio(
          currentProProfile?.bio || ""
        );

        setServiceRadius(
          String(
            currentProProfile?.service_radius_km ?? 50
          )
        );

        setSelectedCategories(
          currentProProfile?.categories || []
        );
      } else {
        setProProfile(null);
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Greška pri učitavanju profila."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(category) {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(
          item => item !== category
        );
      }

      return [
        ...prev,
        category
      ];
    });
  }

  async function saveProfile(e) {
    e.preventDefault();

    if (!supabase || !user || !profile) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        error: profileError
      } = await supabase
        .from("profiles")
        .update({
          full_name:
            fullName.trim() || null,
          city:
            city.trim() || null,
          phone:
            phone.trim() || null
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      if (profile.role === "pro") {
        const proPayload = {
          user_id: user.id,
          company_name:
            companyName.trim() || null,
          oib:
            oib.trim() || null,
          address:
            address.trim() || null,
          zip:
            zip.trim() || null,
          bio:
            bio.trim() || null,
          service_radius_km:
            Number(serviceRadius) || 50,
          categories:
            selectedCategories
        };

        if (proProfile?.id) {
          const {
            error: proError
          } = await supabase
            .from("pro_profiles")
            .update(proPayload)
            .eq("user_id", user.id);

          if (proError) {
            throw proError;
          }
        } else {
          const {
            error: proError
          } = await supabase
            .from("pro_profiles")
            .insert(proPayload);

          if (proError) {
            throw proError;
          }
        }
      }

      setMessage(
        "Profil je spremljen."
      );

      await loadProfile();
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Profil se nije mogao spremiti."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <h1>Profil</h1>

            <p>
              Aplikacija nije ispravno
              konfigurirana.
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

            <h1>Profil</h1>

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

            <h1>Profil</h1>

            <p>
              Za uređivanje profila
              morate se prvo prijaviti.
            </p>

            <div className="actions">
              <Link
                href="/login"
                className="button"
              >
                Prijava
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
            marginBottom: "24px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1>Moj profil</h1>

          <p className="muted">
            {user.email}
          </p>

          <p>
            Vrsta računa:{" "}
            <strong>
              {profile?.role === "pro"
                ? "Majstor"
                : "Naručitelj"}
            </strong>
          </p>

          <div className="actions">
            <Link
              href="/dashboard"
              className="button secondary"
            >
              Moj pregled
            </Link>

            <Link
              href="/jobs"
              className="button"
            >
              Poslovi
            </Link>
          </div>
        </div>

        <form
          onSubmit={saveProfile}
          className="card form"
        >
          <span className="eyebrow">
            Osnovni podaci
          </span>

          <label>
            Ime i prezime
            <input
              value={fullName}
              onChange={e =>
                setFullName(e.target.value)
              }
              placeholder="Ime i prezime"
            />
          </label>

          <label>
            Grad
            <input
              value={city}
              onChange={e =>
                setCity(e.target.value)
              }
              placeholder="Zagreb"
            />
          </label>

          <label>
            Telefon
            <input
              type="tel"
              value={phone}
              onChange={e =>
                setPhone(e.target.value)
              }
              placeholder="+385..."
            />
          </label>

          {profile?.role === "pro" && (
            <>
              <hr
                style={{
                  width: "100%",
                  border: 0,
                  borderTop:
                    "1px solid var(--border)",
                  margin: "8px 0"
                }}
              />

              <span className="eyebrow">
                Podaci majstora
              </span>

              <label>
                Naziv firme
                <input
                  value={companyName}
                  onChange={e =>
                    setCompanyName(
                      e.target.value
                    )
                  }
                  placeholder="Naziv firme"
                />
              </label>

              <label>
                OIB
                <input
                  value={oib}
                  onChange={e =>
                    setOib(e.target.value)
                  }
                  placeholder="OIB"
                />
              </label>

              <label>
                Adresa
                <input
                  value={address}
                  onChange={e =>
                    setAddress(
                      e.target.value
                    )
                  }
                  placeholder="Ulica i broj"
                />
              </label>

              <label>
                Poštanski broj
                <input
                  value={zip}
                  onChange={e =>
                    setZip(e.target.value)
                  }
                  placeholder="10000"
                />
              </label>

              <label>
                Opis / Bio
                <textarea
                  rows="5"
                  value={bio}
                  onChange={e =>
                    setBio(e.target.value)
                  }
                  placeholder="Opišite svoje iskustvo, način rada i usluge."
                />
              </label>

              <label>
                Radijus usluge u km
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={serviceRadius}
                  onChange={e =>
                    setServiceRadius(
                      e.target.value
                    )
                  }
                />
              </label>

              <div>
                <strong>
                  Usluge
                </strong>

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "10px"
                  }}
                >
                  {categories.map(
                    category => (
                      <label
                        key={category}
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                          fontWeight: 600
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedCategories.includes(
                              category
                            )
                          }
                          onChange={() =>
                            toggleCategory(
                              category
                            )
                          }
                          style={{
                            width: "20px",
                            minHeight: "20px"
                          }}
                        />

                        <span>
                          {category}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {proProfile?.verified && (
                <div
                  className="badge"
                  style={{
                    marginTop: "8px"
                  }}
                >
                  Verificirani majstor
                </div>
              )}

              {proProfile?.plan && (
                <p className="muted">
                  Paket:{" "}
                  <strong>
                    {proProfile.plan}
                  </strong>
                  {" · "}
                  Status:{" "}
                  <strong>
                    {proProfile.plan_status}
                  </strong>
                </p>
              )}
            </>
          )}

          <button
            type="submit"
            className="button"
            disabled={saving}
          >
            {saving
              ? "Spremam..."
              : "Spremi profil"}
          </button>

          {message && (
            <p>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
