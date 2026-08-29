"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { dedupeNotifications } from "../../lib/notifications";

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

  const [showAllNotifications, setShowAllNotifications] =
    useState(false);

  const [showCompleted, setShowCompleted] =
    useState(false);

  const [showOldInterests, setShowOldInterests] =
    useState(false);

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
        data: authData
      } = await supabase.auth.getSession();

      const authUser =
        authData?.session?.user || null;

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

        setMyInterests([]);
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

        setMyJobs([]);
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
      dedupeNotifications(
        data || []
      )
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
      const notification =
        notifications.find(
          item =>
            item.id === notificationId
        );

      const notificationIds =
        notification?.duplicateIds?.length
          ? notification.duplicateIds
          : [notificationId];

      const {
        error
      } = await supabase
        .from("notifications")
        .update({
          is_read: true
        })
        .in(
          "id",
          notificationIds
        );

      if (error) {
        throw error;
      }

      setNotifications(
        current =>
          current.map(
            notification =>
              notificationIds.includes(
                notification.id
              )
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
      setNotificationLoading("");
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
      setNotificationLoading("");
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

    if (notification.href) {
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

    if (!interestRows.length) {
      setMyInterests([]);
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
      setActionLoading("");
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
    if (status === "open") {
      return "Aktivan";
    }

    if (status === "assigned") {
      return "U tijeku";
    }

    if (status === "completed") {
      return "Završen";
    }

    return (
      status ||
      "Nepoznato"
    );
  }

  function notificationIcon(
    type
  ) {
    if (type === "new_interest") {
      return "👷";
    }

    if (type === "job_assigned") {
      return "✅";
    }

    if (type === "job_completed") {
      return "🏁";
    }

    if (type === "new_review") {
      return "★";
    }

    return "●";
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

  const openInterests =
    useMemo(
      () =>
        myInterests.filter(
          interest =>
            interest.job &&
            interest.job.status ===
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
            interest.job.status ===
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
            interest.job.status ===
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
              interest.job.status ===
                "assigned" ||
              interest.job.status ===
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
    useMemo(() => {
      if (!proReviews.length) {
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
    }, [proReviews]);

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          notification =>
            !notification.is_read
        ).length,
      [notifications]
    );

  const visibleNotifications =
    showAllNotifications
      ? notifications
      : notifications.slice(
          0,
          3
        );

  function SummaryItem({
    value,
    label
  }) {
    return (
      <div
        style={{
          minWidth: "95px"
        }}
      >
        <strong
          style={{
            fontSize: "22px"
          }}
        >
          {value}
        </strong>

        <div
          className="muted"
          style={{
            fontSize: "13px",
            marginTop: "2px"
          }}
        >
          {label}
        </div>
      </div>
    );
  }

  function NotificationsSection() {
    if (!notifications.length) {
      return null;
    }

    return (
      <section
        style={{
          marginBottom: "28px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "12px"
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
              Novosti
              {unreadCount > 0
                ? ` · ${unreadCount}`
                : ""}
            </h2>
          </div>

          {unreadCount > 0 && (
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
                : "Sve pročitano"}
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gap: "8px"
          }}
        >
          {visibleNotifications.map(
            notification => (
              <article
                key={
                  notification.id
                }
                className="card"
                style={{
                  padding: "12px",
                  display: "flex",
                  gap: "10px",
                  alignItems:
                    "flex-start"
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    lineHeight: 1.4
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
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "8px"
                    }}
                  >
                    <strong>
                      {notification.title}
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
                          "4px 0"
                      }}
                    >
                      {notification.message}
                    </p>
                  )}

                  <small className="muted">
                    {formatDateTime(
                      notification.created_at
                    )}
                  </small>

                  <div
                    style={{
                      display: "flex",
                      gap: "7px",
                      flexWrap: "wrap",
                      marginTop: "8px"
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
                        Otvori
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
                        Pročitano
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          )}
        </div>

        {notifications.length > 3 && (
          <button
            type="button"
            className="button secondary small"
            style={{
              marginTop: "10px"
            }}
            onClick={() =>
              setShowAllNotifications(
                current =>
                  !current
              )
            }
          >
            {showAllNotifications
              ? "Prikaži manje"
              : `Prikaži sve (${notifications.length})`}
          </button>
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
          padding: "14px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "10px",
            alignItems:
              "flex-start"
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems:
                  "center",
                flexWrap: "wrap"
              }}
            >
              <h3
                style={{
                  margin: 0
                }}
              >
                {pro.company_name ||
                  "Majstor"}
              </h3>

              {pro.verified && (
                <span className="badge">
                  ✓
                </span>
              )}
            </div>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0"
              }}
            >
              {favoriteLocationText(
                pro
              )}
            </p>
          </div>

          <small>
            {reviewCount
              ? `${average.toFixed(1)} ★`
              : "Bez ocjena"}
          </small>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "12px"
          }}
        >
          <Link
            href={`/majstor/${pro.user_id}`}
            className="button small"
          >
            Profil
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
          padding: "14px"
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
            {statusLabel(
              job.status
            )}
          </span>
        </div>

        <h3
          style={{
            marginBottom: "6px"
          }}
        >
          {job.city}
          {job.zip
            ? ` · ${job.zip}`
            : ""}
        </h3>

        <p
          style={{
            marginTop: 0
          }}
        >
          {job.description}
        </p>

        <small className="muted">
          {formatDate(
            job.created_at
          )}
        </small>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "12px"
          }}
        >
          {job.status ===
            "open" && (
            <Link
              href="/jobs"
              className="button small"
            >
              Otvori
            </Link>
          )}

          {isAssigned &&
            job.selected_pro_id && (
              <>
                <Link
                  href={`/majstor/${job.selected_pro_id}`}
                  className="button secondary small"
                >
                  Profil
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
                    ? "Spremam..."
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
                  Ocijeni
                </Link>

                <Link
                  href={`/majstor/${job.selected_pro_id}`}
                  className="button secondary small"
                >
                  Profil
                </Link>
              </>
            )}
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

    return (
      <article
        className="card"
        style={{
          padding: "14px"
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
            {statusLabel(
              job.status
            )}
          </span>
        </div>

        <h3
          style={{
            marginBottom: "6px"
          }}
        >
          {job.city}
          {job.zip
            ? ` · ${job.zip}`
            : ""}
        </h3>

        <p
          style={{
            marginTop: 0
          }}
        >
          {job.description}
        </p>

        {mode === "assigned" && (
          <strong>
            ✓ Odabrani ste za ovaj posao
          </strong>
        )}

        {mode === "not-selected" && (
          <p className="muted">
            Odabran je drugi majstor.
          </p>
        )}

        {interest.message && (
          <p
            className="muted"
            style={{
              marginBottom: 0
            }}
          >
            Vaša poruka:{" "}
            {interest.message}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "10px",
            alignItems:
              "center",
            flexWrap: "wrap",
            marginTop: "12px"
          }}
        >
          <small className="muted">
            {formatDate(
              interest.created_at
            )}
          </small>

          {mode === "open" && (
            <Link
              href="/jobs"
              className="button small"
            >
              Poslovi
            </Link>
          )}
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
              Moj pregled
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
              Za pregled svojih poslova prvo se prijavite.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap"
              }}
            >
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
        <section
          className="card"
          style={{
            marginBottom: "24px",
            padding: "18px"
          }}
        >
          <span className="eyebrow">
            MOJMEŠTAR
          </span>

          <h1
            style={{
              marginBottom: "6px"
            }}
          >
            Moj pregled
          </h1>

          <p
            className="muted"
            style={{
              marginTop: 0,
              marginBottom: "14px"
            }}
          >
            {profile?.role === "pro"
              ? "Majstor"
              : "Naručitelj"}
            {" · "}
            {user.email}
          </p>

          {profile?.role ===
            "customer" && (
            <div
              style={{
                display: "flex",
                gap: "22px",
                flexWrap: "wrap",
                marginBottom: "16px"
              }}
            >
              <SummaryItem
                value={
                  openJobs.length
                }
                label="Otvoreni"
              />

              <SummaryItem
                value={
                  assignedJobs.length
                }
                label="U tijeku"
              />

              <SummaryItem
                value={
                  favoritePros.length
                }
                label="Spremljeni"
              />

              {unreadCount > 0 && (
                <SummaryItem
                  value={
                    unreadCount
                  }
                  label="Novo"
                />
              )}
            </div>
          )}

          {profile?.role ===
            "pro" && (
            <div
              style={{
                display: "flex",
                gap: "22px",
                flexWrap: "wrap",
                marginBottom: "16px"
              }}
            >
              <SummaryItem
                value={
                  openInterests.length
                }
                label="Interesi"
              />

              <SummaryItem
                value={
                  assignedToMeInterests.length
                }
                label="U tijeku"
              />

              <SummaryItem
                value={
                  proReviews.length
                    ? averageRating.toFixed(
                        1
                      )
                    : "–"
                }
                label="Ocjena"
              />

              {unreadCount > 0 && (
                <SummaryItem
                  value={
                    unreadCount
                  }
                  label="Novo"
                />
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
              href="/jobs"
              className="button"
            >
              {profile?.role === "pro"
                ? "Pronađi posao"
                : "Poslovi"}
            </Link>

            {profile?.role ===
              "customer" && (
              <Link
                href="/majstori"
                className="button secondary"
              >
                Pronađi majstora
              </Link>
            )}

            <Link
              href="/profile"
              className="button secondary"
            >
              Uredi profil
            </Link>

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
                marginTop: "14px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: "#f7f8fa"
              }}
            >
              {message}
            </div>
          )}
        </section>

        <NotificationsSection />

        {profile?.role ===
          "customer" && (
          <>
            <section
              style={{
                marginBottom: "28px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <span className="eyebrow">
                    Poslovi
                  </span>

                  <h2
                    style={{
                      marginBottom: 0
                    }}
                  >
                    Aktivno
                  </h2>
                </div>

                <Link
                  href="/jobs"
                  className="button secondary small"
                >
                  Svi poslovi
                </Link>
              </div>

              {assignedJobs.length >
              0 && (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginBottom: "16px"
                  }}
                >
                  {assignedJobs.map(
                    job => (
                      <CustomerJobCard
                        key={
                          job.id
                        }
                        job={job}
                      />
                    )
                  )}
                </div>
              )}

              {openJobs.length >
              0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: "10px"
                  }}
                >
                  {openJobs.map(
                    job => (
                      <CustomerJobCard
                        key={
                          job.id
                        }
                        job={job}
                      />
                    )
                  )}
                </div>
              ) : (
                assignedJobs.length ===
                  0 && (
                  <div className="card">
                    <p
                      className="muted"
                      style={{
                        marginTop: 0
                      }}
                    >
                      Trenutno nemate aktivnih poslova.
                    </p>

                    <Link
                      href="/jobs"
                      className="button"
                    >
                      Objavi posao
                    </Link>
                  </div>
                )
              )}
            </section>

            <section
              style={{
                marginBottom: "28px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <span className="eyebrow">
                    Favoriti
                  </span>

                  <h2
                    style={{
                      marginBottom: 0
                    }}
                  >
                    Spremljeni majstori
                  </h2>
                </div>

                <Link
                  href="/favoriti"
                  className="button secondary small"
                >
                  Prikaži sve
                </Link>
              </div>

              {favoritePros.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "10px"
                  }}
                >
                  {favoritePros
                    .slice(0, 2)
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
                      marginTop: 0
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

            {completedJobs.length >
              0 && (
              <section>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setShowCompleted(
                      current =>
                        !current
                    )
                  }
                >
                  {showCompleted
                    ? "Sakrij završene poslove"
                    : `Završeni poslovi (${completedJobs.length})`}
                </button>

                {showCompleted && (
                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                      marginTop: "12px"
                    }}
                  >
                    {completedJobs.map(
                      job => (
                        <CustomerJobCard
                          key={
                            job.id
                          }
                          job={job}
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {profile?.role ===
          "pro" && (
          <>
            <section
              style={{
                marginBottom: "28px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <span className="eyebrow">
                    Poslovi
                  </span>

                  <h2
                    style={{
                      marginBottom: 0
                    }}
                  >
                    Aktivno
                  </h2>
                </div>

                <Link
                  href="/jobs"
                  className="button secondary small"
                >
                  Pronađi posao
                </Link>
              </div>

              {assignedToMeInterests.length >
              0 && (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginBottom: "16px"
                  }}
                >
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
                </div>
              )}

              {openInterests.length >
              0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: "10px"
                  }}
                >
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
                </div>
              ) : (
                assignedToMeInterests.length ===
                  0 && (
                  <div className="card">
                    <p
                      className="muted"
                      style={{
                        marginTop: 0
                      }}
                    >
                      Trenutno nemate aktivnih interesa ili poslova.
                    </p>

                    <Link
                      href="/jobs"
                      className="button"
                    >
                      Pronađi posao
                    </Link>
                  </div>
                )
              )}
            </section>

            <section
              style={{
                marginBottom: "28px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <span className="eyebrow">
                    Reputacija
                  </span>

                  <h2
                    style={{
                      marginBottom: 0
                    }}
                  >
                    Ocjene
                  </h2>
                </div>

                {user?.id && (
                  <Link
                    href={`/majstor/${user.id}`}
                    className="button secondary small"
                  >
                    Sve ocjene
                  </Link>
                )}
              </div>

              <div
                className="card"
                style={{
                  padding: "16px"
                }}
              >
                {proReviews.length ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "12px",
                        flexWrap: "wrap"
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "28px"
                        }}
                      >
                        {averageRating.toFixed(
                          1
                        )}
                      </strong>

                      <span>
                        {renderStars(
                          averageRating
                        )}
                      </span>

                      <span className="muted">
                        {proReviews.length}{" "}
                        recenzija
                      </span>
                    </div>

                    {proReviews[0] && (
                      <div
                        style={{
                          marginTop: "12px"
                        }}
                      >
                        {proReviews[0]
                          .comment && (
                          <p
                            style={{
                              marginBottom:
                                "5px"
                            }}
                          >
                            {
                              proReviews[0]
                                .comment
                            }
                          </p>
                        )}

                        <small className="muted">
                          Posljednja recenzija ·{" "}
                          {formatDate(
                            proReviews[0]
                              .created_at
                          )}
                        </small>
                      </div>
                    )}
                  </>
                ) : (
                  <p
                    className="muted"
                    style={{
                      margin: 0
                    }}
                  >
                    Još nemate ocjena.
                  </p>
                )}
              </div>
            </section>

            {(completedForMeInterests.length >
              0 ||
              notSelectedInterests.length >
                0 ||
              unavailableInterests.length >
                0) && (
              <section>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setShowOldInterests(
                      current =>
                        !current
                    )
                  }
                >
                  {showOldInterests
                    ? "Sakrij povijest"
                    : "Prikaži povijest"}
                </button>

                {showOldInterests && (
                  <div
                    style={{
                      marginTop: "14px",
                      display: "grid",
                      gap: "18px"
                    }}
                  >
                    {completedForMeInterests.length >
                      0 && (
                      <div>
                        <h3>
                          Završeni poslovi
                        </h3>

                        <div
                          style={{
                            display: "grid",
                            gap: "10px"
                          }}
                        >
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
                        </div>
                      </div>
                    )}

                    {notSelectedInterests.length >
                      0 && (
                      <div>
                        <h3>
                          Odabran drugi majstor
                        </h3>

                        <div
                          style={{
                            display: "grid",
                            gap: "10px"
                          }}
                        >
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
                      </div>
                    )}

                    {unavailableInterests.length >
                      0 && (
                      <div>
                        <h3>
                          Nedostupni poslovi
                        </h3>

                        <div
                          style={{
                            display: "grid",
                            gap: "10px"
                          }}
                        >
                          {unavailableInterests.map(
                            interest => (
                              <article
                                key={
                                  interest.id
                                }
                                className="card"
                                style={{
                                  padding:
                                    "14px"
                                }}
                              >
                                <strong>
                                  Posao više nije dostupan
                                </strong>

                                <p
                                  className="muted"
                                  style={{
                                    marginBottom:
                                      "5px"
                                  }}
                                >
                                  Posao je izbrisan ili više nije dostupan.
                                </p>

                                <small className="muted">
                                  {formatDate(
                                    interest.created_at
                                  )}
                                </small>
                              </article>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
