# Scope: VTMT-HUB Attendance System Milestones

## Architecture
VTMT-HUB Next.js 19 App Router + Prisma + InMemoryStore dual client fallback.
Views reside in `src/views/` and are re-exported in `src/app/`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Student Portal Attendance Ring & Seed Data | Seed `student@vtmt.org` & attendance records; connect `StudentDashboardView.tsx` ring to live database via `/api/student/dashboard` | none | IN_PROGRESS |
| 2 | Faculty & HOD Attendance Recording | `FacultyAttendanceRecordingView.tsx`, `/api/teacher/attendance` GET/POST, HOD teaching attendance access & `hodProfile` support | M1 | PLANNED |
| 3 | HOD & Admin Attendance Viewing Interfaces | `HodAttendanceMonitoringView.tsx`, `/api/hod/attendance`, fix export route; `AdminAttendanceAnalyticsView.tsx`, `/api/admin/attendance` | M1, M2 | PLANNED |
| 4 | E2E Testing & System Hardening | Requirement-driven automated E2E test suite covering Tiers 1-4, adversarial edge cases, and full project verification | M1, M2, M3 | PLANNED |
