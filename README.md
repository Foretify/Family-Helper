# Family Helper 🏠

A multi-user web app for tracking daily family tasks. Parents (admins) define the task library and daily assignments; every family member logs in, sees their own list, and checks tasks off.

## Tech Stack

- **Frontend**: React 19 + Vite (hosted on Netlify)
- **Styling**: Tailwind CSS v4
- **Auth & Database**: Supabase (Postgres with Row-Level Security)

## Features

- **Auth**: Email/password sign-up & login via Supabase Auth. The first registered user automatically becomes an admin.
- **Admin**: Create/edit/delete tasks in a task library, assign tasks to family members by date, manage family member roles.
- **Members**: Personal dashboard showing today's assigned tasks, check tasks off (and undo), date picker for historical view, points earned summary.
- **Real-time**: Live updates via Supabase subscriptions — tasks check off instantly for everyone.

## Getting Started

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the Supabase SQL Editor, run the migration:
   ```
   supabase/migration.sql
   ```
3. Copy your project URL and anon key from **Project Settings → API**

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy to Netlify

1. Connect this repository to a Netlify site
2. Add environment variables in **Site Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build` — publish dir: `dist` (already configured in `netlify.toml`)

## Project Structure

```
src/
  components/
    Auth/        # LoginForm, RegisterForm
    Admin/       # TaskLibrary, AssignTasks, FamilyMembers
    Member/      # MyTasks, TaskCard
    Shared/      # Navbar, Layout, Avatar
  hooks/         # useAuth, useTasks, useAssignments
  lib/           # supabaseClient.js
  pages/         # LoginPage, RegisterPage, AdminPage, DashboardPage
  App.jsx        # Routes + auth guards
supabase/
  migration.sql  # Full schema + RLS policies
netlify.toml     # Build & SPA redirect config
```

