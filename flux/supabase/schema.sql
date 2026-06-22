-- ============================================================================
-- FLUX — Supabase schema, RLS and auth wiring.  v2: per-project access control.
-- Run this once in your Supabase project: SQL Editor → paste → Run.
-- Re-running is safe (policies/functions are replaced; backfill is idempotent).
-- ============================================================================
--
-- Model:
--   * Every user belongs to a WORKSPACE keyed to their email domain (so only
--     colleagues on your domain can ever be involved).
--   * A PROJECT is private to its creator + the members they invite by email.
--     Processes, opportunities and knowledge inherit their project's access.
--   * Data is stored as JSONB so the schema never drifts from the app's types.
--
-- After running, VERIFY ISOLATION before trusting real data: sign in as user A,
-- create a project; sign in as user B (same domain, not invited) and confirm B
-- cannot see it. Then invite B and confirm they can.
-- ============================================================================

create extension if not exists pgcrypto;

-- --- Workspaces & profiles ---------------------------------------------------

create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  domain     text unique not null,
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  workspace_id uuid references public.workspaces on delete set null,
  created_at   timestamptz not null default now()
);

create or replace function public.current_workspace()
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_email()
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles where id = auth.uid()
$$;

-- On signup: find-or-create the domain workspace and link a profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare dom text; ws uuid;
begin
  dom := lower(split_part(new.email, '@', 2));
  select id into ws from public.workspaces where domain = dom;
  if ws is null then
    insert into public.workspaces (domain, name) values (dom, dom) returning id into ws;
  end if;
  insert into public.profiles (id, email, workspace_id) values (new.id, lower(new.email), ws)
  on conflict (id) do update set workspace_id = excluded.workspace_id, email = excluded.email;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- --- Data tables -------------------------------------------------------------

create table if not exists public.projects (
  id           text primary key,
  workspace_id uuid not null references public.workspaces on delete cascade,
  created_by   uuid default auth.uid(),
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);
-- created_by may be missing on tables made by an older schema:
alter table public.projects add column if not exists created_by uuid default auth.uid();

create table if not exists public.processes (
  id text primary key, workspace_id uuid not null references public.workspaces on delete cascade,
  data jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.opportunities (
  id text primary key, workspace_id uuid not null references public.workspaces on delete cascade,
  data jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.knowledge (
  id text primary key, workspace_id uuid not null references public.workspaces on delete cascade,
  data jsonb not null, updated_at timestamptz not null default now()
);

-- Project membership (invite by email; resolved to a user when they sign in).
create table if not exists public.project_members (
  project_id text not null,
  email      text not null,
  role       text not null default 'member',  -- 'owner' | 'member'
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);

create index if not exists projects_ws_idx     on public.projects (workspace_id);
create index if not exists processes_ws_idx     on public.processes (workspace_id);
create index if not exists opportunities_ws_idx on public.opportunities (workspace_id);
create index if not exists knowledge_ws_idx     on public.knowledge (workspace_id);
create index if not exists members_email_idx    on public.project_members (email);

-- --- Access helpers (SECURITY DEFINER → bypass RLS, avoid recursion) ---------

create or replace function public.accessible_project(pid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = pid and pm.email = public.my_email()
  ) or exists (
    select 1 from public.projects p where p.id = pid and p.created_by = auth.uid()
  )
$$;

create or replace function public.accessible_process(prid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.processes p
    where p.id = prid and public.accessible_project(p.data->>'projectId')
  )
$$;

-- --- RLS ---------------------------------------------------------------------

alter table public.workspaces      enable row level security;
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.processes       enable row level security;
alter table public.opportunities   enable row level security;
alter table public.knowledge       enable row level security;
alter table public.project_members enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid());

drop policy if exists "read own workspace" on public.workspaces;
create policy "read own workspace" on public.workspaces for select using (id = public.current_workspace());

-- Projects: access is purely per-project membership (creator or invited), so a
-- project can be shared ACROSS email domains (e.g. consultancy + client). The
-- email-domain workspace is just a home for new signups, not an access boundary.
drop policy if exists "ws all" on public.projects;
drop policy if exists "projects read"   on public.projects;
drop policy if exists "projects insert" on public.projects;
drop policy if exists "projects modify" on public.projects;
drop policy if exists "projects delete" on public.projects;
create policy "projects read" on public.projects for select
  using (created_by = auth.uid() or public.accessible_project(id));
create policy "projects insert" on public.projects for insert
  with check (created_by = auth.uid());
create policy "projects modify" on public.projects for update
  using (created_by = auth.uid() or public.accessible_project(id))
  with check (created_by = auth.uid() or public.accessible_project(id));
create policy "projects delete" on public.projects for delete
  using (created_by = auth.uid() or public.accessible_project(id));

-- Child tables inherit project access (no workspace gate, so cross-org members write too).
drop policy if exists "ws all" on public.processes;
drop policy if exists "processes all" on public.processes;
create policy "processes all" on public.processes for all
  using (public.accessible_project(data->>'projectId'))
  with check (public.accessible_project(data->>'projectId'));

drop policy if exists "ws all" on public.opportunities;
drop policy if exists "opportunities all" on public.opportunities;
create policy "opportunities all" on public.opportunities for all
  using (public.accessible_process(data->>'processId'))
  with check (public.accessible_process(data->>'processId'));

drop policy if exists "ws all" on public.knowledge;
drop policy if exists "knowledge all" on public.knowledge;
create policy "knowledge all" on public.knowledge for all
  using (public.accessible_project(data->>'projectId'))
  with check (public.accessible_project(data->>'projectId'));

-- Membership: visible to a project's members; manageable by its members.
drop policy if exists "members read"   on public.project_members;
drop policy if exists "members manage" on public.project_members;
create policy "members read" on public.project_members for select
  using (public.accessible_project(project_id));
create policy "members manage" on public.project_members for all
  using (public.accessible_project(project_id))
  with check (public.accessible_project(project_id));

-- --- Backfill: keep any EXISTING projects visible to the whole domain --------
-- (New projects created via the app are private to creator + invitees.)
insert into public.project_members (project_id, email, role)
select pr.id, pf.email, 'member'
from public.projects pr
join public.profiles pf on pf.workspace_id = pr.workspace_id
on conflict (project_id, email) do nothing;

-- --- Realtime ----------------------------------------------------------------
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.processes;
alter publication supabase_realtime add table public.opportunities;
alter publication supabase_realtime add table public.knowledge;
alter publication supabase_realtime add table public.project_members;

-- Done. Create users by signing in from the app with a work email.
