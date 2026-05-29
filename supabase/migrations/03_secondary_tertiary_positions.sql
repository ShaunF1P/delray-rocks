-- Add secondary and tertiary positions to players and pending_players tables
ALTER TABLE players ADD COLUMN IF NOT EXISTS secondary_position TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tertiary_position TEXT;

ALTER TABLE pending_players ADD COLUMN IF NOT EXISTS secondary_position TEXT;
ALTER TABLE pending_players ADD COLUMN IF NOT EXISTS tertiary_position TEXT;
