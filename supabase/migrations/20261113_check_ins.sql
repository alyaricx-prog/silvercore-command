-- Check-ins table: employees check in at assignment locations
create table if not exists public.check_ins (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  note            text,
  lat             double precision,
  lng             double precision,
  created_at      timestamptz not null default now()
);

-- Index for quick lookups by assignment and employee
create index if not exists check_ins_assignment_id_idx on public.check_ins(assignment_id);
create index if not exists check_ins_employee_id_idx   on public.check_ins(employee_id);
create index if not exists check_ins_org_id_idx        on public.check_ins(organisation_id);

-- RLS
alter table public.check_ins enable row level security;

-- Employees can insert their own check-ins
create policy "Employees can check in"
  on public.check_ins for insert
  with check (
    employee_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = check_ins.organisation_id
    )
  );

-- Org members can read all check-ins for their org
create policy "Org members can view check-ins"
  on public.check_ins for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = check_ins.organisation_id
    )
  );

-- Hosts/cohosts can delete check-ins in their org
create policy "Hosts can delete check-ins"
  on public.check_ins for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = check_ins.organisation_id
        and role in ('host', 'cohost')
    )
  );
