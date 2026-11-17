"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  UserCheck,
  Shuffle,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Layers,
  FileCheck
} from "lucide-react";
import * as XLSX from "xlsx";

interface TeacherItem {
  id: string;
  name: string;
  vmNo?: string | null;
  role: string;
  department?: string | null;
  designation?: string | null;
  subject1?: string | null;
  subject2?: string | null;
  lab1?: string | null;
  lab2?: string | null;
  additional1?: string | null;
  additional2?: string | null;
}

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  departmentCode: string;
}

interface TeacherAllocationProps {
  departments: { code: string; name: string }[];
  initialTargetCourse?: SubjectItem | null;
  onTimetableGenerated?: (classId: string) => void;
  onCourseUpdated?: () => void;
  onBackToCatalog?: () => void;
}

export default function TeacherSubjectAllocation({
  departments = [],
  initialTargetCourse,
  onTimetableGenerated,
  onCourseUpdated,
  onBackToCatalog,
}: TeacherAllocationProps) {
  // Target Class Selection
  const [selectedDept, setSelectedDept] = useState<string>("CSE");
  const [selectedYear, setSelectedYear] = useState<string>("II");
  const [selectedSemType, setSelectedSemType] = useState<"ODD" | "EVEN">("ODD");
  const [selectedSection, setSelectedSection] = useState<string>("A");
  const [highlightedCourseCode, setHighlightedCourseCode] = useState<string | null>(null);

  // Data State
  const [catalogSubjects, setCatalogSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [savingAllocations, setSavingAllocations] = useState<boolean>(false);

  // Subject-to-Teacher Mappings: subjectCode -> { facultyName, vmsNo, roomNo }
  const [assignments, setAssignments] = useState<
    Record<string, { facultyName: string; vmsNo: string; roomNo: string }>
  >({});

  // Per-subject Period Rules: subjectCode -> { periodsPerWeek: number, isContinuous: boolean }
  const [subjectRules, setSubjectRules] = useState<
    Record<string, { periodsPerWeek: number; isContinuous: boolean }>
  >({});

  // Priority Special Slots Configuration (Sports, Electives, Library)
  const [sportsConfig, setSportsConfig] = useState<{
    enabled: boolean;
    dayOrder: string;
    periods: [number, number]; // e.g. [7, 8]
    roomNo: string;
    facultyName: string;
  }>({
    enabled: true,
    dayOrder: "V", // Day Order V by default
    periods: [7, 8], // Last 2 periods
    roomNo: "GROUND",
    facultyName: "Physical Director",
  });

  const [libraryConfig, setLibraryConfig] = useState<{
    enabled: boolean;
    dayOrder: string;
    period: number;
    roomNo: string;
  }>({
    enabled: true,
    dayOrder: "III",
    period: 6,
    roomNo: "CENTRAL-LIB",
  });

  const [electiveConfig, setElectiveConfig] = useState<{
    enabled: boolean;
    code: string;
    name: string;
    dayOrder: string;
    periods: [number, number]; // e.g. [5, 6]
    facultyName: string;
    faculty1: string;
    faculty2: string;
    faculty3: string;
    roomNo: string;
  }>({
    enabled: false,
    code: "EP-OPEN",
    name: "Professional Elective / Open Elective",
    dayOrder: "IV",
    periods: [5, 6],
    facultyName: "Elective Coordinator",
    faculty1: "",
    faculty2: "",
    faculty3: "",
    roomNo: "AUDITORIUM",
  });

  // Mode Switcher: Mode 1 (Interactive Faculty Select) vs Mode 2 (Overall Faculty Excel Input)
  const [generationMode, setGenerationMode] = useState<"mode1_select" | "mode2_excel">("mode1_select");

  // Mode 2 State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelUploading, setExcelUploading] = useState<boolean>(false);
  const [excelExtractedData, setExcelExtractedData] = useState<any[]>([]);
  const [excelTargetClasses, setExcelTargetClasses] = useState<string[]>([]);
  const [excelParsingError, setExcelParsingError] = useState<string | null>(null);
  const [excelSuccessResult, setExcelSuccessResult] = useState<any | null>(null);
  const [excelWriteStrategy, setExcelWriteStrategy] = useState<"replace" | "append">("replace");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "LAB" | "THEORY">("ALL");

  // Execution State
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Subject Management Modal State (Create subject in Course Catalog directly from Allocation view)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCredits, setNewSubCredits] = useState("3");
  const [newSubSem, setNewSubSem] = useState("3");
  const [newSubDept, setNewSubDept] = useState("CSE");
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  // Computed Class ID (e.g. "II-CSE-A")
  const computedClassId = useMemo(() => {
    return `${selectedYear}-${selectedDept}-${selectedSection}`;
  }, [selectedYear, selectedDept, selectedSection]);

  // Compute semester number from academic year and odd/even choice
  const computedSemester = useMemo(() => {
    let base = 1;
    if (selectedYear === "I") base = 1;
    else if (selectedYear === "II") base = 3;
    else if (selectedYear === "III") base = 5;
    else if (selectedYear === "IV") base = 7;

    return selectedSemType === "EVEN" ? base + 1 : base;
  }, [selectedYear, selectedSemType]);

  // Fetch teachers and catalog subjects
  const loadData = async () => {
    try {
      setRefreshing(true);
      // 1. Fetch Teachers from /api/admin/users
      const usersRes = await fetch("/api/admin/users").then((r) => r.json());
      if (usersRes.success && usersRes.users) {
        const teacherList: TeacherItem[] = usersRes.users
          .filter((u: any) => u.role === "FACULTY" || u.role === "HOD")
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            vmNo: u.facultyProfile?.vmNo || u.vmNo || null,
            role: u.role,
            department: u.facultyProfile?.department || null,
            designation: u.facultyProfile?.designation || null,
            subject1: u.facultyProfile?.subject1 || null,
            subject2: u.facultyProfile?.subject2 || null,
            lab1: u.facultyProfile?.lab1 || null,
            lab2: u.facultyProfile?.lab2 || null,
            additional1: u.facultyProfile?.additional1 || null,
            additional2: u.facultyProfile?.additional2 || null,
          }));
        setTeachers(teacherList);
      }

      // 2. Fetch Catalog Subjects
      const subjectsRes = await fetch("/api/admin/subjects").then((r) => r.json());
      if (subjectsRes.success && subjectsRes.subjects) {
        const subs: any[] = subjectsRes.subjects;
        setCatalogSubjects(subs);
        populateClassAssignments(subs, usersRes?.users || [], computedClassId);
      }
    } catch (err: any) {
      console.error("Error loading allocation data:", err);
      setStatusMessage({ type: "error", text: "Failed to load faculty and course catalog." });
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  // Helper: Populate assignments for a specific class section
  const populateClassAssignments = (subs: SubjectItem[], allUsers: any[], targetClassId: string) => {
    setAssignments((prev) => {
      const classMap: Record<string, { facultyName: string; vmsNo: string; roomNo: string }> = {};

      // Helper: get aliases for classId comparison
      const targetAliases = [
        targetClassId.toUpperCase(),
        targetClassId.toUpperCase().replace(/^([IV]+)-/, (m, y) => {
          if (y === "I") return "1-";
          if (y === "II") return "2-";
          if (y === "III") return "3-";
          if (y === "IV") return "4-";
          return m;
        }),
        targetClassId.toUpperCase().replace(/^([1-4])-/, (m, y) => {
          if (y === "1") return "I-";
          if (y === "2") return "II-";
          if (y === "3") return "III-";
          if (y === "4") return "IV-";
          return m;
        }),
      ];

      subs.forEach((sub: any) => {
        // Priority 1: Check if there is an existing schedule slot specifically for this class
        let classSlotFaculty = "";
        let classSlotRoom = "";
        let classSlotVm = "";

        if (sub.scheduleSlots && Array.isArray(sub.scheduleSlots)) {
          const matchingSlot = sub.scheduleSlots.find(
            (slot: any) => slot.classId && targetAliases.includes(slot.classId.toUpperCase())
          );
          if (matchingSlot && matchingSlot.facultyName) {
            classSlotFaculty = matchingSlot.facultyName;
            classSlotRoom = matchingSlot.roomNo || "";
            classSlotVm = matchingSlot.vmsNo || "";
          }
        }

        // If this class has its own assigned teacher in the timetable, use it!
        if (classSlotFaculty) {
          const staffNames = classSlotFaculty.split(/[,/]+/).map((s: string) => s.trim()).filter(Boolean);
          const vmsList = staffNames.map((name: string) => {
            const matched = (allUsers || []).find((u: any) => {
              const uName = (u.name || "").toLowerCase().trim();
              const fName = name.toLowerCase().trim();
              return (
                uName === fName ||
                uName.replace(/^(dr|mr|ms|mrs)\.?\s*/i, "") === fName.replace(/^(dr|mr|ms|mrs)\.?\s*/i, "")
              );
            });
            return matched?.vmNo || matched?.facultyProfile?.vmNo || "";
          });

          classMap[sub.code] = {
            facultyName: classSlotFaculty,
            vmsNo: classSlotVm || vmsList.join(", "),
            roomNo: classSlotRoom || (sub.code.toLowerCase().includes("lab") ? "CS-LAB-1" : "LH-201"),
          };
        } else if (prev[sub.code]) {
          // Keep existing pending user edits
          classMap[sub.code] = prev[sub.code];
        } else {
          // Empty assignment so each class can choose its own teacher
          classMap[sub.code] = {
            facultyName: "",
            vmsNo: "",
            roomNo: sub.code.toLowerCase().includes("lab") ? "CS-LAB-1" : "LH-201",
          };
        }
      });
      return classMap;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // When class selection (year, dept, section) changes, reload class-specific assignments
  useEffect(() => {
    if (catalogSubjects.length > 0) {
      populateClassAssignments(catalogSubjects, teachers, computedClassId);
    }
  }, [computedClassId]);

  // Scope filter: "SEMESTER" (default for target class), "ALL_CATALOG" (every course catalog subject), or specific semester "1".."8"
  const [semesterFilter, setSemesterFilter] = useState<string>("SEMESTER");

  // When initialTargetCourse changes, auto-switch to its department and semester
  useEffect(() => {
    if (initialTargetCourse) {
      if (initialTargetCourse.departmentCode) {
        setSelectedDept(initialTargetCourse.departmentCode);
      }
      if (initialTargetCourse.semester) {
        const sem = initialTargetCourse.semester;
        if (sem <= 2) setSelectedYear("I");
        else if (sem <= 4) setSelectedYear("II");
        else if (sem <= 6) setSelectedYear("III");
        else setSelectedYear("IV");
      }
      setHighlightedCourseCode(initialTargetCourse.code);
      setSemesterFilter("ALL_CATALOG");
      setSearchQuery(initialTargetCourse.code);

      // Scroll into view after render
      setTimeout(() => {
        const el = document.getElementById(`allocation-row-${initialTargetCourse.code}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [initialTargetCourse]);

  // Filter subjects based on scope, department, semester, search, and lab/theory
  const relevantSubjects = useMemo(() => {
    return catalogSubjects.filter((s) => {
      // If showing all catalog subjects, don't restrict department or semester unless explicitly chosen
      const matchDept =
        semesterFilter === "ALL_CATALOG"
          ? true
          : !selectedDept ||
            s.departmentCode.toUpperCase() === selectedDept.toUpperCase() ||
            s.departmentCode.toUpperCase() === "ALL";

      // Match semester
      let matchSem = true;
      if (semesterFilter === "ALL_CATALOG") {
        matchSem = true;
      } else if (semesterFilter === "YEAR") {
        const allowedSems = [computedSemester, computedSemester + 1];
        matchSem = allowedSems.includes(s.semester);
      } else if (semesterFilter === "SEMESTER") {
        matchSem = s.semester === computedSemester;
      } else if (semesterFilter === "ODD_SEMS") {
        matchSem = s.semester % 2 !== 0;
      } else if (semesterFilter === "EVEN_SEMS") {
        matchSem = s.semester % 2 === 0;
      } else if (semesterFilter !== "ALL") {
        const targetSem = parseInt(semesterFilter);
        if (!isNaN(targetSem)) {
          matchSem = s.semester === targetSem;
        }
      }

      // Search query
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.departmentCode.toLowerCase().includes(searchQuery.toLowerCase());

      // Lab vs Theory
      const isLab = s.name.toLowerCase().includes("lab") || s.code.toLowerCase().includes("lab");
      const matchType =
        filterType === "ALL" ? true : filterType === "LAB" ? isLab : !isLab;

      return matchDept && matchSem && matchSearch && matchType;
    });
  }, [catalogSubjects, semesterFilter, selectedDept, computedSemester, searchQuery, filterType]);

  // Check if subject is Lab
  const checkIfLab = (sub: SubjectItem) => {
    const text = `${sub.name} ${sub.code}`.toLowerCase();
    return text.includes("lab") || text.includes("practical") || text.includes("workshop");
  };

  // Check if subject is Elective (professional elective / open elective)
  const checkIfElective = (sub: SubjectItem) => {
    const text = `${sub.name} ${sub.code}`.toLowerCase();
    return (
      text.includes("elective") ||
      text.includes(" pe ") ||
      text.includes(" oe ") ||
      text.startsWith("pe") ||
      text.startsWith("oe") ||
      text.includes("open elective") ||
      text.includes("prof elective")
    );
  };

  // Update assignment for a subject (supports multi-staff for labs and electives)
  const handleTeacherSelect = (subCode: string, teacherName: string, slotIndex: number = 0) => {
    setAssignments((prev) => {
      const existing = prev[subCode] || { facultyName: "", vmsNo: "", roomNo: subCode.toLowerCase().includes("lab") ? "CS-LAB-1" : "LH-201" };
      const currentNames = (existing.facultyName || "").split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
      const currentVms = (existing.vmsNo || "").split(/[,/]+/).map((s) => s.trim()).filter(Boolean);

      const matchedTeacher = teachers.find((t) => t.name === teacherName);
      const teacherVm = matchedTeacher?.vmNo || "";

      if (!teacherName) {
        // Remove staff at slotIndex
        currentNames.splice(slotIndex, 1);
        currentVms.splice(slotIndex, 1);
      } else {
        // Set staff at slotIndex
        currentNames[slotIndex] = teacherName;
        currentVms[slotIndex] = teacherVm;
      }

      return {
        ...prev,
        [subCode]: {
          facultyName: currentNames.join(", "),
          vmsNo: currentVms.join(", "),
          roomNo: existing.roomNo || (subCode.toLowerCase().includes("lab") ? "CS-LAB-1" : "LH-201"),
        },
      };
    });
  };

  const handleRoomChange = (subCode: string, roomNo: string) => {
    setAssignments((prev) => ({
      ...prev,
      [subCode]: {
        facultyName: prev[subCode]?.facultyName || "",
        vmsNo: prev[subCode]?.vmsNo || "",
        roomNo,
      },
    }));
  };

  // Auto-fill unassigned subjects: prioritize teachers whose profile teaching assignments match this subject
  const handleAutoAssignTeachers = () => {
    if (teachers.length === 0) {
      alert("No faculty members registered in system. Please add faculty in User Accounts first.");
      return;
    }

    const updated = { ...assignments };
    relevantSubjects.forEach((sub, idx) => {
      if (!updated[sub.code]?.facultyName) {
        // Priority 1: Check if any teacher has this course code/title in their profile teaching assignments
        const subNameLower = sub.name.toLowerCase();
        const subCodeLower = sub.code.toLowerCase();

        const profileMatchedTeacher = teachers.find((t) => {
          const profileSubjects = [t.subject1, t.subject2, t.lab1, t.lab2, t.additional1, t.additional2]
            .filter(Boolean)
            .map((s) => String(s).toLowerCase().trim());

          return profileSubjects.some(
            (ps) => ps === subCodeLower || ps === subNameLower || subNameLower.includes(ps) || ps.includes(subNameLower)
          );
        });

        // Priority 2: Fallback to department matching faculty in round-robin
        const deptTeachers = teachers.filter(
          (t) => !t.department || t.department.toUpperCase() === selectedDept.toUpperCase()
        );
        const pool = deptTeachers.length > 0 ? deptTeachers : teachers;
        const assignedTeacher = profileMatchedTeacher || pool[idx % pool.length];

        updated[sub.code] = {
          facultyName: assignedTeacher.name,
          vmsNo: assignedTeacher.vmNo || "",
          roomNo: checkIfLab(sub) ? `LAB-${(idx % 3) + 1}` : `LH-${200 + (idx % 4) + 1}`,
        };
      }
    });

    setAssignments(updated);
    setStatusMessage({
      type: "info",
      text: `Auto-mapped teachers to ${relevantSubjects.length} subjects for ${computedClassId} (prioritizing profile teaching assignments).`,
    });
  };

  // Clear all selections for current view
  const handleClearAssignments = () => {
    if (!confirm("Clear selected teacher assignments for this view?")) return;
    setAssignments({});
    setStatusMessage(null);
  };

  // Create subject in Course Catalog from allocation tab
  const handleOpenCreateModal = () => {
    setNewSubDept(selectedDept);
    setNewSubSem(computedSemester.toString());
    setNewSubCode("");
    setNewSubName("");
    setNewSubCredits("3");
    setShowAddSubjectModal(true);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCode.trim() || !newSubName.trim()) {
      alert("Please provide both Subject Code and Name.");
      return;
    }

    try {
      setCreatingSubject(true);
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newSubCode.trim().toUpperCase(),
          name: newSubName.trim(),
          credits: parseInt(newSubCredits) || 3,
          semester: parseInt(newSubSem) || computedSemester,
          departmentCode: newSubDept || selectedDept,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setShowAddSubjectModal(false);
        setNewSubCode("");
        setNewSubName("");
        setStatusMessage({
          type: "success",
          text: `Subject "${res.subject.code} - ${res.subject.name}" successfully added to Course Catalog!`,
        });
        await loadData();
        if (onCourseUpdated) onCourseUpdated();
      } else {
        alert(res.error || "Failed to create subject.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create subject.");
    } finally {
      setCreatingSubject(false);
    }
  };

  // Connect & Save Teacher-Subject Allocations directly to database & Course Catalog
  const handleSaveAllocationsToCatalog = async () => {
    const assignedEntries = Object.entries(assignments).filter(([_, val]) => val.facultyName);
    if (assignedEntries.length === 0) {
      alert("No teachers are currently selected for any subjects in this view. Please assign at least one teacher.");
      return;
    }

    try {
      setSavingAllocations(true);
      setStatusMessage({
        type: "info",
        text: `Syncing and saving teacher allocations for ${assignedEntries.length} subjects to Course Catalog and faculty profiles...`,
      });

      // Save assignments to database through batch subject allocation endpoint
      const res = await fetch("/api/admin/subjects/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: computedClassId,
          departmentCode: selectedDept,
          allocations: assignedEntries.map(([code, val]) => ({
            subjectCode: code,
            facultyName: val.facultyName,
            vmsNo: val.vmsNo || null,
            roomNo: val.roomNo || null,
          })),
        }),
      }).then((r) => r.json());

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully connected & saved allocations for ${assignedEntries.length} subjects! Course Catalog and Faculty Directory now reflect these teacher assignments.`,
        });
        await loadData();
        if (onCourseUpdated) onCourseUpdated();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to save teacher allocations.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Error saving allocations.",
      });
    } finally {
      setSavingAllocations(false);
    }
  };

  // Delete subject from Course Catalog
  const handleDeleteSubject = async (sub: SubjectItem) => {
    if (!confirm(`Are you sure you want to delete course "${sub.code} - ${sub.name}" from the Course Catalog?`)) {
      return;
    }

    try {
      setDeletingSubjectId(sub.id);
      const res = await fetch(`/api/admin/subjects?id=${encodeURIComponent(sub.id)}`, {
        method: "DELETE",
      }).then((r) => r.json());

      if (res.success) {
        // Also remove from assignments if mapped
        setAssignments((prev) => {
          const next = { ...prev };
          delete next[sub.code];
          return next;
        });
        setStatusMessage({
          type: "info",
          text: `Subject "${sub.code}" removed from Course Catalog and allocation list.`,
        });
        await loadData();
        if (onCourseUpdated) onCourseUpdated();
      } else {
        alert(res.error || "Failed to delete subject.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete subject.");
    } finally {
      setDeletingSubjectId(null);
    }
  };

  // Trigger Randomize Timetable with Selected Subject-Teacher Mappings
  const handleExecuteRandomize = async () => {
    setIsRandomizing(true);
    setStatusMessage(null);

    try {
      // Build teacherAssignments dictionary for the API payload
      const payloadAssignments: Record<
        string,
        { facultyName: string | null; vmsNo: string | null; roomNo: string | null }
      > = {};

      Object.entries(assignments).forEach(([code, val]) => {
        if (val.facultyName) {
          payloadAssignments[code] = {
            facultyName: val.facultyName,
            vmsNo: val.vmsNo || null,
            roomNo: val.roomNo || null,
          };
        }
      });

      // Build subjectRules dictionary
      const payloadRules: Record<string, { periodsPerWeek: number; isContinuous: boolean }> = {};
      Object.entries(subjectRules).forEach(([code, r]) => {
        payloadRules[code] = r;
      });

      const combinedElectiveFaculty = [
        electiveConfig.faculty1,
        electiveConfig.faculty2,
        electiveConfig.faculty3,
      ].filter(Boolean).join(", ") || electiveConfig.facultyName || "Elective Coordinator";

      const res = await fetch("/api/admin/timetable/randomize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: computedClassId,
          semType: selectedSemType,
          teacherAssignments: payloadAssignments,
          subjectRules: payloadRules,
          sportsConfig,
          libraryConfig,
          electiveConfig: {
            ...electiveConfig,
            facultyName: combinedElectiveFaculty,
          },
        }),
      }).then((r) => r.json());

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Timetable for ${computedClassId} successfully scheduled & randomized with selected subject teachers! (Filled ${res.filledCount || 0} periods).`,
        });
        if (onTimetableGenerated) {
          onTimetableGenerated(computedClassId);
        }
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to randomize timetable.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Network error while running randomize engine.",
      });
    } finally {
      setIsRandomizing(false);
    }
  };

  // Mode 2: Handle Excel File Selection and Client Extraction
  const handleExcelFileSelect = (f: File) => {
    setExcelFile(f);
    setExcelParsingError(null);
    setExcelSuccessResult(null);

    const fileName = (f.name || "").toLowerCase();
    const isSpreadsheet = fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv");
    if (!isSpreadsheet) {
      setExcelParsingError("Please upload a valid Microsoft Excel file (.xlsx, .xls) or CSV file (.csv).");
      setExcelExtractedData([]);
      setExcelTargetClasses([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        // Find header row (looks for "Faculty Name" or "Theory" or "Subject Allotted" or "MTS" or "Subject Code" or "Sec A" or "Semester")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawAoa.length, 15); i++) {
          const rowStr = rawAoa[i].map((c) => String(c).toLowerCase()).join(" ");
          if (
            rowStr.includes("faculty") ||
            rowStr.includes("theory") ||
            rowStr.includes("subject allotted") ||
            rowStr.includes("mts") ||
            rowStr.includes("subject code") ||
            rowStr.includes("sec a") ||
            rowStr.includes("semester")
          ) {
            headerRowIndex = i;
            break;
          }
        }
        if (headerRowIndex === -1) headerRowIndex = 0;

        const headers = rawAoa[headerRowIndex].map((h) => String(h).trim().toLowerCase());
        const findCol = (...candidates: string[]) => {
          for (const cand of candidates) {
            const idx = headers.findIndex((h) => h.includes(cand.toLowerCase()));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        // Section Matrix Columns: DEPT | SEMESTER | SUBJECT CODE | SUBJECT NAME | SEC A | SEC B | SEC C
        const deptCol = findCol("dept", "department", "branch");
        const semCol = findCol("semester", "sem");
        const subCodeCol = findCol("subject code", "sub code", "code");
        const subNameCol = findCol("subject name", "sub name", "course name", "name");
        const secACol = findCol("sec a", "section a", "seca");
        const secBCol = findCol("sec b", "section b", "secb");
        const secCCol = findCol("sec c", "section c", "secc");

        const isSectionMatrix = subCodeCol !== -1 && (secACol !== -1 || secBCol !== -1 || secCCol !== -1);

        const inferClassFromSem = (sem: number, sec: string, dept: string = "CSE") => {
          const d = dept || "CSE";
          if (sem === 1 || sem === 2) return `I-${d}-${sec}`;
          if (sem === 3 || sem === 4) return `II-${d}-${sec}`;
          if (sem === 5 || sem === 6) return `III-${d}-${sec}`;
          if (sem === 7 || sem === 8) return `IV-${d}-${sec}`;
          return `II-${d}-${sec}`;
        };

        const mtsCol = findCol("mts", "staff id", "emp id");
        const facultyCol = findCol("faculty name", "faculty", "teacher");
        const theoryCol = findCol("theory", "subject allotted");
        const practicalCol = findCol("practical", "lab");
        const classCol = findCol("class", "target class", "section");

        const inferClassFromCourseCode = (code: string) => {
          const u = code.toUpperCase().replace(/\s+/g, "");
          if (u.includes("CS11") || u.includes("111") || u.includes("11A")) return "I-CSE-A";
          if (u.includes("CS32") || u.includes("CS33") || u.includes("321") || u.includes("322") || u.includes("323") || u.includes("324") || u.includes("325") || u.includes("32A") || u.includes("32B") || u.includes("32C")) return "II-CSE-A";
          if (u.includes("CS52") || u.includes("IT52") || u.includes("MC56") || u.includes("521") || u.includes("522") || u.includes("52A") || u.includes("52B")) return "III-CSE-A";
          if (u.includes("CB72") || u.includes("HS70") || u.includes("C7S7") || u.includes("CSV4") || u.includes("721") || u.includes("701") || u.includes("7S7")) return "IV-CSE-A";
          return "II-CSE-A";
        };

        const parseCoursesFromCell = (cellText: string): { code: string; name: string }[] => {
          if (!cellText || typeof cellText !== "string") return [];
          const lines = cellText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
          const results: { code: string; name: string }[] = [];
          for (const line of lines) {
            const match = line.match(/^([0-9]{2,3}[A-Z0-9]+)\s*[-:]*\s*(.*)$/i);
            if (match) {
              results.push({ code: match[1].trim(), name: match[2]?.trim() || match[1].trim() });
            } else {
              results.push({ code: line, name: line });
            }
          }
          return results;
        };

        const extracted: any[] = [];
        const detectedClasses = new Set<string>();

        if (isSectionMatrix) {
          // Parse "DEPT | SEMESTER | SUBJECT CODE | SUBJECT NAME | SEC A | SEC B | SEC C"
          for (let r = headerRowIndex + 1; r < rawAoa.length; r++) {
            const row = rawAoa[r];
            if (!row || row.length === 0) continue;

            const rawDept = deptCol !== -1 && row[deptCol] ? String(row[deptCol]).trim().toUpperCase() : "CSE";
            const rawSem = semCol !== -1 ? parseInt(String(row[semCol]).trim()) || 3 : 3;
            const subjectCode = subCodeCol !== -1 ? String(row[subCodeCol]).trim() : "";
            const subjectName = subNameCol !== -1 ? String(row[subNameCol]).trim() : subjectCode;

            if (!subjectCode && !subjectName) continue;

            const isLab =
              subjectCode.toLowerCase().includes("lab") ||
              subjectName.toLowerCase().includes("lab") ||
              subjectCode.endsWith("A") ||
              subjectCode.endsWith("B") ||
              subjectCode.endsWith("C");

            const sectionFacultyPairs = [
              { sec: "A", col: secACol },
              { sec: "B", col: secBCol },
              { sec: "C", col: secCCol },
            ];

            sectionFacultyPairs.forEach(({ sec, col }) => {
              if (col !== -1 && row[col]) {
                const facRaw = String(row[col]).trim();
                if (facRaw && facRaw !== "-" && facRaw !== "—" && facRaw.toLowerCase() !== "nil") {
                  const targetClass = inferClassFromSem(rawSem, sec, rawDept);
                  detectedClasses.add(targetClass);

                  // Clean names while preserving multiple teachers separated by '/' or ','
                  const cleanFacultyNames = facRaw
                    .replace(/,\s*ph\.?d/gi, "")
                    .replace(/ph\.?d/gi, "")
                    .split(/[\r\n/]+/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .join(" / ");

                  // Attempt client match for teacher MTS number from teachers list
                  const individualTeachers = cleanFacultyNames.split(/[/]+/).map((s) => s.trim()).filter(Boolean);
                  const matchedVms = individualTeachers
                    .map((tName) => {
                      const cleanT = tName
                        .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, '')
                        .replace(/[^a-z0-9]/gi, '')
                        .toLowerCase();
                      const found = teachers.find((t) => {
                        const cleanDb = (t.name || '')
                          .replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, '')
                          .replace(/[^a-z0-9]/gi, '')
                          .toLowerCase();
                        return cleanDb.includes(cleanT) || cleanT.includes(cleanDb);
                      });
                      return found?.vmNo || '';
                    })
                    .filter(Boolean);

                  extracted.push({
                    key: `sec-${r}-${sec}-${subjectCode}`,
                    facultyName: cleanFacultyNames || facRaw,
                    vmsNo: matchedVms.length > 0 ? matchedVms.join(" / ") : "",
                    department: rawDept || "CSE",
                    subjectCode,
                    subjectName,
                    targetClass,
                    periodsPerWeek: isLab ? 3 : 5,
                    isLab,
                    roomNo: isLab ? "CS-LAB-1" : `LH-${200 + rawSem * 10}`,
                  });
                }
              }
            });
          }
        } else {
          // Fallback to Vel Tech Workload Format: Faculty Name | MTS | Theory | Practical | Class
          for (let r = headerRowIndex + 1; r < rawAoa.length; r++) {
            const row = rawAoa[r];
            if (!row || row.length === 0) continue;

            const facultyRaw = facultyCol !== -1 ? String(row[facultyCol]).trim() : "";
            const mtsRaw = mtsCol !== -1 ? String(row[mtsCol]).trim() : "";
            const theoryRaw = theoryCol !== -1 ? String(row[theoryCol]).trim() : "";
            const practicalRaw = practicalCol !== -1 ? String(row[practicalCol]).trim() : "";
            const classRaw = classCol !== -1 ? String(row[classCol]).trim() : "";

            const facultyName = facultyRaw.replace(/,\s*ph\.?d/i, "").trim();
            if (!facultyName && !theoryRaw && !practicalRaw) continue;

            // Process Theory courses
            if (theoryRaw) {
              const courses = parseCoursesFromCell(theoryRaw);
              courses.forEach((c) => {
                const targetClass = classRaw || inferClassFromCourseCode(c.code);
                detectedClasses.add(targetClass);
                extracted.push({
                  key: `${r}-T-${c.code}-${targetClass}`,
                  facultyName: facultyName || "Faculty Member",
                  vmsNo: mtsRaw,
                  department: "CSE",
                  subjectCode: c.code,
                  subjectName: c.name,
                  targetClass,
                  periodsPerWeek: 5,
                  isLab: false,
                  roomNo: "LH-201",
                });
              });
            }

            // Process Practical / Lab courses
            if (practicalRaw) {
              const labs = parseCoursesFromCell(practicalRaw);
              labs.forEach((l) => {
                const targetClass = classRaw || inferClassFromCourseCode(l.code);
                detectedClasses.add(targetClass);
                extracted.push({
                  key: `${r}-P-${l.code}-${targetClass}`,
                  facultyName: facultyName || "Faculty Member",
                  vmsNo: mtsRaw,
                  department: "CSE",
                  subjectCode: l.code,
                  subjectName: l.name,
                  targetClass,
                  periodsPerWeek: 3,
                  isLab: true,
                  roomNo: "CS-LAB-1",
                });
              });
            }
          }
        }

        if (extracted.length === 0) {
          setExcelParsingError("No valid rows were found. Make sure your file has 'Faculty Name', 'Subject Code' and 'Target Class' columns.");
          setExcelExtractedData([]);
          setExcelTargetClasses([]);
        } else {
          setExcelExtractedData(extracted);
          setExcelTargetClasses(Array.from(detectedClasses));
        }
      } catch (err: any) {
        console.error("Excel parse error:", err);
        setExcelParsingError("Could not read file. Please ensure it is a valid Excel spreadsheet.");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // Mode 2: Trigger Batch Timetable Generation from Excel Extracted Payload
  const handleExecuteExcelBatchGeneration = async () => {
    if (excelExtractedData.length === 0) {
      alert("Please upload and extract an Excel allocation file first.");
      return;
    }

    setExcelUploading(true);
    setExcelParsingError(null);
    setExcelSuccessResult(null);

    try {
      const res = await fetch("/api/admin/timetable/generate-batch-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocations: excelExtractedData,
          writeStrategy: excelWriteStrategy,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setExcelSuccessResult(res);
        await loadData();
        if (onCourseUpdated) onCourseUpdated();
      } else {
        setExcelParsingError(res.error || "Failed to generate timetables from Excel.");
      }
    } catch (err: any) {
      console.error("Batch Excel generation error:", err);
      setExcelParsingError(err.message || "Network error while generating timetables.");
    } finally {
      setExcelUploading(false);
    }
  };

  const assignedCount = relevantSubjects.filter(
    (s) => assignments[s.code]?.facultyName
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Level Mode Selector (Choose & Randomize vs Upload Excel) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          padding: "0.6rem",
          backgroundColor: "var(--bg-card)",
          borderRadius: "14px",
          border: "1.5px solid var(--border-subtle)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <button
          type="button"
          onClick={() => setGenerationMode("mode1_select")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.85rem",
            padding: "1rem 1.5rem",
            borderRadius: "10px",
            border: generationMode === "mode1_select" ? "2px solid var(--royal-blue)" : "1px solid var(--border-subtle)",
            backgroundColor: generationMode === "mode1_select" ? "var(--royal-blue)" : "var(--bg-input)",
            color: generationMode === "mode1_select" ? "#ffffff" : "var(--text-main)",
            fontWeight: "700",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: generationMode === "mode1_select" ? "0 4px 14px rgba(10, 102, 194, 0.3)" : "none",
          }}
        >
          <UserCheck size={22} color={generationMode === "mode1_select" ? "#ffffff" : "var(--royal-blue)"} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: "800", fontSize: "1.05rem" }}>1. Choose & Randomize Mode</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.9, fontWeight: "500" }}>
              Select class, choose faculty from dropdowns & generate conflict-free timetable
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setGenerationMode("mode2_excel")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.85rem",
            padding: "1rem 1.5rem",
            borderRadius: "10px",
            border: generationMode === "mode2_excel" ? "2px solid #10b981" : "1px solid var(--border-subtle)",
            backgroundColor: generationMode === "mode2_excel" ? "#059669" : "var(--bg-input)",
            color: generationMode === "mode2_excel" ? "#ffffff" : "var(--text-main)",
            fontWeight: "700",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: generationMode === "mode2_excel" ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "none",
          }}
        >
          <FileSpreadsheet size={22} color={generationMode === "mode2_excel" ? "#ffffff" : "#10b981"} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: "800", fontSize: "1.05rem" }}>2. Upload Excel Mode</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.9, fontWeight: "500" }}>
              Upload official workload spreadsheet (.xlsx) & auto-schedule all classes
            </div>
          </div>
        </button>
      </div>

      {/* Top Banner & Control Deck */}
      <div
        className="premium-card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 64, 175, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          padding: "1.75rem",
          borderRadius: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  backgroundColor: "rgba(56, 189, 248, 0.2)",
                  color: "var(--sky-blue)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                }}
              >
                <UserCheck size={14} /> Subject Allocation & Randomizer Deck
              </span>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  backgroundColor: "rgba(168, 85, 247, 0.2)",
                  color: "#c084fc",
                }}
              >
                Rule Compliant (Max 6P • Non-consecutive • Daily)
              </span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", margin: "0.25rem 0", color: "var(--text-main)" }}>
              Subject-Handling Teacher Allocations
            </h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "680px" }}>
              Choose your automatic generation mode: configure class-by-class interactively with faculty dropdowns, or import your overall faculty allocation Excel spreadsheet.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {onBackToCatalog && (
              <button
                onClick={onBackToCatalog}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.9rem",
                  borderRadius: "8px",
                  border: "1px solid var(--sky-blue)",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  color: "var(--sky-blue)",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <BookOpen size={14} /> Back to Course Catalog
              </button>
            )}

            <button
              onClick={loadData}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: refreshing ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw size={14} className={refreshing ? "spin" : ""} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Mode 1: Class Selection Strip */}
        {generationMode === "mode1_select" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor: "var(--bg-card)",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                <Building2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                DEPARTMENT
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="premium-input"
                style={{ width: "100%", fontSize: "0.85rem" }}
              >
                {(departments.length > 0 ? departments : [{ code: "CSE", name: "CSE" }, { code: "ECE", name: "ECE" }, { code: "IT", name: "IT" }, { code: "MECH", name: "MECH" }]).map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                <GraduationCap size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                ACADEMIC YEAR
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="premium-input"
                style={{ width: "100%", fontSize: "0.85rem" }}
              >
                <option value="I">Year I (Sem 1-2)</option>
                <option value="II">Year II (Sem 3-4)</option>
                <option value="III">Year III (Sem 5-6)</option>
                <option value="IV">Year IV (Sem 7-8)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                <BookOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                SEMESTER
              </label>
              <select
                value={selectedSemType}
                onChange={(e) => setSelectedSemType(e.target.value as "ODD" | "EVEN")}
                className="premium-input"
                style={{ width: "100%", fontSize: "0.85rem", fontWeight: "600", color: selectedSemType === "ODD" ? "var(--royal-blue)" : "#10b981" }}
              >
                <option value="ODD">Odd Sem (Sem {selectedYear === "I" ? 1 : selectedYear === "II" ? 3 : selectedYear === "III" ? 5 : 7})</option>
                <option value="EVEN">Even Sem (Sem {selectedYear === "I" ? 2 : selectedYear === "II" ? 4 : selectedYear === "III" ? 6 : 8})</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                SECTION
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="premium-input"
                style={{ width: "100%", fontSize: "0.85rem" }}
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div
                style={{
                  padding: "0.6rem 0.9rem",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>ALLOCATING FOR CLASS</span>
                <strong style={{ fontSize: "1rem", color: "var(--sky-blue)", letterSpacing: "0.03em" }}>{computedClassId}</strong>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: selectedSemType === "ODD" ? "var(--royal-blue)" : "#10b981", display: "block", marginTop: "1px" }}>
                  Sem {computedSemester} ({selectedSemType})
                </span>
                <span style={{ fontSize: "0.68rem", color: "#10b981", display: "block", marginTop: "2px", fontWeight: "600" }}>
                  ✓ Independent Staff per Section
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Priority Special Slots Deck (Sports, Electives, Library) */}
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            borderRadius: "12px",
            border: "1px solid rgba(56, 189, 248, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--sky-blue)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                ⚡ Priority Slots Allocation Engine
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                (1. Sports 2-P • 2. Electives • 3. Library • Labs & Theory in Table Below)
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontWeight: "600" }}>
              Sync Across Year & Dept • Zero Faculty Clashes
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* 1. Sports Priority */}
            <div style={{ padding: "0.85rem", borderRadius: "10px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={sportsConfig.enabled}
                    onChange={(e) => setSportsConfig({ ...sportsConfig, enabled: e.target.checked })}
                    style={{ accentColor: "#38bdf8", cursor: "pointer" }}
                  />
                  1. Sports (2 Continuous Periods)
                </label>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Year-synchronized</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Day Order</span>
                  <select
                    disabled={!sportsConfig.enabled}
                    value={sportsConfig.dayOrder}
                    onChange={(e) => setSportsConfig({ ...sportsConfig, dayOrder: e.target.value })}
                    className="premium-input"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    {["I", "II", "III", "IV", "V"].map((d) => (
                      <option key={d} value={d}>Day Order {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Time Slot</span>
                  <select
                    disabled={!sportsConfig.enabled}
                    value={`${sportsConfig.periods[0]}-${sportsConfig.periods[1]}`}
                    onChange={(e) => {
                      const [p1, p2] = e.target.value.split("-").map(Number);
                      setSportsConfig({ ...sportsConfig, periods: [p1, p2] });
                    }}
                    className="premium-input"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    <option value="7-8">Periods 7 & 8 (Last 2 Periods)</option>
                    <option value="5-6">Periods 5 & 6 (Afternoon Block)</option>
                    <option value="3-4">Periods 3 & 4 (Mid-Day Block)</option>
                    <option value="1-2">Periods 1 & 2 (Morning Block)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Electives (EP) Priority */}
            <div style={{ padding: "0.85rem", borderRadius: "10px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "#c084fc", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={electiveConfig.enabled}
                    onChange={(e) => setElectiveConfig({ ...electiveConfig, enabled: e.target.checked })}
                    style={{ accentColor: "#c084fc", cursor: "pointer" }}
                  />
                  2. Electives (EP) Slot
                </label>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Dept-wide Sync</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Day Order</span>
                  <select
                    disabled={!electiveConfig.enabled}
                    value={electiveConfig.dayOrder}
                    onChange={(e) => setElectiveConfig({ ...electiveConfig, dayOrder: e.target.value })}
                    className="premium-input"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    {["I", "II", "III", "IV", "V"].map((d) => (
                      <option key={d} value={d}>Day Order {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Time Slot</span>
                  <select
                    disabled={!electiveConfig.enabled}
                    value={`${electiveConfig.periods[0]}-${electiveConfig.periods[1]}`}
                    onChange={(e) => {
                      const [p1, p2] = e.target.value.split("-").map(Number);
                      setElectiveConfig({ ...electiveConfig, periods: [p1, p2] });
                    }}
                    className="premium-input"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    <option value="5-6">Periods 5 & 6 (2-P Block)</option>
                    <option value="3-4">Periods 3 & 4 (2-P Block)</option>
                    <option value="1-2">Periods 1 & 2 (2-P Block)</option>
                    <option value="7-8">Periods 7 & 8 (2-P Block)</option>
                  </select>
                </div>
              </div>

              {/* 3 Dedicated Elective Staff Selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.35rem", paddingTop: "0.35rem", borderTop: "1px dashed var(--border-subtle)" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#c084fc" }}>
                  Elective Faculty (Up to 3 Staff Members):
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem" }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>Staff 1</span>
                    <select
                      disabled={!electiveConfig.enabled}
                      value={electiveConfig.faculty1}
                      onChange={(e) => setElectiveConfig({ ...electiveConfig, faculty1: e.target.value })}
                      className="premium-input"
                      style={{ width: "100%", fontSize: "0.72rem", padding: "0.25rem 0.35rem" }}
                    >
                      <option value="">-- Faculty 1 --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>Staff 2</span>
                    <select
                      disabled={!electiveConfig.enabled}
                      value={electiveConfig.faculty2}
                      onChange={(e) => setElectiveConfig({ ...electiveConfig, faculty2: e.target.value })}
                      className="premium-input"
                      style={{ width: "100%", fontSize: "0.72rem", padding: "0.25rem 0.35rem" }}
                    >
                      <option value="">-- Faculty 2 --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>Staff 3</span>
                    <select
                      disabled={!electiveConfig.enabled}
                      value={electiveConfig.faculty3}
                      onChange={(e) => setElectiveConfig({ ...electiveConfig, faculty3: e.target.value })}
                      className="premium-input"
                      style={{ width: "100%", fontSize: "0.72rem", padding: "0.25rem 0.35rem" }}
                    >
                      <option value="">-- Faculty 3 --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>



            {/* 3. Library Priority */}
            <div style={{ padding: "0.85rem", borderRadius: "10px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={libraryConfig.enabled}
                    onChange={(e) => setLibraryConfig({ ...libraryConfig, enabled: e.target.checked })}
                    style={{ accentColor: "#fbbf24", cursor: "pointer" }}
                  />
                  3. Library (1 Period/Wk)
                </label>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Single Period</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Day Order</span>
                  <select
                    disabled={!libraryConfig.enabled}
                    value={libraryConfig.dayOrder}
                    onChange={(e) => setLibraryConfig({ ...libraryConfig, dayOrder: e.target.value })}
                    className="premium-input"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    {["I", "II", "III", "IV", "V"].map((d) => (
                      <option key={d} value={d}>Day Order {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Period</span>
                  <select
                    disabled={!libraryConfig.enabled}
                    value={libraryConfig.period}
                    onChange={(e) => setLibraryConfig({ ...libraryConfig, period: Number(e.target.value) })}
                    className="premium-input"
                    style={{ width: "100%", fontSize: "0.75rem", padding: "0.35rem" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action / Randomize Summary Bar */}
      <div
        className="premium-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1rem 1.5rem",
          backgroundColor: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {semesterFilter === "ALL_CATALOG" ? "All Catalog Subjects" : `Subjects for ${computedClassId}`}
            </span>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-main)" }}>
              {relevantSubjects.length}
            </div>
          </div>
          <div style={{ width: "1px", height: "30px", backgroundColor: "var(--border-subtle)" }} />
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Teachers Mapped</span>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: assignedCount > 0 ? "#10b981" : "var(--text-muted)" }}>
              {assignedCount} / {relevantSubjects.length}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleAutoAssignTeachers}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Auto-Fill Teachers Evenly
          </button>

          <button
            onClick={handleSaveAllocationsToCatalog}
            disabled={savingAllocations || assignedCount === 0}
            title="Persist assigned faculty to Course Catalog & Faculty Profiles"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.6rem 1.15rem",
              borderRadius: "8px",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              fontSize: "0.85rem",
              fontWeight: "700",
              cursor: savingAllocations || assignedCount === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <CheckCircle2 size={15} />
            {savingAllocations ? "Saving Allocations..." : `Save Allocations to Catalog (${assignedCount})`}
          </button>

          <button
            onClick={handleClearAssignments}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              color: "#ef4444",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Clear Mappings
          </button>

          <button
            onClick={handleExecuteRandomize}
            disabled={isRandomizing || relevantSubjects.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.35rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--royal-blue)",
              color: "white",
              fontSize: "0.9rem",
              fontWeight: "700",
              cursor: isRandomizing || relevantSubjects.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(29, 78, 216, 0.35)",
              opacity: isRandomizing ? 0.7 : 1,
            }}
          >
            <Shuffle size={16} />
            {isRandomizing ? "Randomizing Timetable..." : `Run Randomize with Selected Teachers`}
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive Faculty Select Mode Content */}
      {generationMode === "mode1_select" && (
        <>
          {/* Notifications / Alerts */}
      {statusMessage && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "10px",
            border:
              statusMessage.type === "success"
                ? "1px solid #10b981"
                : statusMessage.type === "error"
                ? "1px solid #ef4444"
                : "1px solid var(--sky-blue)",
            backgroundColor:
              statusMessage.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : statusMessage.type === "error"
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(56, 189, 248, 0.12)",
            color:
              statusMessage.type === "success"
                ? "#10b981"
                : statusMessage.type === "error"
                ? "#ef4444"
                : "var(--sky-blue)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: "600",
          }}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : statusMessage.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <HelpCircle size={18} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Course & Teacher Assignment Table */}
      <div
        className="premium-card"
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BookOpen size={18} style={{ color: "var(--sky-blue)" }} />
            <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-main)" }}>
              {semesterFilter === "ALL_CATALOG"
                ? `All Course Catalog Subjects (${relevantSubjects.length})`
                : semesterFilter === "YEAR"
                ? `${selectedDept} Year ${selectedYear} (Sem ${computedSemester}-${computedSemester + 1}) Subjects (${relevantSubjects.length})`
                : `${selectedDept} Semester ${semesterFilter === "SEMESTER" ? computedSemester : semesterFilter} Subjects (${relevantSubjects.length})`}
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Catalog Scope / Semester Filter */}
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              style={{
                padding: "0.45rem 0.65rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--sky-blue)",
                fontWeight: "600",
                fontSize: "0.8rem",
              }}
              title="Filter subjects shown in allocation table"
            >
              <option value="SEMESTER">📌 Current Class ({selectedDept} Sem {computedSemester})</option>
              <option value="YEAR">🎯 Target Year {selectedYear} (Sem {computedSemester}-{computedSemester + 1})</option>
              <option value="ALL_CATALOG">📚 All Course Catalog Subjects ({catalogSubjects.length})</option>
              <option disabled>──────────</option>
              <option value="ODD_SEMS">🟣 Odd Semesters (Sem 1, 3, 5, 7)</option>
              <option value="EVEN_SEMS">🟢 Even Semesters (Sem 2, 4, 6, 8)</option>
              <option disabled>──────────</option>
              <option value="1">Semester 1 (Odd)</option>
              <option value="2">Semester 2 (Even)</option>
              <option value="3">Semester 3 (Odd)</option>
              <option value="4">Semester 4 (Even)</option>
              <option value="5">Semester 5 (Odd)</option>
              <option value="6">Semester 6 (Even)</option>
              <option value="7">Semester 7 (Odd)</option>
              <option value="8">Semester 8 (Even)</option>
            </select>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search subject or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  width: "180px",
                }}
              />
              <Search size={13} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-main)",
                fontSize: "0.8rem",
              }}
            >
              <option value="ALL">All Types</option>
              <option value="THEORY">Theory Only</option>
              <option value="LAB">Labs Only</option>
            </select>
            {/* Add Subject to Catalog Button */}
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "var(--sky-blue)",
                color: "#0f172a",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={14} /> Add Course
            </button>
          </div>
        </div>

        {loadingData ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading course catalog and faculty directory...
          </div>
        ) : relevantSubjects.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "600", fontSize: "1rem" }}>
              No subjects found for {semesterFilter === "ALL_CATALOG" ? "Course Catalog" : `${selectedDept} Semester ${computedSemester}`}
            </p>
            <span style={{ fontSize: "0.85rem", display: "block", marginBottom: "1.25rem" }}>
              {catalogSubjects.length > 0 && semesterFilter !== "ALL_CATALOG"
                ? `There are ${catalogSubjects.length} subjects in the Course Catalog across all semesters/departments.`
                : "Add a new course directly below or from the Course Catalog."}
            </span>
            <div style={{ display: "inline-flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              {catalogSubjects.length > 0 && semesterFilter !== "ALL_CATALOG" && (
                <button
                  onClick={() => setSemesterFilter("ALL_CATALOG")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid var(--sky-blue)",
                    backgroundColor: "rgba(56, 189, 248, 0.12)",
                    color: "var(--sky-blue)",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <BookOpen size={15} /> Show Every Course Catalog Subject ({catalogSubjects.length})
                </button>
              )}
              <button
                onClick={handleOpenCreateModal}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "var(--royal-blue)",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Plus size={15} /> Add Subject for Semester {computedSemester}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead style={{ backgroundColor: "var(--bg-card-header)", borderBottom: "1px solid var(--border-subtle)" }}>
                <tr>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "110px" }}>CODE</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>SUBJECT NAME</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "125px" }}>SEM (ODD/EVEN)</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "80px" }}>TYPE</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", minWidth: "220px" }}>ASSIGNED TEACHER / FACULTY</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "110px" }}>PERIODS / WK</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "130px" }}>BLOCK MODE</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "90px" }}>MTS NO</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: "600", width: "70px", textAlign: "center" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {relevantSubjects.map((sub, idx) => {
                  const isLab = checkIfLab(sub);
                  const currentAssignment = assignments[sub.code] || {
                    facultyName: "",
                    vmsNo: "",
                    roomNo: isLab ? "CS-LAB-1" : "LH-201",
                  };
                  const currentRule = subjectRules[sub.code] || {
                    periodsPerWeek: isLab ? 2 : (sub.credits >= 4 ? 4 : (sub.credits || 3)),
                    isContinuous: isLab ? true : false,
                  };

                  const isHighlighted = highlightedCourseCode === sub.code;

                  return (
                    <tr
                      id={`allocation-row-${sub.code}`}
                      key={sub.code || sub.id}
                      style={{
                        borderBottom: isHighlighted ? "2px solid var(--sky-blue)" : "1px solid var(--border-subtle)",
                        backgroundColor: isHighlighted
                          ? "rgba(56, 189, 248, 0.14)"
                          : currentAssignment.facultyName
                          ? "rgba(16, 185, 129, 0.03)"
                          : "transparent",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: "700", fontFamily: "monospace", color: isHighlighted ? "#38bdf8" : "var(--sky-blue)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {isHighlighted && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--sky-blue)" }} />}
                          {sub.code}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-main)", fontWeight: "500" }}>
                        <div>{sub.name}</div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Dept: <strong style={{ color: "var(--sky-blue)" }}>{sub.departmentCode || "ALL"}</strong> • Sem {sub.semester} • Credits: {sub.credits}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {(() => {
                          const semNum = Number(sub.semester) || 1;
                          const isOdd = semNum % 2 !== 0;
                          return (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: "700",
                                backgroundColor: isOdd ? "rgba(168, 85, 247, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                color: isOdd ? "#c084fc" : "#10b981",
                                border: isOdd ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                                whiteSpace: "nowrap"
                              }}
                            >
                              Sem {semNum} ({isOdd ? "Odd" : "Even"})
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            backgroundColor: isLab
                              ? "rgba(245, 158, 11, 0.15)"
                              : checkIfElective(sub)
                              ? "rgba(192, 132, 252, 0.15)"
                              : "rgba(59, 130, 246, 0.15)",
                            color: isLab ? "#f59e0b" : checkIfElective(sub) ? "#c084fc" : "var(--royal-blue)",
                          }}
                        >
                          {isLab ? "LAB (2 Staff)" : checkIfElective(sub) ? "ELECTIVE (3 Staff)" : "THEORY (1 Prof)"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {(() => {
                          const isElec = checkIfElective(sub);
                          const assignedList = (currentAssignment.facultyName || "").split(/[,/]+/).map(s => s.trim()).filter(Boolean);
                          const staff1 = assignedList[0] || "";
                          const staff2 = assignedList[1] || "";
                          const staff3 = assignedList[2] || "";

                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                              {/* Staff 1 / Primary Handling Professor */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                {(isLab || isElec) && (
                                  <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", minWidth: "48px" }}>
                                    Staff 1:
                                  </span>
                                )}
                                <select
                                  value={staff1}
                                  onChange={(e) => handleTeacherSelect(sub.code, e.target.value, 0)}
                                  className="premium-input"
                                  style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.82rem" }}
                                >
                                  <option value="">
                                    {isLab
                                      ? "-- Select Primary Lab Faculty (Staff 1) --"
                                      : isElec
                                      ? "-- Select Elective Faculty 1 --"
                                      : "-- Choose Handling Professor (1 for this class) --"}
                                  </option>
                                  {teachers.map((t) => {
                                    const profileSubjects = [t.subject1, t.subject2, t.lab1, t.lab2, t.additional1, t.additional2]
                                      .filter(Boolean)
                                      .map(s => String(s).trim());

                                    const subNameLower = sub.name.toLowerCase();
                                    const subCodeLower = sub.code.toLowerCase();
                                    const hasProfileMatch = profileSubjects.some(ps => {
                                      const psl = ps.toLowerCase();
                                      return psl === subCodeLower || psl === subNameLower || subNameLower.includes(psl) || psl.includes(subNameLower);
                                    });

                                    const subjectBadge = profileSubjects.length > 0
                                      ? ` • Profile: ${profileSubjects.slice(0, 2).join(", ")}`
                                      : "";

                                    return (
                                      <option key={t.id} value={t.name}>
                                        {hasProfileMatch ? "★ " : ""}{t.name} {t.vmNo ? `(MTS: ${t.vmNo})` : ""} [{t.role}]{subjectBadge}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Staff 2 (Available for Labs and Electives) */}
                              {(isLab || isElec) && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <span style={{ fontSize: "0.68rem", fontWeight: "700", color: isLab ? "#f59e0b" : "#c084fc", minWidth: "48px" }}>
                                    Staff 2:
                                  </span>
                                  <select
                                    value={staff2}
                                    onChange={(e) => handleTeacherSelect(sub.code, e.target.value, 1)}
                                    className="premium-input"
                                    style={{
                                      width: "100%",
                                      padding: "0.35rem 0.5rem",
                                      fontSize: "0.82rem",
                                      borderColor: staff2 ? (isLab ? "rgba(245, 158, 11, 0.4)" : "rgba(192, 132, 252, 0.4)") : "var(--border-subtle)"
                                    }}
                                  >
                                    <option value="">
                                      {isLab
                                        ? "-- Select 2nd Lab Faculty (Co-Incharge) --"
                                        : "-- Select Elective Faculty 2 --"}
                                    </option>
                                    {teachers.map((t) => (
                                      <option key={t.id} value={t.name}>
                                        {t.name} {t.vmNo ? `(MTS: ${t.vmNo})` : ""} [{t.role}]
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Staff 3 (Available for Electives) */}
                              {isElec && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#c084fc", minWidth: "48px" }}>
                                    Staff 3:
                                  </span>
                                  <select
                                    value={staff3}
                                    onChange={(e) => handleTeacherSelect(sub.code, e.target.value, 2)}
                                    className="premium-input"
                                    style={{
                                      width: "100%",
                                      padding: "0.35rem 0.5rem",
                                      fontSize: "0.82rem",
                                      borderColor: staff3 ? "rgba(192, 132, 252, 0.4)" : "var(--border-subtle)"
                                    }}
                                  >
                                    <option value="">-- Select Elective Faculty 3 --</option>
                                    {teachers.map((t) => (
                                      <option key={t.id} value={t.name}>
                                        {t.name} {t.vmNo ? `(MTS: ${t.vmNo})` : ""} [{t.role}]
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      {/* Periods Per Week Selector */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <select
                          value={currentRule.periodsPerWeek}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setSubjectRules((prev) => ({
                              ...prev,
                              [sub.code]: {
                                ...(prev[sub.code] || currentRule),
                                periodsPerWeek: val,
                              },
                            }));
                          }}
                          className="premium-input"
                          style={{ padding: "0.35rem 0.5rem", fontSize: "0.82rem", width: "90px" }}
                        >
                          <option value={1}>1 P / wk</option>
                          <option value={2}>2 P / wk</option>
                          <option value={3}>3 P / wk</option>
                          <option value={4}>4 P / wk</option>
                          <option value={5}>5 P / wk</option>
                          <option value={6}>6 P / wk</option>
                        </select>
                      </td>
                      {/* Continuous 2-Period Block Option */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            fontWeight: "600",
                            color: currentRule.isContinuous ? "var(--sky-blue)" : "var(--text-muted)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentRule.isContinuous}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setSubjectRules((prev) => ({
                                ...prev,
                                [sub.code]: {
                                  ...(prev[sub.code] || currentRule),
                                  isContinuous: isChecked,
                                },
                              }));
                            }}
                            style={{ accentColor: "var(--sky-blue)", cursor: "pointer" }}
                          />
                          {currentRule.isContinuous ? "2-P Block ⚡" : "1-P Single"}
                        </label>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {currentAssignment.vmsNo || "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteSubject(sub)}
                          disabled={deletingSubjectId === sub.id}
                          title={`Delete ${sub.code} from Course Catalog`}
                          style={{
                            padding: "0.35rem 0.55rem",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            backgroundColor: "rgba(239, 68, 68, 0.08)",
                            color: "#ef4444",
                            cursor: deletingSubjectId === sub.id ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE SUBJECT MODAL */}
      {showAddSubjectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowAddSubjectModal(false)}
        >
          <div
            className="premium-card"
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BookOpen size={18} style={{ color: "var(--sky-blue)" }} />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)" }}>
                  Add Course to Catalog
                </h3>
              </div>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.25rem",
                  borderRadius: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  SUBJECT CODE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 231CS321 or CS3301"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  className="premium-input"
                  style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.85rem", textTransform: "uppercase" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  SUBJECT NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures or Operating Systems"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="premium-input"
                  style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                    DEPARTMENT
                  </label>
                  <select
                    value={newSubDept}
                    onChange={(e) => setNewSubDept(e.target.value)}
                    className="premium-input"
                    style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code}
                        </option>
                      ))
                    ) : (
                      <option value="CSE">CSE</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                    SEMESTER
                  </label>
                  <select
                    value={newSubSem}
                    onChange={(e) => setNewSubSem(e.target.value)}
                    className="premium-input"
                    style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "0.35rem" }}>
                  CREDITS
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={newSubCredits}
                  onChange={(e) => setNewSubCredits(e.target.value)}
                  className="premium-input"
                  style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSubject}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "var(--royal-blue)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    cursor: creatingSubject ? "not-allowed" : "pointer",
                  }}
                >
                  {creatingSubject ? "Adding..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Mode 2: Overall Faculty Excel Input Mode Content */}
      {generationMode === "mode2_excel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Template Download & Guide Banner */}
          <div
            className="premium-card"
            style={{
              padding: "1.5rem",
              backgroundColor: "var(--bg-card)",
              borderRadius: "14px",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.25rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                  }}
                >
                  <FileSpreadsheet size={13} /> Official Excel Template Available
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Multi-Class Batch Generation
                </span>
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: "0.2rem 0", color: "var(--text-main)" }}>
                Institution-Wide Faculty-Subject Allocation Spreadsheet
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "650px" }}>
                Download the standardized Excel template with format: <strong style={{ color: "var(--sky-blue)", fontFamily: "monospace" }}>DEPT | SEMESTER | SUBJECT CODE | SUBJECT NAME | SEC A | SEC B | SEC C</strong>. Once filled, upload it below to generate conflict-free schedules across all sections automatically.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <a
                href="/api/admin/timetable/template-allocation-excel"
                download="Faculty_Timetable_Allocation_Template.xlsx"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.7rem 1.25rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  fontSize: "0.88rem",
                  fontWeight: "700",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Download size={16} />
                Download Excel Template (.xlsx)
              </a>
            </div>
          </div>

          {/* Excel Upload Dropzone */}
          <div
            className="premium-card"
            style={{
              padding: "2rem",
              backgroundColor: "var(--bg-card)",
              borderRadius: "14px",
              border: "1.5px dashed var(--border-subtle)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              cursor: "pointer",
              transition: "border-color 0.2s ease",
            }}
            onClick={() => {
              const fileInput = document.getElementById("allocation-excel-input");
              if (fileInput) fileInput.click();
            }}
          >
            <input
              id="allocation-excel-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleExcelFileSelect(e.target.files[0]);
                }
              }}
            />
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(14, 165, 233, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sky-blue)",
              }}
            >
              <Upload size={28} />
            </div>

            <div>
              <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>
                {excelFile ? excelFile.name : "Choose or drag & drop Faculty Allocation Excel"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Accepts Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
              </p>
            </div>

            {excelFile && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <CheckCircle2 size={14} /> File loaded: {(excelFile.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Parsing Error Message */}
          {excelParsingError && (
            <div
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "10px",
                border: "1px solid #ef4444",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              <AlertCircle size={18} />
              <span>{excelParsingError}</span>
            </div>
          )}

          {/* Success Generation Message */}
          {excelSuccessResult && (
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "10px",
                border: "1px solid #10b981",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <CheckCircle2 size={20} />
                <span style={{ fontSize: "1rem", fontWeight: "700" }}>{excelSuccessResult.message}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                {excelSuccessResult.classes?.map((c: string) => (
                  <span
                    key={c}
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Details & Overview Cards */}
          {excelExtractedData.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div
                  className="premium-card"
                  style={{
                    padding: "1.25rem",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    TOTAL ALLOCATION ROWS
                  </span>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-main)", marginTop: "0.25rem" }}>
                    {excelExtractedData.length}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--sky-blue)", fontWeight: "600" }}>
                    Parsed from spreadsheet
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: "1.25rem",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    DISTINCT TARGET CLASSES
                  </span>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#38bdf8", marginTop: "0.25rem" }}>
                    {excelTargetClasses.length}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {excelTargetClasses.slice(0, 4).join(", ")}
                    {excelTargetClasses.length > 4 ? ` +${excelTargetClasses.length - 4} more` : ""}
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: "1.25rem",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    LAB PRACTICALS DETECTED
                  </span>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#a855f7", marginTop: "0.25rem" }}>
                    {excelExtractedData.filter((d) => d.isLab).length}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Multi-period block allocations
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: "1.25rem",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    WRITE STRATEGY
                  </span>
                  <div style={{ marginTop: "0.5rem" }}>
                    <select
                      value={excelWriteStrategy}
                      onChange={(e) => setExcelWriteStrategy(e.target.value as any)}
                      className="premium-input"
                      style={{ width: "100%", padding: "0.4rem 0.6rem", fontSize: "0.85rem", fontWeight: "700" }}
                    >
                      <option value="replace">Replace Target Classes</option>
                      <option value="append">Append / Overwrite</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 1.25rem",
                  backgroundColor: "rgba(15, 23, 42, 0.4)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-subtle)",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>
                    Ready to generate timetables
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Will schedule {excelTargetClasses.length} classes concurrently while preventing teacher overlaps.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteExcelBatchGeneration}
                  disabled={excelUploading || excelExtractedData.length === 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.7rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--royal-blue)",
                    color: "#ffffff",
                    fontSize: "0.92rem",
                    fontWeight: "700",
                    cursor: excelUploading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(29, 78, 216, 0.35)",
                    opacity: excelUploading ? 0.7 : 1,
                  }}
                >
                  <Shuffle size={16} />
                  {excelUploading ? "Generating All Timetables..." : "Generate & Apply All Class Timetables"}
                </button>
              </div>

              {/* Extracted Details Table */}
              <div
                className="premium-card"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderRadius: "14px",
                  border: "1px solid var(--border-subtle)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>
                    Preview Extracted Allocation Matrix ({excelExtractedData.length} records)
                  </h4>
                </div>

                <div style={{ overflowX: "auto", maxHeight: "400px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>FACULTY</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>MTS</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>SUBJECT CODE</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>SUBJECT NAME</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>CLASS</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>PERIODS/WK</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>TYPE</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)" }}>ROOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelExtractedData.slice(0, 50).map((row) => (
                        <tr key={row.key} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td style={{ padding: "0.55rem 0.85rem", fontWeight: "600", color: "var(--text-main)" }}>
                            {row.facultyName}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {row.vmsNo || "-"}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", color: "var(--sky-blue)", fontWeight: "700", fontFamily: "monospace" }}>
                            {row.subjectCode}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", color: "var(--text-main)" }}>
                            {row.subjectName}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem" }}>
                            <span style={{ padding: "0.15rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(56, 189, 248, 0.12)", color: "var(--sky-blue)", fontWeight: "700", fontSize: "0.78rem" }}>
                              {row.targetClass}
                            </span>
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", color: "var(--text-main)" }}>
                            {row.periodsPerWeek}
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem" }}>
                            <span style={{ padding: "0.15rem 0.5rem", borderRadius: "4px", backgroundColor: row.isLab ? "rgba(168, 85, 247, 0.15)" : "rgba(16, 185, 129, 0.15)", color: row.isLab ? "#c084fc" : "#10b981", fontWeight: "700", fontSize: "0.75rem" }}>
                              {row.isLab ? "LAB" : "THEORY"}
                            </span>
                          </td>
                          <td style={{ padding: "0.55rem 0.85rem", color: "var(--text-muted)" }}>
                            {row.roomNo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
