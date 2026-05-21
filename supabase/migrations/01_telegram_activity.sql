-- ═══════════════════════════════════════════════════════════════
-- Delray Rocks — Activity Tracking & Staff Awards
-- ═══════════════════════════════════════════════════════════════

-- Activity tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(event_type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- Staff awards
CREATE TABLE IF NOT EXISTS staff_awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  giver_id UUID,
  award_type TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_awards_recipient ON staff_awards(recipient_id);

-- RLS policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read activity logs" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage awards" ON staff_awards FOR ALL TO authenticated USING (true) WITH CHECK (true);
