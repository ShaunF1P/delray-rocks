-- Add title and access_permissions columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS access_permissions TEXT[] DEFAULT '{}'::TEXT[];

-- Ensure Gerard Miller has Head Coach title and role set correctly
UPDATE profiles 
SET title = 'Head Coach', role = 'coach', access_permissions = ARRAY['all']
WHERE id = 'c923e857-5a83-4ebb-9297-99a1b636476c';

-- Ensure Shaun Muhammad has General Manager title and role set correctly
UPDATE profiles 
SET title = 'General Manager', role = 'org_admin', access_permissions = ARRAY['all']
WHERE id = '974839aa-0ee0-4942-821c-7a7fb7f77414';

-- Sync other coaches' titles from coaching_staff table where email or phone match
UPDATE profiles p
SET title = cs.title, role = 'coach', access_permissions = ARRAY['all']
FROM coaching_staff cs
WHERE cs.email IS NOT NULL AND cs.email = (
  SELECT email FROM auth.users WHERE auth.users.id = p.id
);
