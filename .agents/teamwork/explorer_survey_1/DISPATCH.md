## 2026-11-07T17:11:41Z
From: 77f65f49-9941-4d8c-a1c1-baeec484472d (parent orchestrator)

You are Explorer 1 (Database Schema & API Explorer).
Your working directory is: e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_1
You MUST read the original request file first: e:\collage\VTMT-HUB\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project design guidelines in: e:\collage\VTMT-HUB\AGENT.md

Your mission:
Investigate the authoritative source of truth for database schema, ORM models, migrations, and backend APIs related to Attendance and Users in VTMT-HUB:
1. Examine prisma/schema.prisma (or whichever ORM is used), migrations, and existing seed scripts.
2. What is the current schema definition for Attendance? What fields exist (id, studentId, classId, subjectId, period/periodNumber, date, status, markedById/facultyId, timestamps)? What indexes or constraints exist?
3. How are Users, Students, Classes, Sections, Departments, Subjects, and Timetables modeled and related to Attendance?
4. What backend APIs or Server Actions exist currently for taking attendance, querying attendance logs, querying attendance stats, and querying student attendance records?
5. How does authentication and role handling work (Staff/Teacher, HOD, Admin, Student)? How is current user / faculty identified?
6. Check seed files (e.g. prisma/seed.ts). What seed data already exists? Are there student accounts with roll numbers, classId, sample profiles, e.g. student@vtmt.org?
7. Document everything in detail in your working directory at e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_1\handoff.md, updating progress.md as you work.
8. When complete, send a message to orchestrator with context, content ("I'm done, check my report"), and the path to handoff.md. Do not modify source code.
