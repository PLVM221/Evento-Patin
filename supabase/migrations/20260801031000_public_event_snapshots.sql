create table if not exists public.public_event_state (
  channel text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.public_event_state enable row level security;
create policy "public_read_event_snapshots" on public.public_event_state for select to anon, authenticated using (true);
grant select on public.public_event_state to anon, authenticated;

create or replace function public.publish_event_snapshot(p_channel text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_channel !~ '^pista-[a-zA-Z0-9-]{8,80}$' then raise exception 'forbidden'; end if;
  insert into public.public_event_state(channel, owner_id, data, updated_at)
  values (p_channel, auth.uid(), p_data, now())
  on conflict (channel) do update set data = excluded.data, updated_at = now()
  where public.public_event_state.owner_id = auth.uid();
  if not found then raise exception 'forbidden'; end if;
end $$;

revoke all on function public.publish_event_snapshot(text,jsonb) from public, anon;
grant execute on function public.publish_event_snapshot(text,jsonb) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.public_event_state;
exception when duplicate_object then null;
end $$;
