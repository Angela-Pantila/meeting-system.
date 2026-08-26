-- ============================================================
-- Meeting Management System — Supabase SQL Migration (v2)
-- Multi-department: one department per user, department head
-- (or admin) requests meetings. First registered user = admin.
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Departments ----------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  description text default '',
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;

-- ---------- Profiles (extends auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'staff'
    check (role in ('staff', 'head', 'admin')),
  department_id uuid references public.departments (id) on delete set null,
  contact_number text default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------- Meeting rooms ----------
create table if not exists public.meeting_rooms (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments (id) on delete set null,
  name text not null,
  location text,
  capacity integer default 0,
  facilities text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.meeting_rooms enable row level security;

-- ---------- Meetings ----------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  title text not null,
  description text default '',
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_type text not null default 'in_person'
    check (meeting_type in ('in_person', 'online', 'hybrid')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  room_id uuid references public.meeting_rooms (id) on delete set null,
  online_link text default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meetings enable row level security;

-- ---------- Participants ----------
create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  participant_role text not null default 'member'
    check (participant_role in ('organizer', 'chair', 'secretary', 'member', 'guest')),
  rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'accepted', 'declined')),
  attended boolean not null default false,
  created_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

alter table public.meeting_participants enable row level security;

-- ---------- Agenda items ----------
create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text default '',
  duration_minutes integer default 0,
  presenter_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.agenda_items enable row level security;

-- ---------- Documents ----------
create table if not exists public.meeting_documents (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  name text not null,
  file_path text not null,
  file_type text default '',
  size_bytes bigint default 0,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.meeting_documents enable row level security;

-- ---------- Minutes ----------
create table if not exists public.minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  section text not null default 'General',
  content text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.minutes enable row level security;

-- ---------- Decisions ----------
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null,
  description text default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.decisions enable row level security;

-- ---------- Action items ----------
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null,
  description text default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.action_items enable row level security;

-- ---------- Follow-ups ----------
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  action_item_id uuid references public.action_items (id) on delete set null,
  title text not null,
  description text default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  status text not null default 'open'
    check (status in ('open', 'completed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.follow_ups enable row level security;

-- ---------- Meeting reminders ----------
create table if not exists public.meeting_reminders (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  message text not null,
  channel text not null default 'app'
    check (channel in ('app', 'email')),
  status text not null default 'sent'
    check (status in ('sent', 'failed')),
  sent_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.meeting_reminders enable row level security;

-- ---------- Schedule change log (reason required) ----------
create table if not exists public.meeting_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  reason text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  old_start timestamptz,
  new_start timestamptz,
  old_end timestamptz,
  new_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.meeting_schedule_changes enable row level security;

-- ---------- In-app notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'info'
    check (type in ('info', 'reschedule', 'reminder', 'system')),
  title text not null,
  message text default '',
  related_meeting_id uuid references public.meetings (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;


-- ============================================================
-- Helper functions used by RLS policies (security definer to
-- avoid policy recursion). STABLE, safe for policy expressions.
-- ============================================================

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'staff');
$$;

create or replace function public.current_user_department()
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_department_admin(target_department uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or (p.role = 'head' and p.department_id = target_department))
  );
$$;

create or replace function public.belongs_to_department(target_department uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.department_id = target_department)
  );
$$;

create or replace function public.meeting_department(target_meeting uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.meetings where id = target_meeting;
$$;

-- ---------- Updated-at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meetings_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

create trigger action_items_updated_at
  before update on public.action_items
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Auto-create profile on signup ----------
-- The very first registered user becomes the global admin.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS policies
-- ============================================================

-- Departments: everyone can read (including unauthenticated for registration); only admins manage.
create policy "departments select" on public.departments
  for select using (true);
create policy "departments insert" on public.departments
  for insert with check (public.current_user_role() = 'admin');
create policy "departments update" on public.departments
  for update using (public.current_user_role() = 'admin');
create policy "departments delete" on public.departments
  for delete using (public.current_user_role() = 'admin');

-- Profiles: department members read; only admins edit.
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
create policy "profiles delete" on public.profiles
  for delete using (public.current_user_role() = 'admin');

-- Rooms: any authenticated user.
create policy "rooms select" on public.meeting_rooms
  for select using (public.belongs_to_department(department_id));
create policy "rooms insert" on public.meeting_rooms
  for insert with check (public.is_department_admin(department_id));
create policy "rooms update" on public.meeting_rooms
  for update using (public.is_department_admin(department_id))
  with check (public.is_department_admin(department_id));
create policy "rooms delete" on public.meeting_rooms
  for delete using (public.is_department_admin(department_id));

-- Meetings: department members read; department head / admin write.
create policy "meetings select" on public.meetings
  for select using (public.belongs_to_department(department_id));
create policy "meetings insert" on public.meetings
  for insert with check (public.is_department_admin(department_id));
create policy "meetings update" on public.meetings
  for update using (public.is_department_admin(department_id))
  with check (public.is_department_admin(department_id));
create policy "meetings delete" on public.meetings
  for delete using (public.is_department_admin(department_id));

-- Child tables (participants, agenda, documents, minutes, decisions,
-- action items, follow-ups): members read, department head / admin write.
create policy "participants select" on public.meeting_participants
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "participants insert" on public.meeting_participants
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "participants update" on public.meeting_participants
  for update using (
    public.is_department_admin(public.meeting_department(meeting_id))
    or user_id = auth.uid()
  )
  with check (
    public.is_department_admin(public.meeting_department(meeting_id))
    or (user_id = auth.uid() and public.belongs_to_department(public.meeting_department(meeting_id)))
  );
create policy "participants delete" on public.meeting_participants
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

create policy "agenda select" on public.agenda_items
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "agenda insert" on public.agenda_items
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "agenda update" on public.agenda_items
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "agenda delete" on public.agenda_items
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

create policy "documents select" on public.meeting_documents
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "documents insert" on public.meeting_documents
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "documents delete" on public.meeting_documents
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

create policy "minutes select" on public.minutes
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "minutes insert" on public.minutes
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "minutes delete" on public.minutes
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

create policy "decisions select" on public.decisions
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "decisions insert" on public.decisions
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "decisions delete" on public.decisions
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

create policy "action items select" on public.action_items
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "action items insert" on public.action_items
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "action items update" on public.action_items
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "action items delete" on public.action_items
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

create policy "follow ups select" on public.follow_ups
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "follow ups insert" on public.follow_ups
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "follow ups update" on public.follow_ups
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "follow ups delete" on public.follow_ups
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

-- Reminders: department members read; head / admin send.
create policy "reminders select" on public.meeting_reminders
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "reminders insert" on public.meeting_reminders
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "reminders update" on public.meeting_reminders
  for update using (public.is_department_admin(public.meeting_department(meeting_id)))
  with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "reminders delete" on public.meeting_reminders
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

-- Schedule changes: department members read the log; head / admin log changes.
create policy "schedule changes select" on public.meeting_schedule_changes
  for select using (public.belongs_to_department(public.meeting_department(meeting_id)));
create policy "schedule changes insert" on public.meeting_schedule_changes
  for insert with check (public.is_department_admin(public.meeting_department(meeting_id)));
create policy "schedule changes delete" on public.meeting_schedule_changes
  for delete using (public.is_department_admin(public.meeting_department(meeting_id)));

-- Notifications: users only see / read their own.
create policy "notifications select" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications insert" on public.notifications
  for insert with check (
    user_id = auth.uid()
    or public.is_department_admin(public.meeting_department(related_meeting_id))
  );
create policy "notifications update" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications delete" on public.notifications
  for delete using (user_id = auth.uid());

-- Notify all admins (used when a meeting is rescheduled). Security definer so
-- the caller doesn't need to read admin rows; validates the caller is a manager
-- of the meeting's department.
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

-- ---------- Storage bucket for meeting documents ----------
insert into storage.buckets (id, name, public)
values ('meeting-docs', 'meeting-docs', false)
on conflict (id) do nothing;

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
