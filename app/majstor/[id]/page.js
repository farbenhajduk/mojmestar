"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function PublicMajstorPage() {
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [hasCompletedJobWithPro, setHasCompletedJobWithPro] = useState(false);

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
    loadPage();
  }, [supabase, params?.id]);

  async function loadPage() {
    if (!supabase || !params?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const {
        data: authData
      } = await supabase.auth.getUser();

      const authUser =
        authData?.user || null;

      setCurrentUser(authUser);

      if (authUser) {
        const {
          data: userProfileData
        } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", authUser.id)
          .maybeSingle();

        setCurrentUserProfile(
          userProfileData || null
        );

        if (
          userProfileData?.role === "customer" &&
          authUser.id !== params.id
        ) {
          const {
            data: completedJob,
            error: completedJobError
          } = await supabase
            .from("jobs")
            .select("id")
            .eq("customer_id", authUser.id)
            .eq("selected_pro_id", params.id)
            .eq("status", "completed")
            .limit(1)
            .maybeSingle();

          if (completedJobError) {
            throw completedJobError;
          }

          setHasCompletedJobWithPro(
            Boolean(completedJob)
          );
        } else {
          setHasCompletedJobWithPro(false);
        }
      } else {
        setCurrentUserProfile(null);
        setHasCompletedJobWithPro(false);
      }

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
        setReviews([]);
        setExistingReview(null);

        setMessage(
          "Profil majstora nije pronađen."
        );

        return;
      }

      await loadReviews();

      if (authUser) {
        await loadExistingReview(
          authUser.id
        );
      } else {
        setExistingReview(null);
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

  async function loadReviews() {
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
        params.id
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

    setReviews(data || []);
  }

  async function loadExistingReview(userId) {
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
        params.id
      )
      .eq(
        "customer_id",
        userId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    setExistingReview(
      data || null
    );
  }

  async function submitReview(e) {
    e.preventDefault();

    if (
      !supabase ||
      !currentUser ||
      reviewSaving ||
      existingReview
    ) {
      return;
    }

    setReviewSaving(true);
    setMessage("");

    try {
      const {
        error
      } = await supabase
        .from("pro_reviews")
        .insert({
          pro_id: params.id,
          customer_id: currentUser.id,
          rating: Number(rating),
          comment:
            comment.trim() ||
            null
        });

      if (error) {
        if (
          error.code === "23505"
        ) {
          setMessage(
            "Već ste ocijenili ovog majstora."
          );

          await loadExistingReview(
            currentUser.id
          );
        } else {
          throw error;
        }

        return;
      }

      setComment("");
      setRating("5");

      setMessage(
        "Hvala! Vaša ocjena je spremljena."
      );

      await loadReviews();

      await loadExistingReview(
        currentUser.id
      );
    } catch (err) {
      console.error(err);

      setMessage(
        err?.message ||
          "Ocjena se nije mogla spremiti."
      );
    } finally {
      setReviewSaving(false);
    }
  }

  const averageRating =
    useMemo(() => {
      if (!reviews.length) {
        return 0;
      }

      const total =
        reviews.reduce(
          (sum, review) =>
            sum +
            Number(
              review.rating || 0
            ),
          0
        );

      return total / reviews.length;
    }, [reviews]);

  function renderStars(value) {
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

  function formatDate(value) {
    if (!value) {
      return "";
    }

    try {
     
