-- Insta Engage: Supabase schema (not yet applied; the app runs locally until this exists).
-- Single owner. Every table is RLS-protected to the signed-in owner.
create table if not exists contacts (
  id uuid primary key, owner uuid not null default auth.uid(), handle text not null, data jsonb not null,
  do_not_contact boolean not null default false, updated_at timestamptz not null default now(), unique (owner, handle));
create table if not exists funnels (id text primary key, owner uuid not null default auth.uid(), data jsonb not null);
create table if not exists threads (
  id uuid primary key, owner uuid not null default auth.uid(), contact_id uuid references contacts(id) on delete cascade,
  funnel_id text references funnels(id), stage_id text, status text, due_at timestamptz, data jsonb not null,
  updated_at timestamptz not null default now());
create table if not exists reports (
  id uuid primary key, owner uuid not null default auth.uid(), contact_id uuid references contacts(id) on delete cascade,
  status text not null, data jsonb not null, created_at timestamptz not null default now());
create table if not exists content (id text primary key, owner uuid not null default auth.uid(), data jsonb not null);
create table if not exists settings (owner uuid primary key default auth.uid(), data jsonb not null);

do $$ declare t text; begin
  foreach t in array array['contacts','funnels','threads','reports','content','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t || '_owner', t);
  end loop;
end $$;
create index if not exists threads_status_due on threads (owner, status, due_at);
