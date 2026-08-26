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

const MAX_PORTFOLIO_IMAGES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

  const [portfolioUrls, setPortfolioUrls] = useState([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [deletingPortfolioUrl, setDeletingPortfolioUrl] = useState("");

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
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

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

      if (authError) {
        throw authError;
      }

      const authUser =
        authData?.user || null;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setProProfile(null);
        setPortfolioUrls([]);
        return;
      }

      setUser(authUser);

      const currentProfile =
        await ensureProfile(authUser);

      setProfile(currentProfile);

      setFullName(
        currentProfile?.full_name || ""
      );

      setCity(
        currentProfile?.city || ""
      );

      setPhone(
        currentProfile?.phone || ""
      );

      if (
        currentProfile?.role === "pro"
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
          throw ppError;
        }

        const currentProProfile =
          pp || null;

        setProProfile(
          currentProProfile
        );

        setCompanyName(
          currentProProfile?.company_name ||
            ""
        );

        setOib(
          currentProProfile?.oib ||
            ""
        );

        setAddress(
          currentProProfile?.address ||
            ""
        );

        setZip(
          currentProProfile?.zip ||
            ""
        );

        setBio(
          currentProProfile?.bio ||
            ""
        );

        setServiceRadius(
          String(
            currentProProfile
              ?.service_radius_km ??
              50
          )
        );

        setSelectedCategories(
          currentProProfile
            ?.categories || []
        );

        setPortfolioUrls(
          currentProProfile
            ?.portfolio_urls || []
        );
      } else {
        setProProfile(null);
        setPortfolioUrls([]);
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
      if (
        prev.includes(category)
      ) {
        return prev.filter(
          item =>
            item !== category
        );
      }

      return [
        ...prev,
        category
      ];
    });
  }

  function buildProPayload(
    newPortfolioUrls = portfolioUrls,
    coordinates = {}
  ) {
    const latitude =
      Object.prototype.hasOwnProperty.call(
        coordinates,
        "latitude"
      )
        ? coordinates.latitude
        : proProfile?.latitude ?? null;

    const longitude =
      Object.prototype.hasOwnProperty.call(
        coordinates,
        "longitude"
      )
        ? coordinates.longitude
        : proProfile?.longitude ?? null;

    return {
      user_id: user.id,

      company_name:
        companyName.trim() ||
        null,

      oib:
        oib.trim() ||
        null,

      address:
        address.trim() ||
        null,

      zip:
        zip.trim() ||
        null,

      latitude,
      longitude,

      bio:
        bio.trim() ||
        null,

      service_radius_km:
        Number(serviceRadius) ||
        50,

      categories:
        selectedCategories,

      portfolio_urls:
        newPortfolioUrls
    };
  }

  async function saveProData(
    newPortfolioUrls = portfolioUrls,
    coordinates = {}
  ) {
    const proPayload =
      buildProPayload(
        newPortfolioUrls,
        coordinates
      );

    if (proProfile?.id) {
      const {
        data,
        error
      } = await supabase
        .from("pro_profiles")
        .update(proPayload)
        .eq(
          "user_id",
          user.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setProProfile(data);

      return data;
    }

    const {
      data,
      error
    } = await supabase
      .from("pro_profiles")
      .insert(proPayload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    setProProfile(data);

    return data;
  }

  async function uploadPortfolioImages(
    event
  ) {
    const files =
      Array.from(
        event.target.files || []
      );

    event.target.value = "";

    if (
      !supabase ||
      !user ||
      profile?.role !== "pro"
    ) {
      return;
    }

    if (!files.length) {
      return;
    }

    if (
      portfolioUrls.length >=
      MAX_PORTFOLIO_IMAGES
    ) {
      setMessage(
        "Možete dodati najviše 6 fotografija."
      );
      return;
    }

    const remainingSlots =
      MAX_PORTFOLIO_IMAGES -
      portfolioUrls.length;

    if (
      files.length >
      remainingSlots
    ) {
      setMessage(
        `Možete dodati još samo ${remainingSlots} fotografija.`
      );
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    for (const file of files) {
      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setMessage(
          "Dozvoljeni formati su JPG, PNG i WEBP."
        );
        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setMessage(
          "Jedna fotografija može imati najviše 5 MB."
        );
        return;
      }
    }

    setUploadingPortfolio(true);
    setMessage("");

    const uploadedPaths = [];

    try {
      const newUrls = [];

      for (const file of files) {
        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const randomPart =
          Math.random()
            .toString(36)
            .slice(2, 10);

        const filePath =
          `${user.id}/` +
          `${Date.now()}-` +
          `${randomPart}.` +
          `${extension}`;

        const {
          error: uploadError
        } = await supabase.storage
          .from("portfolio")
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",
              upsert: false
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(
          filePath
        );

        const {
          data: publicUrlData
        } = supabase.storage
          .from("portfolio")
          .getPublicUrl(
            filePath
          );

        const publicUrl =
          publicUrlData
            ?.publicUrl;

        if (!publicUrl) {
          throw new Error(
            "URL fotografije nije mogao biti kreiran."
          );
        }

        newUrls.push(
          publicUrl
        );
      }

      const nextUrls = [
        ...portfolioUrls,
        ...newUrls
      ];

      await saveProData(
        nextUrls
      );

      setPortfolioUrls(
        nextUrls
      );

      setMessage(
        files.length === 1
          ? "Fotografija je dodana."
          : "Fotografije su dodane."
      );
    } catch (err) {
      console.error(err);

      if (
        uploadedPaths.length
      ) {
        await supabase.storage
          .from("portfolio")
          .remove(
            uploadedPaths
          );
      }

      setMessage(
        err?.message ||
          "Fotografija se nije mogla prenijeti."
      );
    } finally {
      setUploadingPortfolio(false);
    }
  }

  function getStoragePathFromUrl(
    url
  ) {
    const marker =
      "/storage/v1/object/public/portfolio/";

    const markerIndex =
      url.indexOf(marker);

    if (
      markerIndex === -1
    ) {
      return null;
    }

    const encodedPath =
      url.slice(
        markerIndex +
          marker.length
      );

    try {
      return decodeURIComponent(
        encodedPath
      );
    } catch {
      return encodedPath;
    }
  }

  async function deletePortfolioImage(
    url
  ) {
    if (
      !supabase ||
      !user ||
      deletingPortfolioUrl
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li izbrisati ovu fotografiju?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingPortfolioUrl(
      url
    );

    setMessage("");

    try {
      const path =
        getStoragePathFromUrl(
          url
        );

      if (path) {
        const {
          error: storageError
        } = await supabase.storage
          .from("portfolio")
          .remove([path]);

        if (storageError) {
          throw storageError;
        }
      }

      const nextUrls =
        portfolioUrls.filter(
          item =>
            item !== url
        );

      await saveProData(
        nextUrls
      );

      setPortfolioUrls(
        nextUrls
      );
            setMessage(
        "Fotografija je izbrisana."
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Fotografija se nije mogla izbrisati."
      );
    } finally {
      setDeletingPortfolioUrl(
        ""
      );
    }
  }

  async function geocodeMajstorAddress() {
    const cleanAddress =
      address.trim();

    const cleanZip =
      zip.trim();

    const cleanCity =
      city.trim();

    if (
      !cleanAddress &&
      !cleanZip &&
      !cleanCity
    ) {
      return {
        latitude: null,
        longitude: null
      };
    }

    const response =
      await fetch(
        "/api/geocode",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            address: cleanAddress,
            zip: cleanZip,
            city: cleanCity,
            country: "Croatia"
          })
        }
      );

    if (!response.ok) {
      throw new Error(
        "Lokacija adrese nije mogla biti određena."
      );
    }

    const data =
      await response.json();

    const latitude =
      Number(
        data?.latitude ??
          data?.lat
      );

    const longitude =
      Number(
        data?.longitude ??
          data?.lon ??
          data?.lng
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error(
        "Adresa nije pronađena. Provjerite ulicu, broj, grad i poštanski broj."
      );
    }

    return {
      latitude,
      longitude
    };
  }

  async function saveProfile(e) {
    e.preventDefault();

    if (
      !supabase ||
      !user ||
      !profile
    ) {
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
            fullName.trim() ||
            null,

          city:
            city.trim() ||
            null,

          phone:
            phone.trim() ||
            null
        })
        .eq(
          "id",
          user.id
        );

      if (profileError) {
        throw profileError;
      }

      if (
        profile.role === "pro"
      ) {
        const coordinates =
          await geocodeMajstorAddress();

        await saveProData(
          portfolioUrls,
          coordinates
        );
      }

      setMessage(
        "Profil je spremljen."
      );
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
            <h1>
              Profil
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
              Profil
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
              Profil
            </h1>

            <p>
              Za uređivanje profila morate se prvo prijaviti.
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
            marginBottom:
              "24px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1>
            Moj profil
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
          onSubmit={
            saveProfile
          }
          className="card form"
        >
          <span className="eyebrow">
            Osnovni podaci
          </span>

          <label>
            Ime i prezime

            <input
              value={
                fullName
              }
              onChange={e =>
                setFullName(
                  e.target.value
                )
              }
              placeholder="Ime i prezime"
            />
          </label>

          <label>
            Grad

            <input
              value={
                city
              }
              onChange={e =>
                setCity(
                  e.target.value
                )
              }
              placeholder="Zagreb"
            />
          </label>

          <label>
            Telefon

            <input
              type="tel"
              value={
                phone
              }
              onChange={e =>
                setPhone(
                  e.target.value
                )
              }
              placeholder="+385..."
            />
          </label>

          {profile?.role ===
            "pro" && (
            <>
              <hr
                style={{
                  width:
                    "100%",
                  border: 0,
                  borderTop:
                    "1px solid var(--border)",
                  margin:
                    "8px 0"
                }}
              />

              <span className="eyebrow">
                Podaci majstora
              </span>

              <label>
                Naziv firme

                <input
                  value={
                    companyName
                  }
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
                  value={
                    oib
                  }
                  onChange={e =>
                    setOib(
                      e.target.value
                    )
                  }
                  placeholder="OIB"
                />
              </label>

              <label>
                Adresa

                <input
                  value={
                    address
                  }
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
                  value={
                    zip
                  }
                  onChange={e =>
                    setZip(
                      e.target.value
                    )
                  }
                  placeholder="10000"
                />
              </label>

              <label>
                Opis profila

                <textarea
                  rows="5"
                  value={
                    bio
                  }
                  onChange={e =>
                    setBio(
                      e.target.value
                    )
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
                  value={
                    serviceRadius
                  }
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
                    display:
                      "grid",
                    gap:
                      "10px",
                    marginTop:
                      "10px"
                  }}
                >
                  {categories.map(
                    category => (
                      <label
                        key={
                          category
                        }
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "10px",
                          fontWeight:
                            600
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
                            width:
                              "20px",
                            minHeight:
                              "20px"
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

              <hr
                style={{
                  width:
                    "100%",
                  border: 0,
                  borderTop:
                    "1px solid var(--border)",
                  margin:
                    "12px 0"
                }}
              />

              <div>
                <span className="eyebrow">
                  Portfolio
                </span>

                <h2
                  style={{
                    marginTop:
                      "8px"
                  }}
                >
                  Referentne fotografije
                </h2>

                <p className="muted">
                  Pokažite klijentima svoje završene radove. Najviše 6 fotografija, do 5 MB po fotografiji.
                </p>

                {portfolioUrls.length <
                  MAX_PORTFOLIO_IMAGES && (
                  <label
                    className="button secondary"
                    style={{
                      display:
                        "inline-flex",
                      cursor:
                        uploadingPortfolio
                          ? "default"
                          : "pointer",
                      marginTop:
                        "8px"
                    }}
                  >
                    {uploadingPortfolio
                      ? "Prenosim..."
                      : "Dodaj fotografije"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={
                        uploadingPortfolio
                      }
                      onChange={
                        uploadPortfolioImages
                      }
                      style={{
                        display:
                          "none"
                      }}
                    />
                  </label>
                )}

                <p
                  className="muted"
                  style={{
                    marginTop:
                      "10px"
                  }}
                >
                  {portfolioUrls.length}
                  {" / "}
                  {MAX_PORTFOLIO_IMAGES}
                  {" "}
                  fotografija
                </p>

                {portfolioUrls.length >
                  0 && (
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                      gap:
                        "14px",
                      marginTop:
                        "16px"
                    }}
                  >
                    {portfolioUrls.map(
                      (
                        url,
                        index
                      ) => (
                        <div
                          key={
                            url
                          }
                          style={{
                            border:
                              "1px solid var(--border)",
                            borderRadius:
                              "16px",
                            padding:
                              "10px"
                          }}
                        >
                          <img
                            src={
                              url
                            }
                            alt={`Referentna fotografija ${index + 1}`}
                            style={{
                              width:
                                "100%",
                              height:
                                "150px",
                              objectFit:
                                "cover",
                              borderRadius:
                                "12px",
                              display:
                                "block"
                            }}
                          />

                          <button
                            type="button"
                            className="button secondary"
                            disabled={
                              deletingPortfolioUrl ===
                              url
                            }
                            onClick={() =>
                              deletePortfolioImage(
                                url
                              )
                            }
                            style={{
                              width:
                                "100%",
                              marginTop:
                                "10px"
                            }}
                          >
                            {deletingPortfolioUrl ===
                            url
                              ? "Brišem..."
                              : "Izbriši"}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {proProfile?.verified && (
                <div
                  className="badge"
                  style={{
                    marginTop:
                      "8px"
                  }}
                >
                  Verificirani majstor
                </div>
              )}

              {proProfile?.plan && (
                <p className="muted">
                  Paket:{" "}
                  <strong>
                    {
                      proProfile.plan
                    }
                  </strong>

                  {" · "}

                  Status:{" "}
                  <strong>
                    {
                      proProfile.plan_status
                    }
                  </strong>
                </p>
              )}
            </>
          )}

          <button
            type="submit"
            className="button"
            disabled={
              saving ||
              uploadingPortfolio
            }
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
