-- ============================================================
-- Security hardening migration
-- Run ONCE in Supabase Dashboard > SQL Editor on your deployed project.
-- ============================================================

-- ---------- 0. Add contact_number column ----------
alter table public.profiles add column if not exists contact_number text default '';

-- Departments readable by everyone (needed during registration before login)
drop policy if exists "departments select" on public.departments;
create policy "departments select" on public.departments
  for select using (true);

-- Fix: all FK columns to profiles (enables PostgREST joins across all tables)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth' AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
      AND tc.table_name != 'profiles'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I; ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      r.table_name, r.constraint_name, r.table_name, r.constraint_name, r.column_name
    );
  END LOOP;
END $$;

-- ---------- 1. Profiles: stop self-promotion ----------
-- Previously any user could UPDATE their own row and set role='admin'.
drop policy if exists "profiles select" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles update admin" on public.profiles;

create policy "profiles select" on public.profiles
  for select using (
    public.current_user_role() = 'admin'
    or public.belongs_to_department(department_id)
  );
create policy "profiles insert" on public.profiles
  for insert with check (auth.uid() = id and role = 'staff');
create policy "profiles update admin" on public.profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------- 2. Update policies: validate the NEW row ----------
-- Prevents moving meetings/rooms/items into another department.
drop policy if exists "rooms update" on public.meeting_rooms;
create policy "rooms update" on public.meeting_rooms
  for update using (public.is_department_admin(department_id))
  with check (public.is_department_admin(department_id));

drop policy if exists "meetings update" on public.meetings;
create policy "meetings update" on public.meetings
  for update using (public.is_department_admin(department_id))
  with check (public.is_department_admin(department_id));

drop policy if exists "participants update" on public.meeting_participants;
create policy "participants update" on public.meeting_participants
  for update using (
    public.is_department_admin(public.meeting_department(meeting_id))
    or user_id = auth.uid()
  )
  with check (
    public.is_department_admin(public.meeting_department(meeting_id))
    or (user_id = auth.uid() and public.belongs_to_department(public.meeting_department(meeting_id)))
  );

drop policy if exists "agenda update" on public.agenda_items;
create policy "agenda update" on public.agenda_items
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));

drop policy if exists "action items update" on public.action_items;
create policy "action items update" on public.action_items
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));

drop policy if exists "follow ups update" on public.follow_ups;
create policy "follow ups update" on public.follow_ups
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));

drop policy if exists "reminders update" on public.meeting_reminders;
create policy "reminders update" on public.meeting_reminders
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));

-- ---------- 3. Notifications: only self, or a manager of the meeting ----------
drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert" on public.notifications
  for insert with check (
    user_id = auth.uid()
    or public.is_department_admin(public.meeting_department(related_meeting_id))
  );

-- Notify all admins (reschedule). Validates the caller is a manager of the meeting's dept.
create or replace function public.notify_all_admins(
  p_meeting_id uuid,
  p_title text,
  p_message text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (
    public.current_user_role() = 'admin'
    or public.is_department_admin(public.meeting_department(p_meeting_id))
  ) then
    raise exception 'Only managers can notify admins';
  end if;
  insert into public.notifications (user_id, type, title, message, related_meeting_id)
  select id, 'reschedule', p_title, p_message, p_meeting_id
  from public.profiles
  where role = 'admin';
end;
$$;

-- ---------- 4. Storage: documents scoped to the meeting's department ----------
-- Previously any logged-in user could read/upload/delete any file.
drop policy if exists "meeting docs read" on storage.objects;
drop policy if exists "meeting docs upload" on storage.objects;
drop policy if exists "meeting docs delete" on storage.objects;

create policy "meeting docs read" on storage.objects
  for select using (
    bucket_id = 'meeting-docs'
    and exists (
      select 1
      from public.meeting_documents md
      join public.meetings m on m.id = md.meeting_id
      where md.file_path = name
        and public.belongs_to_department(m.department_id)
    )
  );

create policy "meeting docs upload" on storage.objects
  for insert with check (
    bucket_id = 'meeting-docs'
    and exists (
      select 1
      from public.meetings m
      where m.id::text = (storage.foldername(name))[1]
        and public.is_department_admin(m.department_id)
    )
  );

create policy "meeting docs delete" on storage.objects
  for delete using (
    bucket_id = 'meeting-docs'
    and exists (
      select 1
      from public.meeting_documents md
      join public.meetings m on m.id = md.meeting_id
      where md.file_path = name
        and public.is_department_admin(m.department_id)
    )
  );

-- ---------- 5. Update trigger to store contact_number ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, full_name, email, role, department_id, contact_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    case when is_first then 'admin' else 'staff' end,
    (new.raw_user_meta_data ->> 'department_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'contact_number', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
