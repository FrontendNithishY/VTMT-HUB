## 2026-11-07T17:12:07Z
From: 77f65f49-9941-4d8c-a1c1-baeec484472d (orchestrator)
Mission: Explorer 3 (Student Portal & Test Explorer)

Investigate existing UI, components, APIs, and test infrastructure for the Student Portal and E2E verification in VTMT-HUB:
1. Locate where Student mode and the Student Dashboard page views live in src/views/.
2. Inspect the Student Dashboard attendance overview ring/component:
   - What component renders the attendance ring / percentage?
   - Is it currently using mock data, hardcoded numbers, or connected to an API/database?
   - How should it query and aggregate live records from the Attendance table in the database (e.g. overall attendance percentage, attended periods vs total periods, subject-wise breakdown)?
3. Inspect student accounts and authentication:
   - How do students log in? What fields are associated with a student (email, roll number, classId, section, department, profile fields)?
   - Are there existing seed/test student accounts (such as student@vtmt.org)? What is missing to verify all student portal features?
4. Inspect build, test, and run tooling:
   - Check package.json: scripts (dev, build, test, lint, prisma commands).
   - What packages/dependencies are installed? Next.js version?
   - Are there existing test suites (vitest, jest, playwright, cypress)?
5. Verify whether Student page views adhere to Rule 5 of AGENT.md (all page views in src/views/) and LinkedIn theme design palette/styles.
6. Identify gaps and list required changes to connect the ring and seed the test account.
7. Document everything in detail in your working directory at e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_3\handoff.md, updating progress.md as you work.
8. When complete, send a message to orchestrator with context, content ("I'm done, check my report"), and the path to handoff.md. Do not modify source code.
