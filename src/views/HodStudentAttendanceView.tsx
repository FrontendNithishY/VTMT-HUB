"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Layers,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

interface StudentAttendanceRecord {
  id: string;
  name: string;
  email: string;
  vmNo: string;
  rollNumber: string;
  department: string;
  yearNum: number;
  yearRoman: string;
  yearLabel: string;
  semester: number;
  section: string;
  classId: string;
  batch: string;
  accountStatus: string;
  createdAt: string;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  odSessions: number;
  subjectCount: number;
  overallPercentage: number | null;
  statusCategory: "GOOD" | "WARNING" | "CRITICAL" | "NEW";
  statusLabel: string;
}

interface YearSummaryItem {
  studentCount: number;
  sessionsCount: number;
  avgAttendance: number;
  eligibleCount: number;
  warningCount: number;
  criticalCount: number;
  newCount: number;
}

export default function HodStudentAttendanceView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Record<string, YearSummaryItem>>({});
  const [lastSynced, setLastSynced] = useState<string>("");

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>("ALL"); // "ALL", "I", "II", "III", "IV"
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"pct_asc" | "pct_desc" | "name_asc" | "roll_asc">("pct_asc");

  // Fetch student attendance from API
  const loadAttendanceData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/hod/attendance/students", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        setSummary(data.summary || {});
        setLastSynced(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to fetch student attendance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, []);

  // Filtered & Sorted student list
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Year filter
    if (selectedYear !== "ALL") {
      result = result.filter((s) => s.yearRoman === selectedYear);
    }

    // Section filter
    if (selectedSection !== "ALL") {
      result = result.filter((s) => s.section === selectedSection);
    }

    // Status filter
    if (selectedStatus !== "ALL") {
      result = result.filter((s) => s.statusCategory === selectedStatus);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.vmNo.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.classId.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "pct_asc") {
        const valA = a.overallPercentage ?? 999;
        const valB = b.overallPercentage ?? 999;
        return valA - valB;
      }
      if (sortBy === "pct_desc") {
        const valA = a.overallPercentage ?? -1;
        const valB = b.overallPercentage ?? -1;
        return valB - valA;
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "roll_asc") {
        return a.rollNumber.localeCompare(b.rollNumber);
      }
      return 0;
    });

    return result;
  }, [students, selectedYear, selectedSection, selectedStatus, searchQuery, sortBy]);

  // Active Year Summary stats
  const activeStats = useMemo(() => {
    const defaultStats: YearSummaryItem = {
      studentCount: 0,
      sessionsCount: 0,
      avgAttendance: 0,
      eligibleCount: 0,
      warningCount: 0,
      criticalCount: 0,
      newCount: 0,
    };
    return summary[selectedYear] || defaultStats;
  }, [summary, selectedYear]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return;

    const exportRows = filteredStudents.map((s, idx) => ({
      "S.No": idx + 1,
      "Roll Number": s.rollNumber,
      "VM Number": s.vmNo,
      "Student Name": s.name,
      "Year": s.yearRoman,
      "Semester": s.semester,
      "Section": s.section,
      "Class ID": s.classId,
      "Department": s.department,
      "Total Sessions": s.totalSessions,
      "Present Sessions": s.presentSessions,
      "Absent Sessions": s.absentSessions,
      "OD Sessions": s.odSessions,
      "Overall Attendance %": s.overallPercentage !== null ? `${s.overallPercentage}%` : "No Records",
      "Attendance Status": s.statusLabel,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = selectedYear === "ALL" ? "All_Students" : `Year_${selectedYear}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `VTMT_HOD_Student_Attendance_${selectedYear}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1.5rem",
          borderRadius: "16px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.75rem",
                fontWeight: "700",
                textTransform: "uppercase",
                padding: "0.25rem 0.65rem",
                borderRadius: "9999px",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "var(--royal-blue)",
              }}
            >
              <GraduationCap size={13} />
              HOD Oversight
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.75rem",
                fontWeight: "600",
                padding: "0.25rem 0.65rem",
                borderRadius: "9999px",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  display: "inline-block",
                }}
              />
              Live DB Sync (Reflects Admin Adds Instantly)
            </span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)", margin: 0 }}>
            Student Attendance Analytics & Classification
          </h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Monitor overall attendance percentages across Year I, II, III, and IV with automated condonation & shortage tracking.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => loadAttendanceData(true)}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Syncing DB..." : "Refresh"}</span>
            {lastSynced && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "0.2rem" }}>
                ({lastSynced})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredStudents.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.15rem",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "var(--royal-blue)",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              transition: "all 0.2s ease",
            }}
          >
            <Download size={14} />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* YEAR CLASSIFICATION TABS */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.2rem",
        }}
      >
        {[
          { id: "ALL", label: "All Years", roman: "ALL", icon: Layers },
          { id: "I", label: "1st Year", roman: "Year I", icon: GraduationCap },
          { id: "II", label: "2nd Year", roman: "Year II", icon: GraduationCap },
          { id: "III", label: "3rd Year", roman: "Year III", icon: GraduationCap },
          { id: "IV", label: "4th Year", roman: "Year IV", icon: GraduationCap },
        ].map((tab) => {
          const isSelected = selectedYear === tab.id;
          const tabData = summary[tab.id];
          const count = tabData ? tabData.studentCount : 0;
          const avg = tabData && tabData.studentCount > 0 ? tabData.avgAttendance : null;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedYear(tab.id)}
              style={{
                flex: "1 1 180px",
                minWidth: "160px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.35rem",
                padding: "0.9rem 1.15rem",
                borderRadius: "14px",
                border: isSelected ? "2px solid var(--royal-blue)" : "1px solid var(--border-subtle)",
                backgroundColor: isSelected ? "rgba(37, 99, 235, 0.08)" : "var(--bg-card)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <TabIcon size={16} color={isSelected ? "var(--royal-blue)" : "var(--text-muted)"} />
                  <span style={{ fontSize: "0.92rem", fontWeight: "700", color: isSelected ? "var(--royal-blue)" : "var(--text-main)" }}>
                    {tab.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    backgroundColor: isSelected ? "var(--royal-blue)" : "var(--border-subtle)",
                    color: isSelected ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {count} Students
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span>{tab.roman}</span>
                {avg !== null && (
                  <>
                    <span>•</span>
                    <span style={{ fontWeight: "700", color: avg >= 75 ? "#10b981" : avg >= 65 ? "#f59e0b" : "#ef4444" }}>
                      Avg: {avg}%
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* KPI METRIC CARDS FOR SELECTED YEAR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Total Students */}
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "14px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(37, 99, 235, 0.12)",
              color: "var(--royal-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Students
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-main)" }}>
              {activeStats.studentCount}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {selectedYear === "ALL" ? "Across all 4 years" : `Classified in ${selectedYear}`}
            </div>
          </div>
        </div>

        {/* Average Attendance % */}
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "14px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Average Attendance
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "800",
                color: activeStats.avgAttendance >= 75 ? "#10b981" : activeStats.avgAttendance >= 65 ? "#f59e0b" : "#ef4444",
              }}
            >
              {activeStats.avgAttendance}%
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Department threshold: 75%
            </div>
          </div>
        </div>

        {/* Eligible Students (>=75%) */}
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "14px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Eligible (≥75%)
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#10b981" }}>
              {activeStats.eligibleCount}
              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginLeft: "0.35rem" }}>
                ({activeStats.studentCount > 0 ? Math.round((activeStats.eligibleCount / activeStats.studentCount) * 100) : 0}%)
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#10b981" }}>
              Exam Eligible Roster
            </div>
          </div>
        </div>

        {/* Attendance Shortage (<75%) */}
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "14px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Attendance Shortage
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ef4444" }}>
              {activeStats.criticalCount + activeStats.warningCount}
              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginLeft: "0.35rem" }}>
                ({activeStats.studentCount > 0 ? Math.round(((activeStats.criticalCount + activeStats.warningCount) / activeStats.studentCount) * 100) : 0}%)
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#ef4444" }}>
              {activeStats.warningCount} Warning + {activeStats.criticalCount} Critical
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        style={{
          display: "flex",
          gap: "0.8rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
          backgroundColor: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: "220px" }}>
          <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search name, roll no, VM no, class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.65rem 0.9rem 0.65rem 2.4rem",
              borderRadius: "9px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              fontSize: "0.88rem",
              outline: "none",
            }}
          />
        </div>

        {/* Section Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>Sec:</span>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: "600",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: "600",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="GOOD">Eligible (≥75%)</option>
            <option value="WARNING">Condonation (65-74%)</option>
            <option value="CRITICAL">Shortage (&lt;65%)</option>
            <option value="NEW">New Students</option>
          </select>
        </div>

        {/* Sort By */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: "600",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="pct_asc">Attendance % (Low to High - At Risk First)</option>
            <option value="pct_desc">Attendance % (High to Low)</option>
            <option value="name_asc">Name (A to Z)</option>
            <option value="roll_asc">Roll Number</option>
          </select>
        </div>
      </div>

      {/* STUDENT ATTENDANCE TABLE */}
      <div
        style={{
          borderRadius: "16px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "0.92rem", fontWeight: "700", color: "var(--text-main)" }}>
            Showing {filteredStudents.length} of {students.length} Total Students
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Threshold: 75% | Condonation: 65–74% | Shortage: &lt;65%
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 0.8rem" }} />
            <div>Loading student attendance matrix...</div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={36} style={{ margin: "0 auto 0.8rem", opacity: 0.5 }} />
            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>
              No students found
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>
              Try adjusting your year, section, or search filters.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)" }}>
                  <th style={{ padding: "0.85rem 1.15rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Student Info
                  </th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Classification
                  </th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Sessions & Count
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", width: "240px" }}>
                    Overall Attendance %
                  </th>
                  <th style={{ padding: "0.85rem 1.15rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Eligibility Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => {
                  const pct = s.overallPercentage;
                  const isNew = s.statusCategory === "NEW";
                  const isEligible = s.statusCategory === "GOOD";
                  const isWarning = s.statusCategory === "WARNING";
                  const isCritical = s.statusCategory === "CRITICAL";

                  const barColor = isEligible
                    ? "linear-gradient(90deg, #10b981, #059669)"
                    : isWarning
                    ? "linear-gradient(90deg, #f59e0b, #d97706)"
                    : isCritical
                    ? "linear-gradient(90deg, #ef4444, #dc2626)"
                    : "#94a3b8";

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Student Info */}
                      <td style={{ padding: "0.9rem 1.15rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              backgroundColor: isEligible
                                ? "rgba(16, 185, 129, 0.15)"
                                : isWarning
                                ? "rgba(245, 158, 11, 0.15)"
                                : isCritical
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(148, 163, 184, 0.15)",
                              color: isEligible
                                ? "#10b981"
                                : isWarning
                                ? "#f59e0b"
                                : isCritical
                                ? "#ef4444"
                                : "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "800",
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: "var(--text-main)" }}>{s.name}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", gap: "0.4rem" }}>
                              <span>{s.rollNumber}</span>
                              {s.vmNo && s.vmNo !== s.rollNumber && <span>• {s.vmNo}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Year & Class Classification */}
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontWeight: "700",
                              fontSize: "0.82rem",
                              color: "var(--text-main)",
                            }}
                          >
                            Year {s.yearRoman} • Sec {s.section}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Class ID: <strong style={{ color: "var(--royal-blue)" }}>{s.classId}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Sessions Conducted */}
                      <td style={{ padding: "0.9rem 1rem" }}>
                        {isNew ? (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            0 sessions (Newly added)
                          </span>
                        ) : (
                          <div>
                            <div style={{ fontWeight: "700", color: "var(--text-main)" }}>
                              {s.presentSessions} / {s.totalSessions} Sessions
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {s.absentSessions} Absent {s.odSessions > 0 ? `• ${s.odSessions} OD` : ""}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Percentage & Progress Bar */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        {isNew ? (
                          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                            N/A — No attendance marked
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                              <span
                                style={{
                                  fontSize: "1.05rem",
                                  fontWeight: "800",
                                  color: isEligible ? "#10b981" : isWarning ? "#f59e0b" : "#ef4444",
                                }}
                              >
                                {pct}%
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {isEligible ? "Good" : isWarning ? "At Risk" : "Shortage"}
                              </span>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: "7px",
                                borderRadius: "4px",
                                backgroundColor: "var(--border-subtle)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, pct || 0)}%`,
                                  height: "100%",
                                  borderRadius: "4px",
                                  background: barColor,
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Eligibility Status Pill */}
                      <td style={{ padding: "0.9rem 1.15rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.3rem 0.75rem",
                            borderRadius: "9999px",
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            backgroundColor: isEligible
                              ? "rgba(16, 185, 129, 0.12)"
                              : isWarning
                              ? "rgba(245, 158, 11, 0.12)"
                              : isCritical
                              ? "rgba(239, 68, 68, 0.12)"
                              : "rgba(148, 163, 184, 0.12)",
                            color: isEligible
                              ? "#10b981"
                              : isWarning
                              ? "#f59e0b"
                              : isCritical
                              ? "#ef4444"
                              : "#64748b",
                          }}
                        >
                          {isEligible && <CheckCircle2 size={13} />}
                          {isWarning && <AlertTriangle size={13} />}
                          {isCritical && <XCircle size={13} />}
                          {isNew && <Clock size={13} />}
                          <span>{s.statusLabel}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
