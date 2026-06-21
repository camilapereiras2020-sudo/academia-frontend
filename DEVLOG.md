# DEVLOG — Rangers Academia Frontend

Development log for **academia-frontend** (React + Vite / Vercel).  
Frontend-specific view of the project timeline. See also: [academia-api DEVLOG](https://github.com/camilapereiras2020-sudo/academia-api/blob/main/DEVLOG.md).

---

## Milestones

| Date | Milestone |
|------|-----------|
| 2026-05-27 | Initial commit — React + Vite SPA scaffolded; all core pages rebuilt in one session |
| 2026-05-27 | WhatsApp button added to student cards |
| 2026-05-27 | Vercel SPA routing configured (`vercel.json`) |
| 2026-05-28 | Error feedback on Cobrar button failure |
| 2026-06-02 | Auth token refresh fixed for production API URL |
| 2026-06-03 | Learning games launched: Flashcard, Memory Match, Word Scramble |
| 2026-06-04 | Node >=20 pinned for Vite 8 / Vercel compatibility |
| 2026-06-10 | Frontend confirmed live on Vercel with custom domain |
| 2026-06-11 | Payment dashboard prototype; WhatsApp button logic reviewed |

---

## May 27, 2026 — Full Frontend Launch

> Entire frontend built and deployed in a single session. All pages rebuilt from placeholder stubs to fully functional views.

### Milestone: React + Vite SPA — All Core Pages Live

**Stack:** React 18 · Vite · React Router · Axios · JWT auth  
**Deployment:** Vercel (auto-deploy from `main`)

| Commit | Detail |
|--------|--------|
| **Initial commit — React+Vite frontend for academia management system** | Full SPA scaffolded with React Router, Axios, and JWT auth; project structure established |
| **Guard s.registros against null in AsistenciaPage history render** | Fixed crash when an attendance record has no `registros` array |
| **Rebuild PagosPage with inline create form and full payment list** | Replaced placeholder with functional payments page: create, list, and filter pagos |
| **Rebuild AlumnosPage with improved cards, modal UX, and delete confirmation** | Student cards polished; add/edit modal and two-step delete guard added |
| **Rebuild GruposPage with color accents, schedule chips, and delete modal** | Group list redesigned with color-coded cards and schedule tag chips |
| **Rebuild PagadoresPage with proper delete modal and polished UX** | Payer list now has consistent card layout, edit flow, and delete confirmation |
| **Rebuild DashboardPage with KPI cards, pending payments, and birthdays** | Dashboard rebuilt with revenue summary, pending cobros, and upcoming birthday list |
| **Rebuild CRMPage with edit, delete, interaction logging, and search** | CRM rebuilt from scratch: search bar, interaction history, and full CRUD |
| **Rebuild remaining pages: Cumpleanos, Documentos, Pendientes, Config, Empresas** | All secondary pages rebuilt with consistent layout and live data |
| **Add WhatsApp button to student cards linking to pagador's phone** | Tapping the WA icon opens a pre-filled WhatsApp chat to the student's payer; phone formatted as `34XXXXXXXXX` for Spain |
| **Add vercel.json for SPA routing** | Catch-all rewrite so React Router handles all paths without 404s on refresh |

---

## May 28, 2026 — Error Handling

| Commit | Detail |
|--------|--------|
| **Show error feedback on Cobrar button failure in PendientesPage** | Button now displays a red error message instead of silently failing when the API call returns an error |

---

## June 2, 2026 — Auth Fix

| Commit | Detail |
|--------|--------|
| **Fix VITE_API_URL usage in refresh token interceptor** | Axios interceptor was falling back to `localhost` instead of reading `import.meta.env.VITE_API_URL`; fixed for production |

---

## June 3, 2026 — Learning Games

### Milestone: Student-Facing Games Section Launched

| Commit | Detail |
|--------|--------|
| **Add Flashcard and Memory Match games** | Two interactive games added to the student-facing section for vocabulary practice |
| **Add email buttons, Word Scramble game, fix dashboard** | Email contact buttons added throughout; Word Scramble game added; dashboard KPI revenue calculation fixed |

**Games shipped:**
- Flashcard — flip-card vocabulary drill
- Memory Match — card-matching game
- Word Scramble — unscramble the word

---

## June 4, 2026 — Vercel Build Fix

| Commit | Detail |
|--------|--------|
| **Pin Node >=20 for Vite 8 compatibility on Vercel** | Added `engines.node` to `package.json`; Vercel was picking Node 18 which caused Vite 8 build failures |

---

## June 10, 2026 — Deployment Day Confirmed

> No new commits. Operational milestone.

**Frontend confirmed live** on Vercel with the custom domain pointing correctly.  
Claude Code CLI installed locally — AI-assisted dev workflow now active for this repo.

---

## June 11, 2026 — Payment Dashboard + WhatsApp Review

> Pre-commit working session.

- **Payment dashboard prototype** — visual summary of monthly income, pending cobros, and overdue payments scoped and prototyped
- **WhatsApp button logic reviewed** — confirmed correct phone number format (`34XXXXXXXXX`) and pre-filled message text for Spanish numbers
- Invoice generation flow audited end-to-end from the frontend perspective following the June 10 go-live

---
