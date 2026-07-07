<<<<<<< HEAD
# NCEMDS — National Centralized Emergency Medical Dispatch System

Monorepo containing the backend API and all four NCEMDS apps.

## How to run this, step by step

You'll be running **5 things at once**: MySQL, the backend, and up to 4
frontend apps (you don't have to run all 4 every time — just the ones you're
testing). Each frontend runs on its own port, so they can all be open
simultaneously.

### Prerequisites

- Node.js installed (v18+)
- MySQL installed and running locally

### Step 1 — Create the database

**Using local MySQL:**

```bash
cd ncemds
mysql -u root -p < backend/schema.sql
```

**Using Aiven (or another managed MySQL host):**

1. In the Aiven console, create a MySQL service and wait for it to be "Running"
2. From the service's **Overview** page, grab the connection details:
   `Host`, `Port`, `User` (usually `avnadmin`), `Password`, and download the
   **CA Certificate** (`ca.pem`) — save it into `backend/`
3. Connect and run the schema against it:
   ```bash
   mysql --host=your-service.aivencloud.com --port=12345 \
     --user=avnadmin --password \
     --ssl-mode=REQUIRED \
     < backend/schema.sql
   ```
   (it'll prompt for the password — paste it from the Aiven console)

**Already created the database in an earlier version of this project?**
Run the migrations in order — they're safe to run once each:
```bash
mysql -u root -p < backend/migrations/001_emergency_id_and_live_location.sql
mysql -u root -p < backend/migrations/002_hospital_scoping.sql
```
- `001` adds `emergency_id`, makes `caller_phone` optional, and adds the
  `caller_location_pings` table used for live tracking
- `002` adds `hospital_id` to `users` (required for dispatcher/driver going
  forward) and `assigned_hospital_id` to `emergency_calls` (the auto-routing
  target) — see "The hospital model" section below for why

Same idea on Aiven: swap `mysql -u root -p` for the Aiven connection flags
shown above.

Either way, you only need to do this once.

### Step 2 — Set up and start the backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in:

**Local MySQL:**
- `DB_PASSWORD` → your real MySQL password
- `JWT_SECRET` → any long random string (e.g. mash the keyboard)

**Aiven:** uncomment the Aiven block in `.env.example` and fill in:
- `DB_HOST` → your service's hostname (ends in `.aivencloud.com`)
- `DB_PORT` → the port Aiven assigned (not the default 3306)
- `DB_USER` → usually `avnadmin`
- `DB_PASSWORD` → from the Aiven console
- `DB_SSL=true` → required, Aiven rejects unencrypted connections
- `DB_SSL_CA_PATH=./ca.pem` → path to the CA cert you downloaded in Step 1
  (if you skip this, the connection still encrypts but won't verify Aiven's
  certificate — fine for testing, not for anything production-facing)

Then:

```bash
npm install
npm run dev
```

You should see:
```
🚑 NCEMDS backend running on port 5000
✅ MySQL connected successfully
```

Leave this terminal running. Quick sanity check — open
`http://localhost:5000/api/health` in a browser, it should return
`{"success":true,"message":"NCEMDS API is running"}`.

### Step 3 — Start whichever frontend app(s) you want to test

Each app needs its **own terminal** (since `npm run dev` blocks the terminal).

```bash
cd apps/caller        # or apps/dispatcher, apps/admin, apps/driver
cp .env.example .env
npm install
npm run dev
```

Vite will print a local URL, typically `http://localhost:5173`. If you run
more than one app at once, Vite automatically picks the next free port
(5174, 5175...) — check the terminal output for the exact one.

**Maps require a Google Maps API key.** The caller, dispatcher, and driver
apps all use Google Maps (caller for the location-confirm screen, dispatcher
and driver for the live caller-location view). Each app's `.env` has a
`VITE_GOOGLE_MAPS_API_KEY` line — paste in a key with the **Maps JavaScript
API** enabled in your Google Cloud project. Without it, the map areas show a
"Map not configured" placeholder but the rest of each app still works
normally (admin doesn't use maps at all, so it's unaffected).

### Step 4 — Create your first staff accounts

The **caller app needs no account at all** — that's by design now (see
below). But dispatcher, admin, and driver apps still need real logins, and
there's no seed data, so the very first one needs to be created by hand.

**Create one admin account via the API directly:**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"System Admin","phone_number":"0000000000","password":"changeme123","role":"admin"}'
```

Then log into the **admin app** with phone `0000000000` / password
`changeme123`. From there, use **Staff accounts → New staff account** to
create your dispatcher and driver accounts — no more `curl` needed after this.

### Step 5 — Wire up a working end-to-end test

Since dispatchers and drivers now belong to a hospital, that hospital has to
exist first — these steps build up in the right order:

1. In **Admin** → Hospitals → add a hospital with real latitude/longitude
   (this matters now — it's what auto-routing uses to find "nearest")
2. In **Admin** → Staff accounts → create a **dispatcher** account, select
   that hospital
3. In **Admin** → Staff accounts → create a **driver** account, select the
   same hospital
4. In **Admin** → Ambulance fleet → register an ambulance (e.g. plate
   `RK-001`), pick the same hospital as its home base
5. Log into **Dispatcher** as the account from step 2 → Crew assignment →
   assign the driver from step 3 to the ambulance from step 4
6. In **Caller** app → hold the SOS button → confirm/adjust your location on
   the map (ideally somewhere near the hospital's coordinates, so it
   auto-routes there) → send. You'll get an emergency ID like `EMG-7K3F9Q`
7. Back in **Dispatcher** → Active calls → the call appears (with a live map
   of the caller's position) → assign the now-crewed ambulance
8. In **Driver** app (logged in as that driver) → see the active dispatch,
   including the caller's live location → tap through "On the way" →
   "Arrived at scene" → "Departing scene" → "Arrived at hospital"
9. Back in **Caller** app → tracking screen reflects each status change
   (polls every 5s), and the device keeps streaming its live location the
   whole time the call is active

If you want to verify hospital scoping is actually working, repeat steps
1-5 with a **second** hospital, dispatcher, driver, and ambulance — then
submit a call near the second hospital and confirm the first dispatcher
never sees it, and vice versa.

## Structure

```
ncemds/
├── backend/
│   ├── schema.sql              Fresh database schema
│   ├── migrations/             Incremental migrations for existing databases
│   ├── server.js                Entry point
│   ├── config/db.js             MySQL connection pool
│   ├── models/                  Data access layer
│   ├── controllers/              Request handlers / business logic
│   ├── routes/                   Express route definitions
│   └── middleware/                JWT auth, role guards, validators
│
└── apps/
    ├── caller/           No-login emergency reporting app — map confirm + live tracking
    ├── dispatcher/        Dispatcher console — triage, crew, assign ambulances, live caller maps
    ├── admin/             Admin dashboard — staff, hospitals, fleet, stats, audit records
    └── driver/            Driver app — active dispatch, status updates, live caller map
```

## App roles & what's built so far

| App | Status | Auth | Core screens |
|---|---|---|---|
| **Caller** | Full flow built | **None — no login or sign-up at all** | Hold-to-send SOS, Uber-style map location confirm/adjust, live tracking with emergency ID, device-local call history |
| **Dispatcher** | Scaffolded + wired | Login required, **scoped to one hospital** | Active call queue (own hospital only) with live caller map, crew assignment, ambulance assignment panel, fleet status |
| **Admin** | Scaffolded + wired | Login required (`admin`) | Stats overview, staff accounts (create/edit/deactivate/reactivate, assign hospital), hospitals, ambulance fleet, system records (audit log + unassigned-call alerts) |
| **Driver** | Scaffolded + wired | Login required, **belongs to one hospital** | Active dispatch with live caller map, status progression (on the way → arrived → departed → at hospital), live GPS push |

Dispatcher, admin, and driver all share the same backend `users` table — a
single account's `role` field determines which app(s) it can log into. The
**caller app deliberately has no relationship to `users` at all** — every
caller is anonymous, identified only by the `emergency_id` generated at
submission time.

## The hospital model: dispatchers and drivers are hospital staff

This is the most significant architectural decision in the project, so it
gets its own section. Earlier versions treated NCEMDS as one centralized
dispatch system with its own staff. That's not how it actually works:

- **Drivers are employed by individual hospitals**, not by NCEMDS itself
- **Each hospital has its own dispatcher(s)** — there's no single
  system-wide dispatch desk
- So a dispatcher's job is really "manage my hospital's ambulances and
  drivers, and handle the calls routed to us"

What this means in the schema and backend:

- `users.hospital_id` is **required** for `dispatcher` and `driver` roles,
  and **null** for `admin` (system-wide) and `caller` (anonymous, n/a)
- `ambulances.home_hospital_id` (already existed) is the anchor — an
  ambulance belongs to one hospital, and only that hospital's dispatcher can
  see it, crew it, or send it out
- **Calls are auto-routed at submission time.** When a caller confirms their
  location, the backend computes the nearest hospital (same Haversine math
  used for the destination-hospital picker) and stamps the call with
  `assigned_hospital_id`. Only that hospital's dispatcher will ever see the
  call in their queue — other hospitals' dispatchers don't see it at all,
  even though they're using the exact same app
- **Every dispatcher-facing query is scoped server-side**, not just hidden
  in the UI — active calls, ambulance lists, crew assignment, and the
  nearest-ambulance proximity search all filter by the dispatcher's
  `hospital_id` in the database query itself. A dispatcher can't see another
  hospital's data even by guessing IDs directly against the API; cross-
  hospital attempts (e.g. assigning a driver from Hospital A to an ambulance
  at Hospital B) are explicitly rejected with a 403
- **Admin is unscoped** — admin sees and manages everything system-wide,
  including assigning hospitals to staff accounts in the first place

**Edge case worth knowing about:** if a call can't be matched to any
hospital (e.g. no hospital has coordinates yet, or none exist), it isn't
silently dropped — it shows up in Admin → System records as an "unassigned
call" alert, since otherwise it would sit invisible to every dispatcher
forever.

**Note on existing dispatcher/driver accounts:** if you're upgrading from an
earlier version of this project, run `migrations/002_hospital_scoping.sql`
— existing dispatcher/driver accounts will have `hospital_id = NULL` until
an admin assigns one via Staff accounts. Until then, those accounts will see
a clear "no hospital assigned" message instead of confusingly empty screens.

## The caller flow, in detail

This was reworked from an earlier login-based design to match how the
project is actually meant to work:

1. **Hold the SOS button** (no login, no phone number needed) — NCEMDS
   currently handles medical emergencies only, so there's no type selector;
   every call submits as `emergency_type: 'medical'`
2. **Confirm location on a map** — the app detects GPS automatically, but
   the caller can drag the pin or tap elsewhere on the map to correct it
   before anything is sent (same interaction pattern as ride-hailing apps).
   Optional address text and notes can be added here too
3. **Submit** — the backend generates a unique `emergency_id`
   (e.g. `EMG-7K3F9Q`), **auto-routes the call to the nearest hospital**
   (see above), and returns the emergency ID immediately
4. **Live tracking screen** — shows the emergency ID, a status timeline, and
   keeps streaming the device's live GPS position to the backend the whole
   time the call is active, so dispatcher and driver can watch the caller's
   position update in real time (e.g. if they're moving, or being moved)
5. **History** — since there's no login, "history" is just a list of
   emergency IDs this device has submitted, kept in `localStorage`. Clearing
   browser storage clears the list (the backend records remain — they're
   just no longer linked from this device).

## Use case coverage

Cross-checked against the project's use case diagram. Status as of the
latest update:

| Use case | Status |
|---|---|
| Submit emergency request — no login required | Done |
| Provide / confirm location (map-based, adjustable) | Done — Google Maps (drag pin or tap map to adjust before sending) |
| Validate request information | Done — `express-validator` rules in `middleware/validators/callValidators.js` |
| Generate unique emergency ID | Done — `utils/emergencyId.js`, collision-checked on insert |
| Auto-route call to nearest hospital | Done — computed at submission time, stamped as `assigned_hospital_id` |
| Track emergency status live | Done |
| Continuous live location streaming (caller to dispatcher/driver) | Done — `caller_location_pings` table, polled every 5-6s |
| Driver: Login / view assigned case | Done |
| Driver: update response status (on the way / arrived / complete) | Done — full chain: assigned to en_route to on_scene to transporting to completed |
| Admin: manage user (create/edit/deactivate/reactivate) | Done — including assigning/changing a staff member's hospital |
| Admin: view system record | Done — RecordsScreen, paginated call history + status timeline + unassigned-call alerts |
| Admin: manage ambulance information | Partial (create + list; no edit/delete yet) |
| Admin: create account for dispatcher & driver | Done — hospital selection required for both roles |
| Dispatcher: login / view emergency request | Done — **scoped to dispatcher's own hospital only** |
| Dispatcher: assign ambulance | Done — blocked server-side unless the ambulance has a driver; ambulances + hospitals sorted nearest-first; scoped to own hospital's fleet |
| Dispatcher: assign driver | Done — CrewScreen + /api/driver-assignments; cross-hospital assignment explicitly rejected (403) |
| Dispatcher: monitor emergency request (live map) | Done — CallerLocationMap in the dispatch panel |

## What's intentionally left as next steps

- **Socket.io live push**: the backend has Socket.io wired into `server.js`,
  and rooms are scaffolded, but the `io.emit(...)` calls in controllers are
  marked `// TODO`. Right now everything live (call status, caller location)
  is done via polling every 5-8 seconds instead of real push. This is the
  highest-value next step, especially now that there's continuous location
  streaming to poll for.
- **CNN call-classification integration**: `emergency_calls` has
  `ai_classification_label` / `ai_confidence` columns ready, and
  `CallModel.setAIClassification()` exists, but nothing calls it yet — that's
  where your Python CNN placeholder plugs in.
- **Hospital capacity affecting sort order**: hospitals track
  `capacity_status`, and dispatch now suggests the nearest hospital by
  distance, but a "full" hospital isn't deprioritized in that sort yet — the
  dispatcher just sees the capacity label next to each option and judges it
  themselves.
- **Ambulance edit/delete**: admin can create and list ambulances but not
  edit details or decommission one.
- **JWT staleness on hospital reassignment**: if an admin changes a logged-in
  dispatcher or driver's `hospital_id`, that change won't take effect until
  they log out and back in — the JWT carries `hospital_id` at issue time, it
  isn't re-checked against the database on every request. Same tradeoff the
  `role` field already had; acceptable for now, worth fixing with shorter
  token lifetimes or a server-side session check if this goes further.
- **Restrict the Google Maps API key**: right now the same key is dropped
  into all three apps' `.env` files unrestricted. Before deploying anywhere
  public, restrict the key in Google Cloud Console to your actual domains
  (HTTP referrer restriction) so it can't be lifted from the bundled JS and
  reused elsewhere.

## Hospital data: real hospitals via Places API (one-time import)

The dispatcher needs real hospitals in the `hospitals` table to suggest a
destination for each dispatch. Rather than calling Google every time the
system needs to know what's nearby, **Places API (New) is used once, as an
admin-only import tool** — after that, "nearest hospital" is pure distance
math against your own database, no external API call involved.

**Setup:**
1. In Google Cloud Console, enable **Places API (New)** on your project
   (separate from the Maps JavaScript API used by the frontends)
2. Generate a key for it (can be the same key as Maps JS, or a separate one
   — your call) and put it in `backend/.env` as `GOOGLE_PLACES_API_KEY`.
   This key is **server-side only** — it never reaches any frontend bundle
3. In the **Admin app → Hospitals → Search real hospitals**, search by name
   or area (e.g. "hospital Phnom Penh"), review results, and click
   **Add to database** on the ones you want. Repeat as needed — there's no
   limit, but realistically you'd do this once to seed a handful of real
   hospitals
4. From then on, the dispatcher's call-assignment panel shows hospitals
   sorted by distance from the call's confirmed location automatically

If `GOOGLE_PLACES_API_KEY` isn't set, the search button still works but
returns a clear error — the rest of the admin app (manual hospital entry,
staff accounts, fleet, etc.) is unaffected either way.

## Scope note: medical emergencies only

NCEMDS is currently scoped to **medical emergencies only** — there's no
accident/fire/other type selector in the caller app, and the backend
validator (`callValidators.js`) rejects any `emergency_type` other than
`'medical'` if sent directly to the API. The database column is still an
ENUM with room for more types (`accident`, `fire_related`, `other`), kept
that way in case the scope expands later, but nothing above the schema
currently allows them through.
