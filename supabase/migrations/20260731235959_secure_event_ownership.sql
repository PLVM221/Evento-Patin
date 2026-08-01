-- Secure per-operator ownership and conflict-aware writes.
alter table public.festival_state
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists revision bigint not null default 0;

drop policy if exists "festival_state_select" on public.festival_state;
drop policy if exists "festival_state_insert" on public.festival_state;
drop policy if exists "festival_state_update" on public.festival_state;
drop policy if exists "festival_state_delete" on public.festival_state;

create policy "owners_select_festival_state"
  on public.festival_state for select to authenticated
  using (owner_id = auth.uid());

create policy "owners_insert_festival_state"
  on public.festival_state for insert to authenticated
  with check (owner_id = auth.uid());

create policy "owners_update_festival_state"
  on public.festival_state for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owners_delete_festival_state"
  on public.festival_state for delete to authenticated
  using (owner_id = auth.uid());

revoke all on public.festival_state from anon;
grant select, insert, update, delete on public.festival_state to authenticated;

comment on table public.festival_state is
  'Private operator state. Public screens receive a reduced projection and never read this table.';

create or replace function public.save_festival_state(
  p_id text,
  p_data jsonb,
  p_expected_revision bigint,
  p_new_revision bigint
) returns void language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if auth.uid() is null or p_id <> ('current-' || auth.uid()::text) then
    raise exception 'forbidden';
  end if;
  insert into public.festival_state(id, owner_id, data, revision, updated_at)
    values (p_id, auth.uid(), p_data, p_new_revision, now())
    on conflict (id) do nothing;
  if found then return; end if;
  update public.festival_state set data = p_data, revision = p_new_revision, updated_at = now()
    where id = p_id and owner_id = auth.uid() and revision = p_expected_revision;
  get diagnostics changed = row_count;
  if changed = 0 then raise exception 'revision_conflict' using errcode = '40001'; end if;
end $$;

revoke all on function public.save_festival_state(text,jsonb,bigint,bigint) from public, anon;
grant execute on function public.save_festival_state(text,jsonb,bigint,bigint) to authenticated;
