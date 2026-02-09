"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

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

function RecipeCard({ recipe, onDelete, searchTerm }) {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div
      style={{
        background: "#fffcf7",
        border: "1px solid #ddd5c8",
        borderRadius: "8px",
        padding: "20px 24px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#b8ad9c";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#ddd5c8";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#2c2520", lineHeight: 1.3 }}>
            {highlight(recipe.title)}
          </h3>
          <div style={{ marginTop: "6px", fontSize: "14px", color: "#8a7e70", fontStyle: "italic" }}>
            {highlight(recipe.cookbook)} · p. {recipe.page}
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
  );
}

export default function Home() {
  const [recipes, setRecipes] = useState([]);
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

  // Load recipes from Supabase
  async function loadRecipes() {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRecipes(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRecipes();
  }, []);

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
      console.error(error);
    } else {
      setExtracted(null);
      setCookbook("");
      setPage("");
      setManualTitle("");
      setManualIngredients("");
      if (fileRef.current) fileRef.current.value = "";
      await loadRecipes();
      setView("search");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (!error) setRecipes(recipes.filter((r) => r.id !== id));
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
      <header style={{ padding: "32px 24px 24px", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 700, color: "#2c2520", letterSpacing: "-0.5px" }}>
            📖 Cookbook Index
          </h1>
          <span style={{ fontSize: "14px", color: "#a89d8f" }}>
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ display: "flex", gap: 0, marginTop: "24px", borderBottom: "1.5px solid #ddd5c8" }}>
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
                style={{
                  ...inputStyle,
                  padding: "14px 18px 14px 44px",
                  borderRadius: "10px",
                  fontSize: "16px",
                }}
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
                  <RecipeCard key={r.id} recipe={r} onDelete={handleDelete} searchTerm={search} />
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
