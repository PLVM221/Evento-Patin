create or replace function public.sync_public_event_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
declare public_data jsonb;
begin
  if new.owner_id is null or new.id <> 'current-' || new.owner_id::text then return new; end if;
  public_data := jsonb_build_object(
    'name', new.data->'name', 'organizer', new.data->'organizer', 'organizerLogo', new.data->'organizerLogo',
    'publicFrame', new.data->'publicFrame', 'location', new.data->'location', 'eventDate', new.data->'eventDate',
    'startTime', new.data->'startTime', 'stageCount', new.data->'stageCount', 'currentStage', new.data->'currentStage',
    'completedStages', new.data->'completedStages',
    'started', new.data->'started', 'actualStartedAt', new.data->'actualStartedAt',
    'activeBreakAfter', new.data->'activeBreakAfter', 'breakEndsAt', new.data->'breakEndsAt',
    'breakDurationMinutes', new.data->'breakDurationMinutes', 'showSkaters', new.data->'showSkaters',
    'clubs', new.data->'clubs', 'clubLogos', new.data->'clubLogos', 'teachers', new.data->'teachers',
    'buffetItems', new.data->'buffetItems', 'showBuffet', new.data->'showBuffet', 'showRaffle', new.data->'showRaffle',
    'useFrameOnBuffet', new.data->'useFrameOnBuffet', 'useFrameOnRaffle', new.data->'useFrameOnRaffle',
    'raffleTicketPrice', new.data->'raffleTicketPrice', 'rafflePrices', new.data->'rafflePrices',
    'rafflePrizes', new.data->'rafflePrizes',
    'activeId', case when exists (
      select 1
      from jsonb_array_elements(coalesce(new.data->'skaters', '[]'::jsonb)) active_entry
      where active_entry->>'id' = new.data->>'activeId'
        and coalesce((active_entry->>'showOnPublic')::boolean, true)
    ) then new.data->'activeId' else null end,
    'stageOrders', new.data->'stageOrders',
    'skaters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s->'id', 'entryType', s->'entryType', 'number', s->'number',
        'firstName', s->'firstName', 'lastName', s->'lastName', 'club', s->'club',
        'track', s->'track', 'status', s->'status', 'stageNumber', s->'stageNumber'
      ))
      from jsonb_array_elements(coalesce(new.data->'skaters', '[]'::jsonb)) s
      where s->>'status' <> 'ABSENT'
        and coalesce((s->>'showOnPublic')::boolean, true)
        and case when coalesce((new.data->>'showSkaters')::boolean, true)
          then coalesce(s->>'entryType', 'skater') <> 'club'
          else s->>'entryType' = 'club'
        end
    ), '[]'::jsonb)
  );
  insert into public.public_event_state(channel, owner_id, data, updated_at)
  values ('pista-' || new.owner_id::text, new.owner_id, public_data, now())
  on conflict (channel) do update set data = excluded.data, updated_at = now();
  return new;
end $$;

update public.festival_state set data = data where owner_id is not null and id = 'current-' || owner_id::text;
