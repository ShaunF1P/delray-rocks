# Delray Rocks (8U R.T.G.) — Workspace Architecture & Operational Rules

## 1. System Overview & Tech Stack
- **Application**: Delray Rocks 8U (R.T.G.) Youth Football Operations, Coaching Intelligence, Parent Portal, and AI Film Analysis Platform (`https://dr.f1rstposition.com`).
- **Framework**: Next.js 16.2.4 (App Router), React 19.2.4, Zustand 5, Framer Motion 12, Recharts 3, Lucide React icons.
- **Database & Storage**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`) with TUS resumable uploads (`tus-js-client`) to the `game-films` storage bucket.
- **AI & Multimodal Video Engine**:
  - Google Gemini API (`@google/generative-ai`, `GoogleAIFileManager`) using `gemini-3.8-pro` / `gemini-2.5-pro` / `gemini-2.5-flash`.
  - Dedicated background microservice (`film-service/server.js`, Express + FFmpeg + WebSocket/Supabase Realtime) for long-running video stream uploads, Google File URI caching (`gemini_file_uri`, `gemini_file_name`), and two-pass play analysis.
  - Local/CLI Multi-Pass Film Breakdown Engines (`scripts/multi_pass_film_engine.js`, `scripts/ai-game-processor.js`, `scripts/evaluate-ai-engine.js`).
- **Video Processing & NLE Exports**:
  - Physical FFmpeg stream-copy clip slicing (`/api/film/clip`).
  - Client-side / preset video compressor (`src/lib/video-compressor.js`) with raw 4K default upload and optional 1080p 5Mbps / 4K presets.
  - Professional NLE & Sports Export Engine (`src/lib/film-export.js`, `/api/film/export`) generating **CMX 3600 EDL (`.edl`)**, **Final Cut Pro / DaVinci Resolve XML (`.xml` FCPXML)**, and **Hudl Breakdown CSV (`.csv`)**.
- **Third-Party Integrations**:
  - **QwikCut Cloud & Telemetry** (`src/lib/qwikcut.js`, `/api/qwikcut/sync`, `/api/qwikcut/stats`) with OAuth 2.0 Client Credentials + 30-clip Coral Springs Chargers 4K fallback dataset.
  - **GoHighLevel (GHL) CRM** (`src/lib/ghl.js`, `/api/ghl/status`) for parent/lead sync.
  - **Telegram Bot Alerts** (`src/lib/telegram.js`, `/api/activity/log`, `/api/activity/digest`) for real-time coaching staff notifications.

## 2. Mandatory Workspace Constraints
- **Zero-Emoji Policy**: Never use emojis in any UI component, API output, AI prompt template, CLI script, or markdown documentation. Use only `lucide-react` or custom inline SVG components (`src/components/ui/Icons.js`).
- **Secret Hygiene & Pre-Push Gate**: Never stage or commit `scratch/*.js`, `scratch/*.ps1`, `.agents/`, or hardcoded credentials (`AIzaSy...`, `eyJhbGci...`, `qcs_...`, `pit-...`). Always load credentials exclusively via `process.env` and verify with `.git/hooks/pre-push` before pushing to GitHub.
- **Next.js 16.2.4 Conventions**: Follow Next.js 16 App Router conventions (`src/app/...`).
- **AI Film Ground-Truth Rules**:
  1. Never fabricate jersey numbers or play outcomes.
  2. Distinguish **Live Plays** (snap to whistle) from **Dead Balls / Pre-Snap Penalties** (`deadBallSensitivity` 0.0–1.0).
  3. Enforce the 3-tier **Player Identification Hierarchy**:
     - Tier 1: Field/Scheme Position (`LT`, `LG`, `C`, `RG`, `RT`, `TE`, `QB`, `RB`, `WR1`, `WR2`, `DE`, `DT`, `NT`, `OLB`, `MLB`, `CB`, `FS`, `SS`).
     - Tier 2: Minimum 2–3 Physical Descriptors (cleat/shoe color, hair, build/size, visor/gloves/sleeves).
     - Tier 3: Jersey Number only when confidence meets or exceeds `playerIdConfidenceCutoff` (default `0.70`).
  4. Suppress broadcast replays and non-play intervals; use scorebug/clock movement when present to anchor snap and whistle timestamps.

## 3. Core Directory & Route Map
- `src/app/coach/*`: 23 Coach Portal modules (`dashboard`, `roster`, `depth-chart`, `staff`, `awards`, `activity`, `events`, `practice`, `evaluate`, `form-analysis`, `attendance`, `film`, `playbook`, `sideline`, `post-game`, `scouting`, `training`, `season`, `highlights`, `reports`, `fundraising`, `coastal`, `settings`).
- `src/app/parent/*`: Parent Portal (`dashboard`, `progress`, `reports`, etc.).
- `src/app/coastal/*` & `src/app/brand-guide/*`: Public Coastal Community Church 8U sponsorship landing/proposal pages and PlayStream broadcast brand guide.
- `src/app/api/*`: 25 backend API route handlers covering film upload/analysis/clipping/export/stats, roster equipment signatures & sideline frame scanning (`/api/roster/signatures`), parent progress report generation (`/api/reports/generate`), AI benchmarking (`/api/evaluate/benchmark`), QwikCut sync, playbook seeding, practice generation, scouting, and CRM/Telegram hooks.
- `supabase/migrations/07_multi_factor_stat_engine.sql` & `src/lib/stat-attribution.js`: Normalized `player_visual_signatures`, `film_plays` (with `telestrator_keyframes`), `play_player_stats` (with Mandatory 3-Point Anchor verification `matched_anchors`, `pre_snap_bbox`, `contact_bbox`, offensive/defensive/kinematic metrics), and RPCs `get_film_box_score` / `get_season_player_stats`.
- `scripts/*`: CLI automation for multi-pass Stage A + Stage B film breakdown (`multi_pass_film_engine.js`), Chargers 30-clip batch analysis (`batch_analyze_all_30_chargers_plays.js`), live Supabase sync (`sync_live_supabase.js`), AI benchmarking (`evaluate-ai-engine.js`), and smoke tests.
- `tests/e2e/*`: Playwright E2E test suites (`evaluate.spec.js`, `multi-factor-stats.spec.js`, `brand-guide.spec.js`, `film-export.spec.js`, `qwikcut.spec.js`, `smoke.spec.js` — 25/25 passing).
