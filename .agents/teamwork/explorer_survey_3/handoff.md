# Handoff Report: Student Portal & Test Infrastructure Survey

**Author**: Explorer 3 (Student Portal & Test Explorer)  
**Date**: 2026-11-07  
**Working Directory**: `e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_3`  
**Parent Conversation ID**: `77f65f49-9941-4d8c-a1c1-baeec484472d`  

---

## 1. Observation

### 1.1 Student Views & Route Architecture (Rule 5 AGENT.md)
Direct inspection of `src/app/student/` and `src/views/` revealed:
- Route re-exports in App Router:
  - `src/app/student/page.tsx:1`: `export { default } from "@/views/StudentDashboardView";`
  - `src/app/student/calendar/page.tsx:1`: `export { default } from "@/views/StudentCalendarScheduleView";`
  - `src/app/student/messages/page.tsx:1`: `export { default } from "@/views/StudentMessagesView";`
  - `src/app/student/profile/page.tsx:1`: `export { default } from "@/views/StudentProfilePortfolioView";`
- Root layout: `src/app/student/layout.tsx` (473 lines) renders the desktop and mobile responsive layout containing the LinkedIn-styled sidebar (`admin-sidebar`), "VM-HUB Student Portal" branding, navigation links (`/student`, `/student/calendar`, `/student/messages`), user profile drawer, dynamic academic `Clock` component, and theme toggle.
- Implementation view files in `src/views/`:
  - `src/views/StudentDashboardView.tsx` (300 lines): Personal student greeting, happening now banner, up next card, period timetable cards, attendance card with ring SVG, department notices preview, and bottom `OverallTimetable` component.
  - `src/views/StudentCalendarScheduleView.tsx` (145 lines): Day Order tabbed timetable view (I, II, III, IV, V, UNASSIGNED).
  - `src/views/StudentMessagesView.tsx` (138 lines): Department circulars and notices classified by URGENT, EXAM, GENERAL, SPECIFIC_STUDENT.
  - `src/views/StudentProfilePortfolioView.tsx` (289 lines): Student profile editor (name, department, semester, batch, password update).

### 1.2 Student Dashboard Attendance Overview Ring Component
Direct inspection of `src/views/StudentDashboardView.tsx` lines 202-218:
```tsx
{/* Attendance Card */}
<div className="student-card premium-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
  <div className="attendance-ring" style={{ position: "relative" }}>
    <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="32.65" strokeLinecap="round" />
    </svg>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.2rem", color: "var(--text-main)" }}>
      87%
    </div>
  </div>
  <div>
    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>ATTENDANCE</div>
    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.25rem" }}>Overall this semester</div>
    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#10b981" }}>Above the 75% attendance bar</div>
  </div>
</div>
```
- The attendance overview ring is **100% hardcoded**.
- The SVG uses fixed circle radius $r = 40$, fixed `strokeDasharray="251.2"`, and static `strokeDashoffset="32.65"` (representing $100\% - 87\% = 13\%$, where $0.13 \times 251.2 = 32.65$).
- Hardcoded percentage text: `"87%"`.
- Hardcoded subtext: `"Above the 75% attendance bar"`.
- Hardcoded stroke color: `#10b981` (emerald green).

### 1.3 Backend Student Dashboard API (`/api/student/dashboard`)
Direct inspection of `src/app/api/student/dashboard/route.ts` (156 lines):
- Lines 21-31: Queries `prisma.user.findUnique({ where: { email }, include: { studentProfile: true } })`. If `!user || !user.studentProfile`, returns 404: `"No student profile found in the database. Please create one in the Admin mode."`
- Lines 33-38: Calculates `classId = ${yearStr}-${normalizedDept}-${section}`.
- Lines 41-72: Generates `classAliases` (e.g. for `II-CSE-A`: `["II-CSE-A", "2-CSE-A", "III-CSE-A", "IV-CSE-A"]`).
- Lines 74-75: Gets dynamic day order info via `getDayOrderInfo()`.
- Lines 81-95: Queries `prisma.timetableEntry.findMany({ where: { classId: { in: classAliases } } })`.
- Lines 98-131: Queries `prisma.notice.findMany` matching `studentIds: [email, user.id, user.vmNo, user.studentProfile?.rollNumber]`.
- Lines 133-150: Returns response payload:
  ```json
  {
    "success": true,
    "data": {
      "student": { "name": "...", "vmNo": "...", "department": "...", "semester": "...", "section": "...", "classId": "..." },
      "currentDayOrder": "...",
      "tomorrowDayOrder": "...",
      "timetable": [],
      "fullTimetable": {},
      "notices": []
    }
  }
  ```
- **Zero attendance records are queried or returned**. The `Attendance` table is not referenced anywhere in `src/app/api/student/dashboard/route.ts`.

### 1.4 Student Accounts & Database State
1. **Prisma Schema** (`prisma/schema.prisma`):
   - `User` model: `id` (uuid), `vmNo` (String?, unique), `email` (String, unique), `name`, `password`, `role` (enum Role: `STUDENT`, `FACULTY`, `HOD`, `ADMIN`), `status` ("ACTIVE", "SUSPENDED", "PENDING").
   - `StudentProfile` model: `userEmail` (id, foreign key referencing `User.email`), `rollNumber` (String?, unique), `department` (references `Department.code`), `semester` (Int?), `batch` (String?), `year` (String?), `section` (String?).
   - `Attendance` model: `id` (uuid), `studentId` (String - VM No, Email, or UUID), `classId` (String), `dateString` (String), `dayOrder` (String), `period` (Int), `subjectCode` (String), `facultyName` (String), `status` ("PRESENT", "ABSENT", "ON_DUTY"), `createdAt` (DateTime). Unique constraint: `@@unique([studentId, dateString, period])`.
2. **Current Database Content** (queried via Supabase PostgreSQL):
   - `User` count by role: `FACULTY: 3`, `ADMIN: 2`, `STUDENT: 0`, `HOD: 0`.
   - `StudentProfile` count: `0`.
   - `Attendance` records count: `0`.
   - `TimetableEntry` records count: `492` (Class `II-CSE-A` has 40 complete slots across 5 Day Orders).
3. **In-Memory Fallback Store** (`src/lib/prisma.ts` lines 29-71):
   - Only seeds `admin@vtmt.org` (`id: "admin-secret-root"`).
   - `this.studentProfiles = [];`
   - `this.attendance = [];`
   - No student accounts exist in either PostgreSQL or in-memory fallback store.
4. **Authentication Flow** (`src/lib/auth.ts` and `src/components/LoginForm.tsx`):
   - `LoginForm.tsx` takes `email` and `password`, submits via `signIn("credentials")`.
   - `authOptions` checks `User.email` OR `User.vmNo` (case-insensitive).
   - Passwords verified with `verifyPassword` (bcrypt, AES fallback, or plaintext).
   - On role `"STUDENT"`, `LoginForm.tsx:44` executes `window.location.replace("/student")`.

### 1.5 Build, Test, and Tooling
- `package.json`:
  - `dependencies`: `@prisma/client: ^5.22.0`, `next: 16.4.2`, `react: 19.2.8`, `react-dom: 19.2.8`, `next-auth: ^4.24.15`, `lucide-react: ^1.45.0`, `react-icons: ^5.7.0`, `d3: ^7.9.0`, `xlsx: ^0.18.5`.
  - `devDependencies`: `prisma: ^5.22.0`, `tailwindcss: ^4`, `@tailwindcss/postcss: ^4`, `typescript: ^5`, `eslint: ^9`, `eslint-config-next: 16.4.2`.
  - `scripts`:
    - `"dev": "next dev"`
    - `"build": "prisma generate && next build"`
    - `"start": "next start"`
    - `"lint": "eslint"`
  - **No test scripts exist in `package.json`**.
  - **No test libraries installed** (`vitest`, `jest`, `@playwright/test`, `cypress`, `@testing-library/react` are all absent).
  - Only ad-hoc test file present: `scripts/test-class-fetches.ts` (13 lines checking local HTTP fetch for timetable classes).

### 1.6 Design Guideline Adherence (AGENT.md)
- **Rule 5 (Naming & Location)**: Compliant.
  - All 4 student page views (`StudentDashboardView`, `StudentCalendarScheduleView`, `StudentMessagesView`, `StudentProfilePortfolioView`) reside in `src/views/` and use explicit PascalCase domain names.
- **LinkedIn Theme Styling**:
  - Primary color `--royal-blue: #0a66c2`, background canvas `--bg-page: #f3f2f0` (light) / `#1b1f23` (dark), card surface `--bg-card: #ffffff` / `#24292e`, subtle borders `--border-subtle: #e0e0e0` / `#30363d`.
  - Card border radius `10px`, action buttons pill-shaped (`24px`).
  - Attendance ring uses `#10b981` (standard green). For 100% fidelity with AGENT.md, it should use the official LinkedIn Green `#01754F` (`--color-li-green`) for $\ge 75\%$ and LinkedIn Amber `#915907` / `#C37D16` for warning ($65-74\%$).

---

## 2. Logic Chain

```
[Observation 1.1, 1.2]: StudentDashboardView.tsx renders attendance circle with hardcoded 87% & 32.65 offset.
        │
        ▼
[Observation 1.3]: /api/student/dashboard does not query Attendance table or return attendance in data.
        │
        ▼
[Observation 1.4]: Attendance table exists in schema.prisma with unique([studentId, dateString, period]),
                   but contains 0 records in both PostgreSQL and InMemoryStore.
        │
        ▼
[Deduction 1]: To connect the ring to live records:
               1. /api/student/dashboard must query prisma.attendance for the logged-in student's identifiers.
               2. API must aggregate total periods, attended periods (PRESENT + ON_DUTY), absent periods,
                  overall percentage, and subject-wise breakdown.
               3. StudentDashboardView.tsx must compute SVG circle dashoffset dynamically:
                  C = 251.2, offset = C - (percentage / 100) * C.
               4. Color and status text must dynamically map to LinkedIn Green (>= 75%), Amber (65-74%), Red (< 65%).
```

```
[Observation 1.4]: Zero student accounts exist in User, StudentProfile, or InMemoryStore.
                   40 TimetableEntry records exist for class "II-CSE-A".
        │
        ▼
[Observation 1.3]: computeStudentClassId requires year="II", department="CSE", section="A"
                   to map to "II-CSE-A".
        │
        ▼
[Deduction 2]: Test student account must be created with:
               - Email: student@vtmt.org
               - Password: bcrypt hashed (e.g. student123)
               - Role: STUDENT, Status: ACTIVE
               - StudentProfile: userEmail: "student@vtmt.org", rollNumber: "23CS101",
                 department: "CSE", semester: 3, year: "II", section: "A", batch: "2024-2028".
               - Attendance records: ~25 period entries across II-CSE-A subjects (231CS321, 231CS322, etc.)
                 with realistic attendance (e.g. 85-88% PRESENT/OD).
               - Seed must be applied to both PostgreSQL and InMemoryStore (src/lib/prisma.ts) for offline/dev resilience.
```

```
[Observation 1.5]: package.json has no test runner or scripts.
        │
        ▼
[Deduction 3]: Verification requires an executable automated script (e.g. scripts/verify-student-portal.cjs)
               that tests:
               1. User authentication as student@vtmt.org.
               2. /api/student/dashboard endpoint returning 200 with student profile, timetable, and attendance metrics.
               3. Attendance aggregation calculation accuracy (overall percentage, period counts, subject breakdown).
```

---

## 3. Caveats

1. **Student Identifier Storage in `Attendance`**:
   `TeacherStudentsRosterView.tsx` records `studentId: student.id` (UUID from `User.id`). However, other modules or CSV imports might store `rollNumber` (`23CS101`) or `email` (`student@vtmt.org`). The query in `/api/student/dashboard` must therefore use `studentId: { in: [user.id, user.email, user.vmNo, user.studentProfile?.rollNumber].filter(Boolean) }` to guarantee complete matching.
2. **ON_DUTY Status Counting**:
   In standard academic regulations (Anna University / Vel Tech), `ON_DUTY` counts towards attendance. The aggregation formula treats `attendedPeriods = presentCount + onDutyCount`. If college rules differ, this is easily configurable.
3. **Database Connectivity Mode**:
   The application uses a dual-mode Prisma client (`src/lib/prisma.ts`) that falls back to `InMemoryStore` if Supabase connection drops. Seed data must be present in both to ensure deterministic test runs regardless of network or local development mode.

---

## 4. Conclusion

The Student Portal views strictly follow Rule 5 of `AGENT.md` (residing in `src/views/`) and align with the LinkedIn theme. However:
1. **Attendance Ring**: The overview ring in `StudentDashboardView.tsx` is completely hardcoded (`87%`). The backend `/api/student/dashboard/route.ts` lacks attendance querying and aggregation.
2. **Student Accounts**: Zero student accounts exist in the system. To verify student features, a seeded student account (`student@vtmt.org`) with a profile mapping to `II-CSE-A` and sample attendance records is required.
3. **Testing**: No test framework exists. A lightweight Node verification script is needed to validate the student portal end-to-end.

---

## 5. Required Implementation Specifications

### 5.1 Backend: Attendance Aggregation in `/api/student/dashboard/route.ts`

Add between line 96 and line 133:
```ts
// 5. Query and aggregate Attendance records for this student
let attendanceSummary = {
  percentage: 0,
  totalPeriods: 0,
  attendedPeriods: 0,
  presentPeriods: 0,
  absentPeriods: 0,
  odPeriods: 0,
  hasRecords: false,
  subjectWise: [] as { subjectCode: string; total: number; attended: number; percentage: number }[]
};

try {
  const studentIds = [
    user.id,
    email,
    user.vmNo,
    user.studentProfile?.rollNumber
  ].filter(Boolean) as string[];

  const records = await prisma.attendance.findMany({
    where: {
      studentId: { in: studentIds }
    },
    orderBy: { dateString: "desc" }
  });

  if (records.length > 0) {
    const totalPeriods = records.length;
    const presentPeriods = records.filter(r => r.status === "PRESENT").length;
    const odPeriods = records.filter(r => r.status === "ON_DUTY").length;
    const absentPeriods = records.filter(r => r.status === "ABSENT").length;
    const attendedPeriods = presentPeriods + odPeriods;
    const percentage = Math.round((attendedPeriods / totalPeriods) * 100);

    // Subject-wise breakdown
    const subjectMap: Record<string, { total: number; attended: number }> = {};
    records.forEach(r => {
      const code = r.subjectCode || "GENERAL";
      if (!subjectMap[code]) subjectMap[code] = { total: 0, attended: 0 };
      subjectMap[code].total++;
      if (r.status === "PRESENT" || r.status === "ON_DUTY") {
        subjectMap[code].attended++;
      }
    });

    const subjectWise = Object.entries(subjectMap).map(([subjectCode, s]) => ({
      subjectCode,
      total: s.total,
      attended: s.attended,
      percentage: Math.round((s.attended / s.total) * 100)
    }));

    attendanceSummary = {
      percentage,
      totalPeriods,
      attendedPeriods,
      presentPeriods,
      absentPeriods,
      odPeriods,
      hasRecords: true,
      subjectWise
    };
  }
} catch (attErr) {
  console.error("Could not fetch student attendance records:", attErr);
}
```
And add `attendance: attendanceSummary` into the JSON response at line 149.

### 5.2 Frontend: Dynamic Attendance Ring in `src/views/StudentDashboardView.tsx`

Replace static block at lines 202-218 with:
```tsx
{/* Dynamic Attendance Card */}
{(() => {
  const att = data?.attendance;
  const hasRecords = att?.hasRecords;
  const percentage = hasRecords ? att.percentage : 100;
  const circumference = 251.2;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // LinkedIn theme colors
  let strokeColor = "#01754F"; // LinkedIn Green (>=75%)
  let statusText = "Above the 75% attendance bar";
  let statusColor = "#01754F";

  if (!hasRecords) {
    strokeColor = "var(--royal-blue)";
    statusText = "No attendance sessions logged yet";
    statusColor = "var(--text-muted)";
  } else if (percentage < 65) {
    strokeColor = "#ef4444";
    statusText = "Critical: Attendance shortage (< 65%)";
    statusColor = "#ef4444";
  } else if (percentage < 75) {
    strokeColor = "#915907"; // LinkedIn Amber
    statusText = "Warning: Below 75% requirement";
    statusColor = "#915907";
  }

  return (
    <div className="student-card premium-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
      <div className="attendance-ring" style={{ position: "relative", width: "100px", height: "100px", flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.4s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.25rem", color: "var(--text-main)" }}>
          {hasRecords ? `${percentage}%` : "—"}
        </div>
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
          ATTENDANCE
        </div>
        <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.25rem" }}>
          Overall this semester
        </div>
        <div style={{ fontSize: "0.75rem", fontWeight: "600", color: statusColor }}>
          {statusText}
        </div>
        {hasRecords && (
          <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {att.attendedPeriods} of {att.totalPeriods} periods attended
          </div>
        )}
      </div>
    </div>
  );
})()}
```

### 5.3 Test Account & Attendance Seed Specification

Create a dedicated seed script `scripts/seed-student-account.cjs`:
- **User**:
  - `id`: `stu-vtmt-23cs101`
  - `vmNo`: `23CS101`
  - `email`: `student@vtmt.org`
  - `name`: `Vasanth Kumar R`
  - `password`: `$2a$10$wK1Ww8zJ0q6bH5yN.Gj2A.6sXG.u/9f8c6jR7m5g2L0p1y3x4z5a6` (or hashed `student123`)
  - `role`: `STUDENT`
  - `status`: `ACTIVE`
- **StudentProfile**:
  - `userEmail`: `student@vtmt.org`
  - `rollNumber`: `23CS101`
  - `department`: `CSE`
  - `semester`: 3
  - `year`: `II`
  - `section`: `A`
  - `batch`: `2024-2028`
- **Attendance Records** (~24 records across recent dates):
  - `studentId`: `stu-vtmt-23cs101` (and `student@vtmt.org` / `23CS101`)
  - `classId`: `II-CSE-A`
  - Dates: 3 days of classes (8 periods/day) = 24 periods
  - Distribution: 21 PRESENT, 2 ON_DUTY, 1 ABSENT = 23/24 = 96% attendance (or 20/24 = 83%).
- **InMemoryStore Update** in `src/lib/prisma.ts`:
  Add `student@vtmt.org`, student profile, and sample attendance directly to `InMemoryStore.seed()` so dev/fallback mode also has the account.

---

## 6. Verification Method

1. **Verify Database Seeding**:
   ```bash
   node --env-file=.env -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.user.findUnique({ where: { email: 'student@vtmt.org' }, include: { studentProfile: true } }).then(console.log).finally(() => p.\$disconnect());"
   ```
   *Expected*: Returns user `student@vtmt.org` with associated `StudentProfile` (`II-CSE-A`).
2. **Verify Student Attendance Query**:
   ```bash
   node --env-file=.env -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.attendance.count({ where: { studentId: 'stu-vtmt-23cs101' } }).then(c => console.log('Attendance count:', c)).finally(() => p.\$disconnect());"
   ```
   *Expected*: Returns count $> 0$.
3. **Verify Dashboard API Response**:
   Run Next dev server and execute GET `/api/student/dashboard` with a valid session for `student@vtmt.org`.
   *Expected*: `res.data.attendance.hasRecords === true`, `res.data.attendance.percentage > 0`, and `res.data.attendance.totalPeriods > 0`.
4. **Lint and Build Check**:
   ```bash
   npm run lint
   npm run build
   ```
   *Expected*: Both commands exit with code 0 without any TypeScript or Next.js build errors.
