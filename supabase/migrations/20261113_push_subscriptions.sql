-- Push notification subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "users manage own subscriptions"
  on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Hosts/cohosts can read subscriptions in their org (needed to send pushes)
create policy "org members read subscriptions"
  on public.push_subscriptions
  for select
  using (
    organisation_id in (
      select organisation_id from public.profiles
      where id = auth.uid() and role in ('host', 'cohost')
    )
  );
