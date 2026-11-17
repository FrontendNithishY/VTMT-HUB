# BRIEFING — 2026-11-07T17:21:00Z

## Mission
Investigate the authoritative source of truth for database schema, ORM models, migrations, seeds, and backend APIs related to Attendance and Users in VTMT-HUB.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer (read-only investigation, database schema & API focus)
- Working directory: e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_1
- Original parent: 77f65f49-9941-4d8c-a1c1-baeec484472d
- Milestone: Attendance & User Schema/API Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do not modify source code, tests, or data files
- Write only to working directory e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_1
- .agents/teamwork/ holds only metadata

## Current Parent
- Conversation ID: 77f65f49-9941-4d8c-a1c1-baeec484472d
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma` (Models: User, UserMode, StudentProfile, FacultyProfile, HodProfile, Department, Subject, TimetableEntry, Attendance)
  - `src/lib/prisma.ts` (Proxy client with InMemoryStore fallback)
  - `src/lib/auth.ts` (NextAuth credential provider and JWT callbacks)
  - `src/lib/adminAuth.ts` (Admin role verification)
  - `src/app/api/teacher/attendance/route.ts` (Attendance POST route)
  - `src/app/api/teacher/students/route.ts` (Teacher students & attendance query)
  - `src/app/api/hod/attendance/heatmap/route.ts` & `export/route.ts` (HOD attendance APIs)
  - `src/app/api/student/dashboard/route.ts` (Student dashboard API missing attendance)
  - `src/app/api/admin/cleanup/route.ts` (Admin retention cleanup)
  - `src/views/TeacherStudentsRosterView.tsx`, `StudentDashboardView.tsx`, `HodDashboardOverviewView.tsx`, `AdminCommandCenterView.tsx`
  - `scripts/` (seed-subjects.ts, seed-master-timetable.cjs, reseed-and-clean-timetable.cjs)
  - Live Supabase DB queries via Prisma Client
- **Key findings**:
  - Attendance model has: `id`, `studentId`, `classId`, `dateString`, `dayOrder`, `period`, `subjectCode`, `facultyName`, `status`, `createdAt`.
  - Composite unique constraint: `@@unique([studentId, dateString, period])`.
  - No foreign keys on Attendance; keys are loose strings. `studentId` in practice stores `User.id` (UUID).
  - DB currently has 0 Attendance rows, 0 Student users, 0 StudentProfiles.
  - Student Dashboard attendance ring ("87%") is currently hardcoded static SVG.
  - HOD export route has a bug: `classId: { startsWith: departmentCode }` fails because classIds start with year numerals (e.g. `II-CSE-A`).
  - Admin currently has no attendance viewing API or UI tab.
- **Unexplored areas**: None for this survey scope.

## Key Decisions Made
- Confirmed PostgreSQL/Prisma model and field names for Attendance.
- Confirmed that student account `student@vtmt.org` must be seeded with `User`, `StudentProfile` (class `II-CSE-A`), and `UserMode`.
- Documenting complete evidence-based findings in `handoff.md`.

## Artifact Index
- DISPATCH.md — Received dispatch message
- BRIEFING.md — Situational awareness
- progress.md — Liveness heartbeat and task progress
- query_db.cjs — DB interrogation script
- handoff.md — Final investigation report
