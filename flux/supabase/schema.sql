-- ============================================================================
-- FLUX — Supabase schema, RLS and auth wiring.
-- Run this once in your Supabase project: SQL Editor → paste → Run.
-- Safe to re-run (idempotent where it matters).
-- ============================================================================

-- Each user belongs to a workspace keyed to their email DOMAIN, so colleagues
-- on the same domain automatically share data. Data is stored as JSONB so the
-- schema never drifts from the app's TypeScript types.

create extension if not exists pgcrypto;

-- --- Workspaces & profiles --------------------------------------------------

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

-- Returns the caller's workspace. SECURITY DEFINER so RLS policies can call it
-- without recursing into the profiles policy.
create or replace function public.current_workspace()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

-- On signup: find-or-create the domain workspace and link a profile to it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dom text;
  ws  uuid;
begin
  dom := lower(split_part(new.email, '@', 2));
  select id into ws from public.workspaces where domain = dom;
  if ws is null then
    insert into public.workspaces (domain, name) values (dom, dom) returning id into ws;
  end if;
  insert into public.profiles (id, email, workspace_id) values (new.id, new.email, ws)
  on conflict (id) do update set workspace_id = excluded.workspace_id, email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Data tables (one shape, four entities) ---------------------------------

create table if not exists public.projects (
  id           text primary key,
  workspace_id uuid not null references public.workspaces on delete cascade,
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);
create table if not exists public.processes (
  id           text primary key,
  workspace_id uuid not null references public.workspaces on delete cascade,
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);
create table if not exists public.opportunities (
  id           text primary key,
  workspace_id uuid not null references public.workspaces on delete cascade,
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);
create table if not exists public.knowledge (
  id           text primary key,
  workspace_id uuid not null references public.workspaces on delete cascade,
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);

create index if not exists projects_ws_idx      on public.projects (workspace_id);
create index if not exists processes_ws_idx      on public.processes (workspace_id);
create index if not exists opportunities_ws_idx  on public.opportunities (workspace_id);
create index if not exists knowledge_ws_idx      on public.knowledge (workspace_id);

-- --- Row-level security -----------------------------------------------------

alter table public.workspaces    enable row level security;
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.processes     enable row level security;
alter table public.opportunities enable row level security;
alter table public.knowledge     enable row level security;

-- Profiles: a user can read their own profile.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (id = auth.uid());

-- Workspaces: members can read their workspace.
drop policy if exists "read own workspace" on public.workspaces;
create policy "read own workspace" on public.workspaces
  for select using (id = public.current_workspace());

-- Data tables: full access scoped to the caller's workspace.
do $$
declare t text;
begin
  foreach t in array array['projects','processes','opportunities','knowledge'] loop
    execute format('drop policy if exists "ws all" on public.%I;', t);
    execute format(
      'create policy "ws all" on public.%I for all
         using (workspace_id = public.current_workspace())
         with check (workspace_id = public.current_workspace());', t);
  end loop;
end$$;

-- --- Realtime ---------------------------------------------------------------
-- Enable realtime so teammates see each other's changes live.
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.processes;
alter publication supabase_realtime add table public.opportunities;
alter publication supabase_realtime add table public.knowledge;

-- Done. Create users by signing in from the app with a work email.
