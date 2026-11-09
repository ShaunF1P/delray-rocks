# Delray Rocks (8U R.T.G.) — Complete System Architecture, Feature Inventory & Phase 2 Multi-Factor Stat Engine Reference

> **Purpose of this Document**: This self-contained Markdown reference packages the complete architecture, feature inventory, database schemas, API contracts, AI prompt engineering rules, and verification results of the **Delray Rocks (`delray-rocks`)** platform—including the newly completed **Deterministic Multi-Factor Player Re-ID, Normalized Play Stat Attribution (`film_plays` / `play_player_stats`), Sideline Frame Signature Scanner, Interactive Game Box Score, 1-Click Attribution Override, and Auto-Keyframed Telestrator Spotlight**.

---

## 1. Executive Status Update (Branch: `feat/multi-factor-stat-engine` @ `4e6310c`)

All four architectural upgrades and both pre-flight recommendations have been implemented, verified, and committed cleanly:
- **Checkpoint & Branch Protection**: Committed pre-upgrade working tree to `feat/multi-factor-stat-engine` (`d25f2f6`) and layered the complete Multi-Factor Stat Engine upgrade on top (`4e6310c`).
- **Build Status**: Next.js 16.2.4 production build (`npm run build`) compiles `64/64` static and dynamic routes in `3.0s` with `0` errors.
- **CLI Benchmark Verification (`node scripts/evaluate-ai-engine.js --mock`)**: `10/10` benchmark targets passed (`98.96%` Temporal IoU, `100.00%` Dead-Ball Classification F1, `100.00%` Player ID Precision, `0.00%` Hallucination Rate, `100.00%` Overall Stat Attribution F1, `100.00%` Tackle Attribution F1, `100.00%` Ball-Carrier Attribution F1, `100.00%` 3-Point Anchor Compliance Rate).
- **Playwright E2E Verification (`npm run test:e2e`)**: `24/24` E2E tests passing across `brand-guide.spec.js`, `evaluate.spec.js`, `film-export.spec.js`, `multi-factor-stats.spec.js`, `qwikcut.spec.js`, and `smoke.spec.js`.

---

## 2. What Was Just Built (Tasks 1–4 + Sideline Frame Scanner)

### Task 1: Supabase Schema Normalization & Visual Signature Persistence
- **Migration (`supabase/migrations/07_multi_factor_stat_engine.sql`)**:
  1. **`players.equipment_signature` & `player_visual_signatures`**:
     - Stores 16 structured equipment/physical fields per player: `helmet_color`, `helmet_finish`, `facemask_color`, `visor_type`, `mouthpiece_color`, `cleat_primary_color`, `cleat_secondary_color`, `sock_style` (`high_white`, `low_black`, `green_sleeves`, `mid_white`), `anklet_spat` (boolean), `sleeve_style` (`none`, `left_arm`, `right_arm`, `both_arms`), `sleeve_color`, `glove_color`, `wristband_location`, `towel_location`, `build_descriptor` (`compact`, `tall_lean`, `heavy_lineman`, `athletic_stocky`), `hair_descriptor` (`none_visible`, `braids`, `dreads_visible`, `low_fade`), plus `signature_confidence_weights` JSONB.
  2. **`film_plays` Table**:
     - Stores normalized play-level metadata (`play_number`, `quarter`, `odk`, `down`, `distance`, `yard_line`, `hash`, `snap_timestamp`, `whistle_timestamp`, `clip_start_seconds`, `clip_end_seconds`, `is_dead_ball`, `dead_ball_reason`, `play_type`, `formation`, `play_direction`, `yards_gained`, `play_result`, `keyframe_urls`, and `telestrator_keyframes` JSONB).
  3. **`play_player_stats` Table**:
     - Stores per-play, per-player attribution with **Identity Verification Audit Fields** (`id_confidence`, `matched_anchors` JSONB requiring `>= 3` anchors, `pre_snap_bbox`, `contact_bbox`, `coach_override`), **Offensive Stats** (`rush_attempt`, `rush_yards`, `yards_after_contact`, `broken_tackles`, `rush_td`, `pass_attempt`, `pass_completion`, `pass_yards`, `pass_td`, `interception_thrown`, `target`, `reception`, `rec_yards`, `rec_td`, `pancake_block`, `fumble`), **Defensive Stats** (`solo_tackle`, `assist_tackle`, `tackle_for_loss`, `sack`, `forced_fumble`, `fumble_recovery`, `pass_breakup`, `interception`, `def_td`, `edge_contain_credit`, `missed_tackle`), and **Kinematic & Grading Fields** (`get_off_ms`, `pad_level_status`, `head_placement`, `play_grade`, `coaching_cue`).
  4. **SQL View & RPC Functions**:
     - `vw_live_play_player_stats` (filters out dead-ball plays automatically).
     - `get_film_box_score(target_film_id UUID)` and `get_season_player_stats()` (sums all offensive, defensive, and kinematic metrics grouped by player).
- **Enriched 28-Player Signature Dataset (`scratch/player_signatures.json` & `src/lib/stat-attribution.js`)**:
  - Populated full 16-field `equipment_signature` profiles for all 28 Delray Rocks 8U players (`#0` through `#60`), including `#9 Legend Muhammad` (`primary_alignment: "RDE / RB"`, `cleat_primary_color: "neon_green"`, `facemask_color: "white"`, `visor_type: "clear"`, `sleeve_style: "left_arm"`, `anklet_spat: true`, `build_descriptor: "athletic_stocky"`, `hair_descriptor: "braids"`).
- **New Backend APIs**:
  - `GET/POST /api/roster/signatures` (`src/app/api/roster/signatures/route.js`): supports `action: 'save'`, `action: 'sync_file'`, and `action: 'scan_frame'` (Gemini Vision sideline lineup photo scanner to auto-populate player signatures).
  - `GET/POST /api/film/stats` (`src/app/api/film/stats/route.js`): returns `boxScore`, `plays`, `playerStats`, and `seasonStats`, and handles `action: 'override_attribution'` (1-click player stat reassignment + automatic signature confidence weight boosting) and `action: 'save_play_analysis'`.

### Task 2: High-Precision Multi-Pass Clip & Keyframe Analysis Engine
- **`src/app/api/film/analyze/route.js`, `film-service/server.js`, and `scripts/multi_pass_film_engine.js`**:
  - **Stage A (Macro Segmentation, Clip Slicing & 3-Keyframe Extraction)**:
    - Detects `[snapTimestamp, whistleTimestamp]` and classifies `is_dead_ball` conditioned on `deadBallSensitivity`.
    - Slices isolated play clips (`snap - 3s` to `whistle + 2s`) and extracts 3 high-resolution 4K JPEG keyframes per play via FFmpeg (`extractPlayKeyframes`):
      1. `frame_presnap.jpg` (`snapTimestamp - 0.5s`)
      2. `frame_mesh_point.jpg` (`snapTimestamp + 1.2s`)
      3. `frame_contact_whistle.jpg` (`whistleTimestamp - 1.0s`)
  - **Stage B (3-Point Signature Re-ID & Structured Stat Extraction)**:
    - Feeds the isolated play clip + 3 keyframes + active Roster Signature Matrix (`buildSignatureMatrixContext`) into Gemini using `responseMimeType: "application/json"` and `STAGE_B_PLAY_RESPONSE_SCHEMA`.
    - Enforces the **Mandatory 3-Point Anchor Rule** (`validateThreePointAnchors`): every attributed player stat must have `>= 3` anchors in `matched_anchors` (`[1] Pre-Snap Alignment`, `[2] Equipment Signature`, `[3] Verified Jersey # >= cutoff OR Continuous BBox Trajectory Track`).

### Task 3: Roster Signature Editor, Sideline Frame Scanner, Box Score UI & Auto-Keyframed Telestrator
- **`src/app/coach/roster/page.js`**:
  - Added per-player 16-field **Equipment & Visual Signature Matrix Modal** (`data-testid="equipment-signature-modal"`).
  - Added **Sync Signatures JSON** button (`data-testid="sync-signatures-btn"`).
  - Added **Scan Frame to Auto-Populate Roster Signatures** button and modal (`data-testid="scan-frame-signatures-btn"`, `data-testid="scan-frame-modal"`) where coaches can drop a sideline lineup photo to auto-extract and batch-save equipment signatures for the roster.
- **`src/app/coach/film/page.js`**:
  - Added the **Game Box Score & Player Stats** tab (`data-testid="tab-box-score"`, `data-testid="box-score-table"`) displaying exact player totals (e.g., `#9 Legend Muhammad: 10 Total Tackles [7 Solo, 3 Ast], 3 TFL, 1 Sack, 3 Rushing TDs, 142 Rush Yds, 68 YAC, 2 Pancakes`).
  - Added **Interactive Stat-to-Playlist Filtering**: clicking any stat badge (`data-testid="stat-filter-btn-9-tackles"`, `data-testid="stat-filter-btn-9-tfl"`, `data-testid="stat-filter-btn-9-tds"`) filters the Play Breakdown playlist to only those plays and queues sequential clip playback.
  - Added **1-Click Player Attribution Override** (`data-testid="play-attribution-override"`, `data-testid="override-attribution-btn"`) on every play card to reassign stats, recalculate the Game Box Score in real time, and boost the player's visual signature confidence weights.
- **`src/components/film/TelestratorCanvas.jsx`**:
  - Added `telestratorKeyframes` interpolation across `snap`, `mesh_point`, and `contact_whistle` bounding boxes `[ymin, xmin, ymax, xmax]` with a toggleable **AI Player Spotlight** (`data-testid="toggle-ai-spotlight-btn"`, `data-testid="ai-telestrator-spotlight"`).

### Task 4: Evaluation Benchmark & Playwright E2E Verification
- **`scripts/evaluate-ai-engine.js`, `src/app/api/evaluate/benchmark/route.js`, `src/app/coach/evaluate/page.js`**:
  - Added `metrics.statAttribution` (`overallStatF1`, `tackleAttributionF1`, `ballCarrierF1`, `tdAttributionAccuracy`, `threePointAnchorComplianceRate`) and rendered the **Stat Attribution & 3-Point Anchor Accuracy** card (`data-testid="metric-stat-attribution"`).
- **`tests/e2e/evaluate.spec.js` & `tests/e2e/multi-factor-stats.spec.js`**:
  - Full E2E test coverage for `/api/roster/signatures`, `/api/film/stats`, `/coach/film` Box Score & 1-Click Override, and `/coach/evaluate` Stat Attribution metrics (`24/24` passing).
