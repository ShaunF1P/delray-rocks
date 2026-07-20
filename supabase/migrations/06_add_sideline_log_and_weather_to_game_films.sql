-- Add sideline_log and weather columns to game_films table
ALTER TABLE game_films 
ADD COLUMN IF NOT EXISTS sideline_log JSONB,
ADD COLUMN IF NOT EXISTS weather JSONB;
