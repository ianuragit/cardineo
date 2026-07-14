# CardioIntake

**Pre-consultation & clinic management web app for a cardiology practice.**

A single Next.js app with two surfaces:

1. **Patient Intake** (`/intake`) — a public, mobile-first, 6-step questionnaire patients fill on their own phone in the waiting area (via a QR code at reception). No login, no app install.
2. **Clinic Portal** (password-protected) — a light, clinical dashboard: today's intake queue, a one-screen case view per patient for the doctor, a 7-day follow-up planner, appointments punch-in, daily reports with CSV/PDF export, and a QR-code generator.

> **Core value:** the doctor walks into the consult already knowing the case; the receptionist knows exactly who to call back and when.

---

## Screenshots

| | |
|---|---|
| **Patient intake (mobile)** | **Today's queue** |
| ![Intake](docs/screenshots/intake-step1.png) | ![Queue](docs/screenshots/queue.png) |
| **Case view + doctor's notes** | **Follow-up 7-day board** |
| ![Case](docs/screenshots/case.png) | ![Follow-ups](docs/screenshots/followups.png) |
| **Reports & export** | **Settings + QR** |
| ![Reports](docs/screenshots/reports.png) | ![Settings](docs/screenshots/settings.png) |

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, Server Actions + Route Handlers |
| Styling | Tailwind CSS (light theme, teal `#0D9488` accent) |
| Icons | lucide-react |
| Charts | Recharts |
| DB / ORM | PostgreSQL + Prisma |
| Auth | Cookie session (JWT via `jose`), bcrypt-hashed shared password |
| QR | `qrcode` (server-generated PNG data URL) |
| CSV | `papaparse` |
| PDF | Print-optimised `/reports/print` route + browser print → PDF |
| Hosting | Railway (Next.js service + PostgreSQL plugin) |
| Timezone | Asia/Kolkata for all "today"/date-boundary logic (stored UTC, rendered IST) |

---

## Local setup

**Prerequisites:** Node 20+ and a PostgreSQL database (local install or Docker).

```bash
# 1. Clone & install
git clone <your-repo-url> cardineo
cd cardineo
npm install

# 2. Start Postgres (example with Docker)
docker run --name cardineo-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# 3. Configure env
cp .env.example .env
#   - set DATABASE_URL to your Postgres
#   - generate CLINIC_PASSWORD_HASH  (see below)
#   - generate SESSION_SECRET        (see below)

# 4. Create the schema & seed demo data
npx prisma migrate dev
npm run seed

# 5. Run
npm run dev
# → http://localhost:3000
```

Open **http://localhost:3000/intake** for the patient form, or
**http://localhost:3000/login** for the clinic portal.

### Generating secrets

```bash
# bcrypt hash of your clinic password → paste into CLINIC_PASSWORD_HASH
npm run hash-password -- "yourClinicPassword"

# a strong session secret → paste into SESSION_SECRET
openssl rand -base64 32
```

---

## Environment variables

| Name | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/cardineo` | Postgres connection. Auto-injected by the Railway plugin. |
| `CLINIC_PASSWORD_HASH` | `$2a$10$...` | bcrypt hash of the shared clinic password. Generate with `npm run hash-password -- "pw"`. A password changed later in **Settings** is stored in the DB and takes precedence over this. |
| `SESSION_SECRET` | `k4f9...` (≥32 chars) | Signs the session cookie. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | `https://cardineo.up.railway.app` | Public base URL. Used to build the intake QR code. |
| `CLINIC_NAME` | `Cardineo Heart Clinic` | Shown on intake, portal, exports (overridable in Settings). |
| `DOCTOR_NAME` | `Dr. A. Sharma` | Doctor's name (overridable in Settings). |

---

## Railway deployment (step by step)

1. **Create a project** on [Railway](https://railway.app) → *New Project*.
2. **Add PostgreSQL:** *New* → *Database* → *Add PostgreSQL*. This injects `DATABASE_URL` into your service automatically.
3. **Deploy from GitHub:** *New* → *GitHub Repo* → pick this repo. Railway detects Next.js (Nixpacks) and uses `railway.json`.
4. **Set env vars** on the web service: `CLINIC_PASSWORD_HASH`, `SESSION_SECRET`, `CLINIC_NAME`, `DOCTOR_NAME`. (`DATABASE_URL` is already there.)
5. **Release/start command** is preconfigured in `railway.json`:
   `npx prisma migrate deploy && npm run start` — migrations run on every deploy.
6. **Generate a domain:** service → *Settings* → *Networking* → *Generate Domain*.
7. **Paste that domain into `NEXT_PUBLIC_APP_URL`** and redeploy so the QR code points at the live URL. (Later swappable for a custom domain.)
8. **(Optional) seed demo data:** from the Railway service shell, run `npm run seed`.

---

## How to get the QR code

Log in → **Settings** → *Patient intake QR code*:
- **Download PNG** — the raw QR image.
- **Download A5 poster** — a printable poster with the QR + "Scan to fill your details" in English / Hindi / Marathi.
- **Copy link** — the intake URL.

The QR encodes `NEXT_PUBLIC_APP_URL + /intake`.

---

## Demo credentials

After `npm run seed`:

- **Password:** `cardineo123`
- **Role:** choose **Doctor** (can edit clinical notes) or **Receptionist** (read-only notes; can manage queue, appointments, follow-ups, reports).

Change the password anytime in **Settings → Change password** (persisted in the DB). To reset it back to an env-based password, clear the `passwordHash` row from the `Setting` table.

---

## Data model

```
Patient ─┬─< Intake ──1:1── Consultation ──< FollowUp
         │        └──< Attachment
         ├─< Appointment
         └─< FollowUp
Setting  (key/value: clinicName, doctorName, passwordHash)
```

- **Patient** — one row per person, matched by **phone** on repeat visits.
- **Intake** — a single questionnaire submission (demographics, symptoms, risk factors, meds, report values) with a daily **queue token**. Derivations (BMI, red-flag, risk-factor count) are computed on save.
- **Consultation** — the doctor's notes, diagnosis, next steps, and follow-up date for an intake.
- **FollowUp** — created when the doctor sets a follow-up date; drives the 7-day board.
- **Appointment** — punch-in bookings; auto-flips to *Arrived* when a matching intake (same phone) is submitted the same day.

### How the follow-up board is populated

When a doctor saves a consultation with a **Recommended follow-up date**, a `FollowUp` record is created (or updated) with that `dueDate`, the diagnosis, and the follow-up reason. The **Follow-ups** tab groups these into the next 7 days (Today … +6), with an **Overdue** bucket for any past-due follow-up that was never called or booked. The receptionist can click-to-call, mark the call outcome, or book an appointment (which pre-fills the appointment form). Clearing the date on the consultation removes the follow-up.

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start the production server |
| `npm run seed` | Seed demo data (skips if the DB already has patients) |
| `npm run seed:reset` | Wipe **all** data and reseed |
| `npm run hash-password -- "pw"` | Print a bcrypt hash for `CLINIC_PASSWORD_HASH` |
| `npm run db:migrate` | `prisma migrate dev` (create/apply a migration locally) |
| `npm run db:deploy` | `prisma migrate deploy` (apply migrations in prod) |
| `npm run lint` | Lint |

---

## Safety & red flags

The patient form asks whether chest pain is happening **right now / at rest**. A *yes* shows a full-screen "inform reception immediately" alert and flags the case **URGENT (red)** in the portal, pinned to the top of the queue. The case is also auto-flagged red for **NYHA IV** breathlessness, **syncope**, **LVEF < 35 %**, or **BP > 180/110** — surfaced on the case view with the specific reasons.

---

## Scope notes (v1)

Per the PRD's open questions, v1 ships with sensible defaults:

- **Age** captured directly (DOB optional).
- **File uploads deferred to v1.1** — report values are typed fields; the `Attachment` model exists for later.
- **No SMS/WhatsApp** — click-to-call (`tel:`) links only.
- **English complete**, Hindi/Marathi i18n scaffolding in place (`src/lib/i18n.ts`).
- **Single shared password** with a Doctor/Receptionist toggle (receptionist notes are read-only).
- **Previous visits auto-load** by phone match, labelled "same phone number".

## Roadmap / v1.1

- Prescription & report **image uploads** (Cloudinary / S3).
- **SMS/WhatsApp** appointment reminders & follow-up nudges (MSG91 / Gupshup / Twilio).
- **Prescription printout** (Rx pad with letterhead).
- **Multi-doctor** tenancy (intake asks "which doctor", portal filters by doctor).
- Full **Hindi/Marathi** field translations.
- Separate doctor/receptionist passwords for a hard notes boundary.

---

_Not an EMR/EHR of record. No ABDM/HL7/FHIR compliance claims. Times shown in IST; a consent checkbox is required before submitting the intake form._
