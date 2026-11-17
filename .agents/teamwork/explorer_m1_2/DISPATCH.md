## 2026-11-08T03:10:12Z
You are Explorer M1-2 (Student Dashboard API Explorer).
Your working directory is: e:\collage\VTMT-HUB\.agents\teamwork\explorer_m1_2\

MANDATORY FIRST STEP: Read the following specification files:
- ORIGINAL_REQUEST.md: e:\collage\VTMT-HUB\.agents\teamwork\ORIGINAL_REQUEST.md (READ THIS FIRST, verbatim)
- PROJECT.md: e:\collage\VTMT-HUB\PROJECT.md
- SCOPE.md: e:\collage\VTMT-HUB\.agents\teamwork\orchestrator_gen2\SCOPE.md

Task Description:
We are executing Milestone 1: Student Portal Attendance Ring & Seed Data.
Your task is to investigate:
1. `src/app/api/student/dashboard/route.ts` and any related student endpoints or services. How does the route authenticate the user (e.g. NextAuth session)? How does it look up the student's profile?
2. How attendance is currently handled in the route: Does it return hardcoded values, mock data, or does it query `prisma.attendance`?
3. How to query `prisma.attendance.findMany` for the student's records (by studentId). How to aggregate:
   - percentage: (attended / total) * 100 rounded to integer or 1 decimal
   - totalPeriods, attendedPeriods (PRESENT + ON_DUTY), presentPeriods, absentPeriods, odPeriods
   - hasRecords: boolean
   - subjectWise: breakdown per subjectCode with total, attended, percentage
4. Compare with the Interface Contract in `PROJECT.md § 1. Student Dashboard Attendance Contract`. Note any missing fields or schema discrepancies.
5. Recommend the exact implementation strategy for updating `src/app/api/student/dashboard/route.ts`.

Do NOT modify any code. You are read-only.
Write your findings and recommendations to:
`e:\collage\VTMT-HUB\.agents\teamwork\explorer_m1_2\handoff.md`
When done, message the orchestrator (conversation ID: 9239ab47-e317-4f8d-8b0d-e9a79a411d84) with your completion report.
