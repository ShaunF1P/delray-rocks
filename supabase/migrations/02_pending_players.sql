-- ═══════════════════════════════════════════════════════════════
-- Delray Rocks — Pending Players / Roster Changes Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pending_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID DEFAULT 'a1b2c3d4-0000-0000-0000-000000000001',
  original_player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- Null for additions, set for edits
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  jersey_number INT,
  position TEXT,
  date_of_birth DATE,
  weight_lbs NUMERIC,
  program_type TEXT DEFAULT 'football',
  physical_status TEXT DEFAULT 'not_submitted',
  physical_date DATE,
  has_state_id BOOLEAN DEFAULT false,
  registration_paid BOOLEAN DEFAULT false,
  registration_date DATE,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  notes TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_by_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_players ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users (Coaches/Staff)
CREATE POLICY "Enable read access for authenticated users" 
  ON pending_players FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
  ON pending_players FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
  ON pending_players FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" 
  ON pending_players FOR DELETE 
  TO authenticated 
  USING (true);
