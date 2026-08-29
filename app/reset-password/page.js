"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { authErrorMessage } from "../../lib/auth-messages";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase =
    supabaseUrl && supabaseKey
      ? createBrowserClient(supabaseUrl, supabaseKey)
      : null;

  async function updatePassword(event) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmation) {
      setMessage("Lozinke se ne podudaraju.");
      return;
    }

    if (!supabase) {
      setMessage("Aplikacija nije ispravno konfigurirana.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(authErrorMessage(error, "Lozinku nije moguće promijeniti. Zatražite novu poveznicu."));
      return;
    }

    setCompleted(true);
    setMessage("Lozinka je uspješno promijenjena.");
  }

  return (
    <main className="section">
      <div className="container">
        <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="eyebrow">MOJMEŠTAR</p>
          <h2>Postavi novu lozinku</h2>

          {!completed ? (
            <form className="form" onSubmit={updatePassword}>
              <label>
                Nova lozinka
                <div className="passwordField">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
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

              <label>
                Ponovite novu lozinku
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </label>

              <button className="button" type="submit" disabled={loading}>
                {loading ? "Spremanje..." : "Spremi novu lozinku"}
              </button>
            </form>
          ) : (
            <Link href="/login" className="button">
              Prijavi se
            </Link>
          )}

          {message && <p className="formMessage" aria-live="polite">{message}</p>}
        </div>
      </div>
    </main>
  );
}
