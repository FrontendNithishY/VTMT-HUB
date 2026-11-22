"use client";

import { useState } from "react";
import HodStudentAttendanceView from "@/views/HodStudentAttendanceView";
import TeacherAttendanceLedgerView from "@/views/TeacherAttendanceLedgerView";
import { GraduationCap, CheckCircle2 } from "lucide-react";

export default function HodAttendancePage() {
  const [activeTab, setActiveTab] = useState<"overall" | "ledger">("overall");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.35rem",
          borderRadius: "12px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          width: "fit-content",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("overall")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.15rem",
            borderRadius: "9px",
            border: "none",
            backgroundColor: activeTab === "overall" ? "var(--royal-blue)" : "transparent",
            color: activeTab === "overall" ? "#ffffff" : "var(--text-muted)",
            fontSize: "0.88rem",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: activeTab === "overall" ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
          }}
        >
          <GraduationCap size={16} />
          <span>Overall Student Attendance (% by Year)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.15rem",
            borderRadius: "9px",
            border: "none",
            backgroundColor: activeTab === "ledger" ? "var(--royal-blue)" : "transparent",
            color: activeTab === "ledger" ? "#ffffff" : "var(--text-muted)",
            fontSize: "0.88rem",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: activeTab === "ledger" ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
          }}
        >
          <CheckCircle2 size={16} />
          <span>Period Roll Call (Take Attendance)</span>
        </button>
      </div>

      {activeTab === "overall" ? <HodStudentAttendanceView /> : <TeacherAttendanceLedgerView />}
    </div>
  );
}
