"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/jobs";
  }

  return (
    <main className="section">
      <div className="container">
        <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="eyebrow">MOJMEŠTAR</p>
          <h2>Prijava</h2>

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

            <label>
              Lozinka
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Prijava..." : "Prijavi se"}
            </button>
          </form>

          {message && <p style={{ marginTop: 18 }}>{message}</p>}

          <p className="muted" style={{ marginTop: 24 }}>
            Nemaš račun?{" "}
            <a href="/register">
              <strong>Registriraj se</strong>
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
