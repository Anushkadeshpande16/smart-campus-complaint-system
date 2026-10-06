# Smart Campus Complaint System

**Report. Track. Resolve. Improve.**

A full-stack platform that centralises the complaint lifecycle on a college campus:
student reports → system records and routes it → admin reviews and assigns → staff fixes it → student verifies → administration analyses the data.

## Features

| Area | What is built |
|---|---|
| Students | Register/login, report with photo + location (Block → Floor → Room/Area) + category + priority, unique ID (`CMP-2026-00124`), dashboard, search/filter, tracking timeline, notifications, confirm or reopen a resolved complaint, 1-5 star feedback, "I'm affected too" support |
| Admin | Dashboard, all complaints with filters (status, category, priority, location, department, date, overdue), verify priority, assign/reassign, change status, escalate, analytics, staff / category / location management, editable escalation hours |
| Staff | Own work queue, details + photo + location, Start work → Resolved with resolution text and optional proof photo, overdue highlighting |
| Smart features | Auto department routing from category, duplicate detection (category + location + keyword overlap), overdue detection from configurable SLA hours, building-level hotspot view |
| Accountability | Full status history (`complaint_status_history`), in-app notifications, assignment log |

## Tech stack
React 18 + Vite + Tailwind CSS 3, Recharts, Node.js + Express, MySQL 8, JWT + bcrypt, Multer (local image storage).

## Setup

Prerequisites: Node 18+, MySQL 8 running locally.

```bash
# 1. install dependencies
npm run setup                      # or: npm --prefix server i && npm --prefix client i

# 2. configure the backend
cp server/.env.example server/.env # then set DB_PASSWORD and JWT_SECRET

# 3. create the schema and load demo data (WIPES the smart_campus database)
npm run seed

# 4. run (two terminals)
npm run server                     # API on http://localhost:5000
npm run client                     # UI  on http://localhost:5173
```

`npm run seed` executes `database/schema.sql` and then inserts demo users and 24 complaints with realistic history. You can also load only the schema with `mysql -u root -p < database/schema.sql`.

### Environment variables (`server/.env`)
`PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`.
Optional client variable: `VITE_API_URL` (only if the API is not served through the Vite proxy).

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@campus.edu | Admin@123 |
| Staff (Electrical) | rahul@campus.edu | Staff@123 |
| Staff (others) | neha / amit / manoj / kavita / suresh / deepak / vikram `@campus.edu` | Staff@123 |
| Student | student@campus.edu | Student@123 |
| Students (others) | ishita / rohan / sneha / karan `@student.campus.edu` | Student@123 |

The seed creates complaints CMP-2026-00100 to 00123, so your first new complaint is **CMP-2026-00124** (when the year is 2026).

## Hackathon demo flow (3 minutes)
1. Log in as `student@campus.edu`, **Report an issue**: "Fan not working", Block A → 2nd Floor → Room 204, Electrical, Medium, attach a photo. A duplicate prompt may appear if a similar open complaint exists; choose *Submit as separate complaint*. You get the ID and the routed department (Electrical Department).
2. Log in as `admin@campus.edu`: the complaint is under *New complaints*. Open it → **Assign to staff** → Rahul Sharma.
3. Log in as `rahul@campus.edu`: open it → **Start work**, then **Mark as resolved** with "Fan motor replaced." (optional proof photo).
4. Back as the student: notification arrives; open the complaint → **Yes, close complaint** → give 5 stars. (Or choose *No, reopen* to show the reopen loop.)
5. Back as admin: **Analytics** shows updated counts, resolution rate, average resolution time, rating, categories, hotspots.

## Architecture
```
client/  React SPA (pages, layouts, components, hooks, services, context, utils)
server/  Express API: routes → controllers → services (complaintService holds status rules)
database/schema.sql   tables, FKs, indexes, reference data (departments, categories, SLA)
```
Key rules live in `server/services/complaintService.js`: the single `changeStatus()` function (updates status, writes history, notifies), `allowedStatuses()` (who may move what), and `permissionsFor()` (the UI renders buttons from the server's answer, so the two never disagree).

### Role rules
- Students see only their own complaints; staff see only complaints assigned to them; admins see all.
- Staff: Assigned/Reopened → In Progress → Resolved. Students: confirm (Resolved → Closed) or reopen. Admins: review, assign, change status, close, escalate.

## API overview
| Method & path | Who | Purpose |
|---|---|---|
| POST `/api/auth/register`, `/api/auth/login` | public | Student registration, login (returns JWT) |
| GET/PUT `/api/auth/me`, PUT `/api/auth/password` | any | Profile |
| GET `/api/meta` | any | Categories, locations, departments, SLA hours |
| GET `/api/complaints` | any (scoped by role) | List with filters `q,status,category_id,priority,building,department_id,from,to,overdue` |
| POST `/api/complaints` | student | Create (multipart, field `photo`) |
| GET `/api/complaints/duplicates` | student | Similar open complaints |
| GET `/api/complaints/:id` | owner/assignee/admin | Details + history + resolutions + permissions |
| PUT `/api/complaints/:id` | admin | Verify priority / category |
| POST `/api/complaints/:id/assign` | admin | Assign or reassign |
| POST `/api/complaints/:id/status` | admin, staff | Change status (field `proof` optional) |
| POST `/api/complaints/:id/escalate` | admin | Escalate |
| POST `/api/complaints/:id/reopen` · `/confirm` · `/feedback` · `/support` | student | Verification loop, rating, "me too" |
| GET `/api/notifications`, PUT `/:id/read`, POST `/read-all` | any | In-app notifications |
| GET `/api/analytics/overview\|categories\|priorities\|statuses\|locations\|timeline\|overdue` | admin | `?range=7d\|30d\|6m\|year\|custom&from&to` |
| `/api/admin/staff`, `/categories`, `/locations`, PUT `/sla` | admin | Management |

## Design decisions
- **Image storage:** local disk (`server/uploads`), served at `/uploads`. Swap the Multer storage engine for Cloudinary/S3 in production.
- **Seed:** a Node script (not raw SQL) so passwords are bcrypt-hashed and demo dates are relative to "now", keeping overdue demos alive.
- **Department routing:** stored in `assigned_department_id` at submission (suggested from the category); admins can change it on assignment.
- **Overdue:** computed live from priority SLA hours (default High 24h, Medium 72h, Low 7 days, editable in Analytics). The clock restarts when a complaint is reopened. Status is never changed silently.
- **Hotspots:** a building-level tile view from your location list, not a Leaflet map, because no real campus coordinates exist. Nothing is presented as GPS data.
- **`users.department_id`** replaces `users.department` for staff, as a proper foreign key.
- **Assign/Update Resolution/Complaint Details** are one shared details page with modals rather than separate routes.

## Future improvements
Real campus map (Leaflet + coordinates on `locations`), email/SMS notifications, Cloudinary storage, AI category suggestion from text/photo, predictive maintenance from recurrence, CSV export, pagination for very large datasets.
