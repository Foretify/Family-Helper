-- ============================================================
-- Family Helper — Supabase Database Migration
-- Run this in the Supabase SQL Editor (project > SQL Editor)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PROFILES  (extends auth.users)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'member' check (role in ('admin', 'member')),
  avatar_color text not null default '#6366f1',
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 2. TASKS  (admin-managed task library)
-- ----------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  points      integer check (points >= 0),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. ASSIGNMENTS  (daily task assignments)
-- ----------------------------------------------------------------
create table if not exists public.assignments (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  assigned_to   uuid not null references public.profiles(id) on delete cascade,
  assigned_date date not null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (task_id, assigned_to, assigned_date)
);

-- ----------------------------------------------------------------
-- 4. COMPLETIONS  (tracks when an assignment is completed)
-- ----------------------------------------------------------------
create table if not exists public.completions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  completed_by  uuid not null references public.profiles(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (assignment_id, completed_by)
);

-- ----------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.tasks       enable row level security;
alter table public.assignments enable row level security;
alter table public.completions enable row level security;

-- ----------------------------------------------------------------
-- 6. HELPER: check if the current user is an admin
-- ----------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------
-- 7. PROFILES policies
-- ----------------------------------------------------------------

-- Anyone authenticated can read all profiles (needed to list family members)
create policy "profiles: authenticated read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Users can insert their own profile (during sign-up)
create policy "profiles: self insert"
  on public.profiles for insert
  with check (id = auth.uid());

-- Users can update their own profile; admins can update any
create policy "profiles: self or admin update"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------
-- 8. TASKS policies
-- ----------------------------------------------------------------

-- All authenticated users can read tasks
create policy "tasks: authenticated read"
  on public.tasks for select
  using (auth.role() = 'authenticated');

-- Only admins can insert / update / delete tasks
create policy "tasks: admin insert"
  on public.tasks for insert
  with check (public.is_admin());

create policy "tasks: admin update"
  on public.tasks for update
  using (public.is_admin());

create policy "tasks: admin delete"
  on public.tasks for delete
  using (public.is_admin());

-- ----------------------------------------------------------------
-- 9. ASSIGNMENTS policies
-- ----------------------------------------------------------------

-- Members see only their own; admins see all
create policy "assignments: member or admin read"
  on public.assignments for select
  using (assigned_to = auth.uid() or public.is_admin());

-- Only admins can create / delete assignments
create policy "assignments: admin insert"
  on public.assignments for insert
  with check (public.is_admin());

create policy "assignments: admin delete"
  on public.assignments for delete
  using (public.is_admin());

-- ----------------------------------------------------------------
-- 10. COMPLETIONS policies
-- ----------------------------------------------------------------

-- Members see their own completions; admins see all
create policy "completions: member or admin read"
  on public.completions for select
  using (completed_by = auth.uid() or public.is_admin());

-- Members can mark their own assignments complete (insert)
create policy "completions: self insert"
  on public.completions for insert
  with check (completed_by = auth.uid());

-- Members can undo their own completions (delete)
create policy "completions: self delete"
  on public.completions for delete
  using (completed_by = auth.uid());

-- ----------------------------------------------------------------
-- 11. REALTIME  (enable realtime for live updates)
-- ----------------------------------------------------------------
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table
    public.tasks,
    public.assignments,
    public.completions;
commit;
