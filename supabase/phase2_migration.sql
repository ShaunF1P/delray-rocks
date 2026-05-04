-- Delray Rocks Phase 2: Coaching Staff + Player Compliance
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. COACHING STAFF TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coaching_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Position Coach',
  specialty TEXT,
  phone TEXT,
  email TEXT,
  headshot_url TEXT,
  sort_order INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE coaching_staff ENABLE ROW LEVEL SECURITY;

-- Public read access (coaches and parents can see staff)
CREATE POLICY "Anyone can view coaching staff"
  ON coaching_staff FOR SELECT
  USING (true);

-- Authenticated users can manage staff
CREATE POLICY "Authenticated users can manage staff"
  ON coaching_staff FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- 2. PLAYER COMPLIANCE COLUMNS
-- ============================================
-- Add program type (football vs cheerleading)
ALTER TABLE players ADD COLUMN IF NOT EXISTS program_type TEXT DEFAULT 'football';

-- Add physical compliance tracking
ALTER TABLE players ADD COLUMN IF NOT EXISTS physical_status TEXT DEFAULT 'not_submitted';
-- Values: 'not_submitted', 'scheduled', 'completed'

ALTER TABLE players ADD COLUMN IF NOT EXISTS physical_date DATE;

-- State ID requirement
ALTER TABLE players ADD COLUMN IF NOT EXISTS has_state_id BOOLEAN DEFAULT false;

-- Registration payment tracking
ALTER TABLE players ADD COLUMN IF NOT EXISTS registration_paid BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS registration_date DATE;

-- ============================================
-- 3. SEED COACHING STAFF DATA
-- ============================================
INSERT INTO coaching_staff (name, title, specialty, sort_order) VALUES
  ('Gerard Miller', 'Head Coach', 'Running Backs', 1),
  ('Shaun Muhammad', 'General Manager', 'Operations', 2),
  ('Jacoby Dorch', 'Offensive Coordinator', 'Offense', 3),
  ('Marcus Darrisaw', 'Position Coach', 'WRs / Special Teams', 4),
  ('Brent Modlin', 'Position Coach', 'Offensive Line', 5),
  ('Central McCellion', 'Defensive Coordinator', 'Defensive Backs', 6),
  ('Jasper Brown', 'Position Coach', 'Defensive Line', 7),
  ('Carl Nelson', 'Position Coach', 'Linebackers', 8)
ON CONFLICT DO NOTHING;
