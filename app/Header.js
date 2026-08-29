"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  usePathname,
  useRouter
} from "next/navigation";

import {
  createBrowserClient
} from "@supabase/ssr";

import {
  dedupeNotifications
} from "../lib/notifications";

export default function Header() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    unreadNotifications,
    setUnreadNotifications
  ] = useState(0);

  const router =
    useRouter();

  const pathname =
    usePathname();

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      return null;
    }

    return createBrowserClient(
      supabaseUrl,
      supabaseKey
    );
  }, [
    supabaseUrl,
    supabaseKey
  ]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let activeUserId =
      null;

    async function loadProfile(
      userId
    ) {
      if (!userId) {
        setProfile(null);
        return;
      }

      const {
        data,
        error
      } =
        await supabase
          .from("profiles")
          .select(
            "id, role"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Profile error:",
          error
        );

        return;
      }

      setProfile(
        data || null
      );
    }

    async function loadNotificationCount(
      userId
    ) {
      if (!userId) {
        setUnreadNotifications(
          0
        );

        return;
      }

      try {
        const {
          data,
          error
        } =
          await supabase
            .from(
              "notifications"
            )
            .select(
              "id, user_id, type, title, message, entity_id, is_read, created_at"
            )
            .eq(
              "user_id",
              userId
            )
            .eq(
              "is_read",
              false
            );

        if (error) {
          console.error(
            "Notification count error:",
            error
          );

          return;
        }

        setUnreadNotifications(
          dedupeNotifications(
            data || []
          ).length
        );
      } catch (error) {
        console.error(
          "Notification count error:",
          error
        );
      }
    }

    async function loadUser() {
      const {
        data
      } =
        await supabase.auth
          .getSession();

      const authUser =
        data?.session?.user ||
        null;

      activeUserId =
        authUser?.id || null;

      setUser(authUser);

      if (authUser?.id) {
        await Promise.all([
          loadProfile(
            authUser.id
          ),

          loadNotificationCount(
            authUser.id
          )
        ]);
      } else {
        setProfile(null);

        setUnreadNotifications(
          0
        );
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: authListener
    } =
      supabase.auth
        .onAuthStateChange(
          async (
            _event,
            session
          ) => {
            const authUser =
              session?.user ||
              null;

            activeUserId =
              authUser?.id ||
              null;

            setUser(authUser);

            if (
              authUser?.id
            ) {
              await Promise.all([
                loadProfile(
                  authUser.id
                ),

                loadNotificationCount(
                  authUser.id
                )
              ]);
            } else {
              setProfile(null);

              setUnreadNotifications(
                0
              );
            }
          }
        );

    async function handleVisibilityChange() {
      if (
        document
          .visibilityState ===
          "visible" &&
        activeUserId
      ) {
        await loadNotificationCount(
          activeUserId
        );
      }
    }

    async function handleWindowFocus() {
      if (activeUserId) {
        await loadNotificationCount(
          activeUserId
        );
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    const notificationInterval =
      window.setInterval(
        () => {
          if (
            activeUserId
          ) {
            loadNotificationCount(
              activeUserId
            );
          }
        },
        30000
      );

    return () => {
      authListener
        ?.subscription
        ?.unsubscribe();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );

      window.clearInterval(
        notificationInterval
      );
    };
  }, [supabase]);

  async function logout() {
    if (!supabase) {
      return;
    }

    await supabase.auth
      .signOut();

    setUser(null);
    setProfile(null);

    setUnreadNotifications(
      0
    );

    setMenuOpen(false);

    router.push("/");
    router.refresh();
  }

  function notificationLabel() {
    if (
      unreadNotifications ===
      0
    ) {
      return "Obavijesti";
    }

    if (
      unreadNotifications ===
      1
    ) {
      return "1 nova obavijest";
    }

    return `${unreadNotifications} novih obavijesti`;
  }

  return (
    <header className="siteHeader">
      <div className="container headerInner">
        <div className="brandGroup">
          <Link
            href="/"
            className="brand"
          >
            MOJMEŠTAR
          </Link>

          {!loading && user && profile?.role && (
            <span
              className={`roleBadge ${
                profile.role === "pro"
                  ? "roleBadgePro"
                  : "roleBadgeCustomer"
              }`}
            >
              {profile.role === "pro"
                ? "MAJSTOR"
                : "KUPAC"}
            </span>
          )}

          <button
            type="button"
            className="mobileMenuButton"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() =>
              setMenuOpen(
                current => !current
              )
            }
          >
            <span aria-hidden="true">
              {menuOpen ? "×" : "☰"}
            </span>
            <span>
              Izbornik
            </span>
          </button>
        </div>

        <nav
          id="main-navigation"
          className={`nav ${
            menuOpen
              ? "navOpen"
              : ""
          }`}
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <Link
            href="/jobs"
            className={
              pathname.startsWith("/jobs")
                ? "navActive"
                : undefined
            }
          >
            {profile?.role === "customer"
              ? "Moji poslovi"
              : "Poslovi"}
          </Link>

          {profile?.role !== "pro" && (
            <Link
              href="/majstori"
              className={
                pathname.startsWith("/majstor")
                  ? "navActive"
                  : undefined
              }
            >
              Majstori
            </Link>
          )}

          {!loading && user ? (
            <>
              {profile?.role ===
                "customer" && (
                <Link
                  href="/favoriti"
                  className={
                    pathname.startsWith("/favoriti")
                      ? "navActive"
                      : undefined
                  }
                >
                  Spremljeni
                </Link>
              )}

              <Link
                href="/profile"
                className={
                  pathname.startsWith("/profile")
                    ? "navActive"
                    : undefined
                }
              >
                Moj profil
              </Link>

              <Link
                href="/dashboard"
                className={`button secondary small dashboardLink${
                  pathname.startsWith("/dashboard")
                    ? " navActiveButton"
                    : ""
                }`}
                aria-label={
                  notificationLabel()
                }
                title={
                  notificationLabel()
                }
                style={{
                  position:
                    "relative",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  textDecoration:
                    "none"
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize:
                      "20px",
                    lineHeight: 1
                  }}
                >
                  🔔
                </span>

                {unreadNotifications >
                  0 && (
                  <span
                    style={{
                      marginLeft:
                        "6px",
                      minWidth:
                        "20px",
                      height:
                        "20px",
                      padding:
                        "0 5px",
                      borderRadius:
                        "999px",
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize:
                        "11px",
                      fontWeight:
                        800,
                      lineHeight: 1,
                      background:
                        "#111827",
                      color:
                        "#ffffff",
                      border:
                        "1px solid white"
                    }}
                  >
                    {unreadNotifications >
                    99
                      ? "99+"
                      : unreadNotifications}
                  </span>
                )}

                <span>
                  Moj pregled
                </span>
              </Link>

              <button
                type="button"
                className="button small"
                onClick={
                  logout
                }
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
