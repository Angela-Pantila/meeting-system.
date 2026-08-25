# Meeting Management System (Governance)

A multi-department **Meeting Management System** that handles **meeting requests, schedules, participants, agendas, meeting rooms, online meeting links, documents, attendance, minutes, decisions, assigned action items, deadlines, and follow-ups** — scoped per department.

Built to run on **phone and desktop** and to deploy free on **Vercel (frontend)** + **Supabase (database, auth, file storage)** + **GitHub (repo)**.

---

## Roles & department model

- **Department** — each department (IT, HR, Finance, …) is its own section. Staff only ever see their own department's meetings, participants, minutes, and action items.
- **Staff** — assigned to one department. Can view meetings, RSVP, mark their own attendance, view minutes/documents/action items. **Cannot create meetings.**
- **Department Head** — the only role that can **request/schedule meetings** (and manage agenda, participants, minutes, decisions, action items, documents) **for their department only**.
- **Admin** — global. Creates departments, **assigns users to their department**, promotes staff to head, and can create/manage meetings in any department.

> **Only the admin adds users/staff to their designated department.** The first registered user automatically becomes the admin; every later registration starts as unassigned staff until the admin assigns them.

---

## Stack

| Layer    | Technology                                                    |
| -------- | ------------------------------------------------------------- |
| Frontend | Vite + React 18 + Tailwind CSS + React Router                  |
| Backend  | Supabase (Postgres, Auth, Storage, Row Level Security)         |
| Hosting  | Vercel (frontend), Supabase (data), GitHub (repo)              |

> A Render service is **not required** — all backend work is handled by Supabase.

---

## Features

- **Auth** — email/password via Supabase Auth (registration = name, email, password only)
- **Admin** — manage **Departments** (create/delete) and **Users** (assign department + role)
- **Dashboard** — stats, upcoming meetings, your open action items (scoped to your department)
- **Meetings** — only heads/admins create; statuses: requested → scheduled → in progress → completed / cancelled
- **Meeting detail** (department-scoped)
  - Overview: schedule, room/online link, department, attendance summary, RSVP
  - Agenda, Participants (roles, RSVP, attendance), Minutes & Decisions
  - Action items (assignee + due date + overdue detection) and Follow-ups
  - Documents (Supabase Storage)
  - **Add to calendar** — exports a `.ics` file users can import into their **Gmail / Google Calendar**
- **Rooms** — department-owned rooms; heads see/manage only their own department's rooms, admins manage all. When a head schedules a meeting they only see rooms in their own department.
- **Schedule** (heads & admin) — search staff by **email or name** to see their upcoming/past meetings and avoid scheduling conflicts
- **Reminders** — heads/admin send reminders to participants; delivered **in-app (bell notifications)** and/or **email (Gmail)** via the `send-reminder` Supabase Edge Function (Resend)
- **Schedule changes** — only heads/admin can change a meeting's date/time; a **reason is required** and is logged in the meeting history and **notified to the admin**
- Fully **responsive**: sidebar on desktop, slide-over menu + bottom sheets on phones

---

## Project structure

```
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── supabase/
│   ├── schema.sql            # full database migration (v2, multi-department)
│   └── functions/
│       └── send-reminder/    # Edge Function: email reminders via Resend
│           └── index.ts
└── src/
    ├── main.jsx
    ├── App.jsx               # routes + role guards (AdminOnly, CanCreateMeeting, CanViewSchedule)
    ├── index.css
    ├── lib/
    │   ├── supabase.js
    │   ├── utils.js
    │   └── ics.js            # .ics / Google Calendar export
    ├── context/AuthContext.jsx
    ├── components/
    │   └── NotificationBell.jsx   # in-app notifications dropdown
    └── pages/
        ├── Login.jsx  Register.jsx  Dashboard.jsx  Meetings.jsx
        ├── CreateMeeting.jsx  MeetingDetail.jsx  Rooms.jsx  Profile.jsx
        ├── Departments.jsx  Users.jsx            # admin only
        ├── Schedule.jsx                           # head/admin staff schedule search
        └── meeting/          # Overview, Agenda, Participants, Minutes,
                              # Actions, Documents tabs
```

---

## Deploy steps

### 1. GitHub

```bash
git init
git add .
git commit -m "Initial commit: meeting management system"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Supabase

1. Create a project at https://supabase.com (free plan).
2. Open **SQL Editor**, paste the entire contents of `supabase/schema.sql`, then **Run**.
3. Enable email auth under **Authentication → Providers → Email**.
4. Create the storage bucket under **Storage → New bucket**: name `meeting-docs`, **Public: off** (policies are included in `schema.sql`).
5. Under **Project Settings → API**, copy the **Project URL** and **anon public key**.

### 3. Vercel

1. Import the GitHub repo at https://vercel.com/new.
2. Framework preset: **Vite** (auto-detected).
3. Add environment variables:

   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Deploy. Build command is `npm run build` (Vite defaults, no changes needed).

### 4. Send-reminder Edge Function (email reminders)

Optional — required only for **email (Gmail)** reminders; in-app bell reminders work without it.

```bash
cd supabase
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy send-reminder
```

Set these secrets in **Supabase Dashboard → Edge Functions → send-reminder → Secrets**:

```
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=Meetings <onboarding@resend.dev>
```

> The function verifies the caller is a manager, then sends one email per participant using [Resend](https://resend.com). If it fails (not deployed / no key), the reminder is still saved with status `failed`.

### 5. First login / setup

1. Register the **first account** — it becomes the global **admin**.
2. As admin: **Departments** → create IT, HR, etc.
3. As admin: **Users** → assign each registered user to a department; promote the department leads to **head**.
4. Heads can now schedule meetings and add staff from their department.

### Local development (optional)

```bash
npm install
cp .env.example .env   # fill in your Supabase values
npm run dev            # http://localhost:5173
```

---

## Data model

- `departments` — name, code, description
- `profiles` — full name, email, role (`staff` / `head` / `admin`), department
- `meetings` — department, type (in-person/online/hybrid), room, online link, lifecycle status
- `meeting_rooms` (department-owned, capacity, facilities), `meeting_participants` (role, RSVP, attendance), `agenda_items`
- `meeting_documents` (files in `meeting-docs` bucket), `minutes`, `decisions`
- `action_items` (assignee, due date, status), `follow_ups` (optionally linked to an action item)
- `meeting_reminders` (message, channel `app`/`email`, send status, sender)
- `meeting_schedule_changes` (reason required, old/new times, changed by)
- `notifications` (bell notifications: type `reschedule` / `reminder` / `info`, read flag)

## Security (RLS)

Row Level Security is enabled on every table and enforced through helper functions:

| Who | Can do |
| --- | --- |
| **Staff** | Read own department's data; RSVP / mark own attendance |
| **Head** | Read + write everything within their department |
| **Admin** | Read + write everything, all departments; manages departments & users |

The first-registered-user-become-admin logic lives in the `handle_new_user()` trigger.
