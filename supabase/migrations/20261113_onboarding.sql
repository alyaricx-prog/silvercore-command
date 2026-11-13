-- Add onboarded flag to profiles so we can detect first-time employee logins
alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Existing profiles (hosts who already set up) should be marked as onboarded
update public.profiles set onboarded = true where role in ('host', 'cohost');
