"use client";

import { useEffect, useState } from "react";
import { Briefcase, Users, Activity, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function DepartmentPage() {
  const [dept, setDept] = useState<any>(null);
  const [stats, setStats] = useState<any>({ totalStudents: 0, totalFaculty: 0, avgAttendance: 100 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/departments").then(r => r.json()).catch(() => null),
      fetch("/api/hod/dashboard").then(r => r.json()).catch(() => null)
    ])
      .then(([deptRes, hodRes]) => {
        let hodDeptCode = hodRes?.data?.hod?.department || "CSE";
        let foundDept = null;
        if (deptRes?.success && deptRes?.departments?.length > 0) {
          foundDept = deptRes.departments.find((d: any) => d.code === hodDeptCode) || deptRes.departments[0];
        }
        if (foundDept) {
          // If department hodName is missing or unassigned in DB, fallback to logged-in HOD's name
          if (!foundDept.hodName && hodRes?.data?.hod?.name) {
            foundDept = { ...foundDept, hodName: hodRes.data.hod.name };
          }
          setDept(foundDept);
        }
        if (hodRes?.data?.stats) {
          setStats(hodRes.data.stats);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleExportAll = async () => {
    if (!dept) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/hod/attendance/export?departmentCode=${dept.code}`);
      const { data } = await res.json();
      
      const worksheetData = data.students.map((s: any) => ({
        "Roll No": s.studentProfile?.rollNumber || s.vmNo || "N/A",
        "Name": s.name,
        "Section": s.studentProfile?.section || "N/A",
        "Total Present": data.attendance.filter((a: any) => a.studentId === s.id && a.status === "PRESENT").length,
        "Total Absent": data.attendance.filter((a: any) => a.studentId === s.id && a.status === "ABSENT").length,
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "AttendanceSummary");
      XLSX.writeFile(workbook, `Attendance_Summary_${dept.code}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to export attendance");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #10b981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Department Overview
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>View department statistics and details.</p>
        </div>
        <button 
          onClick={handleExportAll}
          disabled={exporting}
          style={{ backgroundColor: "var(--royal-blue)", color: "white", padding: "0.8rem 1.2rem", borderRadius: "10px", border: "none", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {exporting ? "Generating..." : <><FileSpreadsheet size={18} /> Export All Student Attendance</>}
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>Loading department data...</div>
      ) : dept ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="student-card premium-card" style={{ padding: "2rem", borderRadius: "16px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "16px", backgroundColor: "rgba(16,185,129,0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Briefcase size={40} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.8rem", margin: "0 0 0.2rem 0" }}>{dept.name}</h2>
                <span style={{ fontSize: "1rem", color: "#10b981", fontWeight: "bold", padding: "0.2rem 0.6rem", backgroundColor: "rgba(16,185,129,0.1)", borderRadius: "6px" }}>{dept.code}</span>
              </div>
            </div>
            <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "var(--bg-input)", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Head of Department</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>{dept.hodName || "Not Assigned"}</div>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "var(--bg-input)", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Status</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#10b981" }}>Active & Accredited</div>
              </div>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
             <div className="student-card premium-card" style={{ padding: "1.5rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "1rem" }}>
               <Users size={30} color="var(--sky-blue)" />
               <div>
                 <h4 style={{ margin: 0, fontSize: "1.2rem" }}>{stats.totalStudents}</h4>
                 <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Active Students</span>
               </div>
             </div>
             <div className="student-card premium-card" style={{ padding: "1.5rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "1rem" }}>
               <Activity size={30} color="#a855f7" />
               <div>
                 <h4 style={{ margin: 0, fontSize: "1.2rem" }}>{stats.avgAttendance}%</h4>
                 <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Daily Attendance (Period 1)</span>
               </div>
             </div>
          </div>
        </div>
      ) : (
        <div>No department data found.</div>
      )}
    </div>
  );
}

