"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function PublicMajstorPage() {
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");

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
  }, [supabase, params?.id]);

  async function loadProfile() {
    if (!supabase || !params?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
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
        setMessage(
          "Profil majstora nije pronađen."
        );
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

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <h1>Majstor</h1>

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

            <h1>Profil majstora</h1>

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

            <h1>Profil nije pronađen</h1>

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

          <h1>
            {profile.company_name ||
              "Majstor"}
          </h1>

          {profile.verified && (
            <div
              className="badge"
              style={{
                marginBottom: "16px"
              }}
            >
              Verificirani majstor
            </div>
          )}

          {(profile.address ||
            profile.zip) && (
            <p>
              <strong>Lokacija:</strong>{" "}
              {profile.address || ""}
              {profile.address &&
              profile.zip
                ? ", "
                : ""}
              {profile.zip || ""}
            </p>
          )}

          {profile.service_radius_km && (
            <p>
              <strong>
                Radijus usluge:
              </strong>{" "}
              {profile.service_radius_km} km
            </p>
          )}
        </div>

        <div
          className="card"
          style={{
            marginBottom: "24px"
          }}
        >
          <span className="eyebrow">
            O majstoru
          </span>

          <h2>Opis</h2>

          <p>
            {profile.bio ||
              "Majstor još nije dodao opis profila."}
          </p>
        </div>

        <div
          className="card"
          style={{
            marginBottom: "24px"
          }}
        >
          <span className="eyebrow">
            Usluge
          </span>

          <h2>Područja rada</h2>

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
              marginBottom: "24px"
            }}
          >
            <span className="eyebrow">
              Portfolio
            </span>

            <h2>Radovi</h2>

            <div
              style={{
                display: "grid",
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
                    className="button secondary"
                  >
                    Pogledaj rad{" "}
                    {index + 1}
                  </a>
                )
              )}
            </div>
          </div>
        )}

        <div className="card">
          <h2>Trebate majstora?</h2>

          <p>
            Objavite posao i pronađite
            odgovarajućeg majstora.
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
