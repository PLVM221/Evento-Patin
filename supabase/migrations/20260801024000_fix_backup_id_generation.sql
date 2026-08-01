create or replace function public.save_festival_backup(p_data jsonb, p_revision bigint)
returns text language plpgsql security definer set search_path = public as $$
declare backup_id text;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  backup_id := 'saved-' || auth.uid()::text || '-' || md5(clock_timestamp()::text || random()::text);
  insert into public.festival_state(id, owner_id, data, revision, updated_at)
  values (backup_id, auth.uid(), p_data, p_revision, now());
  return backup_id;
end $$;

revoke all on function public.save_festival_backup(jsonb,bigint) from public, anon;
grant execute on function public.save_festival_backup(jsonb,bigint) to authenticated;
