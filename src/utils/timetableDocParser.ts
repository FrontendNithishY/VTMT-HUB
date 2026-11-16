/**
 * Hardened Parser for College Timetable Word Documents (.docx / .doc)
 * 
 * Supports:
 * 1. Multi-Faculty Individual Timetable Packets (e.g. 33 Faculty sections in one docx,
 *    each containing Faculty Info header, Day Order vs Periods 1-8 matrix with merged cells,
 *    and Sub-1 / Lab-1 / Sub-2 / Sub-3 with Sem/Sec mapping tables).
 * 2. Class Master Timetable Period Grid Matrix (9 college classes, DO in rows, Periods 1-8 in cols,
 *    with Subject Distribution table mapping acronyms/codes to faculty and rooms).
 * 3. 2D Cell Matrix header parsing (prevents empty cell regex leakage like "Designation:").
 * 4. Token collapsing for vertical break tokens ("L\nU\nN\nC\nH\nB\nR\nE\nA\nK" -> "LUNCHBREAK").
 * 5. Priority of Subject Mapping table over bare section defaults to prevent Year II corruption.
 * 6. Unicode arrow stripping, HTML entity decoding, and dash normalization.
 */

import mammoth from "mammoth";

export interface ParsedDocTimetableSlot {
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
}

export interface FacultySummary {
  name: string;
  vmsNo: string;
  designation: string;
  slotCount: number;
}

export interface ParseDocOptions {
  type?: "master" | "individual" | "auto";
  academicYear?: string;
  semType?: "ODD" | "EVEN";
}

export interface ParseDocResult {
  allSlots: ParsedDocTimetableSlot[];
  faculties?: FacultySummary[];
  distinctClasses: string[];
  distinctFaculty: string[];
  isMasterClass: boolean;
  warnings: string[];
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

/**
 * Strip Unicode arrows, decode HTML entities, and normalize dashes
 */
export function cleanUnicodeAndEntities(text: string): string {
  if (!text) return "";
  return text
    // Strip Unicode arrows: 🡨, 🡪, ←, ↑, →, ↓, ◀, ▶, ➡, etc.
    .replace(/[\u{1F860}-\u{1F87F}\u2190-\u219F\u25C0\u25B6\u27A1]/gu, " ")
    // Decode HTML entities
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    // Normalize dashes
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDay(value: string | undefined | null): string | null {
  const raw = cleanUnicodeAndEntities(String(value ?? "")).toUpperCase().replace(/^DAY\s+/, "");
  if (!raw) return null;
  const numberToRoman: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V" };
  const day = numberToRoman[raw] || raw;
  return ["I", "II", "III", "IV", "V"].includes(day) ? day : (value ? String(value).trim() : null);
}

export function parsePeriod(value: string | undefined | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/\d+/);
  if (!match) return null;
  const period = Number.parseInt(match[0], 10);
  return period >= 1 && period <= 8 ? period : null;
}

/**
 * Standardize academic year / semester notation to normalized class identifier
 * e.g., "III / C" -> "II-CSE-C" (3rd Sem = 2nd Year)
 * "VII / A" -> "IV-CSE-A" (7th Sem = 4th Year)
 * "V / B" -> "III-CSE-B" (5th Sem = 3rd Year)
 * "IV" -> "IV-CSE-A" (in odd sem context, IV year)
 */
export function normalizeClassString(rawSec: string, fallbackDept = "CSE"): string | null {
  if (!rawSec) return null;
  const clean = cleanUnicodeAndEntities(rawSec);

  // If already full format like "II-CSE-A" or "IV-CSE-C"
  if (/^[I|V|X]+-[A-Z]+-[A-Z0-9]+$/i.test(clean)) {
    return clean.toUpperCase();
  }

  // Matches "III / C", "VII/A", "V / A,B,C", "3 / A", "III /A", "III/D", "III / D", "VII / D", "3 / D", "5 / C"
  const match = clean.match(/^([I|V|X]+|[1-8])\s*[\/-]?\s*([A-Za-z0-9,\s]+)?$/i);
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
    } else if (semOrYear === "II" && !clean.includes("SEM")) {
      yearPrefix = "II";
    } else if (semOrYear === "5" || semOrYear === "6" || semOrYear === "V" || semOrYear === "VI") {
      yearPrefix = "III";
    } else if (semOrYear === "7" || semOrYear === "8" || semOrYear === "VII" || semOrYear === "VIII" || semOrYear === "IV") {
      yearPrefix = "IV";
    }

    return `${yearPrefix}-${fallbackDept}-${section}`;
  }

  return clean;
}

/**
 * Extract embedded room / lab / bay from slot cell string
 */
export function extractRoomFromText(text: string): { roomNo: string | null; cleanedText: string } {
  let roomNo: string | null = null;
  let cleaned = cleanUnicodeAndEntities(text);

  const patterns = [
    /\((Research\s*Lab|Seminar\s*Hall|Bay\s*\d+|LH[-\s]*\d+|CS[-\s]*LAB[-\s]*\d+|[A-Z]\s*\d{3})\)/i,
    /\b(Bay\s*\d+|BAY\s*\d+|Research\s*Lab|Seminar\s*Hall|LH[-\s]*\d+|N\d{3}\s*\/\s*N\d{3}|I\d{3}\s*\/\s*I\d{3}|N\s*\d{3}|I\s*\d{3})\b/i,
  ];

  for (const regex of patterns) {
    const m = cleaned.match(regex);
    if (m) {
      roomNo = m[1].replace(/\s+/g, " ").trim();
      cleaned = cleaned.replace(m[0], "").replace(/\(\s*\)/g, "").trim();
      break;
    }
  }

  if (!roomNo && cleaned.toUpperCase().includes("LAB")) {
    roomNo = "CS-LAB-1";
  }

  return { roomNo, cleanedText: cleaned };
}

/**
 * Extract embedded section or class from text (without prematurely locking in Year II)
 */
export function extractSectionFromText(text: string): {
  classId: string | null;
  sectionLetter: string | null;
  cleanedText: string;
} {
  let classId: string | null = null;
  let sectionLetter: string | null = null;
  let cleaned = cleanUnicodeAndEntities(text);

  // Pattern: Direct full class like "IV-CSE-A", "II-CSE-C"
  const fullClassMatch = cleaned.match(/\b([I|V|X]+|[1-4])-([A-Z]+)-([A-D])\b/i);
  if (fullClassMatch) {
    classId = fullClassMatch[0].toUpperCase();
    sectionLetter = fullClassMatch[3].toUpperCase();
    cleaned = cleaned.replace(fullClassMatch[0], "").trim();
    return { classId, sectionLetter, cleanedText: cleaned };
  }

  // Pattern: "IV SEC C", "III SEC B", "II SEC A", "IV SEC D"
  const yrSecMatch = cleaned.match(/\b([I|V|X]+|[1-4])\s*(?:YEAR)?\s*(?:SEC(?:TION)?)\s*([A-D])\b/i);
  if (yrSecMatch) {
    const yr = yrSecMatch[1].toUpperCase();
    const sec = yrSecMatch[2].toUpperCase();
    cleaned = cleaned.replace(yrSecMatch[0], "").trim();
    const yrPrefix = yr === "1" ? "I" : yr === "2" ? "II" : yr === "3" ? "III" : yr === "4" ? "IV" : yr;
    return { classId: `${yrPrefix}-CSE-${sec}`, sectionLetter: sec, cleanedText: cleaned };
  }

  // Pattern: "LIB II-B", "LIB III-B", "LIB IV SEC C"
  const libMatch = cleaned.match(/LIB\s*[-–]?\s*([I|V|X]+|[1-4])\s*[-–\s]?\s*(?:SEC(?:TION)?)?\s*([A-D])/i);
  if (libMatch) {
    let yr = libMatch[1].toUpperCase();
    if (yr === "1") yr = "I";
    else if (yr === "2") yr = "II";
    else if (yr === "3") yr = "III";
    else if (yr === "4") yr = "IV";
    const sec = libMatch[2].toUpperCase();
    cleaned = cleaned.replace(libMatch[0], "").trim();
    return { classId: `${yr}-CSE-${sec}`, sectionLetter: sec, cleanedText: cleaned };
  }

  // Bare Section Pattern: "SEC B", "SEC C", "Sec B", "A Sec", "B Sec"
  const secMatch = cleaned.match(/\b(?:SEC(?:TION)?\s*([A-D])|([A-D])\s*SEC(?:TION)?)\b/i);
  if (secMatch) {
    sectionLetter = (secMatch[1] || secMatch[2]).toUpperCase();
    cleaned = cleaned.replace(secMatch[0], "").trim();
  }

  // Pattern: "PPT-B", "PPT- C"
  const pptMatch = cleaned.match(/PPT\s*[-–]?\s*([A-D])(?:\s*SEC)?/i);
  if (pptMatch) {
    sectionLetter = pptMatch[1].toUpperCase();
    cleaned = cleaned.replace(pptMatch[0], "").trim();
  }

  return { classId, sectionLetter, cleanedText: cleaned };
}

/**
 * Check if a cell is a Break token with aggressive whitespace collapsing
 */
export function isBreakToken(rawText: string): boolean {
  if (!rawText) return false;
  // Collapse ALL whitespace, newlines, tabs
  const collapsed = cleanUnicodeAndEntities(rawText).toUpperCase().replace(/[\s\r\n\t]+/g, "");
  return (
    collapsed === "LUNCH" ||
    collapsed === "BREAK" ||
    collapsed === "LUNCHBREAK" ||
    collapsed === "FNBREAK" ||
    collapsed === "ANBREAK" ||
    collapsed.includes("LUNCHBREAK") ||
    /^LUN?CH(?:BREAK)?$/i.test(collapsed) ||
    /^TEA(?:BREAK)?$/i.test(collapsed)
  );
}

/**
 * Parses full 2D HTML table handling rowspans and colspans accurately
 */
export function parseHtmlTableMatrix(tableHtml: string): {
  grid: { rawText: string; isOrigin: boolean }[][];
  periodCols: Record<number, number>;
  dayRows: { dayOrder: string; r: number }[];
} {
  const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const grid: { rawText: string; isOrigin: boolean }[][] = [];

  for (let r = 0; r < trMatches.length; r++) {
    if (!grid[r]) grid[r] = [];
    const cellMatches = trMatches[r].match(/<(td|th)[\s\S]*?<\/(td|th)>/gi) || [];

    let currentC = 0;
    for (const cellHtml of cellMatches) {
      while (grid[r][currentC] !== undefined) {
        currentC++;
      }

      const colspanMatch = cellHtml.match(/colspan=["']?(\d+)["']?/i);
      const rowspanMatch = cellHtml.match(/rowspan=["']?(\d+)["']?/i);
      const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;
      const rowspan = rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1;

      const text = cleanUnicodeAndEntities(cellHtml.replace(/<[^>]+>/g, " "));

      for (let ro = 0; ro < rowspan; ro++) {
        const targetR = r + ro;
        if (!grid[targetR]) grid[targetR] = [];
        for (let co = 0; co < colspan; co++) {
          grid[targetR][currentC + co] = {
            rawText: text,
            isOrigin: ro === 0 && co === 0,
          };
        }
      }
      currentC += colspan;
    }
  }

  // Identify Period Columns 1..8
  const periodCols: Record<number, number> = {};
  for (let r = 0; r < Math.min(3, grid.length); r++) {
    for (let c = 0; c < (grid[r] || []).length; c++) {
      const val = grid[r][c]?.rawText || "";
      const match = val.match(/^([1-8])$/);
      if (match) {
        const p = parseInt(match[1], 10);
        if (periodCols[p] === undefined) {
          periodCols[p] = c;
        }
      }
    }
  }

  // Identify Day Order rows (I, II, III, IV, V)
  const dayRows: { dayOrder: string; r: number }[] = [];
  for (let r = 0; r < grid.length; r++) {
    const firstCell = grid[r][0]?.rawText || "";
    if (["I", "II", "III", "IV", "V"].includes(firstCell.toUpperCase())) {
      dayRows.push({ dayOrder: firstCell.toUpperCase(), r });
    }
  }

  return { grid, periodCols, dayRows };
}

/**
 * Parse Header Table as 2D Cell Matrix (stops empty cell regex jumping)
 */
function parseHeaderTableCells(tableHtml: string): {
  facultyName: string;
  vmsNo: string;
  designation: string;
  totalHours: string;
  classId: string | null;
  roomNo: string | null;
  academicYear: string | null;
  semType: string | null;
} {
  const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const matrix: string[][] = [];

  for (const tr of trMatches) {
    const cellMatches = tr.match(/<(td|th)[\s\S]*?<\/(td|th)>/gi) || [];
    const row = cellMatches.map((td) => cleanUnicodeAndEntities(td.replace(/<[^>]+>/g, " ")));
    matrix.push(row);
  }

  let facultyName = "";
  let vmsNo = "";
  let designation = "Assistant Professor";
  let totalHours = "";
  let classId: string | null = null;
  let roomNo: string | null = null;
  let academicYear: string | null = null;
  let semType: string | null = null;

  for (const row of matrix) {
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      const cellLower = cell.toLowerCase();

      // Faculty Name
      if (cellLower.includes("name of the faculty")) {
        if (c + 1 < row.length && row[c + 1]) {
          facultyName = row[c + 1];
        }
      }

      // MTS No
      if (cellLower.includes("mts no") || cellLower.includes("vms no")) {
        if (c + 1 < row.length) {
          const adjacent = row[c + 1];
          // If empty cell, stays empty! Never takes designation
          if (adjacent && !adjacent.toLowerCase().includes("designation")) {
            vmsNo = adjacent;
          }
        }
      }

      // Designation
      if (cellLower.includes("designation")) {
        if (c + 1 < row.length && row[c + 1]) {
          designation = row[c + 1];
        }
      }

      // Total hours
      if (cellLower.includes("total hours")) {
        if (c + 1 < row.length && row[c + 1]) {
          totalHours = row[c + 1];
        }
      }

      // Master Class ID
      if (cellLower.includes("class id")) {
        if (c + 1 < row.length && row[c + 1]) {
          classId = normalizeClassString(row[c + 1]);
        }
      }

      // Room No
      if (cellLower.includes("room no")) {
        if (c + 1 < row.length && row[c + 1]) {
          roomNo = row[c + 1];
        }
      }

      // Academic Year
      const yearM = cell.match(/(20\d\d\s*[-–]\s*20\d\d)/);
      if (yearM) academicYear = yearM[1].replace(/\s+/g, "");

      if (cellLower.includes("odd sem") || cellLower.includes("odd")) semType = "ODD";
      else if (cellLower.includes("even sem") || cellLower.includes("even")) semType = "EVEN";
    }
  }

  return { facultyName, vmsNo, designation, totalHours, classId, roomNo, academicYear, semType };
}

/**
 * Main parser entry point for .docx/.doc timetable buffers
 */
export async function parseTimetableDocBuffer(
  buffer: Buffer,
  options: ParseDocOptions = {}
): Promise<ParseDocResult> {
  const warnings: string[] = [];

  let result: { value: string; messages: any[] };
  try {
    result = await mammoth.convertToHtml({ buffer });
  } catch (err: any) {
    throw new Error(`Failed to read Word document: ${err.message || "Invalid or encrypted document format"}`);
  }

  const html = cleanUnicodeAndEntities(result.value);
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || [];

  if (tableMatches.length === 0) {
    throw new Error("No tables found in Word document.");
  }

  const allSlots: ParsedDocTimetableSlot[] = [];
  const facultiesSummary: FacultySummary[] = [];

  // Determine if document is Master Class or Individual Faculty
  const requestedType = options.type || "auto";
  const hasFacultyHeaders = tableMatches.some((t) => t.includes("Name of the Faculty"));
  const hasClassHeaders = tableMatches.some(
    (t) => t.includes("Class Information") || t.includes("Class ID:") || t.includes("Subject Distribution")
  );

  const isMasterMode =
    requestedType === "master" ||
    (requestedType === "auto" && !hasFacultyHeaders && hasClassHeaders);

  // ==========================================
  // MODE 1: MULTI-FACULTY INDIVIDUAL PACKETS
  // ==========================================
  if (!isMasterMode && hasFacultyHeaders) {
    const facultyIndices: number[] = [];
    for (let i = 0; i < tableMatches.length; i++) {
      if (tableMatches[i].includes("Name of the Faculty")) {
        facultyIndices.push(i);
      }
    }

    for (let fIdx = 0; fIdx < facultyIndices.length; fIdx++) {
      const headerTableIdx = facultyIndices[fIdx];
      const nextHeaderIdx = fIdx + 1 < facultyIndices.length ? facultyIndices[fIdx + 1] : tableMatches.length;

      const headerTable = tableMatches[headerTableIdx];
      let gridTable = "";
      let subjectTable = "";

      for (let t = headerTableIdx + 1; t < nextHeaderIdx; t++) {
        const tHtml = tableMatches[t];
        if (!gridTable && (tHtml.includes("DO") || tHtml.includes(">1<") || tHtml.includes("8.05"))) {
          gridTable = tHtml;
        } else if (!subjectTable && (tHtml.includes("Sub-1") || tHtml.includes("Sem / Sec") || tHtml.includes("Branch"))) {
          subjectTable = tHtml;
        }
      }

      // 1. Extract Faculty Details via 2D Cell Matrix (never leaks "Designation:")
      const headerInfo = parseHeaderTableCells(headerTable);
      const facultyName = headerInfo.facultyName || `Faculty ${fIdx + 1}`;
      const vmsNo = headerInfo.vmsNo;
      const designation = headerInfo.designation || "Assistant Professor";

      // 2. Extract Subject and Class Mapping from Subject Table (Sub-1, Lab-1, Sub-2, Sub-3)
      const facultySubjectMap = new Map<
        string,
        { code?: string; name: string; classId?: string; room?: string; yearPrefix?: string }
      >();
      let dominantClassId: string | null = null;

      if (subjectTable) {
        const trs = subjectTable.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        const parsedRows = trs.map((tr) => {
          const tds = tr.match(/<(td|th)[\s\S]*?<\/(td|th)>/gi) || [];
          return tds.map((td) => cleanUnicodeAndEntities(td.replace(/<[^>]+>/g, " ")));
        });

        if (parsedRows.length >= 4) {
          const subNames = parsedRows[1] || [];
          const semSecs = parsedRows[3] || [];

          for (let c = 0; c < subNames.length; c++) {
            const rawSub = subNames[c];
            const rawSec = semSecs[c] || "";
            if (!rawSub) continue;

            const normalizedClass = normalizeClassString(rawSec);
            if (!dominantClassId && normalizedClass) dominantClassId = normalizedClass;

            let yearPrefix: string | undefined = undefined;
            if (normalizedClass) {
              const yrMatch = normalizedClass.match(/^([I|V|X]+)-/);
              if (yrMatch) yearPrefix = yrMatch[1];
            }

            const mappingObj = { name: rawSub, classId: normalizedClass || undefined, yearPrefix };
            const keyFull = rawSub.toUpperCase().trim();
            facultySubjectMap.set(keyFull, mappingObj);

            // Primary keyword/acronym (e.g. "ALML", "ESIOT", "SPM", "AIML", "CD", "DS", "PE-V", "PEHV")
            const firstToken = rawSub.split(/[\s-]+/)[0].toUpperCase();
            if (firstToken && firstToken.length > 1) {
              facultySubjectMap.set(firstToken, mappingObj);
            }

            // Hyphenated and compressed tokens
            const peMatch = rawSub.match(/\b(PE\s*[-–]?\s*[I|V|X]+|OE\s*[-–]?\s*[I|V|X]+)\b/i);
            if (peMatch) {
              const peKey = peMatch[0].toUpperCase().replace(/\s+/g, "-");
              const peKeyNoHyphen = peMatch[0].toUpperCase().replace(/[\s-–]+/g, "");
              facultySubjectMap.set(peKey, mappingObj);
              facultySubjectMap.set(peKeyNoHyphen, mappingObj);
            }
          }
        }
      }

      if (!gridTable) {
        warnings.push(`Faculty "${facultyName}" had no recognizable period matrix grid.`);
        facultiesSummary.push({ name: facultyName, vmsNo, designation, slotCount: 0 });
        continue;
      }

      // 3. Parse Period Grid Matrix with 2D spanning
      const { grid, periodCols, dayRows } = parseHtmlTableMatrix(gridTable);
      let facultySlotCount = 0;

      for (const { dayOrder, r } of dayRows) {
        for (let p = 1; p <= 8; p++) {
          const colIdx = periodCols[p];
          if (colIdx === undefined) continue;

          const cellObj = grid[r][colIdx];
          if (!cellObj) continue;

          const rawText = cellObj.rawText;
          if (!rawText || rawText === "-" || rawText === "—") continue;

          // Hardened break token filter: strip all whitespace
          if (isBreakToken(rawText)) {
            continue;
          }

          // Extract room and section information embedded in the cell
          const { roomNo: extractedRoom, cleanedText: textNoRoom } = extractRoomFromText(rawText);
          const { classId: explicitClass, sectionLetter, cleanedText: cleanSubject } =
            extractSectionFromText(textNoRoom);

          // LOOK UP IN SUBJECT MAPPING TABLE FIRST (Prevents Year II Overwrite)
          const normalizedLookupKey = cleanSubject.toUpperCase().trim().replace(/[\s-–]+/g, "");
          const firstWord = cleanSubject.split(/[\s-]+/)[0].toUpperCase();

          let matchedSub =
            facultySubjectMap.get(cleanSubject.toUpperCase()) ||
            facultySubjectMap.get(firstWord) ||
            facultySubjectMap.get(normalizedLookupKey);

          if (!matchedSub) {
            for (const [mapKey, mapVal] of facultySubjectMap.entries()) {
              const cleanMapKey = mapKey.replace(/[\s-–]+/g, "");
              if (normalizedLookupKey.includes(cleanMapKey) || cleanMapKey.includes(normalizedLookupKey)) {
                matchedSub = mapVal;
                break;
              }
            }
          }

          let finalSubjectName = matchedSub?.name || cleanSubject || rawText;
          let finalClassId = "II-CSE-A";

          if (explicitClass) {
            // If full class was in cell (e.g. "IV-CSE-A")
            finalClassId = explicitClass;
          } else if (matchedSub?.classId) {
            // Subject table gave full class (e.g. "III-CSE-B" for ALML)
            if (sectionLetter && matchedSub.yearPrefix) {
              finalClassId = `${matchedSub.yearPrefix}-CSE-${sectionLetter}`;
            } else {
              finalClassId = matchedSub.classId;
            }
          } else if (sectionLetter) {
            // Fallback bare section if no subject mapping exists
            finalClassId = `II-CSE-${sectionLetter}`;
          } else if (dominantClassId) {
            finalClassId = dominantClassId;
          }

          let finalRoom =
            extractedRoom || (finalSubjectName.toLowerCase().includes("lab") ? "CS-LAB-1" : "LH-201");

          // Determine category
          let category = "sub1";
          const subLower = finalSubjectName.toLowerCase();
          if (subLower.includes("lab")) category = "lab1";
          else if (subLower.includes("pe") || subLower.includes("elective")) category = "pe";
          else if (subLower.includes("oe") || subLower.includes("open")) category = "oe";
          else if (subLower.includes("proj")) category = "lab2";

          facultySlotCount++;
          allSlots.push({
            classId: finalClassId,
            dayOrder,
            period: p,
            timeRange: DEFAULT_TIMINGS[p] || `Period ${p}`,
            subjectCode: finalSubjectName,
            subjectName: finalSubjectName,
            facultyName,
            vmsNo: vmsNo || undefined,
            designation,
            roomNo: finalRoom,
            category,
            academicYear: options.academicYear || headerInfo.academicYear || "2026-2027",
            semType: options.semType || headerInfo.semType || "ODD",
          });
        }
      }

      facultiesSummary.push({
        name: facultyName,
        vmsNo,
        designation,
        slotCount: facultySlotCount,
      });
    }

    const distinctClasses = [...new Set(allSlots.map((s) => s.classId).filter(Boolean) as string[])];
    const distinctFaculty = [...new Set(allSlots.map((s) => s.facultyName).filter(Boolean) as string[])];

    return {
      allSlots,
      faculties: facultiesSummary,
      distinctClasses,
      distinctFaculty,
      isMasterClass: false,
      warnings,
    };
  }

  // ==========================================
  // MODE 2: MASTER CLASS TIMETABLE TABLES
  // ==========================================
  for (let tIdx = 0; tIdx < tableMatches.length; tIdx++) {
    const tableHtml = tableMatches[tIdx];
    const { grid, periodCols, dayRows } = parseHtmlTableMatrix(tableHtml);

    if (dayRows.length >= 2 && Object.keys(periodCols).length >= 4) {
      // Find associated Class Header or Subject Distribution table
      let classId = "II-CSE-A";
      let roomNo = "LH-201";
      const classSubjectMap = new Map<string, { code?: string; name: string; faculty?: string }>();

      // Check preceding table for Class Info
      if (tIdx > 0) {
        const prevInfo = parseHeaderTableCells(tableMatches[tIdx - 1]);
        if (prevInfo.classId) classId = prevInfo.classId;
        if (prevInfo.roomNo) roomNo = prevInfo.roomNo;
      }

      // Check succeeding table for Subject Distribution
      if (tIdx + 1 < tableMatches.length) {
        const nextHtml = tableMatches[tIdx + 1];
        if (nextHtml.includes("Subject") || nextHtml.includes("Staff") || nextHtml.includes("Code")) {
          const subTrs = nextHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
          for (const tr of subTrs) {
            const tds = tr.match(/<(td|th)[\s\S]*?<\/(td|th)>/gi) || [];
            const cells = tds.map((td) => cleanUnicodeAndEntities(td.replace(/<[^>]+>/g, " ")));
            if (cells.length >= 3) {
              const code = cells[0];
              const name = cells[1];
              const faculty = cells[cells.length - 1];
              classSubjectMap.set(code.toUpperCase(), { code, name, faculty });
              classSubjectMap.set(name.toUpperCase(), { code, name, faculty });
              const acronym = cells.length >= 4 ? cells[2].toUpperCase() : name.split(/[\s-]+/)[0].toUpperCase();
              classSubjectMap.set(acronym, { code, name, faculty });
            }
          }
        }
      }

      for (const { dayOrder, r } of dayRows) {
        for (let p = 1; p <= 8; p++) {
          const colIdx = periodCols[p];
          if (colIdx === undefined) continue;

          const cellObj = grid[r][colIdx];
          if (!cellObj) continue;

          const rawText = cellObj.rawText;
          if (!rawText || rawText === "-" || rawText === "—") continue;
          if (isBreakToken(rawText)) continue;

          const { roomNo: cellRoom, cleanedText } = extractRoomFromText(rawText);
          const { classId: explicitClass, cleanedText: finalSub } = extractSectionFromText(cleanedText);

          const matchedSub = classSubjectMap.get(finalSub.toUpperCase());
          const subjectCode = matchedSub?.code || finalSub;
          const subjectName = matchedSub?.name || finalSub;
          const facultyName = matchedSub?.faculty || null;

          allSlots.push({
            classId: explicitClass || classId,
            dayOrder,
            period: p,
            timeRange: DEFAULT_TIMINGS[p] || `Period ${p}`,
            subjectCode,
            subjectName,
            facultyName,
            roomNo: cellRoom || roomNo,
            category: finalSub.toLowerCase().includes("lab") ? "lab1" : "sub1",
            academicYear: options.academicYear || "2026-2027",
            semType: options.semType || "ODD",
          });
        }
      }
    }
  }

  if (allSlots.length === 0) {
    throw new Error(
      "No timetable rows could be parsed from the Word document. Ensure the document contains an individual faculty schedule or standard class schedule matrix."
    );
  }

  const distinctClasses = [...new Set(allSlots.map((s) => s.classId).filter(Boolean) as string[])];
  const distinctFaculty = [...new Set(allSlots.map((s) => s.facultyName).filter(Boolean) as string[])];

  return {
    allSlots,
    faculties: facultiesSummary,
    distinctClasses,
    distinctFaculty,
    isMasterClass: isMasterMode,
    warnings,
  };
}
