-- Insta Engage: applied to Supabase project `insta-engage` (ukcgzvkurfrntkquxsab, eu-west-2) on 2026-11-20.
-- One owner-scoped store mirrors the app's local tables (contacts, funnels, threads, reports, content, settings).
create table public.records (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('contacts','funnels','threads','reports','content','settings')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (owner, kind, id)
);
create index records_owner_updated on public.records (owner, updated_at);
alter table public.records enable row level security;
create policy records_owner_select on public.records for select to authenticated using (owner = (select auth.uid()));
create policy records_owner_insert on public.records for insert to authenticated with check (owner = (select auth.uid()));
create policy records_owner_update on public.records for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy records_owner_delete on public.records for delete to authenticated using (owner = (select auth.uid()));
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger records_touch before insert or update on public.records for each row execute function public.touch_updated_at();

-- Claude runs write here with the service role / SQL, e.g.:
-- insert into public.records(owner, kind, id, data) values ('<tom uid>', 'contacts', '<uuid>', '{...}')
-- on conflict (owner, kind, id) do update set data = excluded.data;
