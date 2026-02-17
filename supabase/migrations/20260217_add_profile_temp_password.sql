-- Add temporary password fields for demo mode
alter table if exists public.profiles
  add column if not exists temp_password_hash text,
  add column if not exists temp_password_set_at timestamptz,
  add column if not exists must_change_password boolean default false;
