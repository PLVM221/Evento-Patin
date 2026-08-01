-- Base event state table and initial realtime publication.
create table if not exists public.festival_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.festival_state enable row level security;

drop policy if exists "festival_state_select" on public.festival_state;
create policy "festival_state_select" on public.festival_state for select to anon, authenticated using (true);

drop policy if exists "festival_state_insert" on public.festival_state;
create policy "festival_state_insert" on public.festival_state for insert to anon, authenticated with check (true);

drop policy if exists "festival_state_update" on public.festival_state;
create policy "festival_state_update" on public.festival_state for update to anon, authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.festival_state;
exception when duplicate_object then null;
end $$;

