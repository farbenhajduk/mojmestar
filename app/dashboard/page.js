"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [notificationLoading, setNotificationLoading] = useState("");
  const [message, setMessage] = useState("");

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [myJobs, setMyJobs] = useState([]);
  const [myInterests, setMyInterests] = useState([]);
  const [proReviews, setProReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [favoritePros, setFavoritePros] = useState([]);

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
    loadDashboard();
  }, [supabase]);

  async function ensureProfile(authUser) {
    const {
      data: existing,
      error: readError
    } = await supabase
      .from("profiles")
      .select("id, role")
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
      .select("id, role")
      .single();

    if (createError) {
      throw createError;
    }

    return created;
  }

  async function loadDashboard() {
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
        setMyJobs([]);
        setMyInterests([]);
        setProReviews([]);
        setNotifications([]);
        setFavoritePros([]);
        return;
      }

      setUser(authUser);

      const currentProfile =
        await ensureProfile(
          authUser
        );

      setProfile(
        currentProfile
      );

      const commonTasks = [
        loadNotifications(
          authUser.id
        )
      ];

      if (
        currentProfile?.role ===
        "customer"
      ) {
        await Promise.all([
          ...commonTasks,

          loadCustomerJobs(
            authUser.id
          ),

          loadCustomerFavorites(
            authUser.id
          )
        ]);

        setProReviews([]);
      }

      if (
        currentProfile?.role ===
        "pro"
      ) {
        await Promise.all([
          ...commonTasks,

          loadProInterests(
            authUser.id
          ),

          loadProReviews(
            authUser.id
          )
        ]);

        setFavoritePros([]);
      }
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Greška pri učitavanju pregleda."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications(
    userId
  ) {
    const {
      data,
      error
    } = await supabase
      .from("notifications")
      .select(
        "id, user_id, type, title, message, href, entity_id, is_read, created_at"
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(20);

    if (error) {
      throw error;
    }

    setNotifications(
      data || []
    );
  }

  async function markNotificationRead(
    notificationId
  ) {
    if (
      !supabase ||
      !notificationId
    ) {
      return;
    }

    setNotificationLoading(
      notificationId
    );

    try {
      const {
        error
      } = await supabase
        .from("notifications")
        .update({
          is_read: true
        })
        .eq(
          "id",
          notificationId
        );

      if (error) {
        throw error;
      }

      setNotifications(
        current =>
          current.map(
            notification =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true
                  }
                : notification
          )
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Obavijest nije moguće označiti kao pročitanu."
      );
    } finally {
      setNotificationLoading(
        ""
      );
    }
  }

  async function markAllNotificationsRead() {
    if (
      !supabase ||
      !user?.id
    ) {
      return;
    }

    setNotificationLoading(
      "all"
    );

    try {
      const {
        error
      } = await supabase
        .from("notifications")
        .update({
          is_read: true
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "is_read",
          false
        );

      if (error) {
        throw error;
      }

      setNotifications(
        current =>
          current.map(
            notification => ({
              ...notification,
              is_read: true
            })
          )
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Obavijesti nije moguće označiti kao pročitane."
      );
    } finally {
      setNotificationLoading(
        ""
      );
    }
  }

  async function openNotification(
    notification
  ) {
    if (!notification) {
      return;
    }

    if (!notification.is_read) {
      await markNotificationRead(
        notification.id
      );
    }

    if (
      notification.href
    ) {
      window.location.href =
        notification.href;
    }
  }

  async function loadCustomerJobs(
    userId
  ) {
    const {
      data,
      error
    } = await supabase
      .from("jobs")
      .select("*")
      .eq(
        "customer_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    setMyJobs(
      data || []
    );

    setMyInterests([]);
  }

  async function loadCustomerFavorites(
    userId
  ) {
    const {
      data: favoriteRows,
      error: favoriteError
    } = await supabase
      .from("favorite_pros")
      .select("pro_id, created_at")
      .eq(
        "customer_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (favoriteError) {
      throw favoriteError;
    }

    const ids =
      (favoriteRows || [])
        .map(
          row => row.pro_id
        )
        .filter(Boolean);

    if (!ids.length) {
      setFavoritePros([]);
      return;
    }

    const {
      data: directoryData,
      error: directoryError
    } = await supabase.rpc(
      "get_public_pro_directory"
    );

    if (directoryError) {
      throw directoryError;
    }

    const directory =
      Array.isArray(directoryData)
        ? directoryData
        : [];

    const prosById =
      Object.fromEntries(
        directory.map(
          pro => [
            pro.user_id,
            pro
          ]
        )
      );

    setFavoritePros(
      ids
        .map(
          id => prosById[id]
        )
        .filter(Boolean)
    );
  }

  async function removeFavorite(
    proId
  ) {
    if (
      !supabase ||
      !user?.id ||
      !proId ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li ukloniti ovog majstora iz spremljenih?"
      );

    if (!confirmed) {
      return;
    }

    const loadingKey =
      `favorite-${proId}`;

    setActionLoading(
      loadingKey
    );

    setMessage("");

    try {
      const {
        error
      } = await supabase
        .from("favorite_pros")
        .delete()
        .eq(
          "customer_id",
          user.id
        )
        .eq(
          "pro_id",
          proId
        );

      if (error) {
        throw error;
      }

      setFavoritePros(
        current =>
          current.filter(
            pro =>
              pro.user_id !==
              proId
          )
      );

      setMessage(
        "Majstor je uklonjen iz spremljenih."
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Majstora nije moguće ukloniti iz spremljenih."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function loadProInterests(
    userId
  ) {
    const {
      data: interests,
      error: interestsError
    } = await supabase
      .from("interests")
      .select("*")
      .eq(
        "pro_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (interestsError) {
      throw interestsError;
    }

    const interestRows =
      interests || [];

    if (
      !interestRows.length
    ) {
      setMyInterests([]);
      setMyJobs([]);
      return;
    }

    const jobIds = [
      ...new Set(
        interestRows
          .map(
            item =>
              item.job_id
          )
          .filter(Boolean)
      )
    ];

    const {
      data: jobs,
      error: jobsError
    } = await supabase
      .from("jobs")
      .select("*")
      .in(
        "id",
        jobIds
      );

    if (jobsError) {
      throw jobsError;
    }

    const jobsById =
      Object.fromEntries(
        (jobs || []).map(
          job => [
            job.id,
            job
          ]
        )
      );

    const combined =
      interestRows.map(
        interest => ({
          ...interest,

          job:
            jobsById[
              interest.job_id
            ] || null
        })
      );

    setMyInterests(
      combined
    );

    setMyJobs([]);
  }

  async function loadProReviews(
    userId
  ) {
    const {
      data,
      error
    } = await supabase
      .from("pro_reviews")
      .select(
        "id, rating, comment, created_at"
      )
      .eq(
        "pro_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    setProReviews(
      data || []
    );
  }

  async function completeJob(
    jobId
  ) {
    if (
      !supabase ||
      !jobId ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Želite li označiti ovaj posao kao završen?"
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      jobId
    );

    setMessage("");

    try {
      const {
        error
      } = await supabase.rpc(
        "close_job",
        {
          p_job_id:
            jobId
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        "Posao je uspješno označen kao završen."
      );

      await loadDashboard();
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Posao nije moguće završiti."
      );
    } finally {
      setActionLoading(
        ""
      );
    }
  }

  function formatDate(
    value
  ) {
    if (!value) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(
        "hr-HR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }
      ).format(
        new Date(value)
      );
    } catch {
      return "";
    }
  }

  function formatDateTime(
    value
  ) {
    if (!value) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(
        "hr-HR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      ).format(
        new Date(value)
      );
    } catch {
      return "";
    }
  }

  function statusLabel(
    status
  ) {
    if (
      status === "open"
    ) {
      return "Aktivan";
    }

    if (
      status === "assigned"
    ) {
      return "U tijeku";
    }

    if (
      status === "completed"
    ) {
      return "Završen";
    }

    return (
      status ||
      "Nepoznato"
    );
  }

  function statusBadge(
    status
  ) {
    if (
      status === "open"
    ) {
      return "Aktivan";
    }

    if (
      status === "assigned"
    ) {
      return "Posao u tijeku";
    }

    if (
      status === "completed"
    ) {
      return "Završen";
    }

    return "Nepoznato";
  }

  function notificationIcon(
    type
  ) {
    if (
      type === "new_interest"
    ) {
      return "👷";
    }

    if (
      type === "job_assigned"
    ) {
      return "✅";
    }

    if (
      type === "job_completed"
    ) {
      return "🏁";
    }

    if (
      type === "new_review"
    ) {
      return "★";
    }

    return "●";
  }

  function notificationActionLabel(
    type
  ) {
    if (
      type === "new_interest"
    ) {
      return "Pogledaj majstore";
    }

    if (
      type === "job_assigned"
    ) {
      return "Pogledaj posao";
    }

    if (
      type === "job_completed"
    ) {
      return "Otvori pregled";
    }

    if (
      type === "new_review"
    ) {
      return "Pogledaj ocjenu";
    }

    return "Otvori";
  }

  function renderStars(
    value
  ) {
    const rounded =
      Math.round(
        Number(value) || 0
      );

    return Array.from(
      { length: 5 },
      (_, index) =>
        index < rounded
          ? "★"
          : "☆"
    ).join("");
  }

  function favoriteLocationText(
    pro
  ) {
    const parts = [];

    if (pro?.address) {
      parts.push(
        pro.address
      );
    }

    if (pro?.zip) {
      parts.push(
        pro.zip
      );
    }

    return parts.length
      ? parts.join(" · ")
      : "Lokacija nije navedena";
  }

  /*
   * NARUČITELJ
   */

  const openJobs =
    useMemo(
      () =>
        myJobs.filter(
          job =>
            job.status ===
            "open"
        ),
      [myJobs]
    );

  const assignedJobs =
    useMemo(
      () =>
        myJobs.filter(
          job =>
            job.status ===
            "assigned"
        ),
      [myJobs]
    );

  const completedJobs =
    useMemo(
      () =>
        myJobs.filter(
          job =>
            job.status ===
            "completed"
        ),
      [myJobs]
    );

  /*
   * MAJSTOR
   */

  const openInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .status ===
              "open"
        ),
      [myInterests]
    );

  const assignedToMeInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .status ===
              "assigned" &&
            interest.job
              .selected_pro_id ===
              user?.id
        ),
      [
        myInterests,
        user?.id
      ]
    );

  const completedForMeInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .status ===
              "completed" &&
            interest.job
              .selected_pro_id ===
              user?.id
        ),
      [
        myInterests,
        user?.id
      ]
    );

  const notSelectedInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job
              .selected_pro_id &&
            interest.job
              .selected_pro_id !==
              user?.id &&
            (
              interest.job
                .status ===
                "assigned" ||
              interest.job
                .status ===
                "completed"
            )
        ),
      [
        myInterests,
        user?.id
      ]
    );

  const unavailableInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            !interest.job
        ),
      [myInterests]
    );

  const averageRating =
    useMemo(
      () => {
        if (
          !proReviews.length
        ) {
          return 0;
        }

        const total =
          proReviews.reduce(
            (
              sum,
              review
            ) =>
              sum +
              Number(
                review.rating ||
                  0
              ),
            0
          );

        return (
          total /
          proReviews.length
        );
      },
      [proReviews]
    );

  const unreadNotifications =
    useMemo(
      () =>
        notifications.filter(
          notification =>
            !notification.is_read
        ),
      [notifications]
    );

  const unreadCount =
    unreadNotifications.length;

  function StatCard({
    value,
    label
  }) {
    return (
      <div
        className="card"
        style={{
          padding: "16px",
          textAlign: "center"
        }}
      >
        <div
          style={{
            fontSize: "30px",
            fontWeight: 800,
            lineHeight: 1
          }}
        >
          {value}
        </div>

        <div
          className="muted"
          style={{
            marginTop: "7px"
          }}
        >
          {label}
        </div>
      </div>
    );
  }

  function NotificationsSection() {
    return (
      <section
        style={{
          marginBottom:
            "30px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom:
              "14px"
          }}
        >
          <div>
            <span className="eyebrow">
              Obavijesti
            </span>

            <h2
              style={{
                marginBottom: 0
              }}
            >
              Novosti za vas
            </h2>
          </div>

          {unreadCount >
            0 && (
            <button
              type="button"
              className="button secondary small"
              disabled={
                notificationLoading ===
                "all"
              }
              onClick={
                markAllNotificationsRead
              }
            >
              {notificationLoading ===
              "all"
                ? "Spremam..."
                : "Označi sve kao pročitano"}
            </button>
          )}
        </div>

        {unreadCount >
          0 && (
          <div
            className="card"
            style={{
              padding: "14px",
              marginBottom:
                "12px"
            }}
          >
            <strong>
              {unreadCount}{" "}
              {unreadCount ===
              1
                ? "nova obavijest"
                : "novih obavijesti"}
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              Ovdje se pojavljuju promjene vezane uz vaše poslove, interese i ocjene.
            </p>
          </div>
        )}

        {!notifications.length ? (
          <div className="card">
            <p
              className="muted"
              style={{
                marginBottom: 0
              }}
            >
              Trenutno nemate novih obavijesti.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px"
            }}
          >
            {notifications
              .slice(0, 10)
              .map(
                notification => (
                  <article
                    key={
                      notification.id
                    }
                    className="card"
                    style={{
                      padding:
                        "14px",

                      border:
                        notification.is_read
                          ? "1px solid var(--border)"
                          : "2px solid currentColor"
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        gap: "12px",
                        alignItems:
                          "flex-start"
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          flexShrink: 0,
                          borderRadius:
                            "12px",
                          background:
                            "#f2f4f7",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize:
                            "20px"
                        }}
                      >
                        {notificationIcon(
                          notification.type
                        )}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap:
                              "10px",
                            flexWrap:
                              "wrap"
                          }}
                        >
                          <strong>
                            {
                              notification.title
                            }
                          </strong>

                          {!notification.is_read && (
                            <span className="badge">
                              Novo
                            </span>
                          )}
                        </div>

                        {notification.message && (
                          <p
                            className="muted"
                            style={{
                              margin:
                                "6px 0"
                            }}
                          >
                            {
                              notification.message
                            }
                          </p>
                        )}

                        <small className="muted">
                          {formatDateTime(
                            notification.created_at
                          )}
                        </small>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                            flexWrap:
                              "wrap",
                            marginTop:
                              "12px"
                          }}
                        >
                          {notification.href && (
                            <button
                              type="button"
                              className="button small"
                              disabled={
                                notificationLoading ===
                                notification.id
                              }
                              onClick={() =>
                                openNotification(
                                  notification
                                )
                              }
                            >
                              {notificationActionLabel(
                                notification.type
                              )}
                            </button>
                          )}

                          {!notification.is_read && (
                            <button
                              type="button"
                              className="button secondary small"
                              disabled={
                                notificationLoading ===
                                notification.id
                              }
                              onClick={() =>
                                markNotificationRead(
                                  notification.id
                                )
                              }
                            >
                              {notificationLoading ===
                              notification.id
                                ? "Spremam..."
                                : "Pročitano"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}
          </div>
        )}
      </section>
    );
  }

  function CustomerFavoriteCard({
    pro
  }) {
    const reviewCount =
      Number(
        pro.review_count
      ) || 0;

    const average =
      Number(
        pro.average_rating
      ) || 0;

    const loadingKey =
      `favorite-${pro.user_id}`;

    return (
      <article
        className="card"
        style={{
          display: "grid",
          gap: "12px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "10px",
            alignItems:
              "flex-start",
            flexWrap: "wrap"
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: "7px",
                flexWrap: "wrap",
                marginBottom: "7px"
              }}
            >
              <span className="badge">
                ★ Spremljen
              </span>

              {pro.verified && (
                <span className="badge">
                  ✓ Verificirani
                </span>
              )}
            </div>

            <h3
              style={{
                margin: "0 0 5px"
              }}
            >
              {pro.company_name ||
                "Majstor"}
            </h3>

            <p
              className="muted"
              style={{
                margin: 0
              }}
            >
              📍 {favoriteLocationText(
                pro
              )}
            </p>
          </div>

          <div
            style={{
              textAlign: "right"
            }}
          >
            {reviewCount > 0 ? (
              <>
                <div
                  style={{
                    fontSize: "20px",
                    lineHeight: 1
                  }}
                >
                  {renderStars(
                    average
                  )}
                </div>

                <small className="muted">
                  {average.toFixed(1)} · {reviewCount} recenzija
                </small>
              </>
            ) : (
              <small className="muted">
                Još nema ocjena
              </small>
            )}
          </div>
        </div>

        {Array.isArray(
          pro.categories
        ) &&
          pro.categories.length >
            0 && (
            <div
              style={{
                display: "flex",
                gap: "7px",
                flexWrap: "wrap"
              }}
            >
              {pro.categories
                .slice(0, 3)
                .map(
                  category => (
                    <span
                      className="badge"
                      key={category}
                    >
                      {category}
                    </span>
                  )
                )}
            </div>
          )}

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap"
          }}
        >
          <Link
            href={`/majstor/${pro.user_id}`}
            className="button small"
          >
            Pogledaj profil
          </Link>

          <button
            type="button"
            className="button secondary small"
            disabled={
              actionLoading ===
              loadingKey
            }
            onClick={() =>
              removeFavorite(
                pro.user_id
              )
            }
          >
            {actionLoading ===
            loadingKey
              ? "Uklanjam..."
              : "Ukloni"}
          </button>
        </div>
      </article>
    );
  }

  function CustomerJobCard({
    job
  }) {
    const isOpen =
      job.status === "open";

    const isAssigned =
      job.status ===
      "assigned";

    const isCompleted =
      job.status ===
      "completed";

    return (
      <article
        className="card"
        style={{
          marginBottom:
            "16px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "10px",
            flexWrap: "wrap"
          }}
        >
          <span className="badge">
            {job.category}
          </span>

          <span className="badge">
            {statusBadge(
              job.status
            )}
          </span>
        </div>

        <h3>
          {job.city}

          {job.zip
            ? ` · ${job.zip}`
            : ""}
        </h3>

        <p>
          {job.description}
        </p>

        {isOpen && (
          <div
            style={{
              padding: "12px",
              borderRadius:
                "12px",
              background:
                "#f7f8fa",
              marginBottom:
                "14px"
            }}
          >
            <strong>
              Posao je otvoren
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              Majstori još mogu iskazati interes za ovaj posao.
            </p>
          </div>
        )}

        {isAssigned &&
          job.selected_pro_id && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Posao je u tijeku
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Majstor je odabran. Kada posao bude gotov, označite ga kao završen.
              </p>
            </div>
          )}

        {isCompleted &&
          job.selected_pro_id && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Posao je završen
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Sada možete ocijeniti odabranog majstora.
              </p>
            </div>
          )}

        <div
          className="rowBetween"
          style={{
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div>
            <small>
              Status:{" "}
              <strong>
                {statusLabel(
                  job.status
                )}
              </strong>
            </small>

            <br />

            <small>
              Objavljeno:{" "}
              {formatDate(
                job.created_at
              )}
            </small>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap"
            }}
          >
            {isOpen && (
              <Link
                href="/jobs"
                className="button small"
              >
                Otvori posao
              </Link>
            )}

            {isAssigned &&
              job.selected_pro_id && (
                <>
                  <Link
                    href={`/majstor/${job.selected_pro_id}`}
                    className="button secondary small"
                  >
                    Profil majstora
                  </Link>

                  <button
                    type="button"
                    className="button small"
                    disabled={
                      actionLoading ===
                      job.id
                    }
                    onClick={() =>
                      completeJob(
                        job.id
                      )
                    }
                  >
                    {actionLoading ===
                    job.id
                      ? "Spremanje..."
                      : "Završi posao"}
                  </button>
                </>
              )}

            {isCompleted &&
              job.selected_pro_id && (
                <>
                  <Link
                    href={`/majstor/${job.selected_pro_id}#ocijeni`}
                    className="button small"
                  >
                    Ocijeni majstora
                  </Link>

                  <Link
                    href={`/majstor/${job.selected_pro_id}`}
                    className="button secondary small"
                  >
                    Profil majstora
                  </Link>
                </>
              )}
          </div>
        </div>
      </article>
    );
  }

  function ProInterestCard({
    interest,
    mode = "open"
  }) {
    if (!interest.job) {
      return null;
    }

    const job =
      interest.job;

    const isSelected =
      job.selected_pro_id ===
      user?.id;

    return (
      <article
        className="card"
        style={{
          marginBottom:
            "16px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "10px",
            flexWrap: "wrap"
          }}
        >
          <span className="badge">
            {job.category}
          </span>

          <span className="badge">
            {statusBadge(
              job.status
            )}
          </span>
        </div>

        <h3>
          {job.city}

          {job.zip
            ? ` · ${job.zip}`
            : ""}
        </h3>

        <p>
          {job.description}
        </p>

        {mode === "open" && (
          <div
            style={{
              padding: "12px",
              borderRadius:
                "12px",
              background:
                "#f7f8fa",
              marginBottom:
                "14px"
            }}
          >
            <strong>
              Interes je poslan
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              Naručitelj još nije odabrao majstora.
            </p>
          </div>
        )}

        {mode === "assigned" &&
          isSelected && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Odabrani ste za posao
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Posao je u tijeku. Naručitelj će ga označiti kao završen kada radovi budu gotovi.
              </p>
            </div>
          )}

        {mode === "completed" &&
          isSelected && (
            <div
              style={{
                padding: "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                Vi ste bili odabrani majstor
              </strong>

              <p
                className="muted"
                style={{
                  margin:
                    "5px 0 0"
                }}
              >
                Naručitelj je označio ovaj posao kao završen.
              </p>
            </div>
          )}

        {mode ===
          "not-selected" && (
          <div
            style={{
              padding: "12px",
              borderRadius:
                "12px",
              background:
                "#f7f8fa",
              marginBottom:
                "14px"
            }}
          >
            <strong>
              Odabran je drugi majstor
            </strong>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              Naručitelj je za ovaj posao odabrao drugog majstora.
            </p>
          </div>
        )}

        {interest.message && (
          <div
            style={{
              padding: "14px",
              background:
                "#f7f8fa",
              borderRadius:
                "12px"
            }}
          >
            <strong>
              Moja poruka
            </strong>

            <p
              style={{
                margin:
                  "6px 0 0"
              }}
            >
              {interest.message}
            </p>
          </div>
        )}

        <div
          className="rowBetween"
          style={{
            marginTop: "14px",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div>
            <small>
              Status posla:{" "}
              <strong>
                {statusLabel(
                  job.status
                )}
              </strong>
            </small>

            <br />

            <small>
              Interes poslan:{" "}
              {formatDate(
                interest.created_at
              )}
            </small>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap"
            }}
          >
            {mode === "open" && (
              <Link
                href="/jobs"
                className="button small"
              >
                Otvori poslove
              </Link>
            )}

            {mode ===
              "completed" &&
              user?.id && (
                <Link
                  href={`/majstor/${user.id}`}
                  className="button secondary small"
                >
                  Pogledaj ocjene
                </Link>
              )}
          </div>
        </div>
      </article>
    );
  }

  if (!supabase) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">
            <h1>
              Pregled
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
              Moj pregled
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
              Moj pregled
            </h1>

            <p>
              Za pregled svojih poslova morate se prvo prijaviti.
            </p>

            <div className="actions">
              <Link
                href="/login"
                className="button"
              >
                Prijava
              </Link>

              <Link
                href="/register"
                className="button secondary"
              >
                Registracija
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
              "20px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1>
            Moj pregled
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

          {unreadCount >
            0 && (
            <div
              style={{
                padding:
                  "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa",
                marginBottom:
                  "14px"
              }}
            >
              <strong>
                🔔 Imate{" "}
                {unreadCount}{" "}
                {unreadCount ===
                1
                  ? "novu obavijest"
                  : "novih obavijesti"}
              </strong>
            </div>
          )}

          <div className="actions">
            <Link
              href="/profile"
              className="button secondary"
            >
              Uredi profil
            </Link>

            <Link
              href="/jobs"
              className="button"
            >
              Poslovi
            </Link>

            {profile?.role ===
              "customer" && (
              <Link
                href="/favoriti"
                className="button secondary"
              >
                Spremljeni majstori
              </Link>
            )}

            <button
              type="button"
              className="button secondary"
              onClick={
                loadDashboard
              }
            >
              Osvježi
            </button>

            {profile?.role ===
              "pro" &&
              user?.id && (
                <Link
                  href={`/majstor/${user.id}`}
                  className="button secondary"
                >
                  Javni profil
                </Link>
              )}
          </div>

          {message && (
            <div
              style={{
                marginTop:
                  "16px",
                padding:
                  "12px",
                borderRadius:
                  "12px",
                background:
                  "#f7f8fa"
              }}
            >
              {message}
            </div>
          )}
        </div>

        <NotificationsSection />

        {profile?.role ===
          "customer" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                marginBottom:
                  "28px"
              }}
            >
              <StatCard
                value={
                  openJobs.length
                }
                label="Otvoreni poslovi"
              />

              <StatCard
                value={
                  assignedJobs.length
                }
                label="Poslovi u tijeku"
              />

              <StatCard
                value={
                  completedJobs.length
                }
                label="Završeni poslovi"
              />

              <StatCard
                value={
                  favoritePros.length
                }
                label="Spremljeni majstori"
              />

              <StatCard
                value={
                  unreadCount
                }
                label="Nove obavijesti"
              />
            </div>

            <section
              style={{
                marginBottom: "30px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "flex-end",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "14px"
                }}
              >
                <div>
                  <span className="eyebrow">
                    Favoriti
                  </span>

                  <h2
                    style={{
                      marginBottom: "4px"
                    }}
                  >
                    Spremljeni majstori
                  </h2>

                  <p
                    className="muted"
                    style={{
                      margin: 0
                    }}
                  >
                    Brzi pristup majstorima koje ste spremili.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap"
                  }}
                >
                  <Link
                    href="/majstori"
                    className="button secondary small"
                  >
                    Pronađi majstora
                  </Link>

                  {favoritePros.length >
                    0 && (
                    <Link
                      href="/favoriti"
                      className="button small"
                    >
                      Svi spremljeni
                    </Link>
                  )}
                </div>
              </div>

              {favoritePros.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "14px"
                  }}
                >
                  {favoritePros
                    .slice(0, 3)
                    .map(
                      pro => (
                        <CustomerFavoriteCard
                          key={
                            pro.user_id
                          }
                          pro={pro}
                        />
                      )
                    )}
                </div>
              ) : (
                <div className="card">
                  <p
                    className="muted"
                    style={{
                      marginBottom: "12px"
                    }}
                  >
                    Još nemate spremljenih majstora.
                  </p>

                  <Link
                    href="/majstori"
                    className="button"
                  >
                    Pregledaj majstore
                  </Link>
                </div>
              )}
            </section>

            <section>
              <span className="eyebrow">
                Za naručitelje
              </span>

              <h2>
                Otvoreni poslovi
              </h2>

              <div className="jobList">
                {openJobs.map(
                  job => (
                    <CustomerJobCard
                      key={
                        job.id
                      }
                      job={
                        job
                      }
                    />
                  )
                )}

                {!openJobs.length && (
                  <div className="card">
                    <p className="muted">
                      Trenutno nemate otvorenih poslova.
                    </p>

                    <Link
                      href="/jobs"
                      className="button"
                    >
                      Objavi posao
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  "30px"
              }}
            >
              <span className="eyebrow">
                Aktivni radovi
              </span>

              <h2>
                Poslovi u tijeku
              </h2>

              <div className="jobList">
                {assignedJobs.map(
                  job => (
                    <CustomerJobCard
                      key={
                        job.id
                      }
                      job={
                        job
                      }
                    />
                  )
                )}

                {!assignedJobs.length && (
                  <div className="card">
                    <p className="muted">
                      Trenutno nemate poslova u tijeku.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  "30px"
              }}
            >
              <span className="eyebrow">
                Povijest poslova
              </span>

              <h2>
                Završeni poslovi
              </h2>

              <div className="jobList">
                {completedJobs.map(
                  job => (
                    <CustomerJobCard
                      key={
                        job.id
                      }
                      job={
                        job
                      }
                    />
                  )
                )}

                {!completedJobs.length && (
                  <div className="card">
                    <p className="muted">
                      Još nemate završenih poslova.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {profile?.role ===
          "pro" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                marginBottom:
                  "28px"
              }}
            >
              <StatCard
                value={
                  openInterests.length
                }
                label="Aktivni interesi"
              />

              <StatCard
                value={
                  assignedToMeInterests.length
                }
                label="Poslovi u tijeku"
              />

              <StatCard
                value={
                  completedForMeInterests.length
                }
                label="Završeni poslovi"
              />

              <StatCard
                value={
                  proReviews.length
                    ? averageRating.toFixed(
                        1
                      )
                    : "–"
                }
                label="Prosječna ocjena"
              />

              <StatCard
                value={
                  proReviews.length
                }
                label="Recenzije"
              />

              <StatCard
                value={
                  unreadCount
                }
                label="Nove obavijesti"
              />
            </div>

            <section
              style={{
                marginBottom:
                  "30px"
              }}
            >
              <span className="eyebrow">
                Moja reputacija
              </span>

              <h2>
                Ocjene naručitelja
              </h2>

              <div className="card">
                {proReviews.length ? (
                  <>
                    <div
                      style={{
                        fontSize:
                          "30px",
                        lineHeight:
                          1,
                        marginBottom:
                          "10px"
                      }}
                    >
                      {renderStars(
                        averageRating
                      )}
                    </div>

                    <p
                      style={{
                        margin:
                          "0 0 6px"
                      }}
                    >
                      <strong>
                        {averageRating.toFixed(
                          1
                        )}
                        /5
                      </strong>
                    </p>

                    <p className="muted">
                      {proReviews.length} recenzija
                    </p>

                    <Link
                      href={`/majstor/${user.id}`}
                      className="button secondary"
                    >
                      Pogledaj javni profil i sve ocjene
                    </Link>
                  </>
                ) : (
                  <>
                    <p>
                      Još nemate ocjena.
                    </p>

                    <p className="muted">
                      Nakon završenog posla naručitelj vas može ocijeniti.
                    </p>

                    <Link
                      href={`/majstor/${user.id}`}
                      className="button secondary"
                    >
                      Pogledaj javni profil
                    </Link>
                  </>
                )}
              </div>
            </section>

            <section>
              <span className="eyebrow">
                Za meštre
              </span>

              <h2>
                Aktivni interesi
              </h2>

              <div className="jobList">
                {openInterests.map(
                  interest => (
                    <ProInterestCard
                      key={
                        interest.id
                      }
                      interest={
                        interest
                      }
                      mode="open"
                    />
                  )
                )}

                {!openInterests.length && (
                  <div className="card">
                    <p>
                      Trenutno nemate aktivnih interesa.
                    </p>

                    <Link
                      href="/jobs"
                      className="button"
                    >
                      Pronađi posao
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  "30px"
              }}
            >
              <span className="eyebrow">
                Aktivni radovi
              </span>

              <h2>
                Poslovi u tijeku
              </h2>

              <div className="jobList">
                {assignedToMeInterests.map(
                  interest => (
                    <ProInterestCard
                      key={
                        interest.id
                      }
                      interest={
                        interest
                      }
                      mode="assigned"
                    />
                  )
                )}

                {!assignedToMeInterests.length && (
                  <div className="card">
                    <p className="muted">
                      Trenutno nemate poslova u tijeku.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  "30px"
              }}
            >
              <span className="eyebrow">
                Povijest
              </span>

              <h2>
                Završeni poslovi
              </h2>

              <div className="jobList">
                {completedForMeInterests.map(
                  interest => (
                    <ProInterestCard
                      key={
                        interest.id
                      }
                      interest={
                        interest
                      }
                      mode="completed"
                    />
                  )
                )}

                {!completedForMeInterests.length && (
                  <div className="card">
                    <p className="muted">
                      Još nemate završenih poslova.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {proReviews.length >
              0 && (
              <section
                style={{
                  marginTop:
                    "30px"
                }}
              >
                <span className="eyebrow">
                  Moje ocjene
                </span>

                <h2>
                  Posljednje recenzije
                </h2>

                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px"
                  }}
                >
                  {proReviews
                    .slice(
                      0,
                      5
                    )
                    .map(
                      review => (
                        <article
                          key={
                            review.id
                          }
                          className="card"
                        >
                          <div
                            style={{
                              fontSize:
                                "24px",
                              lineHeight:
                                1
                            }}
                          >
                            {renderStars(
                              review.rating
                            )}
                          </div>

                          <p
                            style={{
                              margin:
                                "10px 0 6px"
                            }}
                          >
                            <strong>
                              {
                                review.rating
                              }
                              /5
                            </strong>
                          </p>

                          {review.comment && (
                            <p>
                              {
                                review.comment
                              }
                            </p>
                          )}

                          <small className="muted">
                            {formatDate(
                              review.created_at
                            )}
                          </small>
                        </article>
                      )
                    )}
                </div>

                <div
                  style={{
                    marginTop:
                      "14px"
                  }}
                >
                  <Link
                    href={`/majstor/${user.id}`}
                    className="button secondary"
                  >
                    Sve recenzije
                  </Link>
                </div>
              </section>
            )}

            {notSelectedInterests.length >
              0 && (
              <section
                style={{
                  marginTop:
                    "30px"
                }}
              >
                <span className="eyebrow">
                  Ostali interesi
                </span>

                <h2>
                  Odabran je drugi majstor
                </h2>

                <div className="jobList">
                  {notSelectedInterests.map(
                    interest => (
                      <ProInterestCard
                        key={
                          interest.id
                        }
                        interest={
                          interest
                        }
                        mode="not-selected"
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {unavailableInterests.length >
              0 && (
              <section
                style={{
                  marginTop:
                    "30px"
                }}
              >
                <span className="eyebrow">
                  Nedostupno
                </span>

                <h2>
                  Izbrisani ili nedostupni poslovi
                </h2>

                <div className="jobList">
                  {unavailableInterests.map(
                    interest => (
                      <article
                        className="card"
                        key={
                          interest.id
                        }
                        style={{
                          marginBottom:
                            "16px"
                        }}
                      >
                        <h3>
                          Posao više nije dostupan
                        </h3>

                        <p className="muted">
                          Posao za koji ste iskazali interes je izbrisan ili više nije dostupan.
                        </p>

                        <small>
                          Interes poslan:{" "}
                          {formatDate(
                            interest.created_at
                          )}
                        </small>
                      </article>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
