import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "HOD" && role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const selectedYear = searchParams.get("year"); // "ALL", "I", "II", "III", "IV" or "1", "2", "3", "4"
    const selectedSection = searchParams.get("section"); // "ALL", "A", "B", "C"
    const statusFilter = searchParams.get("status"); // "ALL", "GOOD", "WARNING", "CRITICAL", "NEW"
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // 1. Fetch all student users dynamically from the database
    // This guarantees that any new student added via Admin Panel immediately appears
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        vmNo: true,
        status: true,
        createdAt: true,
        studentProfile: {
          select: {
            rollNumber: true,
            department: true,
            semester: true,
            year: true,
            section: true,
            batch: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    // 2. Fetch all attendance records from the database
    const attendanceRecords = await prisma.attendance.findMany({
      select: {
        studentId: true,
        status: true,
        classId: true,
        subjectCode: true,
        dateString: true,
      },
    });

    // 3. Index attendance records by all possible student identifiers
    // (User ID, VM Number, Email, Roll Number)
    const attMap = new Map<string, { total: number; present: number; absent: number; od: number; subjects: Set<string> }>();

    for (const rec of attendanceRecords) {
      const rawId = (rec.studentId || "").trim().toLowerCase();
      if (!rawId) continue;

      if (!attMap.has(rawId)) {
        attMap.set(rawId, { total: 0, present: 0, absent: 0, od: 0, subjects: new Set() });
      }
      const agg = attMap.get(rawId)!;
      agg.total++;
      if (rec.status === "PRESENT") agg.present++;
      else if (rec.status === "ON_DUTY") {
        agg.present++;
        agg.od++;
      } else if (rec.status === "ABSENT") {
        agg.absent++;
      }
      if (rec.subjectCode) agg.subjects.add(rec.subjectCode);
    }

    // Year classifier helper
    const classifyStudentYear = (s: typeof students[0]) => {
      const sp = s.studentProfile;
      const rawYear = (sp?.year || "").trim().toUpperCase();

      if (rawYear === "1" || rawYear === "I" || rawYear.includes("1ST") || rawYear.includes("FIRST")) {
        return { yearNum: 1, yearRoman: "I", yearLabel: "1st Year (Year I)" };
      }
      if (rawYear === "2" || rawYear === "II" || rawYear.includes("2ND") || rawYear.includes("SECOND")) {
        return { yearNum: 2, yearRoman: "II", yearLabel: "2nd Year (Year II)" };
      }
      if (rawYear === "3" || rawYear === "III" || rawYear.includes("3RD") || rawYear.includes("THIRD")) {
        return { yearNum: 3, yearRoman: "III", yearLabel: "3rd Year (Year III)" };
      }
      if (rawYear === "4" || rawYear === "IV" || rawYear.includes("4TH") || rawYear.includes("FOURTH")) {
        return { yearNum: 4, yearRoman: "IV", yearLabel: "4th Year (Year IV)" };
      }

      // Infer from semester if year string is missing
      const sem = sp?.semester;
      if (sem) {
        if (sem <= 2) return { yearNum: 1, yearRoman: "I", yearLabel: "1st Year (Year I)" };
        if (sem <= 4) return { yearNum: 2, yearRoman: "II", yearLabel: "2nd Year (Year II)" };
        if (sem <= 6) return { yearNum: 3, yearRoman: "III", yearLabel: "3rd Year (Year III)" };
        return { yearNum: 4, yearRoman: "IV", yearLabel: "4th Year (Year IV)" };
      }

      // Default fallback
      return { yearNum: 2, yearRoman: "II", yearLabel: "2nd Year (Year II)" };
    };

    // 4. Transform students with attendance statistics
    const processedStudents = students.map((s) => {
      const sp = s.studentProfile;
      const { yearNum, yearRoman, yearLabel } = classifyStudentYear(s);
      const section = (sp?.section || "A").trim().toUpperCase();
      const dept = (sp?.department || "CSE").replace(/^(B\.E\s+|B\.Tech\s+)/i, "").trim();
      const classId = `${yearRoman}-${dept}-${section}`;

      // Search all identifier variants for attendance records
      const candidateKeys = [
        s.id.toLowerCase(),
        (s.email || "").toLowerCase(),
        (s.vmNo || "").toLowerCase(),
        (sp?.rollNumber || "").toLowerCase(),
        s.vmNo ? s.vmNo.replace(/^VM/i, "").toLowerCase() : "",
        s.vmNo ? `VM${s.vmNo.replace(/^VM/i, "")}`.toLowerCase() : "",
      ].filter(Boolean);

      let attStats = { total: 0, present: 0, absent: 0, od: 0, subjectCount: 0 };
      for (const key of candidateKeys) {
        if (attMap.has(key)) {
          const found = attMap.get(key)!;
          attStats = {
            total: found.total,
            present: found.present,
            absent: found.absent,
            od: found.od,
            subjectCount: found.subjects.size,
          };
          break;
        }
      }

      const total = attStats.total;
      const present = attStats.present;
      const absent = attStats.absent;
      const od = attStats.od;

      let overallPercentage: number | null = null;
      let statusCategory: "GOOD" | "WARNING" | "CRITICAL" | "NEW" = "NEW";
      let statusLabel = "New Student (No records)";

      if (total > 0) {
        overallPercentage = Math.round((present / total) * 1000) / 10;
        if (overallPercentage >= 75) {
          statusCategory = "GOOD";
          statusLabel = "Eligible (≥75%)";
        } else if (overallPercentage >= 65) {
          statusCategory = "WARNING";
          statusLabel = "Condonation (65-74%)";
        } else {
          statusCategory = "CRITICAL";
          statusLabel = "Shortage (<65%)";
        }
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        vmNo: s.vmNo || "N/A",
        rollNumber: sp?.rollNumber || s.vmNo || "N/A",
        department: sp?.department || dept,
        yearNum,
        yearRoman,
        yearLabel,
        semester: sp?.semester || (yearNum * 2 - 1),
        section,
        classId,
        batch: sp?.batch || "2025-2029",
        accountStatus: s.status,
        createdAt: s.createdAt,
        totalSessions: total,
        presentSessions: present,
        absentSessions: absent,
        odSessions: od,
        subjectCount: attStats.subjectCount,
        overallPercentage,
        statusCategory,
        statusLabel,
      };
    });

    // 5. Calculate Metrics by Year and Overall
    const yearsSummary: Record<
      string,
      {
        studentCount: number;
        sessionsCount: number;
        avgAttendance: number;
        eligibleCount: number;
        warningCount: number;
        criticalCount: number;
        newCount: number;
      }
    > = {
      ALL: { studentCount: 0, sessionsCount: 0, avgAttendance: 0, eligibleCount: 0, warningCount: 0, criticalCount: 0, newCount: 0 },
      I: { studentCount: 0, sessionsCount: 0, avgAttendance: 0, eligibleCount: 0, warningCount: 0, criticalCount: 0, newCount: 0 },
      II: { studentCount: 0, sessionsCount: 0, avgAttendance: 0, eligibleCount: 0, warningCount: 0, criticalCount: 0, newCount: 0 },
      III: { studentCount: 0, sessionsCount: 0, avgAttendance: 0, eligibleCount: 0, warningCount: 0, criticalCount: 0, newCount: 0 },
      IV: { studentCount: 0, sessionsCount: 0, avgAttendance: 0, eligibleCount: 0, warningCount: 0, criticalCount: 0, newCount: 0 },
    };

    const yearSums: Record<string, { sumPct: number; countPct: number }> = {
      ALL: { sumPct: 0, countPct: 0 },
      I: { sumPct: 0, countPct: 0 },
      II: { sumPct: 0, countPct: 0 },
      III: { sumPct: 0, countPct: 0 },
      IV: { sumPct: 0, countPct: 0 },
    };

    for (const student of processedStudents) {
      const yr = student.yearRoman;
      const targets = ["ALL", yr];

      for (const t of targets) {
        if (!yearsSummary[t]) continue;
        yearsSummary[t].studentCount++;
        yearsSummary[t].sessionsCount += student.totalSessions;
        if (student.statusCategory === "GOOD") yearsSummary[t].eligibleCount++;
        else if (student.statusCategory === "WARNING") yearsSummary[t].warningCount++;
        else if (student.statusCategory === "CRITICAL") yearsSummary[t].criticalCount++;
        else if (student.statusCategory === "NEW") yearsSummary[t].newCount++;

        if (student.overallPercentage !== null) {
          yearSums[t].sumPct += student.overallPercentage;
          yearSums[t].countPct++;
        }
      }
    }

    // Compute averages
    for (const t of Object.keys(yearsSummary)) {
      if (yearSums[t].countPct > 0) {
        yearsSummary[t].avgAttendance = Math.round((yearSums[t].sumPct / yearSums[t].countPct) * 10) / 10;
      } else {
        yearsSummary[t].avgAttendance = 100;
      }
    }

    // 6. Apply Filters for response
    let filteredStudents = [...processedStudents];

    if (selectedYear && selectedYear !== "ALL") {
      const yrRoman = selectedYear === "1" ? "I" : selectedYear === "2" ? "II" : selectedYear === "3" ? "III" : selectedYear === "4" ? "IV" : selectedYear.toUpperCase();
      filteredStudents = filteredStudents.filter((s) => s.yearRoman === yrRoman);
    }

    if (selectedSection && selectedSection !== "ALL") {
      filteredStudents = filteredStudents.filter((s) => s.section === selectedSection.toUpperCase());
    }

    if (statusFilter && statusFilter !== "ALL") {
      filteredStudents = filteredStudents.filter((s) => s.statusCategory === statusFilter.toUpperCase());
    }

    if (searchQuery) {
      filteredStudents = filteredStudents.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery) ||
          s.rollNumber.toLowerCase().includes(searchQuery) ||
          s.vmNo.toLowerCase().includes(searchQuery) ||
          s.email.toLowerCase().includes(searchQuery) ||
          s.classId.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: yearsSummary,
      totalStudents: processedStudents.length,
      filteredCount: filteredStudents.length,
      students: filteredStudents,
    });
  } catch (error: any) {
    console.error("HOD Student Attendance API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
