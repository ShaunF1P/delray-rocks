-- ============================================================================
-- Delray Rocks (8U R.T.G.) - Migration 07: Multi-Factor Stat & Identity Engine
-- Normalizes visual equipment signatures, play-by-play telemetry, and player
-- stat attribution with 3-point identity verification audit fields.
-- ============================================================================

-- 1. Extend players table with structured equipment_signature JSONB
ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS equipment_signature JSONB DEFAULT '{}'::jsonb;

-- 2. Create player_visual_signatures table
CREATE TABLE IF NOT EXISTS player_visual_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  jersey_number INT,
  helmet_color TEXT DEFAULT 'black',
  helmet_finish TEXT DEFAULT 'matte',
  facemask_color TEXT DEFAULT 'black',
  visor_type TEXT DEFAULT 'none',
  mouthpiece_color TEXT DEFAULT 'none',
  cleat_primary_color TEXT DEFAULT 'black',
  cleat_secondary_color TEXT DEFAULT 'white',
  sock_style TEXT DEFAULT 'low_black',
  anklet_spat BOOLEAN DEFAULT false,
  sleeve_style TEXT DEFAULT 'none',
  sleeve_color TEXT DEFAULT 'none',
  glove_color TEXT DEFAULT 'none',
  wristband_location TEXT DEFAULT 'none',
  towel_location TEXT DEFAULT 'none',
  build_descriptor TEXT DEFAULT 'compact',
  hair_descriptor TEXT DEFAULT 'none_visible',
  signature_confidence_weights JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_visual_signatures_jersey
  ON player_visual_signatures(jersey_number);

-- 3. Create film_plays table
CREATE TABLE IF NOT EXISTS film_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_film_id UUID REFERENCES game_films(id) ON DELETE CASCADE,
  clip_film_id UUID REFERENCES game_films(id) ON DELETE SET NULL,
  play_number INT NOT NULL,
  quarter INT DEFAULT 1,
  odk TEXT DEFAULT 'O' CHECK (odk IN ('O', 'D', 'K')),
  down INT DEFAULT 1,
  distance INT DEFAULT 10,
  yard_line INT DEFAULT 25,
  hash TEXT DEFAULT 'M' CHECK (hash IN ('L', 'M', 'R')),
  snap_timestamp DOUBLE PRECISION NOT NULL,
  whistle_timestamp DOUBLE PRECISION NOT NULL,
  clip_start_seconds DOUBLE PRECISION,
  clip_end_seconds DOUBLE PRECISION,
  is_dead_ball BOOLEAN DEFAULT false,
  dead_ball_reason TEXT DEFAULT 'none' CHECK (dead_ball_reason IN ('offsides', 'false_start', 'encroachment', 'early_whistle', 'none')),
  play_type TEXT DEFAULT 'run' CHECK (play_type IN ('run', 'pass', 'punt', 'kickoff', 'pat', 'dead_ball')),
  formation TEXT,
  play_direction TEXT CHECK (play_direction IN ('left', 'middle', 'right')),
  yards_gained INT DEFAULT 0,
  play_result TEXT,
  keyframe_urls JSONB DEFAULT '{}'::jsonb,
  telestrator_keyframes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_film_plays_master_film
  ON film_plays(master_film_id, play_number);

CREATE INDEX IF NOT EXISTS idx_film_plays_clip_film
  ON film_plays(clip_film_id);

-- 4. Create play_player_stats table
CREATE TABLE IF NOT EXISTS play_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id UUID REFERENCES film_plays(id) ON DELETE CASCADE,
  film_id UUID REFERENCES game_films(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  jersey_number INT,
  player_name TEXT,
  unit_role TEXT,

  -- Identity Verification Audit Fields
  id_confidence DOUBLE PRECISION DEFAULT 0.85 CHECK (id_confidence >= 0.0 AND id_confidence <= 1.0),
  matched_anchors JSONB DEFAULT '[]'::jsonb,
  pre_snap_bbox JSONB DEFAULT '[0,0,0,0]'::jsonb,
  contact_bbox JSONB DEFAULT '[0,0,0,0]'::jsonb,
  coach_override BOOLEAN DEFAULT false,

  -- Deterministic Offensive Stat Columns
  rush_attempt INT DEFAULT 0,
  rush_yards INT DEFAULT 0,
  yards_after_contact INT DEFAULT 0,
  broken_tackles INT DEFAULT 0,
  rush_td INT DEFAULT 0,
  pass_attempt INT DEFAULT 0,
  pass_completion INT DEFAULT 0,
  pass_yards INT DEFAULT 0,
  pass_td INT DEFAULT 0,
  interception_thrown INT DEFAULT 0,
  target INT DEFAULT 0,
  reception INT DEFAULT 0,
  rec_yards INT DEFAULT 0,
  rec_td INT DEFAULT 0,
  pancake_block INT DEFAULT 0,
  fumble INT DEFAULT 0,

  -- Deterministic Defensive Stat Columns
  solo_tackle INT DEFAULT 0,
  assist_tackle INT DEFAULT 0,
  tackle_for_loss INT DEFAULT 0,
  sack INT DEFAULT 0,
  forced_fumble INT DEFAULT 0,
  fumble_recovery INT DEFAULT 0,
  pass_breakup INT DEFAULT 0,
  interception INT DEFAULT 0,
  def_td INT DEFAULT 0,
  edge_contain_credit INT DEFAULT 0,
  missed_tackle INT DEFAULT 0,

  -- Kinematic & Grading Columns
  get_off_ms INT,
  pad_level_status TEXT DEFAULT 'optimal' CHECK (pad_level_status IN ('optimal', 'high_warning', 'critical_high')),
  head_placement TEXT DEFAULT 'safe' CHECK (head_placement IN ('safe', 'head_down_warning')),
  play_grade TEXT DEFAULT 'B',
  coaching_cue TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_play_player_stats_film
  ON play_player_stats(film_id);

CREATE INDEX IF NOT EXISTS idx_play_player_stats_play
  ON play_player_stats(play_id);

CREATE INDEX IF NOT EXISTS idx_play_player_stats_player
  ON play_player_stats(player_id, jersey_number);

-- 5. SQL View for Live Play Player Stats (excludes dead-ball plays)
CREATE OR REPLACE VIEW vw_live_play_player_stats AS
SELECT
  pps.*,
  fp.play_number,
  fp.quarter,
  fp.odk,
  fp.down,
  fp.distance,
  fp.yard_line,
  fp.play_type,
  fp.formation,
  fp.play_direction,
  fp.snap_timestamp,
  fp.whistle_timestamp
FROM play_player_stats pps
LEFT JOIN film_plays fp ON pps.play_id = fp.id
WHERE COALESCE(fp.is_dead_ball, false) = false;

-- 6. RPC: get_film_box_score(target_film_id UUID)
CREATE OR REPLACE FUNCTION get_film_box_score(target_film_id UUID)
RETURNS TABLE (
  player_id UUID,
  jersey_number INT,
  player_name TEXT,
  snaps_logged BIGINT,
  rush_attempts BIGINT,
  rush_yards BIGINT,
  yards_after_contact BIGINT,
  broken_tackles BIGINT,
  rush_tds BIGINT,
  pass_attempts BIGINT,
  pass_completions BIGINT,
  pass_yards BIGINT,
  pass_tds BIGINT,
  interceptions_thrown BIGINT,
  targets BIGINT,
  receptions BIGINT,
  rec_yards BIGINT,
  rec_tds BIGINT,
  pancake_blocks BIGINT,
  fumbles BIGINT,
  solo_tackles BIGINT,
  assist_tackles BIGINT,
  total_tackles BIGINT,
  tackles_for_loss BIGINT,
  sacks BIGINT,
  forced_fumbles BIGINT,
  fumble_recoveries BIGINT,
  pass_breakups BIGINT,
  interceptions BIGINT,
  def_tds BIGINT,
  edge_contain_credits BIGINT,
  missed_tackles BIGINT,
  avg_get_off_ms NUMERIC,
  avg_id_confidence NUMERIC,
  override_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pps.player_id,
    pps.jersey_number,
    MAX(pps.player_name) AS player_name,
    COUNT(pps.id) AS snaps_logged,
    COALESCE(SUM(pps.rush_attempt), 0) AS rush_attempts,
    COALESCE(SUM(pps.rush_yards), 0) AS rush_yards,
    COALESCE(SUM(pps.yards_after_contact), 0) AS yards_after_contact,
    COALESCE(SUM(pps.broken_tackles), 0) AS broken_tackles,
    COALESCE(SUM(pps.rush_td), 0) AS rush_tds,
    COALESCE(SUM(pps.pass_attempt), 0) AS pass_attempts,
    COALESCE(SUM(pps.pass_completion), 0) AS pass_completions,
    COALESCE(SUM(pps.pass_yards), 0) AS pass_yards,
    COALESCE(SUM(pps.pass_td), 0) AS pass_tds,
    COALESCE(SUM(pps.interception_thrown), 0) AS interceptions_thrown,
    COALESCE(SUM(pps.target), 0) AS targets,
    COALESCE(SUM(pps.reception), 0) AS receptions,
    COALESCE(SUM(pps.rec_yards), 0) AS rec_yards,
    COALESCE(SUM(pps.rec_td), 0) AS rec_tds,
    COALESCE(SUM(pps.pancake_block), 0) AS pancake_blocks,
    COALESCE(SUM(pps.fumble), 0) AS fumbles,
    COALESCE(SUM(pps.solo_tackle), 0) AS solo_tackles,
    COALESCE(SUM(pps.assist_tackle), 0) AS assist_tackles,
    COALESCE(SUM(pps.solo_tackle + pps.assist_tackle), 0) AS total_tackles,
    COALESCE(SUM(pps.tackle_for_loss), 0) AS tackles_for_loss,
    COALESCE(SUM(pps.sack), 0) AS sacks,
    COALESCE(SUM(pps.forced_fumble), 0) AS forced_fumbles,
    COALESCE(SUM(pps.fumble_recovery), 0) AS fumble_recoveries,
    COALESCE(SUM(pps.pass_breakup), 0) AS pass_breakups,
    COALESCE(SUM(pps.interception), 0) AS interceptions,
    COALESCE(SUM(pps.def_td), 0) AS def_tds,
    COALESCE(SUM(pps.edge_contain_credit), 0) AS edge_contain_credits,
    COALESCE(SUM(pps.missed_tackle), 0) AS missed_tackles,
    ROUND(AVG(pps.get_off_ms)::numeric, 1) AS avg_get_off_ms,
    ROUND(AVG(pps.id_confidence)::numeric, 3) AS avg_id_confidence,
    COUNT(*) FILTER (WHERE pps.coach_override = true) AS override_count
  FROM play_player_stats pps
  LEFT JOIN film_plays fp ON pps.play_id = fp.id
  WHERE (pps.film_id = target_film_id OR fp.master_film_id = target_film_id OR fp.clip_film_id = target_film_id)
    AND COALESCE(fp.is_dead_ball, false) = false
  GROUP BY pps.player_id, pps.jersey_number
  ORDER BY COALESCE(SUM(pps.solo_tackle + pps.assist_tackle), 0) DESC,
           COALESCE(SUM(pps.rush_yards + pps.pass_yards + pps.rec_yards), 0) DESC;
$$;

-- 7. RPC: get_season_player_stats()
CREATE OR REPLACE FUNCTION get_season_player_stats()
RETURNS TABLE (
  player_id UUID,
  jersey_number INT,
  player_name TEXT,
  games_logged BIGINT,
  snaps_logged BIGINT,
  rush_attempts BIGINT,
  rush_yards BIGINT,
  yards_after_contact BIGINT,
  broken_tackles BIGINT,
  rush_tds BIGINT,
  pass_attempts BIGINT,
  pass_completions BIGINT,
  pass_yards BIGINT,
  pass_tds BIGINT,
  interceptions_thrown BIGINT,
  targets BIGINT,
  receptions BIGINT,
  rec_yards BIGINT,
  rec_tds BIGINT,
  pancake_blocks BIGINT,
  fumbles BIGINT,
  solo_tackles BIGINT,
  assist_tackles BIGINT,
  total_tackles BIGINT,
  tackles_for_loss BIGINT,
  sacks BIGINT,
  forced_fumbles BIGINT,
  fumble_recoveries BIGINT,
  pass_breakups BIGINT,
  interceptions BIGINT,
  def_tds BIGINT,
  edge_contain_credits BIGINT,
  missed_tackles BIGINT,
  avg_get_off_ms NUMERIC,
  avg_id_confidence NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pps.player_id,
    pps.jersey_number,
    MAX(pps.player_name) AS player_name,
    COUNT(DISTINCT pps.film_id) AS games_logged,
    COUNT(pps.id) AS snaps_logged,
    COALESCE(SUM(pps.rush_attempt), 0) AS rush_attempts,
    COALESCE(SUM(pps.rush_yards), 0) AS rush_yards,
    COALESCE(SUM(pps.yards_after_contact), 0) AS yards_after_contact,
    COALESCE(SUM(pps.broken_tackles), 0) AS broken_tackles,
    COALESCE(SUM(pps.rush_td), 0) AS rush_tds,
    COALESCE(SUM(pps.pass_attempt), 0) AS pass_attempts,
    COALESCE(SUM(pps.pass_completion), 0) AS pass_completions,
    COALESCE(SUM(pps.pass_yards), 0) AS pass_yards,
    COALESCE(SUM(pps.pass_td), 0) AS pass_tds,
    COALESCE(SUM(pps.interception_thrown), 0) AS interceptions_thrown,
    COALESCE(SUM(pps.target), 0) AS targets,
    COALESCE(SUM(pps.reception), 0) AS receptions,
    COALESCE(SUM(pps.rec_yards), 0) AS rec_yards,
    COALESCE(SUM(pps.rec_td), 0) AS rec_tds,
    COALESCE(SUM(pps.pancake_block), 0) AS pancake_blocks,
    COALESCE(SUM(pps.fumble), 0) AS fumbles,
    COALESCE(SUM(pps.solo_tackle), 0) AS solo_tackles,
    COALESCE(SUM(pps.assist_tackle), 0) AS assist_tackles,
    COALESCE(SUM(pps.solo_tackle + pps.assist_tackle), 0) AS total_tackles,
    COALESCE(SUM(pps.tackle_for_loss), 0) AS tackles_for_loss,
    COALESCE(SUM(pps.sack), 0) AS sacks,
    COALESCE(SUM(pps.forced_fumble), 0) AS forced_fumbles,
    COALESCE(SUM(pps.fumble_recovery), 0) AS fumble_recoveries,
    COALESCE(SUM(pps.pass_breakup), 0) AS pass_breakups,
    COALESCE(SUM(pps.interception), 0) AS interceptions,
    COALESCE(SUM(pps.def_td), 0) AS def_tds,
    COALESCE(SUM(pps.edge_contain_credit), 0) AS edge_contain_credits,
    COALESCE(SUM(pps.missed_tackle), 0) AS missed_tackles,
    ROUND(AVG(pps.get_off_ms)::numeric, 1) AS avg_get_off_ms,
    ROUND(AVG(pps.id_confidence)::numeric, 3) AS avg_id_confidence
  FROM play_player_stats pps
  LEFT JOIN film_plays fp ON pps.play_id = fp.id
  WHERE COALESCE(fp.is_dead_ball, false) = false
  GROUP BY pps.player_id, pps.jersey_number
  ORDER BY COALESCE(SUM(pps.solo_tackle + pps.assist_tackle), 0) DESC,
           COALESCE(SUM(pps.rush_yards + pps.pass_yards + pps.rec_yards), 0) DESC;
$$;

-- 8. Row Level Security (RLS) & Policies
ALTER TABLE player_visual_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE film_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read/write player_visual_signatures for authenticated and service" ON player_visual_signatures;
CREATE POLICY "Allow read/write player_visual_signatures for authenticated and service"
  ON player_visual_signatures FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read/write film_plays for authenticated and service" ON film_plays;
CREATE POLICY "Allow read/write film_plays for authenticated and service"
  ON film_plays FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read/write play_player_stats for authenticated and service" ON play_player_stats;
CREATE POLICY "Allow read/write play_player_stats for authenticated and service"
  ON play_player_stats FOR ALL
  USING (true)
  WITH CHECK (true);
