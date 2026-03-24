# 🏏 IPL Predictor

Predict IPL match winners with your crew. +1 point per correct pick. Leaderboard gets updated live.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres DB + Google Auth + Realtime
- **CricAPI** — IPL schedules & live results (free tier)
- **Vercel** — Hosting + cron job for match sync

---

## Setup Guide (do these in order)

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project** (db pw - G@pNZXJ_4h2r4Qy)
2. Note down: **Project URL** and **anon key** (Settings → API)
3. Also grab the **service_role key** (same page — keep this secret)
4. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → **Run**
   - This creates the `profiles`, `matches`, `predictions` tables, the `leaderboard` view, and streak functions

### 2. Enable Google Auth in Supabase

1. In Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable it
3. You'll need a **Google OAuth Client ID and Secret**:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a project → **APIs & Services** → **Credentials** → **Create OAuth Client ID**
   - App type: **Web application**
   - Authorized redirect URIs: `https://fmebknvvneswgobokwel.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret** into Supabase's Google provider settings
4. Save

### 3. CricAPI Setup

1. Sign up at [cricapi.com](https://www.cricapi.com) — free tier gives 100 requests/day
2. Copy your **API key**
3. To find the IPL 2025 series ID:
   - Call: `https://api.cricapi.com/v1/series?apikey=YOUR_KEY&search=Indian+Premier+League`
   - Find the 2025 entry and copy its `id` field
   - This is your `IPL_SERIES_ID`

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

CRICAPI_KEY=your_key_here
IPL_SERIES_ID=abc123

INVITE_CODE=cricket2025          # whatever you want — share this with your friends
CRON_SECRET=any_random_string    # generate with: openssl rand -hex 32

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Install and Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. For `NEXT_PUBLIC_APP_URL` use your Vercel URL (e.g. `https://ipl-fantasy-xyz.vercel.app`)
5. Deploy

**After deploying:**

- Update Google OAuth redirect URI in Google Console to include: `https://your-vercel-url.vercel.app/api/auth/callback`
- Update Supabase Auth → **URL Configuration** → Site URL: `https://your-vercel-url.vercel.app`
- Add your Vercel URL to Supabase Auth → **Redirect URLs**

### 7. Test the Match Sync

After deploying, manually trigger the sync once to pull IPL matches:

```
GET https://your-vercel-url.vercel.app/api/matches/sync
Authorization: Bearer your_cron_secret
```

Or just wait — Vercel will auto-run it every 3 hours per `vercel.json`.

---

## How It Works

### Match Sync (Cron)

Every 3 hours, `/api/matches/sync` calls CricAPI and:

- Upserts all IPL matches into the `matches` table
- For completed matches with a winner, resolves all predictions as correct/incorrect
- Updates voting streaks for users who predicted correctly

### Voting Lock

Votes are locked 30 minutes before match start. This is enforced both in the UI and on the server-side in `/api/predictions`.

### Invite Flow

1. User signs in with Google → profile created with `is_approved = false`
2. Redirected to `/invite` to enter the code
3. On correct code → `is_approved = true` → redirected to `/home`
4. Middleware protects all routes — unapproved users can't access `/home`

### Streaks

- **Login streak**: Incremented once per day on login via `update_login_streak()` SQL function
- **Voting streak**: Consecutive days with at least one correct prediction, via `update_voting_streak()`. Getting even one wrong on a day resets it (unless you also got one right that day)

---

## Database Schema

```
profiles
  id (uuid, FK to auth.users)
  name, email, avatar_url
  is_approved (boolean)
  login_streak, last_login_date
  voting_streak, last_correct_vote_date

matches
  id (text, CricAPI match ID)
  team1, team2, venue
  match_date, status, winner
  match_started, match_ended
  raw_data (jsonb)

predictions
  id (uuid)
  user_id (FK → profiles)
  match_id (FK → matches)
  predicted_team
  is_correct (null until match ends)

leaderboard (VIEW)
  Aggregates correct_predictions per user, sorted by points
```

---

## Sharing With Friends

1. Deploy to Vercel
2. Share your app URL
3. Tell them the invite code you set in `INVITE_CODE`
4. They sign in with Google → enter the code → they're in

---

## Notes

- CricAPI free tier: 100 req/day. With 3-hour cron that's 8 calls/day — well within limit.
- If CricAPI doesn't have the IPL series ID yet (early season), the sync will still work by filtering `currentMatches` for IPL T20s.
- Supabase free tier: 500MB storage, 2GB bandwidth — more than enough for a friend group.
- The leaderboard uses a Postgres `VIEW` — scores are always computed live from predictions, never stored separately.
