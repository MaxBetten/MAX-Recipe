"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const FAMILY_MEMBERS_KEY = "cookbook-family-members";
const ACTIVE_USER_KEY = "cookbook-active-user";

function getLocalFamily() {
  try { return JSON.parse(localStorage.getItem(FAMILY_MEMBERS_KEY)) || []; } catch { return []; }
}
function setLocalFamily(members) {
  localStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(members));
}
function getLocalUser() {
  return localStorage.getItem(ACTIVE_USER_KEY) || "";
}
function setLocalUser(name) {
  localStorage.setItem(ACTIVE_USER_KEY, name);
}

// ─── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 22, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: "inline-flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            cursor: readonly ? "default" : "pointer",
            fontSize: `${size}px`,
            color: star <= (hover || value) ? "#d4a017" : "#ddd5c8",
            transition: "color 0.15s",
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Average Rating Display ──────────────────────────────────────────────────
function AvgRating({ reviews }) {
  if (!reviews || reviews.length === 0) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <StarRating value={Math.round(avg)} readonly size={14} />
      <span style={{ fontSize: "12px", color: "#a89d8f" }}>
        ({avg.toFixed(1)}) · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
      </span>
    </span>
  );
}

// ─── Tag pill ────────────────────────────────────────────────────────────────
function Tag({ label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: "100px",
        border: active ? "1.5px solid #2d5a27" : "1px solid #c8bfb0",
        background: active ? "#2d5a27" : "transparent",
        color: active ? "#faf6f0" : "#5c5347",
        fontSize: "13px",
        fontFamily: "'Source Serif 4', Georgia, serif",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Review Item ─────────────────────────────────────────────────────────────
function ReviewItem({ review, onDelete, activeUser }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid #f0ebe2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#2d5a27",
              color: "#faf6f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {review.author[0]?.toUpperCase()}
          </span>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#2c2520" }}>{review.author}</span>
          <StarRating value={review.rating} readonly size={14} />
        </div>
        {review.author === activeUser && (
          <button
            onClick={() => onDelete(review.id)}
            style={{
              background: "none",
              border: "none",
              color: "#c8bfb0",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        )}
      </div>
      {review.comment && (
        <p style={{ margin: "8px 0 0 38px", fontSize: "14px", color: "#5c5347", lineHeight: 1.5 }}>
          {review.comment}
        </p>
      )}
      <div style={{ margin: "4px 0 0 38px", fontSize: "11px", color: "#b8ad9c" }}>
        {new Date(review.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ─── Recipe card ─────────────────────────────────────────────────────────────
function RecipeCard({ recipe, reviews, onDelete, onAddReview, onDeleteReview, searchTerm, activeUser }) {
  const [expanded, setExpanded] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const recipeReviews = reviews.filter((r) => r.recipe_id === recipe.id);

  function highlight(text) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ background: "#e8d44d", borderRadius: "2px", padding: "0 1px" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  async function handleSubmitReview() {
    if (!rating) return alert("Please select a rating.");
    if (!activeUser) return alert("Please select your name first (top of page).");
    setSubmitting(true);
    await onAddReview(recipe.id, { author: activeUser, rating, comment: comment.trim() });
    setRating(0);
    setComment("");
    setShowReviewForm(false);
    setSubmitting(false);
  }

  return (
    <div
      style={{
        background: "#fffcf7",
        border: "1px solid #ddd5c8",
        borderRadius: "8px",
        padding: "20px 24px",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#2c2520", lineHeight: 1.3 }}>
              {highlight(recipe.title)}
            </h3>
            <div style={{ marginTop: "4px", fontSize: "14px", color: "#8a7e70", fontStyle: "italic" }}>
              {highlight(recipe.cookbook)} · p. {recipe.page}
            </div>
            <div style={{ marginTop: "6px" }}>
              <AvgRating reviews={recipeReviews} />
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Remove this recipe?")) onDelete(recipe.id);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#c8bfb0",
              cursor: "pointer",
              fontSize: "18px",
              padding: "0 4px",
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Delete recipe"
          >
            ×
          </button>
        </div>
        <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {(expanded ? recipe.ingredients : recipe.ingredients.slice(0, 6)).map((ing, i) => (
            <span
              key={i}
              style={{
                padding: "3px 10px",
                background: "#f3ede3",
                borderRadius: "100px",
                fontSize: "12px",
                color: "#6b5f52",
                whiteSpace: "nowrap",
              }}
            >
              {highlight(ing)}
            </span>
          ))}
          {!expanded && recipe.ingredients.length > 6 && (
            <span style={{ padding: "3px 10px", fontSize: "12px", color: "#a89d8f" }}>
              +{recipe.ingredients.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Expanded: Reviews section */}
      {expanded && (
        <div style={{ marginTop: "16px", borderTop: "1px solid #f0ebe2", paddingTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#5c5347" }}>
              Reviews {recipeReviews.length > 0 && `(${recipeReviews.length})`}
            </span>
            {!showReviewForm && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReviewForm(true);
                }}
                style={{
                  padding: "5px 14px",
                  background: "none",
                  border: "1px solid #2d5a27",
                  borderRadius: "6px",
                  color: "#2d5a27",
                  fontSize: "13px",
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  cursor: "pointer",
                }}
              >
                + Add Review
              </button>
            )}
          </div>

          {/* Review form */}
          {showReviewForm && (
            <div
              style={{
                padding: "16px",
                background: "#f8f4ed",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {!activeUser && (
                <div style={{ fontSize: "13px", color: "#c0392b", marginBottom: "8px" }}>
                  ⚠ Select your name at the top of the page first
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#5c5347", marginBottom: "6px" }}>
                  Rating
                </label>
                <StarRating value={rating} onChange={setRating} size={28} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#5c5347", marginBottom: "6px" }}>
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was it? Any tips for next time?"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid #ddd5c8",
                    borderRadius: "8px",
                    background: "#fffcf7",
                    fontSize: "14px",
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    color: "#2c2520",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSubmitReview}
                  disabled={!rating || !activeUser || submitting}
                  style={{
                    padding: "8px 20px",
                    background: rating && activeUser ? "#2d5a27" : "#c8bfb0",
                    color: "#faf6f0",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    cursor: rating && activeUser ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Saving…" : "Submit"}
                </button>
                <button
                  onClick={() => { setShowReviewForm(false); setRating(0); setComment(""); }}
                  style={{
                    padding: "8px 16px",
                    background: "none",
                    border: "1px solid #c8bfb0",
                    borderRadius: "6px",
                    color: "#8a7e70",
                    fontSize: "14px",
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing reviews */}
          {recipeReviews.length === 0 && !showReviewForm && (
            <div style={{ fontSize: "13px", color: "#a89d8f", fontStyle: "italic", padding: "8px 0" }}>
              No reviews yet — be the first!
            </div>
          )}
          {recipeReviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              activeUser={activeUser}
              onDelete={(id) => onDeleteReview(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main app ────────────────────────────────────────────────────────────────
export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("search");
  const [search, setSearch] = useState("");
  const [cookbookFilter, setCookbookFilter] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [cookbook, setCookbook] = useState("");
  const [page, setPage] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");
  const [addMode, setAddMode] = useState("photo");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  // Family member state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activeUser, setActiveUser] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [showFamilySetup, setShowFamilySetup] = useState(false);

  // Load family from localStorage
  useEffect(() => {
    const members = getLocalFamily();
    setFamilyMembers(members);
    setActiveUser(getLocalUser());
    if (members.length === 0) setShowFamilySetup(true);
  }, []);

  // Load recipes & reviews from Supabase
  async function loadData() {
    const [recipesRes, reviewsRes] = await Promise.all([
      supabase.from("recipes").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: true }),
    ]);
    if (recipesRes.data) setRecipes(recipesRes.data);
    if (reviewsRes.data) setReviews(reviewsRes.data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const cookbooks = [...new Set(recipes.map((r) => r.cookbook))].sort();

  const filtered = recipes.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      r.title.toLowerCase().includes(term) ||
      r.cookbook.toLowerCase().includes(term) ||
      r.ingredients.some((ing) => ing.toLowerCase().includes(term));
    const matchesCookbook = !cookbookFilter || r.cookbook === cookbookFilter;
    return matchesSearch && matchesCookbook;
  });

  // Family member management
  function addFamilyMember() {
    const name = newMemberName.trim();
    if (!name || familyMembers.includes(name)) return;
    const updated = [...familyMembers, name];
    setFamilyMembers(updated);
    setLocalFamily(updated);
    setNewMemberName("");
    if (!activeUser) {
      setActiveUser(name);
      setLocalUser(name);
    }
  }

  function removeFamilyMember(name) {
    const updated = familyMembers.filter((m) => m !== name);
    setFamilyMembers(updated);
    setLocalFamily(updated);
    if (activeUser === name) {
      setActiveUser(updated[0] || "");
      setLocalUser(updated[0] || "");
    }
  }

  function switchUser(name) {
    setActiveUser(name);
    setLocalUser(name);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtracted(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Data: base64, mediaType }),
        });
        const result = await res.json();
        if (result && result.title) {
          setExtracted(result);
        } else {
          alert("Couldn't extract a recipe from that image. Try a clearer photo or enter manually.");
        }
      } catch {
        alert("Error extracting recipe. Please try again.");
      }
      setExtracting(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const title = addMode === "photo" ? extracted?.title : manualTitle.trim();
    const ingredients =
      addMode === "photo"
        ? extracted?.ingredients || []
        : manualIngredients.split("\n").map((s) => s.trim()).filter(Boolean);

    if (!title) return alert("Please provide a recipe title.");
    if (!cookbook.trim()) return alert("Please enter the cookbook name.");
    if (!page.trim()) return alert("Please enter the page number.");

    setSaving(true);
    const { error } = await supabase.from("recipes").insert({
      title,
      cookbook: cookbook.trim(),
      page: page.trim(),
      ingredients,
    });

    if (error) {
      alert("Error saving recipe. Please try again.");
    } else {
      setExtracted(null);
      setCookbook("");
      setPage("");
      setManualTitle("");
      setManualIngredients("");
      if (fileRef.current) fileRef.current.value = "";
      await loadData();
      setView("search");
    }
    setSaving(false);
  }

  async function handleDeleteRecipe(id) {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (!error) {
      setRecipes(recipes.filter((r) => r.id !== id));
      setReviews(reviews.filter((r) => r.recipe_id !== id));
    }
  }

  async function handleAddReview(recipeId, { author, rating, comment }) {
    const { data, error } = await supabase
      .from("reviews")
      .insert({ recipe_id: recipeId, author, rating, comment: comment || null })
      .select()
      .single();
    if (!error && data) {
      setReviews([...reviews, data]);
    }
  }

  async function handleDeleteReview(reviewId) {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (!error) {
      setReviews(reviews.filter((r) => r.id !== reviewId));
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7e70" }}>
        Loading your cookbook index…
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #ddd5c8",
    borderRadius: "8px",
    background: "#fffcf7",
    fontSize: "15px",
    fontFamily: "'Source Serif 4', Georgia, serif",
    color: "#2c2520",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#5c5347",
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ padding: "32px 24px 0", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 700, color: "#2c2520", letterSpacing: "-0.5px" }}>
            📖 Cookbook Index
          </h1>
          <span style={{ fontSize: "14px", color: "#a89d8f" }}>
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Active user selector */}
        <div
          style={{
            marginTop: "16px",
            padding: "10px 16px",
            background: "#f3ede3",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "13px", color: "#6b5f52", whiteSpace: "nowrap" }}>Logged in as:</span>
          {familyMembers.map((name) => (
            <button
              key={name}
              onClick={() => switchUser(name)}
              style={{
                padding: "4px 12px",
                borderRadius: "100px",
                border: activeUser === name ? "1.5px solid #2d5a27" : "1px solid #c8bfb0",
                background: activeUser === name ? "#2d5a27" : "#fffcf7",
                color: activeUser === name ? "#faf6f0" : "#5c5347",
                fontSize: "13px",
                fontFamily: "'Source Serif 4', Georgia, serif",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {name}
            </button>
          ))}
          <button
            onClick={() => setShowFamilySetup(!showFamilySetup)}
            style={{
              padding: "4px 10px",
              borderRadius: "100px",
              border: "1px dashed #c8bfb0",
              background: "transparent",
              color: "#8a7e70",
              fontSize: "13px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              cursor: "pointer",
            }}
          >
            {showFamilySetup ? "Done" : "+ Add"}
          </button>
        </div>

        {/* Family setup */}
        {showFamilySetup && (
          <div
            style={{
              marginTop: "8px",
              padding: "14px 16px",
              background: "#fffcf7",
              border: "1px solid #ddd5c8",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: familyMembers.length > 0 ? "12px" : 0 }}>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFamilyMember()}
                placeholder="Enter a name…"
                style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: "14px" }}
              />
              <button
                onClick={addFamilyMember}
                disabled={!newMemberName.trim()}
                style={{
                  padding: "8px 16px",
                  background: newMemberName.trim() ? "#2d5a27" : "#c8bfb0",
                  color: "#faf6f0",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  cursor: newMemberName.trim() ? "pointer" : "not-allowed",
                }}
              >
                Add
              </button>
            </div>
            {familyMembers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {familyMembers.map((name) => (
                  <span
                    key={name}
                    style={{
                      padding: "3px 10px",
                      background: "#f3ede3",
                      borderRadius: "100px",
                      fontSize: "12px",
                      color: "#6b5f52",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {name}
                    <button
                      onClick={() => removeFamilyMember(name)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#b8ad9c",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 0, marginTop: "20px", borderBottom: "1.5px solid #ddd5c8" }}>
          {["search", "add"].map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              style={{
                padding: "10px 20px",
                background: "none",
                border: "none",
                borderBottom: view === tab ? "2.5px solid #2d5a27" : "2.5px solid transparent",
                color: view === tab ? "#2d5a27" : "#8a7e70",
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "15px",
                fontWeight: view === tab ? 600 : 400,
                cursor: "pointer",
                marginBottom: "-1.5px",
                transition: "all 0.2s",
              }}
            >
              {tab === "search" ? "Search Recipes" : "Add Recipe"}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px 60px" }}>
        {/* SEARCH VIEW */}
        {view === "search" && (
          <div>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="Search by recipe, ingredient, or cookbook…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, padding: "14px 18px 14px 44px", borderRadius: "10px", fontSize: "16px" }}
                onFocus={(e) => (e.target.style.borderColor = "#2d5a27")}
                onBlur={(e) => (e.target.style.borderColor = "#ddd5c8")}
              />
              <span
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "#b8ad9c",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
            </div>

            {cookbooks.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                <Tag label="All Cookbooks" onClick={() => setCookbookFilter("")} active={!cookbookFilter} />
                {cookbooks.map((cb) => (
                  <Tag key={cb} label={cb} onClick={() => setCookbookFilter(cookbookFilter === cb ? "" : cb)} active={cookbookFilter === cb} />
                ))}
              </div>
            )}

            {recipes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#a89d8f" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
                <p style={{ fontSize: "18px", margin: "0 0 8px" }}>Your cookbook index is empty</p>
                <p style={{ fontSize: "14px", margin: 0 }}>
                  Switch to <strong>Add Recipe</strong> to start cataloging your cookbooks.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#a89d8f", fontSize: "15px" }}>
                No recipes match &ldquo;{search}&rdquo;{cookbookFilter ? ` in ${cookbookFilter}` : ""}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "13px", color: "#a89d8f", marginBottom: "4px" }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  {search && ` for "${search}"`}
                  {cookbookFilter && ` in ${cookbookFilter}`}
                </div>
                {filtered.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    reviews={reviews}
                    onDelete={handleDeleteRecipe}
                    onAddReview={handleAddReview}
                    onDeleteReview={handleDeleteReview}
                    searchTerm={search}
                    activeUser={activeUser}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD VIEW */}
        {view === "add" && (
          <div style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", gap: 0, marginBottom: "24px", background: "#f3ede3", borderRadius: "8px", padding: "3px" }}>
              {[
                { key: "photo", label: "📷 Photo Extract" },
                { key: "manual", label: "✏️ Manual Entry" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setAddMode(m.key); setExtracted(null); }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    borderRadius: "6px",
                    background: addMode === m.key ? "#fffcf7" : "transparent",
                    boxShadow: addMode === m.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    color: addMode === m.key ? "#2c2520" : "#8a7e70",
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontSize: "14px",
                    fontWeight: addMode === m.key ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {addMode === "photo" && (
              <div>
                <label style={labelStyle}>Photograph a cookbook page</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFileUpload}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1.5px dashed #c8bfb0",
                    borderRadius: "8px",
                    background: "#fffcf7",
                    fontSize: "14px",
                    color: "#5c5347",
                    boxSizing: "border-box",
                  }}
                />
                {extracting && (
                  <div style={{ marginTop: "16px", padding: "20px", background: "#f3ede3", borderRadius: "8px", textAlign: "center", color: "#6b5f52", fontSize: "15px" }}>
                    <div style={{ display: "inline-block", animation: "spin 1s linear infinite", marginBottom: "8px", fontSize: "24px" }}>⏳</div>
                    <div>Extracting recipe with AI…</div>
                  </div>
                )}
                {extracted && (
                  <div style={{ marginTop: "16px", padding: "16px 20px", background: "#edf5eb", border: "1px solid #b8d4b0", borderRadius: "8px" }}>
                    <div style={{ fontSize: "13px", color: "#4a7a42", fontWeight: 600, marginBottom: "6px" }}>✓ Extracted successfully</div>
                    <div style={{ fontSize: "17px", fontWeight: 600, color: "#2c2520" }}>{extracted.title}</div>
                    <div style={{ fontSize: "13px", color: "#6b5f52", marginTop: "6px" }}>{extracted.ingredients.length} ingredients found</div>
                  </div>
                )}
              </div>
            )}

            {addMode === "manual" && (
              <div>
                <label style={labelStyle}>Recipe Title</label>
                <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="e.g. Chicken Tikka Masala" style={{ ...inputStyle, marginBottom: "16px" }} />
                <label style={labelStyle}>Ingredients (one per line)</label>
                <textarea
                  value={manualIngredients}
                  onChange={(e) => setManualIngredients(e.target.value)}
                  placeholder={"1 lb chicken thighs\n1 can coconut milk\n2 tsp garam masala\n..."}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Cookbook</label>
                <input
                  type="text"
                  value={cookbook}
                  onChange={(e) => setCookbook(e.target.value)}
                  list="cookbook-suggestions"
                  placeholder="e.g. Salt Fat Acid Heat"
                  style={inputStyle}
                />
                <datalist id="cookbook-suggestions">
                  {cookbooks.map((cb) => <option key={cb} value={cb} />)}
                </datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Page #</label>
                <input type="text" value={page} onChange={(e) => setPage(e.target.value)} placeholder="42" style={inputStyle} />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || (addMode === "photo" ? !extracted : !manualTitle.trim())}
              style={{
                marginTop: "24px",
                width: "100%",
                padding: "14px",
                background: (addMode === "photo" ? extracted : manualTitle.trim()) && !saving ? "#2d5a27" : "#c8bfb0",
                color: "#faf6f0",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                fontFamily: "'Source Serif 4', Georgia, serif",
                cursor: (addMode === "photo" ? extracted : manualTitle.trim()) && !saving ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving…" : "Save to Index"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
