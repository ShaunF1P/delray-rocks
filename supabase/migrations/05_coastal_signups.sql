-- ═══════════════════════════════════════════════════════════════
-- Delray Rocks — Coastal Community TV Sponsorship Signups Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coastal_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_first_name TEXT NOT NULL,
  parent_last_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  text_opt_in BOOLEAN DEFAULT FALSE,
  player_name TEXT NOT NULL, -- Name of the 8U player to attribute the signup
  planned_visit TEXT DEFAULT 'Unspecified', -- Voluntary planned service time or event
  attended BOOLEAN DEFAULT FALSE, -- Track if they checked in or visited the service/event
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alter table queries in case table was already created in a previous step
ALTER TABLE coastal_signups ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE coastal_signups ADD COLUMN IF NOT EXISTS planned_visit TEXT DEFAULT 'Unspecified';

-- Enable Row Level Security (RLS)
ALTER TABLE coastal_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone (anonymous users) to insert a signup from the public landing page
DROP POLICY IF EXISTS "Enable public anonymous insert access" ON coastal_signups;
CREATE POLICY "Enable public anonymous insert access" 
  ON coastal_signups FOR INSERT 
  WITH CHECK (true);

-- Policy: Allow authenticated users (coaches/staff) to read and manage all signups
DROP POLICY IF EXISTS "Enable read/write access for authenticated users" ON coastal_signups;
CREATE POLICY "Enable read/write access for authenticated users" 
  ON coastal_signups FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);
