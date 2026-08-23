"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

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
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function loadUser() {
      const { data } =
        await supabase.auth.getUser();

      setUser(data?.user || null);
      setLoading(false);
    }

    loadUser();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(
            session?.user || null
          );
        }
      );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setUser(null);

    router.push("/");
    router.refresh();
  }

  return (
    <header className="siteHeader">
      <div className="container headerInner">
        <Link
          href="/"
          className="brand"
        >
          MOJMEŠTAR
        </Link>

        <nav className="nav">
          <Link href="/jobs">
            Poslovi
          </Link>

          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className="button secondary small"
              >
                Moj pregled
              </Link>

              <button
                type="button"
                className="button small"
                onClick={logout}
              >
                Odjava
              </button>
            </>
          ) : !loading ? (
            <>
              <Link href="/login">
                Prijava
              </Link>

              <Link
                href="/register"
                className="button small"
              >
                Registracija
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
