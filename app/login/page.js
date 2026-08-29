"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { authErrorMessage } from "../../lib/auth-messages";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase =
    supabaseUrl && supabaseKey
      ? createBrowserClient(supabaseUrl, supabaseKey)
      : null;

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase konfiguracija nije dostupna.");
      return;
    }

    setLoading(true);

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setLoading(false);

      if (error) {
        setMessage(authErrorMessage(error, "E-mail za obnovu lozinke nije moguće poslati."));
        return;
      }

      setMessage("Poslali smo vam e-mail za postavljanje nove lozinke.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setMessage(authErrorMessage(error, "Prijava trenutačno nije moguća."));
      return;
    }

    window.location.href = "/jobs";
  }

  return (
    <main className="section">
      <div className="container">
        <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="eyebrow">MOJMEŠTAR</p>
          <h2>{resetMode ? "Obnova lozinke" : "Prijava"}</h2>

          {resetMode && (
            <p className="muted">
              Upišite e-mail adresu računa. Poslat ćemo vam poveznicu za novu lozinku.
            </p>
          )}

          <form className="form" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            {!resetMode && (
              <label>
                Lozinka
                <div className="passwordField">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="passwordToggle"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Sakrij" : "Prikaži"}
                  </button>
                </div>
              </label>
            )}

            <button className="button" type="submit" disabled={loading}>
              {loading
                ? "Molimo pričekajte..."
                : resetMode
                  ? "Pošalji poveznicu"
                  : "Prijavi se"}
            </button>
          </form>

          {message && <p className="formMessage" aria-live="polite">{message}</p>}

          <button
            type="button"
            className="textButton"
            onClick={() => {
              setResetMode((current) => !current);
              setMessage("");
            }}
          >
            {resetMode ? "Natrag na prijavu" : "Zaboravili ste lozinku?"}
          </button>

          <p className="muted" style={{ marginTop: 24 }}>
            Nemaš račun?{" "}
            <Link href="/register">
              <strong>Registriraj se</strong>
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
