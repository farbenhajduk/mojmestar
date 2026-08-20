"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function RegisterPage() {
  const [role, setRole] = useState("buyer");
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

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase konfiguracija nije dostupna.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.session) {
      window.location.href = "/jobs";
      return;
    }

    setMessage(
      "Registracija uspješna. Provjeri e-mail ako je potvrda uključena."
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="eyebrow">MOJMEŠTAR</p>
          <h2>Registracija</h2>

          <form className="form" onSubmit={handleRegister}>
            <label>
              Tip korisnika
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="buyer">Kupac</option>
                <option value="pro">Majstor</option>
              </select>
            </label>

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
                minLength={6}
                autoComplete="new-password"
              />
            </label>

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Izrada računa..." : "Izradi račun"}
            </button>
          </form>

          {message && <p style={{ marginTop: 18 }}>{message}</p>}

          <p className="muted" style={{ marginTop: 24 }}>
            Već imaš račun?{" "}
            <a href="/login">
              <strong>Prijavi se</strong>
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
