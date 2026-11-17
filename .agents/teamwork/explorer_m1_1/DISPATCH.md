# Dispatch Task: Explorer M1-1 (Database & Seeding Exploration)
Path to ORIGINAL_REQUEST.md: e:\collage\VTMT-HUB\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: e:\collage\VTMT-HUB\PROJECT.md
Path to SCOPE.md: e:\collage\VTMT-HUB\.agents\teamwork\orchestrator_gen2\SCOPE.md
Milestone: Milestone 1 (Student Portal Attendance Ring & Seed Data)
Objective: Investigate database schema, seed scripts, and InMemoryStore default data for student user, student profile, and sample attendance records.


## 2026-11-08T03:10:03Z
From: 9239ab47-e317-4f8d-8b0d-e9a79a411d84
Priority: MESSAGE_PRIORITY_HIGH

You are Explorer M1-1 (Database & Seeding Explorer).
Your working directory is: e:\collage\VTMT-HUB\.agents\teamwork\explorer_m1_1\

MANDATORY FIRST STEP: Read the following specification files:
- ORIGINAL_REQUEST.md: e:\collage\VTMT-HUB\.agents\teamwork\ORIGINAL_REQUEST.md (READ THIS FIRST, verbatim)
- PROJECT.md: e:\collage\VTMT-HUB\PROJECT.md
- SCOPE.md: e:\collage\VTMT-HUB\.agents\teamwork\orchestrator_gen2\SCOPE.md

Task Description:
We are executing Milestone 1: Student Portal Attendance Ring & Seed Data.
Your task is to investigate:
1. The database models in `prisma/schema.prisma` relevant to students and attendance (User, StudentProfile, Attendance, etc.). Note exact fields, relations, enums, unique constraints (e.g. @@unique([studentId, dateString, period])), and indexes.
2. The offline/in-memory fallback store in `src/lib/prisma.ts` (specifically `InMemoryStore`). How are default users, profiles, and attendance data seeded in memory? How does `prisma.attendance` operate in `InMemoryStore`?
3. Existing seed scripts (such as `prisma/seed.ts`, `scripts/seed-*.cjs` or similar) to see how accounts and initial data are seeded in PostgreSQL.
4. What exact seed data is needed for test student `student@vtmt.org` (e.g., User record with password, StudentProfile with rollNumber, registerNumber, classId e.g. 'II-CSE-A', department 'CSE', semester, and realistic sample Attendance records across multiple dates, periods, and subjects so that attendance percentage, attended periods, and subject-wise metrics can be computed and verified).
5. Recommend the exact fix/implementation strategy for seeding (e.g. updating `InMemoryStore` in `src/lib/prisma.ts` and creating/updating a seed script for the database).

Do NOT modify any code. You are read-only.
Write your findings and recommendations to:
`e:\collage\VTMT-HUB\.agents\teamwork\explorer_m1_1\handoff.md`
When done, message the orchestrator (conversation ID: 9239ab47-e317-4f8d-8b0d-e9a79a411d84) with your completion report.
