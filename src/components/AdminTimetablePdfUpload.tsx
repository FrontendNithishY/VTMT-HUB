"use client";

import { useState, useRef, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Users,
  Award,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  BookOpen,
  Building,
  GraduationCap
} from "lucide-react";

interface FacultyExtractedSummary {
  name: string;
  vmsNo: string;
  designation: string;
  slotCount: number;
}

interface SampleSlot {
  classId: string | null;
  dayOrder: string | null;
  period: number | null;
  timeRange: string | null;
  subjectCode: string | null;
  subjectName: string | null;
  facultyName: string | null;
  vmsNo?: string | null;
  roomNo: string | null;
  category?: string | null;
}

interface TimetableUploadResponse {
  success: boolean;
  timetableType: "master" | "individual";
  writeStrategy: "replace" | "append";
  isMasterClass: boolean;
  count: number;
  totalProcessed: number;
  classCount?: number;
  classes?: string[];
  facultyCount?: number;
  faculty?: string[];
  faculties?: FacultyExtractedSummary[];
  sampleSlots: SampleSlot[];
  warnings?: string[];
  message: string;
  error?: string;
}

const MASTER_CLASSES = [
  "II-CSE-A",
  "II-CSE-B",
  "II-CSE-C",
  "III-CSE-A",
  "III-CSE-B",
  "III-CSE-C",
  "IV-CSE-A",
  "IV-CSE-B",
  "IV-CSE-C",
];

const PERIOD_TIMINGS: Record<number, string> = {
  1: "08:05 - 08:55",
  2: "08:55 - 09:45",
  3: "10:00 - 10:50",
  4: "10:50 - 11:40",
  5: "12:20 - 01:05",
  6: "01:05 - 01:50",
  7: "02:00 - 02:45",
  8: "02:45 - 03:30",
};

const DAY_ORDERS = ["I", "II", "III", "IV", "V"];

export default function AdminTimetablePdfUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  // Mode: Master Class vs Individual Faculty
  const [docSubTab, setDocSubTab] = useState<"master" | "individual">("master");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importMode, setImportMode] = useState<"append" | "replace">("replace");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semType, setSemType] = useState<"ODD" | "EVEN">("ODD");
  const [showGuide, setShowGuide] = useState(true);

  // Post-Extraction State
  const [uploadResult, setUploadResult] = useState<TimetableUploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedClassTab, setSelectedClassTab] = useState<string>("II-CSE-A");
  const [facultySearch, setFacultySearch] = useState<string>("");
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [showRawTable, setShowRawTable] = useState(false);

  const [fileType, setFileType] = useState<"pdf" | "doc" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isDoc = name.endsWith(".docx") || name.endsWith(".doc");

    if (!isPdf && !isDoc) {
      setErrorMessage("Please upload a valid PDF document (.pdf) or Word document (.docx/.doc)");
      return;
    }
    setFile(selectedFile);
    setFileType(isPdf ? "pdf" : "doc");
    setErrorMessage(null);
    setUploadResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExtractAndImport = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", importMode);
    formData.append("type", docSubTab);
    formData.append("timetableType", docSubTab);
    formData.append("academicYear", academicYear);
    formData.append("semType", semType);

    try {
      const endpoint = fileType === "doc" ? "/api/admin/timetable/import-doc" : "/api/admin/timetable/import-pdf";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setUploadResult(data);
        if (data.classes && data.classes.length > 0) {
          setSelectedClassTab(data.classes[0]);
        }
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setErrorMessage(data.error || "Failed to parse and import timetable file.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected network error occurred.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileType(null);
    setUploadResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filtered faculty list
  const filteredFaculties = useMemo(() => {
    if (!uploadResult?.faculties) return [];
    if (!facultySearch.trim()) return uploadResult.faculties;
    const q = facultySearch.toLowerCase();
    return uploadResult.faculties.filter(
      (f) => f.name.toLowerCase().includes(q) || f.vmsNo.toLowerCase().includes(q)
    );
  }, [uploadResult?.faculties, facultySearch]);

  // Slots for currently selected master class
  const classMatrixSlots = useMemo(() => {
    if (!uploadResult?.sampleSlots) return new Map<string, SampleSlot>();
    const map = new Map<string, SampleSlot>();
    for (const slot of uploadResult.sampleSlots) {
      if (slot.classId === selectedClassTab && slot.dayOrder && slot.period) {
        map.set(`${slot.dayOrder}-${slot.period}`, slot);
      }
    }
    return map;
  }, [uploadResult?.sampleSlots, selectedClassTab]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 2-Part Sub-Tab Segmented Control */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.4rem",
          backgroundColor: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setDocSubTab("master");
            setUploadResult(null);
            setErrorMessage(null);
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "9px",
            border: "none",
            backgroundColor: docSubTab === "master" ? "var(--royal-blue)" : "transparent",
            color: docSubTab === "master" ? "#ffffff" : "var(--text-muted)",
            fontSize: "0.95rem",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: docSubTab === "master" ? "0 4px 12px rgba(29, 78, 216, 0.3)" : "none",
          }}
        >
          <Building size={18} />
          <span>🏛️ 1. Master Class Timetable (9-Class Grids)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDocSubTab("individual");
            setUploadResult(null);
            setErrorMessage(null);
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "9px",
            border: "none",
            backgroundColor: docSubTab === "individual" ? "var(--royal-blue)" : "transparent",
            color: docSubTab === "individual" ? "#ffffff" : "var(--text-muted)",
            fontSize: "0.95rem",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: docSubTab === "individual" ? "0 4px 12px rgba(29, 78, 216, 0.3)" : "none",
          }}
        >
          <Users size={18} />
          <span>👥 2. Individual Faculty Timetable (33 Faculty Packets)</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="student-card premium-card" style={{ padding: "1.75rem", borderLeft: "4px solid var(--royal-blue)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "var(--sky-blue)",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Sparkles size={12} />
                {docSubTab === "master"
                  ? "MASTER CLASS TIMETABLE EXTRACTION"
                  : "INDIVIDUAL FACULTY PACKET EXTRACTION"}
              </span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
              {docSubTab === "master"
                ? "Upload Master Class Timetable (.pdf, .docx, .doc)"
                : "Upload Individual Faculty Timetable Packet (.pdf, .docx, .doc)"}
            </h2>
            <p style={{ margin: "0.4rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {docSubTab === "master"
                ? "Extracts college master class tables containing Days I–V x Periods 1–8 across department sections (II-CSE-A/B/C, III-CSE-A/B/C, IV-CSE-A/B/C) with subject distribution mapping."
                : "Extracts individual faculty packets containing faculty metadata (Name, MTS ID, Designation), weekly period matrices, and subject/lab mapping tables."}
            </p>
          </div>

          {/* Contextual Template Downloads */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {docSubTab === "master" ? (
              <>
                <a
                  href="/api/admin/timetable/template-pdf?type=class"
                  download="master-class-timetable-template.pdf"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-main)",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} color="var(--royal-blue)" /> ⬇ Master Class PDF (.pdf)
                </a>
                <a
                  href="/api/admin/timetable/template-doc"
                  download="timetable-master-template.docx"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-main)",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} color="#2563eb" /> ⬇ Master Class Word (.docx)
                </a>
              </>
            ) : (
              <>
                <a
                  href="/api/admin/timetable/template-pdf?type=individual"
                  download="individual-faculty-timetable-template.pdf"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-main)",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} color="var(--sky-blue)" /> ⬇ Faculty PDF Template (.pdf)
                </a>
                <a
                  href="/api/admin/timetable/template-doc"
                  download="individual-faculty-template.docx"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-main)",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} color="#2563eb" /> ⬇ Faculty Word Template (.docx)
                </a>
              </>
            )}

            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <Info size={14} /> {showGuide ? "Hide Guide" : "Format Guide"}
            </button>
          </div>
        </div>

        {/* Format Guide */}
        {showGuide && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1.1rem 1.25rem",
              backgroundColor: "var(--bg-input)",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {docSubTab === "master" ? (
              <>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    🏛️ 9-Class Department Coverage
                  </strong>
                  Supports multi-page documents containing full master schedules for classes II-CSE-A/B/C, III-CSE-A/B/C, IV-CSE-A/B/C.
                </div>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    📐 5x8 Matrix & Lunch Collapsing
                  </strong>
                  Assigns Days I–V against Periods 1–8 via coordinate intersection. Vertical lunch breaks are filtered without corrupting surrounding slots.
                </div>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    📚 Subject Distribution Mapping
                  </strong>
                  Automatically reads bottom tables to associate subject acronyms (e.g. DS, SPM) with subject codes, full names, faculty names, and lab rooms.
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    👥 33 Faculty Member Roster
                  </strong>
                  Parses full faculty packets with 33 individual sections. Extracts faculty names, MTS staff IDs, and designations without leaking header labels.
                </div>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    🛡️ Replacement Scope Isolation
                  </strong>
                  Updating individual faculty schedules replaces only slots belonging to the uploaded teachers, preventing accidental deletion of whole class timetables.
                </div>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    🎯 Smart Semester Mapping
                  </strong>
                  Maps Sem/Sec notation (e.g. &apos;V / B&apos; to III-CSE-B, &apos;VII / A&apos; to IV-CSE-A) prioritizing subject mappings over bare section defaults.
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upload Zone & Controls */}
      <div className="student-card premium-card" style={{ padding: "2rem" }}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragging ? "2px dashed var(--sky-blue)" : "2px dashed var(--border-subtle)",
            backgroundColor: isDragging ? "rgba(56, 189, 248, 0.08)" : "var(--bg-input)",
            borderRadius: "12px",
            padding: "3rem 2rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
            accept=".pdf, .docx, .doc, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword"
            style={{ display: "none" }}
          />

          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 4px 14px rgba(29, 78, 216, 0.3)",
            }}
          >
            <FileText size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: "0 0 0.3rem 0", color: "var(--text-main)" }}>
              {file
                ? file.name
                : docSubTab === "master"
                ? "Choose or drop Master Class Timetable (.pdf, .docx, .doc)"
                : "Choose or drop Individual Faculty Timetable Packet (.pdf, .docx, .doc)"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for ${docSubTab} timetable extraction`
                : docSubTab === "master"
                ? "Accepts 9-page college master class grids (Days I-V x Periods 1-8 for II, III, IV Year CSE)"
                : "Accepts 33-faculty packets containing faculty metadata, MTS IDs, and period matrices"}
            </p>
          </div>
        </div>

        {/* Options Toolbar: Mode, Academic Year, Semester, and Actions */}
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            {/* Write Strategy */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>
                Database Mode:
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                />
                <span>
                  <strong>Replace Target</strong> ({docSubTab === "master" ? "Overwrites targeted classes" : "Overwrites targeted faculty"})
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === "append"}
                  onChange={() => setImportMode("append")}
                />
                <span><strong>Append / Merge</strong></span>
              </label>
            </div>

            {/* Academic Year Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Year:</span>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{
                  padding: "0.35rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                }}
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            {/* Semester Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Semester:</span>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => setSemType("ODD")}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: semType === "ODD" ? "var(--sky-blue)" : "var(--bg-input)",
                    color: semType === "ODD" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  ODD
                </button>
                <button
                  type="button"
                  onClick={() => setSemType("EVEN")}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: semType === "EVEN" ? "var(--sky-blue)" : "var(--bg-input)",
                    color: semType === "EVEN" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  EVEN
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {file && (
              <button
                type="button"
                onClick={handleReset}
                disabled={uploading}
                style={{
                  padding: "0.65rem 1.1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleExtractAndImport}
              disabled={!file || uploading}
              style={{
                padding: "0.65rem 1.4rem",
                borderRadius: "8px",
                border: "none",
                background:
                  !file || uploading
                    ? "var(--border-subtle)"
                    : "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: !file || uploading ? "not-allowed" : "pointer",
                boxShadow: !file || uploading ? "none" : "0 4px 14px rgba(29, 78, 216, 0.3)",
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  Extracting {docSubTab === "master" ? "Master Class Grids" : "Faculty Packets"}...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Run {docSubTab === "master" ? "Master Class" : "Faculty"} Extraction & Import
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <AlertCircle size={18} />
            <div>
              <strong>Extraction Error:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* Success Results Card */}
        {uploadResult && uploadResult.success && (
          <div
            style={{
              marginTop: "1.75rem",
              padding: "1.5rem",
              borderRadius: "12px",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#10b981", marginBottom: "0.75rem" }}>
              <CheckCircle2 size={22} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>
                Extraction & Database Import Successful!
              </h3>
            </div>
            <p style={{ margin: "0 0 1.25rem 0", color: "var(--text-main)", fontSize: "0.9rem" }}>
              {uploadResult.message}
            </p>

            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {uploadResult.isMasterClass ? "Classes Extracted" : "Faculty Extracted"}
                </span>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--sky-blue)", marginTop: "0.2rem" }}>
                  {uploadResult.isMasterClass
                    ? `${uploadResult.classCount || uploadResult.classes?.length || 0} Classes`
                    : `${uploadResult.facultyCount || uploadResult.faculties?.length || 0} Faculty`}
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Slots Created</span>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#10b981", marginTop: "0.2rem" }}>
                  {uploadResult.count} Slots
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target Days</span>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#a855f7", marginTop: "0.2rem" }}>
                  Day I – V (Periods 1–8)
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Academic Period</span>
                <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-main)", marginTop: "0.2rem" }}>
                  {semType} {academicYear}
                </div>
              </div>
            </div>

            {/* ======================================================= */}
            {/* VIEW 1: MASTER CLASS INTERACTIVE PERIOD MATRIX GRID */}
            {/* ======================================================= */}
            {uploadResult.isMasterClass && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                    🏛️ Master Class Weekly Period Grid (Select Class Section):
                  </strong>
                </div>

                {/* Class Switcher Tabs */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {(uploadResult.classes && uploadResult.classes.length > 0 ? uploadResult.classes : MASTER_CLASSES).map(
                    (cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSelectedClassTab(cls)}
                        style={{
                          padding: "0.45rem 0.85rem",
                          borderRadius: "6px",
                          border: selectedClassTab === cls ? "1px solid var(--royal-blue)" : "1px solid var(--border-subtle)",
                          backgroundColor: selectedClassTab === cls ? "var(--royal-blue)" : "var(--bg-card)",
                          color: selectedClassTab === cls ? "#ffffff" : "var(--text-main)",
                          fontSize: "0.8rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {cls}
                      </button>
                    )
                  )}
                </div>

                {/* 5x8 Visual Period Matrix Grid */}
                <div className="responsive-table-wrapper" style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "center" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--bg-card-header)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "0.6rem", borderRight: "1px solid var(--border-subtle)", width: "80px" }}>Day Order</th>
                        {[1, 2, 3, 4].map((p) => (
                          <th key={p} style={{ padding: "0.6rem", borderRight: "1px solid var(--border-subtle)" }}>
                            <div>P{p}</div>
                            <div style={{ fontSize: "0.65rem", fontWeight: "normal", color: "var(--text-muted)" }}>{PERIOD_TIMINGS[p]}</div>
                          </th>
                        ))}
                        <th style={{ padding: "0.6rem", borderRight: "1px solid var(--border-subtle)", width: "65px", backgroundColor: "rgba(234, 179, 8, 0.1)", color: "#eab308" }}>
                          Lunch
                        </th>
                        {[5, 6, 7, 8].map((p) => (
                          <th key={p} style={{ padding: "0.6rem", borderRight: p < 8 ? "1px solid var(--border-subtle)" : "none" }}>
                            <div>P{p}</div>
                            <div style={{ fontSize: "0.65rem", fontWeight: "normal", color: "var(--text-muted)" }}>{PERIOD_TIMINGS[p]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAY_ORDERS.map((day) => (
                        <tr key={day} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.6rem", fontWeight: "800", color: "var(--royal-blue)", borderRight: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)" }}>
                            Day {day}
                          </td>
                          {[1, 2, 3, 4].map((p) => {
                            const slot = classMatrixSlots.get(`${day}-${p}`);
                            return (
                              <td key={p} style={{ padding: "0.5rem 0.4rem", borderRight: "1px solid var(--border-subtle)", verticalAlign: "top" }}>
                                {slot ? (
                                  <div>
                                    <div style={{ fontWeight: "700", color: slot.category === "lab1" ? "#10b981" : "var(--sky-blue)", fontSize: "0.8rem" }}>
                                      {slot.subjectCode || slot.subjectName}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                      {slot.facultyName || "Staff"}
                                    </div>
                                    <div style={{ fontSize: "0.65rem", color: "#a855f7", marginTop: "2px" }}>
                                      {slot.roomNo || "LH-201"}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--text-muted)" }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: "0.4rem", backgroundColor: "rgba(234, 179, 8, 0.05)", borderRight: "1px solid var(--border-subtle)", color: "#ca8a04", fontSize: "0.7rem", fontWeight: "600" }}>
                            Break
                          </td>
                          {[5, 6, 7, 8].map((p) => {
                            const slot = classMatrixSlots.get(`${day}-${p}`);
                            return (
                              <td key={p} style={{ padding: "0.5rem 0.4rem", borderRight: p < 8 ? "1px solid var(--border-subtle)" : "none", verticalAlign: "top" }}>
                                {slot ? (
                                  <div>
                                    <div style={{ fontWeight: "700", color: slot.category === "lab1" ? "#10b981" : "var(--sky-blue)", fontSize: "0.8rem" }}>
                                      {slot.subjectCode || slot.subjectName}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                      {slot.facultyName || "Staff"}
                                    </div>
                                    <div style={{ fontSize: "0.65rem", color: "#a855f7", marginTop: "2px" }}>
                                      {slot.roomNo || "LH-201"}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--text-muted)" }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* VIEW 2: INDIVIDUAL FACULTY DIRECTORY & TEACHING MATRIX  */}
            {/* ======================================================= */}
            {!uploadResult.isMasterClass && uploadResult.faculties && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                    👥 Processed Faculty Sheets ({uploadResult.faculties.length} Staff):
                  </strong>
                  <div style={{ position: "relative", width: "260px" }}>
                    <Search size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Filter by name or MTS No..."
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.35rem 0.6rem 0.35rem 1.8rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-input)",
                        color: "var(--text-main)",
                        fontSize: "0.8rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem", maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                  {filteredFaculties.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.85rem",
                        backgroundColor: "var(--bg-card)",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{f.name}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {f.vmsNo ? <span style={{ color: "var(--sky-blue)", fontWeight: "700" }}>MTS: {f.vmsNo} • </span> : ""}
                            {f.designation || "Assistant Professor"}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: f.slotCount > 0 ? "rgba(56, 189, 248, 0.15)" : "rgba(239, 68, 68, 0.1)",
                            color: f.slotCount > 0 ? "var(--sky-blue)" : "#ef4444",
                            fontWeight: "700",
                            fontSize: "0.75rem",
                          }}
                        >
                          {f.slotCount} slots
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toggle Raw Database Slots Table */}
            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setShowRawTable(!showRawTable)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                📋 {showRawTable ? "Hide Raw Database Slots" : `View Raw Database Slots (${uploadResult.sampleSlots?.length || 0} Preview)`}
                {showRawTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showRawTable && uploadResult.sampleSlots && uploadResult.sampleSlots.length > 0 && (
                <div className="responsive-table-wrapper" style={{ maxHeight: "240px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--border-subtle)", marginTop: "0.75rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--bg-card-header)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Class</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Day Order</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Period</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Timing</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Subject</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Faculty</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>MTS No</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.sampleSlots.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: "700", color: "#a855f7" }}>{s.classId || "—"}</td>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: "700" }}>{s.dayOrder ? `Day ${s.dayOrder}` : "—"}</td>
                          <td style={{ padding: "0.45rem 0.6rem" }}>{s.period ? `P${s.period}` : "—"}</td>
                          <td style={{ padding: "0.45rem 0.6rem", color: "var(--text-muted)" }}>{s.timeRange || "—"}</td>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: "600", color: "var(--sky-blue)" }}>
                            {s.subjectName || s.subjectCode || "—"}
                          </td>
                          <td style={{ padding: "0.45rem 0.6rem" }}>{s.facultyName || "—"}</td>
                          <td style={{ padding: "0.45rem 0.6rem", color: "var(--text-muted)" }}>{s.vmsNo || "—"}</td>
                          <td style={{ padding: "0.45rem 0.6rem" }}>{s.roomNo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
