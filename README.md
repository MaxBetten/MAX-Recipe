# 📖 Cookbook Index

A family-friendly web app to catalog and search recipes across all your physical cookbooks. Snap a photo of a cookbook page and AI extracts the recipe title and ingredients automatically. Everyone in the family can add and search recipes from any device.

## Features

- **📷 Photo extraction** — Upload a photo of a cookbook page, AI extracts the recipe title & ingredients
- **🔍 Search everything** — Search by recipe name, ingredient, or cookbook
- **📚 Filter by cookbook** — Quick-filter pills for each cookbook in your collection
- **👨‍👩‍👧‍👦 Family shared** — Everyone uses the same database, no accounts needed
- **📱 Mobile friendly** — Works great on phones for adding recipes in the kitchen

---

## Setup Guide (30 minutes)

### 1. Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **New Project**, pick a name (e.g. "cookbook-index"), set a database password, choose a region close to you
3. Once the project is created, go to **SQL Editor** (left sidebar)
4. Paste this SQL and click **Run**:

```sql
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  cookbook TEXT NOT NULL,
  page TEXT NOT NULL,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable public read/write access (no auth needed for family use)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON recipes FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON recipes FOR DELETE USING (true);
```

5. Go to **Settings → API** (left sidebar)
6. Copy these two values — you'll need them in step 3:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 2. Get a Claude API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Go to **API Keys** and create a new key
4. Copy it — you'll need it in step 3

### 3. Deploy to Vercel (free)

1. Download this project folder and push it to a **GitHub repository** (public or private)
2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click **Add New → Project**, import your GitHub repo
4. Before deploying, add these **Environment Variables**:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `ANTHROPIC_API_KEY` | Your Claude API key |

5. Click **Deploy**
6. Done! Share the URL (e.g. `cookbook-index.vercel.app`) with your family.

### 4. (Optional) Custom domain

In Vercel, go to your project → **Settings → Domains** to add a custom domain like `cookbooks.yourfamily.com`.

---

## Running locally (for development)

```bash
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL database, free tier)
- **Claude API** (recipe extraction from photos)
- **Vercel** (hosting, free tier)
