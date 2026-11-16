/**
 * Coordinate-Aware Parser for College Timetable PDFs (.pdf)
 * 
 * Supports:
 * 1. 2D Grid Matrix Period Tables for Master Class Timetables (9 classes, Days I-V x Periods 1-8, 360 slots)
 *    with Subject Distribution mapping (Code, Acronym, Subject Name, Faculty Name, Room).
 * 2. 2D Grid Matrix Period Tables for Individual Faculty Timetables (33 faculty members, MTS IDs,
 *    Period Matrices, and Subject/Lab Details tables with Sem/Sec mapping).
 * 3. Transparent XRef self-healing for PDFs with 19-byte or misaligned cross-reference tables.
 * 4. Fallback parser for traditional row-based tabular PDFs.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse/lib/pdf-parse.js");

export interface ParsedTimetableSlot {
  classId: string | null;
  dayOrder: string | null;
  period: number | null;
  timeRange: string | null;
  subjectCode: string | null;
  subjectName: string | null;
  facultyName: string | null;
  vmsNo?: string | null;
  designation?: string | null;
  roomNo: string | null;
  category?: string | null;
  academicYear?: string | null;
  semType?: string | null;
  sourcePage?: number;
}

export interface ParsedFacultySheet {
  facultyName: string;
  vmsNo: string;
  designation: string;
  totalHoursPerWeek: number;
  department?: string;
  subjectMappings: Array<{
    code?: string;
    name: string;
    classId?: string;
    room?: string;
  }>;
  slots: ParsedTimetableSlot[];
}

export interface ParsePdfOptions {
  type?: "master" | "individual" | "auto";
  academicYear?: string;
  semType?: "ODD" | "EVEN";
}

export interface ParsePdfResult {
  facultySheets: ParsedFacultySheet[];
  allSlots: ParsedTimetableSlot[];
  isMasterClass: boolean;
  classes: string[];
}

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PageData {
  pageNumber: number;
  items: PdfTextItem[];
  fullText: string;
}

const DEFAULT_TIMINGS: Record<number, string> = {
  1: "08:05 - 08:55",
  2: "08:55 - 09:45",
  3: "10:00 - 10:50",
  4: "10:50 - 11:40",
  5: "12:20 - 01:05",
  6: "01:05 - 01:50",
  7: "02:00 - 02:45",
  8: "02:45 - 03:30",
};

const HEADER_ALIASES: Record<string, string[]> = {
  classId: ["class", "classid", "classidentifier"],
  dayOrder: ["day", "dayorder"],
  period: ["period", "slot"],
  timeRange: ["time", "timerange", "timing"],
  subjectCode: ["code", "subjectcode", "coursecode"],
  subjectName: ["subject", "subjectname", "coursename"],
  facultyName: ["faculty", "facultyname", "teacher", "teachername", "instructor"],
  vmsNo: ["vmsno", "vmno", "staffid", "facultynumber", "mtsno", "mts_no", "vms_no"],
  roomNo: ["room", "roomno", "classroom"],
  category: ["category", "subjectcategory"],
};

const HEADER_BY_ALIAS = new Map(
  Object.entries(HEADER_ALIASES).flatMap(([field, aliases]) => aliases.map((alias) => [alias, field]))
);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitCells(line: string): string[] {
  if (line.includes("|")) return line.split("|").map((cell) => cell.trim());
  if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
  return line.trim().split(/\s{2,}/).map((cell) => cell.trim());
}

function isHeader(cells: string[]) {
  const mapped = cells.map((cell) => HEADER_BY_ALIAS.get(normalize(cell)));
  const recognized = new Set(mapped.filter(Boolean));
  return recognized.size >= 2;
}

function parseDay(value: string | undefined): string | null {
  const raw = (value ?? "").trim().toUpperCase().replace(/^DAY\s+/, "");
  if (!raw) return null;
  const numberToRoman: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V" };
  const day = numberToRoman[raw] || raw;
  return ["I", "II", "III", "IV", "V"].includes(day) ? day : value?.trim() || null;
}

function parsePeriod(value: string | undefined): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/\d+/);
  if (!match) return null;
  const period = Number.parseInt(match[0], 10);
  return period >= 1 && period <= 8 ? period : null;
}

export function normalizeClassId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = raw.trim().toUpperCase();

  // Already normalized e.g. "II-CSE-C", "III-CSE-A", "IV-CSE-D"
  if (/^[I|V|X]+-[A-Z]+-[A-Z0-9]+$/i.test(str)) return str;

  // Pattern: "III / C", "III / D", "VII / A", "V / B", "3 / C", "3 / D"
  const match = str.match(/^([I|V|X]+|[1-8])\s*[\/-]?\s*([A-Za-z0-9,\s]+)?$/i);
  if (match) {
    const semOrYear = match[1].toUpperCase();
    let secPart = (match[2] || "").trim().toUpperCase();
    if (secPart.includes(",")) {
      secPart = secPart.split(",")[0].trim();
    }
    const section = secPart || "A";

    let yearPrefix = "II";
    if (semOrYear === "1" || semOrYear === "2" || semOrYear === "I") {
      yearPrefix = "I";
    } else if (semOrYear === "3" || semOrYear === "4" || semOrYear === "III") {
      yearPrefix = "II";
    } else if (semOrYear === "II" && !str.includes("SEM")) {
      yearPrefix = "II";
    } else if (semOrYear === "5" || semOrYear === "6" || semOrYear === "V" || semOrYear === "VI") {
      yearPrefix = "III";
    } else if (semOrYear === "7" || semOrYear === "8" || semOrYear === "VII" || semOrYear === "VIII" || semOrYear === "IV") {
      yearPrefix = "IV";
    }

    return `${yearPrefix}-CSE-${section}`;
  }

  // Handle formats like "2ndyearcseb", "IICSEC", "IIICSED", "IVCSEC"
  const compactMatch = str.match(/^(I{1,3}|IV|[1-4])(?:ST|ND|RD|TH)?[\s_-]*(?:YEAR)?[\s_-]*([A-Z]+)[\s_-]*([A-Z0-9]+)$/i) ||
                       str.match(/^(I{1,3}|IV|[1-4])(?:ST|ND|RD|TH)?(?:YEAR)?([A-Z]+)([A-Z0-9])$/i);
  if (compactMatch) {
    let yr = compactMatch[1].toUpperCase();
    if (yr === '1') yr = 'I';
    else if (yr === '2') yr = 'II';
    else if (yr === '3') yr = 'III';
    else if (yr === '4') yr = 'IV';
    const dept = compactMatch[2].toUpperCase();
    const sec = compactMatch[3].toUpperCase();
    return `${yr}-${dept}-${sec}`;
  }

  return str;
}

/**
 * Transparent XRef Self-Healing for PDF buffers with 19-byte or malformed xref entries
 */
function tryRepairXref(buf: Buffer): Buffer {
  try {
    const str = buf.toString("latin1");
    const xrefIdx = str.lastIndexOf("xref");
    const trailerIdx = str.lastIndexOf("trailer");
    if (xrefIdx === -1 || trailerIdx === -1 || trailerIdx <= xrefIdx) return buf;

    const xrefSection = str.substring(xrefIdx, trailerIdx);
    const lines = xrefSection.split(/\r?\n/);
    if (lines.length < 2) return buf;

    const repairedLines: string[] = [];
    repairedLines.push(lines[0]); // "xref"

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      if (/^\d+\s+\d+$/.test(line.trim())) {
        repairedLines.push(line.trim());
        continue;
      }
      const match = line.match(/^(\d{10})\s+(\d{5})\s+([fn])/i);
      if (match) {
        // Enforce exact 20-byte line: 10 digits + space + 5 digits + space + letter + CRLF
        repairedLines.push(`${match[1]} ${match[2]} ${match[3].toLowerCase()}`);
      } else {
        repairedLines.push(line.trim());
      }
    }

    const trailerSection = str.substring(trailerIdx);
    const newBody = str.substring(0, xrefIdx);
    const newStartxref = Buffer.byteLength(newBody, "latin1");
    const updatedTrailer = trailerSection.replace(/startxref\s*\d+/i, `startxref\r\n${newStartxref}`);

    // Reassemble xref with 20-byte lines (CRLF)
    let newXrefStr = repairedLines[0] + "\r\n";
    for (let i = 1; i < repairedLines.length; i++) {
      const rl = repairedLines[i];
      if (/^\d+\s+\d+$/.test(rl)) {
        newXrefStr += rl + "\r\n";
      } else {
        newXrefStr += rl + "\r\n";
      }
    }

    return Buffer.from(newBody + newXrefStr + updatedTrailer, "latin1");
  } catch {
    return buf;
  }
}

/**
 * Parse Master Class Grid Page
 */
function parseMasterClassPage(
  page: PageData,
  academicYearDefault = "2026-2027",
  semTypeDefault: "ODD" | "EVEN" = "ODD"
): { slots: ParsedTimetableSlot[]; classId: string } | null {
  const { items, fullText } = page;

  // 1. Extract Class Header info
  let classId: string | null = null;
  const classIdItem = items.find((i) => /^[I|V|X]+-[A-Z]+-[A-Z0-9]+$/i.test(i.str.trim()));
  if (classIdItem) {
    classId = normalizeClassId(classIdItem.str.trim());
  } else {
    const classIdMatch = fullText.match(/Class ID:\s*([^\s)]+)/i);
    if (classIdMatch) {
      classId = normalizeClassId(classIdMatch[1]);
    }
  }

  // Room No
  let roomNo = "LH-201";
  const roomMatch = fullText.match(/Room No:\s*([^\s)]+(?:\s+[^\s)]+)?)/i);
  if (roomMatch) {
    roomNo = roomMatch[1].trim();
  }

  // Academic Year & Semester
  let academicYear = academicYearDefault;
  const yearMatch = fullText.match(/(20\d\d\s*[-–]\s*20\d\d)/);
  if (yearMatch) {
    academicYear = yearMatch[1].replace(/\s+/g, "");
  }
  let semType = semTypeDefault;
  if (/EVEN\s*SEM/i.test(fullText)) semType = "EVEN";
  else if (/ODD\s*SEM/i.test(fullText)) semType = "ODD";

  // 2. Identify Day Order Rows (I..V)
  const dayRows: { day: string; y: number }[] = [];
  for (const d of ["I", "II", "III", "IV", "V"]) {
    // Left boundary x < 120, y between 200 and 400
    const it = items.find((i) => i.x < 120 && i.y > 200 && i.y < 400 && i.str.trim() === d);
    if (it) {
      dayRows.push({ day: d, y: it.y });
    }
  }

  // 3. Identify Period Columns (1..8)
  const periodCols: { period: number; x: number }[] = [];
  for (let num = 1; num <= 8; num++) {
    const it = items.find((i) => i.y > 390 && i.y < 440 && i.str.trim() === String(num));
    if (it) {
      periodCols.push({ period: num, x: it.x });
    }
  }

  // If no grid matrix identified, not a valid master class grid page
  if (dayRows.length < 2 || periodCols.length < 4) {
    return null;
  }

  periodCols.sort((a, b) => a.x - b.x);
  dayRows.sort((a, b) => b.y - a.y); // top to bottom

  // 4. Parse Subject Distribution Table at bottom of page
  const subDistMap = new Map<
    string,
    { code: string; name: string; faculty: string; room?: string; category?: string }
  >();

  // Look for subject distribution lines (typically at y < 220)
  for (const item of items) {
    if (item.y > 230) continue;
    const str = item.str.trim();
    // Pattern: "* 231CS301: Data Structures (DS) - Ms A Vinothini | 4 Hours"
    const m = str.match(/\*\s*([A-Za-z0-9]+)\s*:\s*([^(\-]+?)\s*\(([^)]+)\)\s*-\s*([^|]+)/);
    if (m) {
      const code = m[1].trim();
      const name = m[2].trim();
      const acronym = m[3].trim().toUpperCase();
      const faculty = m[4].trim();
      let category = "sub1";
      if (/lab/i.test(name) || /lab/i.test(acronym)) category = "lab1";
      else if (/elective|pe|oe/i.test(name) || /pe|oe/i.test(acronym)) category = "pe";

      subDistMap.set(acronym, { code, name, faculty, category });
      subDistMap.set(code.toUpperCase(), { code, name, faculty, category });
      subDistMap.set(name.toUpperCase(), { code, name, faculty, category });
      const firstToken = acronym.split(/[\s/]+/)[0];
      if (firstToken && firstToken.length > 1) {
        subDistMap.set(firstToken, { code, name, faculty, category });
      }
    }
  }

  const finalClassId = classId || "II-CSE-A";
  const slots: ParsedTimetableSlot[] = [];

  // 5. Bin 2D Grid Cells
  for (const { day, y: rowY } of dayRows) {
    for (const { period: p, x: colX } of periodCols) {
      const cellItems = items.filter(
        (it) =>
          Math.abs(it.y - rowY) <= 16 &&
          Math.abs(it.x - colX) <= 35 &&
          !["I", "II", "III", "IV", "V", "1", "2", "3", "4", "5", "6", "7", "8"].includes(it.str.trim())
      );

      const cellText = cellItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(" ");

      if (!cellText || cellText === "-" || cellText === "—") continue;

      // Filter out lunch break tokens
      const textUpper = cellText.toUpperCase().replace(/[\s\r\n\t]+/g, "");
      if (
        textUpper === "LUNCH" ||
        textUpper === "BREAK" ||
        textUpper === "LUNCHBREAK" ||
        textUpper === "FNBREAK" ||
        textUpper === "ANBREAK" ||
        /^LUN?CH(?:BREAK)?$/i.test(textUpper)
      ) {
        continue;
      }

      // Check embedded room e.g. "SE LAB (Bay 3)", "PQT LAB (Bay 4)"
      let slotRoom = roomNo;
      let cleanedText = cellText;
      const bayMatch = cellText.match(/\(([^)]+)\)/);
      if (bayMatch) {
        slotRoom = bayMatch[1].trim();
        cleanedText = cellText.replace(bayMatch[0], "").trim();
      }

      // Match subject
      const acronymLookup = cleanedText.toUpperCase().trim();
      const firstToken = acronymLookup.split(/[\s/]+/)[0];
      const matched =
        subDistMap.get(acronymLookup) ||
        subDistMap.get(firstToken) ||
        subDistMap.get(cleanedText.toUpperCase().replace(/[\s-]+/g, ""));

      let subjectCode = matched?.code || cleanedText;
      let subjectName = matched?.name || cleanedText;
      let facultyName = matched?.faculty || null;
      let category = matched?.category || (subjectName.toLowerCase().includes("lab") ? "lab1" : "sub1");

      slots.push({
        classId: finalClassId,
        dayOrder: day,
        period: p,
        timeRange: DEFAULT_TIMINGS[p] || `Period ${p}`,
        subjectCode,
        subjectName,
        facultyName,
        roomNo: slotRoom,
        category,
        academicYear,
        semType,
        sourcePage: page.pageNumber,
      });
    }
  }

  return { slots, classId: finalClassId };
}

/**
 * Parse Individual Faculty Grid Page
 */
function parseIndividualFacultyPage(
  page: PageData,
  academicYearDefault = "2026-2027",
  semTypeDefault: "ODD" | "EVEN" = "ODD"
): ParsedFacultySheet | null {
  const { items, fullText } = page;

  // 1. Extract Faculty Details
  let facultyName = "";
  const nameLabel = items.find((i) => i.str.includes("Name of the Faculty"));
  if (nameLabel) {
    const adjacent = items.find(
      (i) => Math.abs(i.y - nameLabel.y) <= 8 && i.x > nameLabel.x && i.str.trim() && !i.str.includes("MTS")
    );
    if (adjacent) facultyName = adjacent.str.trim();
  }
  if (!facultyName) {
    const m = fullText.match(/Name of the Faculty:\s*([^\n\r]+?)(?=\s*MTS No:|\s*Department:|$)/i);
    if (m) facultyName = m[1].replace(/MTS No.*$/i, "").trim();
  }
  if (!facultyName) {
    const profItem = items.find((i) => /^(?:Dr\.|Mr\.|Ms\.|Mrs\.)\s*[A-Z]/i.test(i.str.trim()));
    if (profItem) facultyName = profItem.str.trim();
  }

  // MTS No
  let vmsNo = "";
  const mtsLabel = items.find((i) => i.str.includes("MTS No"));
  if (mtsLabel) {
    const adjacent = items.find(
      (i) => Math.abs(i.y - mtsLabel.y) <= 8 && i.x > mtsLabel.x && /^\d{3,6}$/.test(i.str.trim())
    );
    if (adjacent) vmsNo = adjacent.str.trim();
  }
  if (!vmsNo) {
    const mtsMatch = fullText.match(/MTS No:\s*(\d+)/i);
    if (mtsMatch) vmsNo = mtsMatch[1].trim();
  }

  // Designation
  let designation = "Assistant Professor";
  const desigMatch = fullText.match(/Designation:\s*([^\n\r]+?)(?=\s*Total hours|\s*Department|$)/i);
  if (desigMatch) designation = desigMatch[1].trim();

  // Academic Year & Semester
  let academicYear = academicYearDefault;
  const yearMatch = fullText.match(/(20\d\d\s*[-–]\s*20\d\d)/);
  if (yearMatch) academicYear = yearMatch[1].replace(/\s+/g, "");

  let semType = semTypeDefault;
  if (/EVEN\s*SEM/i.test(fullText)) semType = "EVEN";
  else if (/ODD\s*SEM/i.test(fullText)) semType = "ODD";

  // 2. Identify Day Order Rows (I..V)
  const dayRows: { day: string; y: number }[] = [];
  for (const d of ["I", "II", "III", "IV", "V"]) {
    const it = items.find((i) => i.x < 120 && i.y > 200 && i.y < 400 && i.str.trim() === d);
    if (it) dayRows.push({ day: d, y: it.y });
  }

  // 3. Identify Period Columns (1..8)
  const periodCols: { period: number; x: number }[] = [];
  for (let num = 1; num <= 8; num++) {
    const it = items.find((i) => i.y > 390 && i.y < 440 && i.str.trim() === String(num));
    if (it) periodCols.push({ period: num, x: it.x });
  }

  if (dayRows.length < 2 || periodCols.length < 4) {
    return null;
  }

  periodCols.sort((a, b) => a.x - b.x);
  dayRows.sort((a, b) => b.y - a.y);

  // 4. Parse Subject Details mapping table at bottom
  const subjectMappings: Array<{ code?: string; name: string; classId?: string; room?: string }> = [];
  const subjectMap = new Map<string, { code?: string; name: string; classId?: string; room?: string }>();
  let dominantClassId: string | null = null;

  for (const item of items) {
    if (item.y > 230) continue;
    const str = item.str.trim();
    // Pattern: "* Sub-1: 231CB721 - Software Project Management (SPM) | Sem/Sec: IV-CSE-A | Branch: CSE"
    const m = str.match(
      /\*\s*(?:Sub-\d+|Lab-\d+|Proj-\d+)\s*:\s*([A-Za-z0-9]+)\s*-\s*([^|(]+)(?:\(([^)]+)\))?\s*\|\s*Sem\/Sec:\s*([^|]+)/i
    );
    if (m) {
      const code = m[1].trim();
      const rawName = m[2].trim();
      const acronym = (m[3] || "").trim().toUpperCase();
      const rawClass = m[4].trim();
      const normalizedClass = normalizeClassId(rawClass) || rawClass;
      if (!dominantClassId && normalizedClass) dominantClassId = normalizedClass;

      let room: string | undefined = undefined;
      const bayMatch = rawName.match(/\(([^)]+)\)/);
      if (bayMatch) room = bayMatch[1].trim();

      const mapping = { code, name: rawName, classId: normalizedClass, room };
      subjectMappings.push(mapping);

      if (acronym) {
        subjectMap.set(acronym, mapping);
        subjectMap.set(acronym.replace(/[\s-]+/g, ""), mapping);
      }
      subjectMap.set(code.toUpperCase(), mapping);
      subjectMap.set(rawName.toUpperCase(), mapping);
      const firstToken = (acronym || rawName).split(/[\s-]+/)[0].toUpperCase();
      if (firstToken && firstToken.length > 1) {
        subjectMap.set(firstToken, mapping);
      }
    }
  }

  const slots: ParsedTimetableSlot[] = [];

  // 5. Bin 2D Grid Cells
  for (const { day, y: rowY } of dayRows) {
    for (const { period: p, x: colX } of periodCols) {
      const cellItems = items.filter(
        (it) =>
          Math.abs(it.y - rowY) <= 18 &&
          Math.abs(it.x - colX) <= 35 &&
          !["I", "II", "III", "IV", "V", "1", "2", "3", "4", "5", "6", "7", "8"].includes(it.str.trim())
      );

      // Separate text items by line
      const lineTokens = cellItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .filter((t) => t !== "-" && t !== "—");

      if (lineTokens.length === 0) continue;

      const cellText = lineTokens.join(" ");
      const textUpper = cellText.toUpperCase().replace(/[\s\r\n\t]+/g, "");
      if (
        textUpper === "LUNCH" ||
        textUpper === "BREAK" ||
        textUpper === "LUNCHBREAK" ||
        textUpper === "FNBREAK" ||
        textUpper === "ANBREAK" ||
        /^LUN?CH(?:BREAK)?$/i.test(textUpper)
      ) {
        continue;
      }

      // Check if second line has class or room (e.g. `IV-CSE-A` or `Bay 3`)
      let detectedClass: string | null = null;
      let detectedRoom: string | null = null;
      let primaryTokens: string[] = [];

      for (const tok of lineTokens) {
        if (/^[I|V|X]+-[A-Z]+-[A-Z0-9]+$/i.test(tok)) {
          detectedClass = normalizeClassId(tok);
        } else if (/^Bay\s*\d+/i.test(tok)) {
          detectedRoom = tok;
        } else {
          primaryTokens.push(tok);
        }
      }

      const primarySub = primaryTokens.join(" ") || cellText;
      const normalizedKey = primarySub.toUpperCase().trim().replace(/[\s-]+/g, "");
      const firstWord = primarySub.split(/[\s-]+/)[0].toUpperCase();

      const matched =
        subjectMap.get(primarySub.toUpperCase()) ||
        subjectMap.get(normalizedKey) ||
        subjectMap.get(firstWord);

      let finalSubjectName = matched?.name || primarySub;
      let finalSubjectCode = matched?.code || primarySub;
      let finalClassId = detectedClass || matched?.classId || dominantClassId || "II-CSE-A";
      let finalRoom = detectedRoom || matched?.room || (finalSubjectName.toLowerCase().includes("lab") ? "CS-LAB-1" : "LH-201");

      let category = "sub1";
      if (finalSubjectName.toLowerCase().includes("lab")) category = "lab1";
      else if (/pe|elective/i.test(finalSubjectName)) category = "pe";
      else if (/oe|open/i.test(finalSubjectName)) category = "oe";
      else if (/proj/i.test(finalSubjectName)) category = "lab2";

      slots.push({
        classId: finalClassId,
        dayOrder: day,
        period: p,
        timeRange: DEFAULT_TIMINGS[p] || `Period ${p}`,
        subjectCode: finalSubjectCode,
        subjectName: finalSubjectName,
        facultyName: facultyName || "Faculty",
        vmsNo: vmsNo || undefined,
        designation,
        roomNo: finalRoom,
        category,
        academicYear,
        semType,
        sourcePage: page.pageNumber,
      });
    }
  }

  return {
    facultyName: facultyName || `Faculty ${page.pageNumber}`,
    vmsNo: vmsNo || "",
    designation,
    totalHoursPerWeek: slots.length,
    department: "Computer Science and Engineering",
    subjectMappings,
    slots,
  };
}

/**
 * Legacy Row-Oriented Fallback Page Parser
 */
export function parseIndividualTimetablePage(text: string, pageNumber = 1): ParsedFacultySheet | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let headers: string[] | null = null;
  let fieldIndexes: Record<string, number> = {};
  const slots: ParsedTimetableSlot[] = [];

  for (const line of lines) {
    const cells = splitCells(line);
    if (isHeader(cells)) {
      headers = cells;
      fieldIndexes = {};
      cells.forEach((cell, index) => {
        const field = HEADER_BY_ALIAS.get(normalize(cell));
        if (field && fieldIndexes[field] === undefined) fieldIndexes[field] = index;
      });
      continue;
    }
    if (!headers || cells.length !== headers.length) continue;

    const get = (key: string) => {
      const value = cells[fieldIndexes[key]];
      return value?.trim() || null;
    };
    const hasContent = cells.some((cell) => cell.trim() !== "");
    if (!hasContent) continue;

    const rawClass = get("classId");
    const classId = normalizeClassId(rawClass);

    slots.push({
      classId,
      dayOrder: parseDay(get("dayOrder") ?? undefined),
      period: parsePeriod(get("period") ?? undefined),
      timeRange: get("timeRange"),
      subjectCode: get("subjectCode"),
      subjectName: get("subjectName"),
      facultyName: get("facultyName"),
      vmsNo: get("vmsNo"),
      roomNo: get("roomNo"),
      category: get("category"),
      sourcePage: pageNumber,
    });
  }

  if (slots.length === 0) return null;
  const facultyName = slots.find((slot) => slot.facultyName)?.facultyName || "";
  const vmsNo = slots.find((slot) => slot.vmsNo)?.vmsNo || "";
  return {
    facultyName,
    vmsNo,
    designation: "",
    totalHoursPerWeek: slots.length,
    subjectMappings: [],
    slots,
  };
}

/**
 * Main PDF Timetable Parser Entry Point
 */
export async function parseTimetablePdfBuffer(
  buffer: Buffer,
  options: ParsePdfOptions = {}
): Promise<ParsePdfResult> {
  const pagesData: PageData[] = [];

  function customPageRender(pageData: any) {
    return pageData.getTextContent().then((textContent: any) => {
      const items: PdfTextItem[] = [];
      let fullText = "";
      for (const it of textContent.items) {
        const str = String(it.str || "");
        fullText += str + " ";
        items.push({
          str,
          x: Math.round(it.transform[4] * 10) / 10,
          y: Math.round(it.transform[5] * 10) / 10,
          w: Math.round(it.width * 10) / 10,
          h: Math.round(it.height * 10) / 10,
        });
      }
      pagesData.push({
        pageNumber: pagesData.length + 1,
        items,
        fullText,
      });
      return fullText;
    });
  }

  let extracted: any;
  try {
    extracted = await pdf(buffer, { pagerender: customPageRender });
  } catch (initialErr: any) {
    // Attempt transparent xref repair on buffer
    console.warn("PDF parse initial attempt failed, attempting self-repair:", initialErr?.message, initialErr?.stack);
    const repairedBuffer = tryRepairXref(buffer);
    try {
      pagesData.length = 0; // reset
      extracted = await pdf(repairedBuffer, { pagerender: customPageRender });
    } catch (secondErr: any) {
      throw new Error(`Failed to parse PDF document: ${secondErr.message || initialErr.message}`);
    }
  }

  const requestedType = options.type || "auto";
  const allSlots: ParsedTimetableSlot[] = [];
  const facultySheets: ParsedFacultySheet[] = [];
  let isMasterClass = false;

  // Process Each Page
  for (const page of pagesData) {
    const fullTextUpper = page.fullText.toUpperCase();
    const isMasterCandidate =
      requestedType === "master" ||
      (requestedType === "auto" &&
        (fullTextUpper.includes("CLASS INFORMATION") ||
          fullTextUpper.includes("CLASS ID") ||
          fullTextUpper.includes("CLASS ADVISOR") ||
          fullTextUpper.includes("SUBJECT DISTRIBUTION")));

    if (isMasterCandidate) {
      const masterResult = parseMasterClassPage(page, options.academicYear, options.semType);
      if (masterResult && masterResult.slots.length > 0) {
        isMasterClass = true;
        allSlots.push(...masterResult.slots);
        continue;
      }
    }

    // Individual Faculty parsing
    const indSheet = parseIndividualFacultyPage(page, options.academicYear, options.semType);
    if (indSheet && indSheet.slots.length > 0) {
      facultySheets.push(indSheet);
      allSlots.push(...indSheet.slots);
      continue;
    }

    // Fallback: Legacy flat tabular row parser
    const fallbackSheet = parseIndividualTimetablePage(page.fullText, page.pageNumber);
    if (fallbackSheet && fallbackSheet.slots.length > 0) {
      facultySheets.push(fallbackSheet);
      allSlots.push(...fallbackSheet.slots);
    }
  }

  if (allSlots.length === 0) {
    throw new Error(
      "No timetable rows could be read from this PDF. No records were written. Ensure the PDF contains a standard 2D period timetable matrix (Days I-V x Periods 1-8) or text-based rows."
    );
  }

  const distinctClasses = [...new Set(allSlots.map((s) => s.classId).filter(Boolean) as string[])];

  return {
    facultySheets,
    allSlots,
    isMasterClass,
    classes: distinctClasses,
  };
}
