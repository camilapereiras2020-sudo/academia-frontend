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
| 2026-06-21 | DEVLOG.md added for this repo |
| 2026-06-30 | Fixed app-wide modal positioning bug (all 11 modals); Descargar opens PDF inline; document rows show creation datetime |
| 2026-07-02 | CRM nueva consulta form: only nombre padre/madre + nombre alumno required |
| 2026-07-03 | CRM adult/self-pay support: checkbox, payer dropdown, conditional required field, Matricular flow, origen/objetivo taxonomy update |

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

## June 21, 2026 — DEVLOG Added

| Commit | Detail |
|--------|--------|
| **Add DEVLOG.md — full frontend development log with milestones table** | Backfilled this repo's history from the May 27 launch through June 11, with a milestones table for quick scanning |

---

## June 30, 2026 — Modal Positioning Bug (App-Wide) + Documentos Polish

| Commit | Detail |
|--------|--------|
| **Fix modal positioning and Descargar button behaviour** | `index.css`'s `fadeUp` animation ended on `transform: translateY(0)` instead of `transform: none` — a zero-translate still creates a new stacking context, which broke `position: fixed` centering on **every modal in the app** (Alumnos, Grupos, Pagadores, Pagos, CRM, Empresas, Documentos — 11 overlays total). One-line CSS fix resolved all of them at once. Also: Descargar in DocumentosPage now opens the PDF in a new tab (`target="_blank"`, no `download` attribute) instead of forcing a silent download, and its fetch URL now uses `VITE_API_URL` instead of a hardcoded `/api/v1` path — the old version only worked on localhost, not in production (Vercel → Railway) |
| **feat(documentos): show creation datetime on every document row** | Each row in the documents list now shows when it was created |

---

## July 2, 2026 — CRM Form Simplified

| Commit | Detail |
|--------|--------|
| **CRM: only require nombre padre/madre and nombre alumno in nueva consulta** | Teléfono, objetivo, origen, edad, curso, and email are now optional in the nueva consulta form. Teléfono is still validated as a Spanish mobile number (9 digits, starting 6/7/9) when a value is entered, with an inline error on malformed input |

---

## July 3, 2026 — CRM Adult/Self-Pay Support + Matriculation Flow

### Milestone: Adult Students Can Be Captured, Enrolled, and Self-Paid Through the CRM

**Context:** Every CRM lead used to assume a parent/guardian contact distinct from the student. This session added a first-class path for adult students who are their own contact and payer, and built the previously-missing flow to actually convert a "Matriculado" lead into a real Alumno/Pagador.

| Commit | Detail |
|--------|--------|
| **Update CRM origen/objetivo options to match new taxonomy** | `<select>` options for origen/objetivo realigned to the backend's new fixed choice list (`telefono`/`whatsapp`/`instagram`/`facebook`/`recomendacion`/`web` and `general`/`cambridge`/`ib`/`adultos`) |
| **CRM: add adult/self-pay checkbox and payer dropdown to nueva consulta form** | New checkbox — "El alumno es adulto / paga el mismo" — reveals a dropdown ("El mismo alumno es el pagador" / "Otro pagador") when checked, wired to the new `es_adulto`/`pagador_es_alumno` Lead fields. Lead detail panel shows the adult/payer status when set |
| **CRM: add Matricular button to convert a lead into an Alumno/Pagador** | Leads in the "Matriculado" stage now show a **Matricular** button (on the card and in the detail panel) that opens a form to pick grupo (auto-filling the fee from the group's tarifa), mensualidad, and fecha de inicio, then calls `convertir-alumno`. A confirmation modal shows the created alumno/pagador names, a note when the payer was auto-filled from the alumno's own data, and a "Ver perfil del alumno" link. Since there's no per-student detail route, that link goes to `/alumnos?openId=<id>` — `AlumnosPage` was updated to read that query param and auto-open the matching alumno's edit modal |
| **CRM: make Nombre padre/madre optional when adulto is checked** | Field relabels to "Nombre contacto (opcional)" and is dropped from the required-fields check in `handleSubmit` whenever `es_adulto` is checked, matching the backend's now-conditional requirement |

**Why it matters:** Previously, marking a lead "Matriculado" only changed a status label — no actual student record was created, and every adult lead was forced through a "parent contact" field that didn't apply to them. Both gaps are closed as of this session.

---
