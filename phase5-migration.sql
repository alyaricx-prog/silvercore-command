-- ============================================================
-- SilverCore Command — Phase 5 Migration
-- Run once in Supabase SQL editor
-- ============================================================

-- 1. customers
create table if not exists public.customers (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  name             text not null,
  phone            text,
  email            text,
  address          text,
  lat              double precision,
  lng              double precision,
  tags             text[],
  status           text not null default 'active',
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.customers enable row level security;
create policy "org members read own customers" on public.customers for select
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "org members insert customers" on public.customers for insert
  with check (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "org members update customers" on public.customers for update
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));

-- 2. customer_events
create table if not exists public.customer_events (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  customer_id      uuid not null references public.customers(id) on delete cascade,
  logged_by        uuid references public.profiles(id),
  kind             text not null,
  summary          text not null,
  deal_log_id      uuid references public.deal_logs(id),
  created_at       timestamptz not null default now()
);
alter table public.customer_events enable row level security;
create policy "org members manage customer events" on public.customer_events for all
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));

-- 3. contracts
create table if not exists public.contracts (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  title            text not null,
  description      text,
  value_estimate   numeric,
  area             text,
  term_months      int,
  status           text not null default 'evaluating',
  risk_level       text not null default 'moderate',
  risk_score       int,
  risk_factors     jsonb default '[]',
  opportunities    jsonb default '[]',
  eval_notes       text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.contracts enable row level security;
create policy "hosts manage contracts" on public.contracts for all
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));

-- 4. goals
create table if not exists public.goals (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  profile_id       uuid references public.profiles(id) on delete cascade,
  title            text not null,
  metric           text not null,
  target           int not null,
  current_value    int not null default 0,
  period           text not null default 'weekly',
  period_start     date not null,
  period_end       date not null,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy "org members read goals" on public.goals for select
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "hosts manage goals" on public.goals for all
  using (
    organisation_id = (select organisation_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('host','cohost')
  );

-- 5. badges
create table if not exists public.badges (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  kind             text not null,
  label            text not null,
  earned_at        timestamptz not null default now()
);
alter table public.badges enable row level security;
create policy "org members read badges" on public.badges for select
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "hosts insert badges" on public.badges for insert
  with check (
    organisation_id = (select organisation_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('host','cohost')
  );

-- 6. custom_field_defs
create table if not exists public.custom_field_defs (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  entity           text not null,
  field_key        text not null,
  label            text not null,
  field_type       text not null default 'text',
  options          jsonb,
  required         boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (organisation_id, entity, field_key)
);
alter table public.custom_field_defs enable row level security;
create policy "org members read field defs" on public.custom_field_defs for select
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
create policy "hosts manage field defs" on public.custom_field_defs for all
  using (
    organisation_id = (select organisation_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('host','cohost')
  );

-- 7. custom_field_values
create table if not exists public.custom_field_values (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  field_def_id     uuid not null references public.custom_field_defs(id) on delete cascade,
  entity_id        uuid not null,
  value_text       text,
  value_number     numeric,
  value_boolean    boolean,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.custom_field_values enable row level security;
create policy "org members manage field values" on public.custom_field_values for all
  using (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));

-- 8. audit_events
create table if not exists public.audit_events (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  actor_id         uuid references public.profiles(id),
  entity           text not null,
  entity_id        uuid,
  action           text not null,
  detail           jsonb,
  created_at       timestamptz not null default now()
);
alter table public.audit_events enable row level security;
create policy "hosts read audit" on public.audit_events for select
  using (
    organisation_id = (select organisation_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('host','cohost')
  );
create policy "org members insert audit" on public.audit_events for insert
  with check (organisation_id = (select organisation_id from public.profiles where id = auth.uid()));
