-- ============================================================
-- SilverCore Command — Phase 6 Migration
-- Run once in Supabase SQL editor
-- ============================================================

-- 1. reminders
create table if not exists public.reminders (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  created_by       uuid references public.profiles(id),
  assigned_to      uuid references public.profiles(id),   -- null = all org members
  assignment_id    uuid references public.assignments(id),
  title            text not null,
  body             text,
  remind_at        timestamptz not null,
  sent             boolean not null default false,
  created_at       timestamptz not null default now()
);
alter table public.reminders enable row level security;
create policy "org members read own reminders" on public.reminders for select
  using (
    organisation_id = (select organisation_id from public.profiles where id = auth.uid())
    and (assigned_to = auth.uid() or assigned_to is null
         or (select role from public.profiles where id = auth.uid()) in ('host','cohost'))
  );
create policy "hosts manage reminders" on public.reminders for all
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));

-- 2. documents (vault)
create table if not exists public.documents (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  assignment_id    uuid references public.assignments(id),
  uploaded_by      uuid references public.profiles(id),
  name             text not null,
  file_path        text not null,   -- Supabase Storage path
  mime_type        text,
  size_bytes       bigint,
  created_at       timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "org members read documents" on public.documents for select
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "org members insert documents" on public.documents for insert
  with check (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "hosts delete documents" on public.documents for delete
  using (
    organisation_id = (select organisation_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('host','cohost')
  );
