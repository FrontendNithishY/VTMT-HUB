# Handoff Report: Student Dashboard Frontend UI Exploration (Milestone 1)

## 1. Observation

### 1.1 Current Attendance Overview Ring in `src/views/StudentDashboardView.tsx`
Direct inspection of `src/views/StudentDashboardView.tsx` (lines 202–218) revealed:
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

**Key Direct Observations**:
1. **Hardcoded Progress Ring**: The percentage text is hardcoded to `"87%"`. The SVG stroke properties are hardcoded to `strokeDasharray="251.2"` and `strokeDashoffset="32.65"` (which represents `251.2 * (1 - 0.87)`).
2. **Hardcoded Color**: The progress stroke and subtitle text use `#10b981` (generic Tailwind emerald), rather than the official LinkedIn green (`#01754F` from `AGENT.md § 1`).
3. **No Dynamic API Binding**: While `StudentDashboardView.tsx` fetches `/api/student/dashboard` at line 17 (`fetch("/api/student/dashboard")`) and stores the response in `data` (`setData(res.data)`), lines 202–218 make zero references to `data.attendance`.
4. **Missing Attendance Metrics**: The widget displays neither total periods, attended periods, present periods, absent periods, nor On-Duty (OD) counts.
5. **Missing Status Pills / Badges**: There is no dynamic status badge (e.g. "Good Standing", "Shortage Warning", "Critical Defaulter").
6. **No Subject-wise Breakdown**: No subject list, cards, or modal exist in the view for course-by-course attendance details.
7. **No Empty / Zero-Records State**: If a student has no attendance recorded, the widget still renders the mock 87% green ring.

---

### 1.2 Verification of Rule 5 from `AGENT.md` ("All page views must be defined in src/views/ and re-exported in src/app/")
Direct inspection of `src/app/student/page.tsx`:
```tsx
export { default } from "@/views/StudentDashboardView";
```
Direct inspection of sibling student routes:
- `src/app/student/calendar/page.tsx`: `export { default } from "@/views/StudentCalendarScheduleView";`
- `src/app/student/messages/page.tsx`: `export { default } from "@/views/StudentMessagesView";`
- `src/app/student/profile/page.tsx`: `export { default } from "@/views/StudentProfilePortfolioView";`

**Finding**: The project strictly complies with Rule 5. The implementation work for the student dashboard MUST be executed entirely inside `src/views/StudentDashboardView.tsx` without modifying `src/app/student/page.tsx`.

---

### 1.3 Interface Contract from `PROJECT.md § 1`
`PROJECT.md` lines 46–65 define the live payload contract returned by `GET /api/student/dashboard`:
```ts
attendance: {
  percentage: number;      // e.g. 85 (0 to 100)
  totalPeriods: number;    // e.g. 24
  attendedPeriods: number; // e.g. 21 (PRESENT + ON_DUTY)
  presentPeriods: number;  // e.g. 19
  absentPeriods: number;   // e.g. 3
  odPeriods: number;       // e.g. 2
  hasRecords: boolean;
  subjectWise: Array<{
    subjectCode: string;
    total: number;
    attended: number;
    percentage: number;
  }>;
}
```

---

### 1.4 LinkedIn Theme Tokens and Existing CSS Classes
Direct inspection of `AGENT.md § 1` & `src/app/globals.css`:
- **LinkedIn Green**: `#01754F` (used for $\ge 75\%$ attendance).
- **LinkedIn Amber / Gold**: `#915907` / `#C37D16` (used for $65\% \le P < 75\%$).
- **LinkedIn / Critical Defaulter Red**: `#D11124` / `#B91C1C` (used for $< 65\%$).
- **Background Track**: `var(--border-subtle)` (`#e0e0e0` light / `#30363d` dark).
- **Existing Utility Classes** in `src/app/globals.css`:
  - `.attendance-ring` (line 821: `width: 100px; height: 100px;`)
  - `.student-card` (line 702: `background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; box-shadow: var(--shadow-card); padding: 1.25rem 1.5rem;`)
  - `.admin-modal-overlay` & `.admin-modal` (lines 507–528: modal overlay with backdrop blur, slide-up animation, and responsive card sizing).
  - `.btn-royal` & `.btn-sky` (lines 64–99: LinkedIn pill action buttons).

---

## 2. Logic Chain

1. **Step 1: Status of Attendance Progress Widget**
   - Observation 1.1 reveals lines 202–218 contain static values `87%`, `#10b981`, and fixed SVG offset `32.65`.
   - Observation 1.1 also reveals `data.attendance` is not read anywhere in the component.
   - Therefore, the Attendance Overview Ring is currently **100% hardcoded mock UI** and completely disconnected from API data.

2. **Step 2: Mathematical Formulation of Dynamic SVG Ring**
   - An SVG circle with center $(50, 50)$ and radius $r = 40$ in a `viewBox="0 0 100 100"` has circumference:
     $$C = 2 \times \pi \times 40 \approx 251.3274\text{ px}$$
   - For an attendance percentage $P \in [0, 100]$:
     - Clamped percentage: $P_{\text{clamped}} = \min(100, \max(0, P))$
     - Stroke dashoffset:
       $$\text{offset} = C \times \left(1 - \frac{P_{\text{clamped}}}{100}\right) = C - \left(\frac{P_{\text{clamped}}}{100}\right) \times C$$
     - When $P = 100\% \implies \text{offset} = 0$ (full ring).
     - When $P = 0\% \implies \text{offset} = C$ (empty ring).
     - When $P = 87.5\% \implies \text{offset} = 251.33 \times 0.125 = 31.42\text{ px}$.
   - For clockwise drawing starting at 12 o'clock (top), transform circle by `transform="rotate(-90 50 50)"` with `strokeLinecap="round"`.
   - For smooth rendering when data loads or updates, apply `style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease" }}`.

3. **Step 3: Threshold Evaluation & LinkedIn Palette Mapping**
   - According to institutional regulations and project design guidelines:
     - **Tier 1 (Good Standing)**: $P \ge 75\%$
       - Color: `#01754F` (LinkedIn Green)
       - Badge text: `"Good Standing"`
       - Badge styling: `background: "rgba(1, 117, 79, 0.1)"`, `color: "#01754F"`, `border: "1px solid rgba(1, 117, 79, 0.25)"`
       - Subtitle: `"Above the 75% university requirement"`
     - **Tier 2 (Shortage Warning)**: $65\% \le P < 75\%$
       - Color: `#915907` (LinkedIn Amber)
       - Badge text: `"Shortage Warning"`
       - Badge styling: `background: "rgba(145, 89, 7, 0.1)"`, `color: "#915907"`, `border: "1px solid rgba(145, 89, 7, 0.25)"`
       - Subtitle: `"Below 75% — Subject to condonation"`
     - **Tier 3 (Critical Defaulter)**: $P < 65\%$
       - Color: `#D11124` (Critical Red)
       - Badge text: `"Critical Defaulter"`
       - Badge styling: `background: "rgba(209, 17, 36, 0.1)"`, `color: "#D11124"`, `border: "1px solid rgba(209, 17, 36, 0.25)"`
       - Subtitle: `"Critical shortage (< 65%) — Exam detention risk"`
     - **Empty / No Records State**: When `hasRecords === false` or `totalPeriods === 0` or `!data?.attendance`:
       - Color: `var(--text-muted)`
       - Badge text: `"No Records Yet"`
       - Badge styling: `background: "var(--bg-input)"`, `color: "var(--text-muted)"`, `border: "1px solid var(--border-subtle)"`
       - Ring center text: `"N/A"` or `"—"`
       - Subtitle: `"No attendance records found for this semester yet"`

4. **Step 4: Layout & Modal Interaction Architecture**
   - The Attendance card resides in a 2-column grid alongside Department Notices.
   - To provide both instant glanceability and comprehensive depth without overcrowding the card:
     - **Card Interior**: Displays the circular ring with percentage, attended/total period counts (`X of Y periods attended`), status badge, micro-chips for `P: XX`, `OD: XX`, `A: XX`, and an interactive link `"Subject Breakdown →"`.
     - **Modal Dialog (`admin-modal-overlay` + `admin-modal`)**: Triggered when the student clicks `"Subject Breakdown →"`. Displays:
       1. Header with class ID, semester, and close button (`✕`).
       2. Summary bar (Overall %, Attended/Total, Status badge).
       3. Scrollable list of subjects showing Subject Code, Subject Name (if provided), Attended/Total periods, mini horizontal progress bar colored by threshold, and subject percentage.
       4. Close button.

5. **Step 5: Architectural Rule Compliance**
   - In accordance with Observation 1.2, all UI enhancements are isolated to `src/views/StudentDashboardView.tsx`.
   - `src/app/student/page.tsx` remains untouched as a pure re-export.

---

## 3. Caveats

1. **API Dependency**: `StudentDashboardView.tsx` relies on `/api/student/dashboard` returning the `attendance` object per the contract in `PROJECT.md § 1`. If the API has not yet deployed this field, `attendance` will be undefined; the proposed implementation handles this gracefully by falling back to the "No Records Yet" state without crashing.
2. **Subject Names in `subjectWise`**: The contract in `PROJECT.md § 1` provides `subjectCode`, `total`, `attended`, and `percentage`. If `subjectName` is not populated by the backend query, the UI falls back cleanly to displaying `subjectCode`.
3. **No External CSS Edits Needed**: The design uses existing styles from `src/app/globals.css` (`.student-card`, `.attendance-ring`, `.admin-modal-overlay`, `.admin-modal`, `.btn-royal`, `.btn-sky`), requiring no modifications to `globals.css`.

---

## 4. Conclusion & Recommended Implementation Blueprint

The Attendance Overview in `src/views/StudentDashboardView.tsx` requires replacement with a dynamic, live-bound component.

### Proposed Code Replacement for `src/views/StudentDashboardView.tsx`

#### A. State Addition (around line 14)
```tsx
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
```

#### B. Dynamic Calculations (before return statement, around line 54)
```tsx
  // Attendance calculations from live API payload
  const attendance = data?.attendance;
  const hasAttendanceRecords = Boolean(attendance?.hasRecords && (attendance?.totalPeriods || 0) > 0);
  const attendancePct = hasAttendanceRecords ? Math.round(attendance.percentage) : 0;

  // LinkedIn theme colors based on official thresholds:
  // >= 75%: LinkedIn Green (#01754F)
  // 65% - 74%: LinkedIn Amber / Gold (#915907)
  // < 65%: Critical Defaulter Red (#D11124)
  let ringColor = "var(--text-muted)";
  let badgeText = "No Records Yet";
  let badgeBg = "var(--bg-input)";
  let badgeBorder = "1px solid var(--border-subtle)";
  let badgeColor = "var(--text-muted)";
  let statusSubtitle = "Attendance records will appear once sessions are marked.";

  if (hasAttendanceRecords) {
    if (attendancePct >= 75) {
      ringColor = "#01754F";
      badgeText = "Good Standing";
      badgeBg = "rgba(1, 117, 79, 0.1)";
      badgeBorder = "1px solid rgba(1, 117, 79, 0.25)";
      badgeColor = "#01754F";
      statusSubtitle = "Above the 75% university requirement";
    } else if (attendancePct >= 65) {
      ringColor = "#915907";
      badgeText = "Shortage Warning";
      badgeBg = "rgba(145, 89, 7, 0.1)";
      badgeBorder = "1px solid rgba(145, 89, 7, 0.25)";
      badgeColor = "#915907";
      statusSubtitle = "Below 75% — Needs condonation approval";
    } else {
      ringColor = "#D11124";
      badgeText = "Critical Defaulter";
      badgeBg = "rgba(209, 17, 36, 0.1)";
      badgeBorder = "1px solid rgba(209, 17, 36, 0.25)";
      badgeColor = "#D11124";
      statusSubtitle = "Critical shortage (< 65%) — Exam detention risk";
    }
  }

  // SVG Geometry: radius 40, circumference 2 * PI * 40 ≈ 251.33
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = hasAttendanceRecords
    ? ringCircumference - (Math.min(100, Math.max(0, attendancePct)) / 100) * ringCircumference
    : ringCircumference;
```

#### C. Replacement of Attendance Card (lines 202–218)
```tsx
        {/* Attendance Card with Live Dynamic Ring */}
        <div className="student-card premium-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            {/* Dynamic SVG Circular Ring */}
            <div className="attendance-ring" style={{ position: "relative", width: "100px", height: "100px", flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="9"
                />
                {/* Dynamic Value Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="9"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: "800", fontSize: "1.25rem", color: "var(--text-main)", lineHeight: 1 }}>
                  {hasAttendanceRecords ? `${attendancePct}%` : "—"}
                </span>
                <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "2px" }}>
                  {hasAttendanceRecords ? "OVERALL" : "NO DATA"}
                </span>
              </div>
            </div>

            {/* Attendance Details & Status Pill */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.05em" }}>ATTENDANCE</div>
                <span style={{
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  border: badgeBorder,
                  padding: "0.15rem 0.55rem",
                  borderRadius: "12px",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  whiteSpace: "nowrap"
                }}>
                  {badgeText}
                </span>
              </div>

              <div style={{ fontSize: "1.02rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.2rem" }}>
                {hasAttendanceRecords ? `${attendance.attendedPeriods} of ${attendance.totalPeriods} periods attended` : "No attendance recorded"}
              </div>

              <div style={{ fontSize: "0.76rem", fontWeight: "600", color: hasAttendanceRecords ? ringColor : "var(--text-muted)", marginBottom: "0.45rem" }}>
                {statusSubtitle}
              </div>

              {hasAttendanceRecords && (
                <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.72rem", flexWrap: "wrap" }}>
                  <span style={{ backgroundColor: "rgba(1, 117, 79, 0.08)", color: "#01754F", padding: "0.1rem 0.45rem", borderRadius: "4px", fontWeight: "600" }}>
                    P: {attendance.presentPeriods ?? 0}
                  </span>
                  <span style={{ backgroundColor: "rgba(10, 102, 194, 0.08)", color: "var(--royal-blue)", padding: "0.1rem 0.45rem", borderRadius: "4px", fontWeight: "600" }}>
                    OD: {attendance.odPeriods ?? 0}
                  </span>
                  <span style={{ backgroundColor: "rgba(209, 17, 36, 0.08)", color: "#D11124", padding: "0.1rem 0.45rem", borderRadius: "4px", fontWeight: "600" }}>
                    A: {attendance.absentPeriods ?? 0}
                  </span>
                </div>
              )}
            </div>
          </div>

          {hasAttendanceRecords && attendance.subjectWise && attendance.subjectWise.length > 0 && (
            <div style={{ marginTop: "0.85rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {attendance.subjectWise.length} subject{attendance.subjectWise.length > 1 ? "s" : ""} recorded
              </span>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--royal-blue)",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                Subject Breakdown →
              </button>
            </div>
          )}
        </div>
```

#### D. Modal Addition (before closing `</main>` tag, around line 298)
```tsx
      {/* Subject-wise Attendance Breakdown Modal */}
      {showAttendanceModal && attendance && (
        <div className="admin-modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="admin-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)", margin: "0 0 0.25rem 0" }}>
                  Subject Attendance Breakdown
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {data?.student?.classId ? `Class ${data.student.classId}` : "Student Portal"} • Semester {data?.student?.semester ?? "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.2rem 0.5rem"
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Summary Pill Bar */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "var(--bg-input)",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              textAlign: "center"
            }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>OVERALL</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: ringColor }}>{attendancePct}%</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>ATTENDED / TOTAL</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-main)" }}>
                  {attendance.attendedPeriods}/{attendance.totalPeriods}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>STATUS</div>
                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: badgeColor, marginTop: "2px" }}>{badgeText}</div>
              </div>
            </div>

            {/* Subject List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {attendance.subjectWise?.map((sub: any, idx: number) => {
                const subPct = Math.round(sub.percentage);
                let subColor = "#01754F";
                if (subPct < 65) subColor = "#D11124";
                else if (subPct < 75) subColor = "#915907";

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-card)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <div>
                        <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-main)" }}>
                          {sub.subjectCode}
                        </span>
                        {sub.subjectName && (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                            • {sub.subjectName}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: "800", fontSize: "0.95rem", color: subColor }}>
                        {subPct}%
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div style={{ width: "100%", height: "6px", backgroundColor: "var(--bg-input)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.35rem" }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, subPct))}%`,
                          height: "100%",
                          backgroundColor: subColor,
                          borderRadius: "3px",
                          transition: "width 0.5s ease"
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      <span>Attended: {sub.attended} of {sub.total} periods</span>
                      <span style={{ color: subColor, fontWeight: "600" }}>
                        {subPct >= 75 ? "Eligible" : subPct >= 65 ? "Shortage" : "Defaulter"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "1.25rem", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="btn-royal"
                style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Typecheck Verification**:
   ```powershell
   npx tsc --noEmit
   ```
   Ensures zero syntax, type, or JSX errors in `src/views/StudentDashboardView.tsx`.

2. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   Ensures clean static compilation, dynamic route compilation, and App Router re-exports.

### 5.2 Files to Inspect
1. `src/views/StudentDashboardView.tsx`: Verify dynamic SVG circle arc binding, status badge, period counts, and modal dialog.
2. `src/app/student/page.tsx`: Verify single-line re-export remains unchanged (`export { default } from "@/views/StudentDashboardView";`).

### 5.3 Invalidation Conditions
- Any hardcoding of `87%` or fixed stroke offsets invalidates the fix.
- Using generic Tailwind colors (e.g. `#10b981`) instead of the LinkedIn palette (`#01754F`, `#915907`, `#D11124`) invalidates theme compliance.
- Modifying `src/app/student/page.tsx` instead of `src/views/StudentDashboardView.tsx` violates Rule 5 of `AGENT.md`.
- Crashing when `data.attendance` is null or `hasRecords === false` invalidates robustness criteria.
