# ROADMAP — Rangers Academia (Frontend)

Feature ideas captured for future work. Not scheduled — this is a backlog, not a commitment.

---

## 1. Visual Group Scheduling / Timetable Builder (not started, needs design)

**What:** A drag-and-drop, color-coded timetable view for building out class schedules, separate from the current backend/admin-only group management.

**Core idea:**
- Visual grid showing groups/timeslots across the week
- Drag student names directly into a slot to assign them to a group
- Live headcount per class/slot as students are dropped in
- Color-coded by group, marca, or teacher (TBD)

**The smart part — scheduling constraints per student:**
- Students can have structured availability constraints stored on their profile (not just a free-text note) — e.g. "only available Tuesdays/Thursdays 19:00-21:00"
- When dragging a student into a slot that conflicts with their stored constraints, show a warning/block before the assignment is made, rather than relying on a human to remember/notice

**Open questions to resolve before building:**
- Build custom, or integrate an existing scheduling tool/library — Cami is open to either, hasn't decided
- Where constraint data lives on the student model, and how granular it needs to be
- Whether this replaces or sits alongside the current Group CRUD work

**Related/simpler prerequisite:** Group CRUD in the platform UI itself (create/edit/delete groups without touching backend/admin) — likely needs to exist before or alongside this, since groups are the containers being scheduled into.

**Priority:** real feature, needs its own design pass — not a quick build. Noted here so it isn't lost, not scheduled yet.

**Backend note:** structured availability-constraint storage and slot-conflict validation would live in academia-api (student model + scheduling logic) — see academia-api/ROADMAP.md for the backend-side pointer.

---
