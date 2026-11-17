# Handoff Report: Database Schema, ORM Models & Backend APIs for Attendance & Users

**Explorer**: Explorer 1 (Database Schema & API Explorer)  
**Target Recipient**: Orchestrator (77f65f49-9941-4d8c-a1c1-baeec484472d) & Implementation Agents  
**Working Directory**: `e:\collage\VTMT-HUB\.agents\teamwork\explorer_survey_1`  
**Timestamp**: 2026-11-07T17:25:00Z  

---

## 1. Observation

### 1.1 ORM, Client Proxy & Migrations
- **ORM & Database**:
  - `package.json` lines 13, 41: `"@prisma/client": "^5.22.0"`, `"prisma": "^5.22.0"`. Target datasource is PostgreSQL (`env("DATABASE_URL")` pointing to Supabase).
  - `prisma/schema.prisma` lines 1-8:
    ```prisma
    generator client {
      provider = "prisma-client-js"
    }
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
- **Prisma Client Proxy & Offline Fallback**:
  - `src/lib/prisma.ts` lines 9-71: Implements `InMemoryStore` with arrays `users`, `userModes`, `studentProfiles`, `facultyProfiles`, `hodProfiles`, `departments`, `subjects`, `timetableEntries`, `attendance`.
  - `src/lib/prisma.ts` lines 386-420: Uses an 8-second timeout race condition (`Promise.race([target[method](...args), timeoutPromise])`). If PostgreSQL/Supabase times out or drops, it falls back seamlessly to `InMemoryStore`.
- **Migrations**:
  - Tool command `Test-Path prisma/migrations` returned `False`.
  - There is no `prisma/migrations` folder. Schema updates in development are pushed via `prisma db push` or raw SQL scripts (`scripts/sync-db-columns.cjs`).

---

### 1.2 Attendance Schema Definition
- `prisma/schema.prisma` lines 182-196:
  ```prisma
  model Attendance {
    id          String   @id @default(uuid())
    studentId   String   // VM No or Email
    classId     String   // e.g., "IICSEA"
    dateString  String   // e.g., "2026-10-02"
    dayOrder    String
    period      Int
    subjectCode String
    facultyName String
    status      String   @default("PRESENT") // PRESENT, ABSENT, ON_DUTY
    createdAt   DateTime @default(now())

    @@unique([studentId, dateString, period])
    @@index([classId, dateString])
  }
  ```
- **Field Breakdown**:
  | Field | Type | Attributes / Default | Notes / Inconsistencies |
  | :--- | :--- | :--- | :--- |
  | `id` | String | `@id @default(uuid())` | Primary key UUID. |
  | `studentId` | String | - | Loose string without foreign key. In runtime code (`TeacherStudentsRosterView.tsx:145`), this stores `User.id` (UUID). |
  | `classId` | String | - | Loose string without foreign key. E.g., `"II-CSE-A"`. |
  | `dateString` | String | - | Calendar date formatted as `YYYY-MM-DD`. There is **no** `date: DateTime` field. |
  | `dayOrder` | String | - | Academic day order (e.g., `"I"`, `"II"`, `"III"`, `"IV"`, `"V"`). |
  | `period` | Int | - | Integer from `1` to `8`. Named `period`, **not** `periodNumber`. |
  | `subjectCode`| String | - | Course subject code (e.g., `"231CS321"`). There is **no** `subjectId` field. |
  | `facultyName`| String | - | Teacher full name string. There is **no** `markedById` or `facultyId` field. |
  | `status` | String | `@default("PRESENT")` | Allowed values: `"PRESENT"`, `"ABSENT"`, `"ON_DUTY"`. |
  | `createdAt` | DateTime | `@default(now())` | Record insertion timestamp. There is **no** `updatedAt` field. |
- **Indexes & Constraints**:
  - `@@unique([studentId, dateString, period])`: Prisma compound unique key `studentId_dateString_period`. Prevents duplicate attendance marks for a student in the same period on the same day.
  - `@@index([classId, dateString])`: Secondary index for querying class attendance on a specific day.
- **TypeScript Type Interface**:
  - `src/types/academic.ts` lines 79-90:
    ```ts
    export interface AttendanceRecord {
      id: string;
      studentId: string;
      classId: string;
      dateString: string;
      dayOrder: string;
      period: number;
      subjectCode: string;
      facultyName: string;
      status: "PRESENT" | "ABSENT" | "ON_DUTY" | string;
      createdAt?: string | Date;
    }
    ```

---

### 1.3 Modeling of Related Academic Entities
- **User & Roles**:
  - `prisma/schema.prisma` lines 10-33:
    ```prisma
    enum Role {
      STUDENT
      FACULTY
      HOD
      ADMIN
    }
    model User {
      id        String   @id @default(uuid())
      vmNo      String?  @unique
      email     String   @unique
      name      String
      password  String
      role      Role     @default(STUDENT)
      status    String   @default("ACTIVE")
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt

      studentProfile StudentProfile?
      facultyProfile FacultyProfile?
      hodProfile     HodProfile?
      auditLogs      AuditLog[]
      notices        Notice[]
    }
    ```
- **StudentProfile**:
  - `prisma/schema.prisma` lines 43-54:
    ```prisma
    model StudentProfile {
      userEmail   String     @id
      user        User       @relation(fields: [userEmail], references: [email], onDelete: Cascade)
      rollNumber  String?    @unique
      department  String?
      dept        Department? @relation(fields: [department], references: [code], onDelete: SetNull)
      semester    Int?
      batch       String?
      year        String?
      section     String?
      createdAt   DateTime   @default(now())
    }
    ```
- **Classes & Sections**:
  - There is **no** `Class` or `Section` database table.
  - A class is a computed synthetic string derived from `year`, `department`, and `section` (e.g. `II-CSE-A`).
  - Implemented in `src/app/api/teacher/students/route.ts` line 28:
    `return \`\${yearStr}-\${normalizedDept}-\${section}\`;`
  - Canonical format across timetable seed files is `II-CSE-A`, `II-CSE-B`, `II-CSE-C`, etc.
- **Department & Subjects**:
  - `model Department` (lines 80-91): `code String @unique`, `name String`, `hodName String?`.
  - `model Subject` (lines 93-102): `code String @unique`, `name String`, `credits Int`, `semester Int`, `departmentCode String`.
- **TimetableEntry**:
  - `prisma/schema.prisma` lines 141-160:
    ```prisma
    model TimetableEntry {
      id           String   @id @default(uuid())
      classId      String?  // e.g., "IICSEA" or "II-CSE-A"
      dayOrder     String?  // e.g., "I", "II", "III", "IV", "V"
      period       Int?     // 1 to 8
      timeRange    String?
      subjectCode  String?
      subjectName  String?
      facultyName  String?
      roomNo       String?
      vmsNo        String?
      category     String?
      academicYear String?
      semType      String?
      createdAt    DateTime @default(now())
      @@index([classId, dayOrder])
      @@index([vmsNo])
      @@index([academicYear])
    }
    ```
- **Relation to Attendance**:
  - Attendance uses **unconstrained string foreign keys**:
    - `Attendance.studentId` <-> `User.id`
    - `Attendance.classId` <-> `TimetableEntry.classId` / computed student class
    - `Attendance.subjectCode` <-> `TimetableEntry.subjectCode` / `Subject.code`
    - `Attendance.facultyName` <-> `User.name` / `TimetableEntry.facultyName`

---

### 1.4 Existing Backend APIs for Attendance
1. **Take / Mark Attendance**:
   - `src/app/api/teacher/attendance/route.ts` (lines 6-88):
     - `POST` route only (no `GET`).
     - Accepts single: `{ studentId, classId, dateString, dayOrder, period, subjectCode, status }`.
     - Accepts bulk batch: `{ batch: [...] }`.
     - Performs `prisma.attendance.upsert({ where: { studentId_dateString_period: { studentId, dateString, period } }, update: { status }, create: { ... } })`.
     - Uses authenticated `session.user.email` to resolve `facultyName`.
2. **Query Teacher Attendance & Class Roster**:
   - `src/app/api/teacher/students/route.ts` (lines 31-138):
     - `GET` with optional `?date=YYYY-MM-DD` (defaults to today).
     - Resolves teacher's classes for `currentDayOrder` from `TimetableEntry`.
     - Returns `{ success: true, data: { students, todayClasses, attendance, dateString } }`.
     - `attendance` array contains `prisma.attendance.findMany({ where: { dateString: todayString } })`.
3. **Query HOD Department Attendance**:
   - `src/app/api/hod/attendance/heatmap/route.ts` (lines 6-46):
     - `GET`: Aggregates all attendance by department via substring matching `classId.includes('CSE')`.
   - `src/app/api/hod/attendance/export/route.ts` (lines 6-44):
     - `GET` with `?departmentCode=CSE`.
     - Fetches students in department and attendance from the past 6 months.
     - **Bug Observed (Line 37)**: `classId: { startsWith: departmentCode }`. Class IDs start with Roman numerals (e.g. `II-CSE-A`), so `startsWith('CSE')` never matches, returning 0 records.
4. **Student Attendance API**:
   - `src/app/api/student/dashboard/route.ts` lines 133-150: Returns `{ student, currentDayOrder, tomorrowDayOrder, timetable, fullTimetable, notices }`. It **does not query or return attendance data**.
   - `src/views/StudentDashboardView.tsx` lines 204-212: Displays a hardcoded static SVG with `"87%"` and hardcoded `strokeDashoffset="32.65"`.
   - There is no `/api/student/attendance` route.
5. **Admin Attendance API**:
   - Only `src/app/api/admin/cleanup/route.ts` exists (`POST` to delete records older than 180 days).
   - There is **no** Admin API or view tab for querying attendance logs, daily/period attendance, or department statistics.

---

### 1.5 Authentication & Role Handling
- **NextAuth Configuration** (`src/lib/auth.ts` lines 33-193):
  - Provider: `CredentialsProvider`.
  - Input: `email` (or `vmNo`) and `password`.
  - Authentication query (`auth.ts:68-82`):
    Searches `prisma.user` where `OR: [{ email }, { vmNo }]` (case-insensitive).
    Fallback search in `prisma.userMode` where `OR: [{ emailid }, { vmno }]`.
  - Password hashing: Salted bcrypt via `verifyPassword()` (`src/lib/encryption.ts`).
  - Session callbacks populate:
    ```ts
    session.user = {
      id: token.id,      // User.id UUID
      email: token.email,
      name: token.name,
      role: token.role,  // "STUDENT" | "FACULTY" | "HOD" | "ADMIN"
    }
    ```
- **Faculty Identification**:
  - In `src/app/api/teacher/students/route.ts:58-71`:
    - Retrieves `vmNo` from `user.vmNo` or `user.facultyProfile.vmNo`.
    - Extracts `firstName` and `cleanName` from `user.name` stripping titles (`Dr.`, `Mr.`, etc.).
    - Queries `TimetableEntry` where `OR: [{ vmsNo: { contains: vmNo } }, { facultyName: { contains: firstName } }]`.
- **HOD Role & Teaching**:
  - HOD users have `role: "HOD"` and an optional `hodProfile`.
  - In `src/app/api/hod/dashboard/route.ts:53-60`, HOD can also have teaching schedule entries if `TimetableEntry.facultyName` or `vmsNo` matches their name/VM number.
  - However, `HodLayout` does not currently provide a navigation route to take attendance for their assigned classes.

---

### 1.6 Current Live Database State & Seed Data Audit
Inspected live Supabase database via Node/Prisma script (`.agents/teamwork/explorer_survey_1/query_db.cjs`):
- **Live Users Count**: `5`
  1. `admin@vtmt.org` — Role: `ADMIN`, vmNo: `ADM-SECRET-01`, name: `System Administrator`
  2. `srh@vtmt.org` — Role: `ADMIN`, vmNo: null, name: `srh`
  3. `teach1@vtmt` — Role: `FACULTY`, vmNo: `MTS001`, Dept: `CSE`, name: `teach1`
  4. `teach2@vtmt` — Role: `FACULTY`, vmNo: `MTS002`, Dept: `CSE`, name: `teach2`
  5. `teach3@vtmt` — Role: `FACULTY`, vmNo: `MTS003`, Dept: `CSE`, name: `teach3`
- **Student Accounts**: `0` students exist in the `User` table.
- **Student Profiles**: `0` rows in `StudentProfile`.
- **Attendance Records**: `0` rows in `Attendance`.
- **Timetable Entries**: `492` entries in `TimetableEntry`.
- **Distinct Classes in Timetable**: `["II-CSE-A", null]`. (Master timetable seeder `scripts/seed-master-timetable.cjs` has verified 360-slot configurations for `II-CSE-A/B/C`, `III-CSE-A/B/C`, `IV-CSE-A/B/C`).
- **Target test account `student@vtmt.org`**: Does **NOT** exist yet in the database.

---

## 2. Logic Chain

1. **Schema Integrity**:
   - The `Attendance` table in `prisma/schema.prisma` contains all necessary attributes: `studentId`, `classId`, `dateString`, `dayOrder`, `period`, `subjectCode`, `facultyName`, `status`, and `createdAt`.
   - The unique constraint `@@unique([studentId, dateString, period])` guarantees deduplication when taking period-wise attendance.
   - Because `studentId`, `classId`, and `subjectCode` are non-relational strings, attendance queries must match either `User.id` or `User.email`/`vmNo`, and `classId` must conform to the canonical class naming scheme (e.g., `II-CSE-A`).

2. **Attendance Recording Flow**:
   - The teacher UI in `TeacherStudentsRosterView.tsx` already uses `POST /api/teacher/attendance` passing `student.id` as `studentId`, alongside `classId`, `dateString`, `dayOrder`, `period`, and `subjectCode`.
   - The backend `POST /api/teacher/attendance` upserts into `prisma.attendance` successfully.
   - For an HOD who teaches a subject, `/api/teacher/attendance` and `/api/teacher/students` work identically because authentication relies on session email and does not restrict role to `FACULTY` only. HOD mode simply lacks a dedicated attendance taking link/view in its layout.

3. **Attendance Viewing Flow for HOD & Admin**:
   - Currently, HOD only has a high-level heatmap route (`/api/hod/attendance/heatmap`) and a broken export route (`/api/hod/attendance/export` with `startsWith(departmentCode)`).
   - Admin has no attendance viewing endpoints or UI tab in `AdminCommandCenterView.tsx`.
   - To fulfill the original request, backend routes and UI interfaces are needed for HOD and Admin to view:
     - Daily / period-wise attendance logs.
     - Department-level statistics (present/absent/percentage rates).
     - Class-level attendance summaries.

4. **Student Mode Attendance Flow**:
   - Currently, `StudentDashboardView.tsx` displays a static SVG ring with hardcoded 87%.
   - `GET /api/student/dashboard` does not query the `Attendance` table.
   - To connect the dashboard ring to live records:
     - Query `prisma.attendance.findMany({ where: { OR: [{ studentId: user.id }, { studentId: user.email }] } })`.
     - Calculate overall attendance rate: `Math.round((presentCount / totalPeriods) * 100)`.
     - Calculate dynamic SVG `strokeDashoffset`: `circumference - (rate / 100) * circumference` where `circumference = 2 * π * 40 = 251.2`.
     - Pass the rate and period counts into `StudentDashboardView.tsx`.

5. **Test Student Account Seeding**:
   - No student accounts currently exist. Login as a student fails immediately.
   - Seeding `student@vtmt.org` requires inserting:
     - `User`: `{ email: "student@vtmt.org", name: "Student Demo", role: "STUDENT", vmNo: "23CS101", password: <bcrypt hash> }`
     - `StudentProfile`: `{ userEmail: "student@vtmt.org", rollNumber: "23CS101", department: "CSE", semester: 3, year: "II", section: "A", batch: "2023-2027" }`
     - `UserMode`: `{ emailid: "student@vtmt.org", vmno: "23CS101", usermode: "STUDENT", password: <bcrypt hash> }`
     - This maps the student to class `II-CSE-A`, perfectly matching existing timetables and faculty rosters.
     - Adding sample attendance records for `student@vtmt.org` in class `II-CSE-A` will immediately verify the student overview ring and attendance calculations.

---

## 3. Caveats

1. **No Foreign Key Constraints**: `Attendance` does not have Prisma `@relation` declarations to `User` or `StudentProfile`. Implementers must ensure `studentId` consistently uses `User.id` (or fallback matching on `email`/`vmNo`).
2. **Date Storage as String**: `dateString` is stored as `YYYY-MM-DD` text rather than a Prisma `DateTime`. Date range queries must format dates as ISO date strings or use `createdAt` for timestamp filtering.
3. **Class Identifier Formatting**: Class identifiers must match between `TimetableEntry`, `StudentProfile`, and `Attendance`. The standard format established in `scripts/seed-master-timetable.cjs` and `TeacherStudentsRosterView.tsx` is `II-CSE-A` (Roman year, hyphen, department code, hyphen, section letter).
4. **HOD Export Bug**: Any new or updated HOD attendance query must filter by `classId: { contains: departmentCode }` rather than `{ startsWith: departmentCode }`.

---

## 4. Conclusion

- The database schema in `prisma/schema.prisma` already defines the `Attendance` model with composite unique key `[studentId, dateString, period]` and index `[classId, dateString]`. No DDL schema migration is needed for `Attendance`.
- Attendance recording API `POST /api/teacher/attendance` is functional and properly upserts into PostgreSQL.
- Attendance viewing is completely absent for Admin, partially implemented (with a filtering bug) for HOD, and hardcoded in the Student dashboard.
- Zero student accounts and zero attendance records exist in the database.
- A seed script must create `student@vtmt.org` (class `II-CSE-A`), seed initial sample attendance records, and backend routes must expose attendance logs and statistics to Admin, HOD, and Student dashboards.

---

## 5. Verification Method

To independently verify the observations and conclusions:

1. **Inspect Schema & Prisma Models**:
   ```powershell
   Get-Content prisma/schema.prisma | Select-String -Pattern "model Attendance", "studentId", "classId", "unique"
   ```
2. **Verify Database Records (Users & Attendance)**:
   ```powershell
   node -e 'const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); Promise.all([p.user.count(), p.attendance.count(), p.user.findMany({ where: { role: "STUDENT" } })]).then(([uc, ac, st]) => { console.log({ users: uc, attendance: ac, students: st.length }); p.$disconnect(); });'
   ```
3. **Verify Existing Attendance Routes**:
   - Inspect `src/app/api/teacher/attendance/route.ts` (POST upsert logic).
   - Inspect `src/app/api/teacher/students/route.ts` (GET class attendance for date).
   - Inspect `src/app/api/student/dashboard/route.ts` (Confirm absence of attendance data).
   - Inspect `src/views/StudentDashboardView.tsx` line 204-212 (Confirm hardcoded 87% SVG).
   - Inspect `src/app/api/hod/attendance/export/route.ts` line 37 (Confirm `startsWith` bug).
4. **Invalidation Conditions**:
   - If `prisma/schema.prisma` is modified to add `@relation` on `Attendance`, or
   - If students or attendance records are found elsewhere in a separate database instance.
