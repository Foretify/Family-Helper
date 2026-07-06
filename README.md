# Family Helper

A multi-user web app for tracking daily family tasks. Parents (admins) define
the task library and the daily assignments; every family member logs in, sees
their own list, and checks tasks off.

---

## Features

- **Session-based auth** with bcrypt password hashing and rate-limited login
- **Role-based access control** — Admin (parent) and Member (child) roles
- **Task Library** — admins create reusable task templates with rich Markdown instructions, recurrence rules, and a default assignee
- **Daily Board** (admin) — full household overview for any date; skip, reassign, verify, or add ad-hoc tasks on the fly
- **My Day** (member) — personal daily checklist, progress bar, and instructions viewer/editor
- **Verification flow** — admins can mark completed tasks as verified; visually distinct from unverified-done
- **History view** — per-person, per-date task history with status filters; admins also get a full audit log
- **Audit trail** — every create/edit/override/verify writes to `audit_log`
- **Tenant-ready data model** — all data scoped to a `household` for easy multi-family expansion later

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js 22+ · Express 4 · `node:sqlite` (built-in) |
| Auth | express-session · bcryptjs · express-rate-limit |
| Frontend | React 19 · Vite · Tailwind CSS 3 · react-router-dom · axios |

---

## Getting Started

### 1. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
# Edit SESSION_SECRET to something random
```

### 3. Seed the demo database

```bash
cd server && npm run seed
```

This creates:

| Email | Password | Role |
|---|---|---|
| admin@family.local | admin123 | Admin |
| alice@family.local | alice123 | Member |
| bob@family.local | bob123 | Member |

### 4. Start development servers

In two terminals:

```bash
# Terminal 1 — API server (port 3000)
cd server && npm run dev

# Terminal 2 — React dev server (port 5173, proxies /api → 3000)
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

### 5. Production build

```bash
cd client && npm run build
# The built files land in client/dist/
# The Express server serves them automatically when NODE_ENV=production
```

Start the combined server:

```bash
cd server && NODE_ENV=production node src/index.js
```

---

## Data Model

```
households      — tenant boundary; one row per family
users           — household_id, name, email, password_hash, role, avatar_color
tasks           — reusable template: title, instructions, recurrence, default_assignee_id
task_instances  — one occurrence per task × person × date; tracks status, completion, verification
audit_log       — append-only record of every meaningful action
```

### Recurrence options

| Value | When it runs |
|---|---|
| `daily` | Every day |
| `weekdays` | Monday–Friday |
| `weekends` | Saturday–Sunday |
| `custom_days` | Specific days of the week (stored as JSON array of 0–6) |
| `one_off` | Never auto-generated — added manually via Daily Board |

---

## API Reference

All endpoints require an active session cookie (set by `POST /api/auth/login`).

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login; returns user object; sets session cookie |
| POST | `/api/auth/logout` | Destroys session |
| GET | `/api/auth/me` | Returns current user |

### Users (admin)
| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List household members |
| POST | `/api/users` | Create member (admin) |
| PATCH | `/api/users/:id` | Update user (admin or self) |
| DELETE | `/api/users/:id` | Delete member (admin) |

### Tasks (admin CRUD)
| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List active tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Deactivate task (soft delete) |
| PATCH | `/api/tasks/:id/instructions` | Update instructions (member if assignee) |

### Task Instances
| Method | Path | Description |
|---|---|---|
| GET | `/api/instances?date=&user_id=` | Fetch instances; materializes today on first call |
| POST | `/api/instances` | Create ad-hoc instance (admin) |
| PATCH | `/api/instances/:id` | `action`: `complete`, `uncomplete`, `verify`, `skip`, `reassign`, `update_instructions` |
| DELETE | `/api/instances/:id` | Hard delete (admin) |

### History
| Method | Path | Description |
|---|---|---|
| GET | `/api/history` | Task history with filters: `user_id`, `date_from`, `date_to`, `status` |
| GET | `/api/history/audit` | Audit log (admin only) |

---

## Project Structure

```
Family-Helper/
├── server/
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── app.js             # Express app, middleware, routes
│   │   ├── db.js              # node:sqlite setup + schema
│   │   ├── seed.js            # Demo data seeder
│   │   ├── middleware/
│   │   │   └── auth.js        # requireAuth, requireAdmin
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── tasks.js
│   │   │   ├── instances.js
│   │   │   └── history.js
│   │   └── utils/
│   │       ├── audit.js       # writeAudit()
│   │       └── materialize.js # materializeDay()
│   └── package.json
└── client/
    ├── src/
    │   ├── api/client.js      # Axios API wrappers
    │   ├── context/AuthContext.jsx
    │   ├── components/        # Layout, Avatar, StatusBadge, InstructionsModal
    │   └── pages/
    │       ├── Login.jsx
    │       ├── MyDay.jsx      # Member daily checklist
    │       ├── AdminBoard.jsx # Admin family board
    │       ├── TaskLibrary.jsx
    │       ├── Members.jsx
    │       └── History.jsx
    └── package.json
```

