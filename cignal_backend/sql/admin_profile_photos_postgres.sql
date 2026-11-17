-- Apply through the reviewed Supabase/PostgreSQL SQL editor, only after staging.
-- The backend API accesses this table by the authenticated admin's user ID.
CREATE TABLE IF NOT EXISTS public.admin_profile_photos (
  user_id INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  mime_type VARCHAR(32) NOT NULL,
  image_base64 TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Enable row-level security against direct anonymous/PostgREST access.
-- Backend connection must retain appropriate privileges through its secure DB role.
ALTER TABLE public.admin_profile_photos ENABLE ROW LEVEL SECURITY;
