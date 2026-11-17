import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const DAYS = ['I', 'II', 'III', 'IV', 'V'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const DEFAULT_TIMINGS: Record<number, string> = {
  1: '08:05 - 08:55',
  2: '08:55 - 09:45',
  3: '10:00 - 10:50',
  4: '10:50 - 11:40',
  5: '12:20 - 01:05',
  6: '01:05 - 01:50',
  7: '02:00 - 02:45',
  8: '02:45 - 03:30',
};

// Course code to likely target class year map based on Vel Tech CSE curriculum
function inferClassFromCourseCode(courseCode: string): string {
  const code = courseCode.toUpperCase().replace(/\s+/g, '');
  if (code.includes('CS11') || code.includes('111') || code.includes('11A')) return 'I-CSE-A';
  if (code.includes('CS32') || code.includes('CS33') || code.includes('321') || code.includes('322') || code.includes('323') || code.includes('324') || code.includes('325') || code.includes('32A') || code.includes('32B') || code.includes('32C')) return 'II-CSE-A';
  if (code.includes('CS52') || code.includes('IT52') || code.includes('MC56') || code.includes('521') || code.includes('522') || code.includes('52A') || code.includes('52B')) return 'III-CSE-A';
  if (code.includes('CB72') || code.includes('HS70') || code.includes('C7S7') || code.includes('CSV4') || code.includes('721') || code.includes('701') || code.includes('7S7')) return 'IV-CSE-A';
  return 'II-CSE-A';
}

// Split multi-course cell (lines, commas or regex)
function parseCoursesFromCell(cellText: string): { code: string; name: string }[] {
  if (!cellText || typeof cellText !== 'string') return [];
  const lines = cellText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const results: { code: string; name: string }[] = [];

  for (const line of lines) {
    // Regex for: 231CS52B- Embedded Systems and IoT Laboratory OR 231CSV46 -Network Security OR 231CB721Software Project Management
    const match = line.match(/^([0-9]{2,3}[A-Z0-9]+)\s*[-:]*\s*(.*)$/i);
    if (match) {
      const code = match[1].trim();
      const name = match[2]?.trim() || code;
      results.push({ code, name });
    } else {
      // Just text without clear code
      results.push({ code: line, name: line });
    }
  }
  return results;
}

interface ExtractedAllocationRow {
  facultyName: string;
  vmsNo?: string;
  department?: string;
  subjectCode: string;
  subjectName?: string;
  targetClass: string;
  periodsPerWeek: number;
  isLab: boolean;
  roomNo?: string;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const contentType = request.headers.get('content-type') || '';
    let allocations: ExtractedAllocationRow[] = [];
    let writeStrategy: 'replace' | 'append' = 'replace';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      allocations = body.allocations || [];
      if (body.writeStrategy === 'append') writeStrategy = 'append';
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const strategy = formData.get('writeStrategy') as string | null;
      if (strategy === 'append') writeStrategy = 'append';

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No Excel file was uploaded' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawAoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Find header row (looks for "Faculty Name" or "Theory" or "Subject Allotted")
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawAoa.length, 15); i++) {
        const rowStr = rawAoa[i].map((c) => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('faculty') || rowStr.includes('theory') || rowStr.includes('subject allotted') || rowStr.includes('mts')) {
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

      const mtsCol = findCol('mts', 'staff id', 'emp id');
      const facultyCol = findCol('faculty name', 'faculty', 'teacher');
      const theoryCol = findCol('theory', 'subject allotted', 'subject code', 'course');
      const practicalCol = findCol('practical', 'lab');
      const classCol = findCol('class', 'target class', 'section');

      // Loop data rows
      for (let r = headerRowIndex + 1; r < rawAoa.length; r++) {
        const row = rawAoa[r];
        if (!row || row.length === 0) continue;

        const facultyRaw = facultyCol !== -1 ? String(row[facultyCol]).trim() : '';
        const mtsRaw = mtsCol !== -1 ? String(row[mtsCol]).trim() : '';
        const theoryRaw = theoryCol !== -1 ? String(row[theoryCol]).trim() : '';
        const practicalRaw = practicalCol !== -1 ? String(row[practicalCol]).trim() : '';
        const classRaw = classCol !== -1 ? String(row[classCol]).trim() : '';

        // Clean faculty name (e.g. "Dr. R Saravanan, Ph.D" -> "Dr. R Saravanan")
        const facultyName = facultyRaw.replace(/,\s*ph\.?d/i, '').trim();
        if (!facultyName && !theoryRaw && !practicalRaw) continue;

        // 1. Process Theory courses
        if (theoryRaw) {
          const courses = parseCoursesFromCell(theoryRaw);
          courses.forEach((c) => {
            const targetClass = classRaw || inferClassFromCourseCode(c.code);
            allocations.push({
              facultyName: facultyName || 'Faculty Member',
              vmsNo: mtsRaw,
              department: 'CSE',
              subjectCode: c.code,
              subjectName: c.name,
              targetClass,
              periodsPerWeek: 5,
              isLab: false,
              roomNo: 'LH-201',
            });
          });
        }

        // 2. Process Practical / Lab courses
        if (practicalRaw) {
          const labs = parseCoursesFromCell(practicalRaw);
          labs.forEach((l) => {
            const targetClass = classRaw || inferClassFromCourseCode(l.code);
            allocations.push({
              facultyName: facultyName || 'Faculty Member',
              vmsNo: mtsRaw,
              department: 'CSE',
              subjectCode: l.code,
              subjectName: l.name,
              targetClass,
              periodsPerWeek: 3,
              isLab: true,
              roomNo: 'CS-LAB-1',
            });
          });
        }
      }
    }

    if (allocations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid faculty-subject allocation rows found in spreadsheet.' },
        { status: 400 }
      );
    }

    // 2. Identify all distinct target classes
    const targetClasses = Array.from(new Set(allocations.map((a) => a.targetClass.toUpperCase())));

    // 3. Prepare generation engine:
    const teacherBusy = new Map<string, Map<string, string>>();
    const markBusy = (teacherName: string, day: string, period: number, classId: string) => {
      const names = teacherName.split(/[,/]+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
      names.forEach((t) => {
        if (!teacherBusy.has(t)) teacherBusy.set(t, new Map());
        teacherBusy.get(t)!.set(`${day}-${period}`, classId);
      });
    };
    const isTeacherAvailable = (teacherName: string, day: string, period: number) => {
      if (!teacherName || !teacherName.trim()) return true;
      const names = teacherName.split(/[,/]+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
      return names.every((t) => {
        const map = teacherBusy.get(t);
        return !map || !map.has(`${day}-${period}`);
      });
    };

    // If replace mode, delete existing entries for these targeted classes
    if (writeStrategy === 'replace') {
      await prisma.timetableEntry.deleteMany({
        where: {
          classId: { in: targetClasses },
        },
      });
    }

    const generatedSlots: any[] = [];
    let totalAssignedPeriods = 0;

    // 4. Generate schedule class by class
    for (const classId of targetClasses) {
      const classAllocations = allocations.filter((a) => a.targetClass.toUpperCase() === classId);
      const grid: Record<string, Record<number, any>> = {};
      DAYS.forEach((d) => {
        grid[d] = {};
      });

      // A. Reserve standard institution periods
      grid['V'][7] = {
        subjectCode: 'SPORTS',
        subjectName: 'Physical Education / Sports',
        facultyName: 'Physical Director',
        roomNo: 'Grounds',
        category: 'sports',
      };
      grid['V'][8] = {
        subjectCode: 'SPORTS',
        subjectName: 'Physical Education / Sports',
        facultyName: 'Physical Director',
        roomNo: 'Grounds',
        category: 'sports',
      };

      grid['III'][8] = {
        subjectCode: 'LIB',
        subjectName: 'Library & Digital Knowledge Resource',
        facultyName: 'Librarian',
        roomNo: 'Central Library',
        category: 'library',
      };

      // B. Place Labs First
      const labs = classAllocations.filter((a) => a.isLab);
      const labBlocks = [
        { day: 'I', start: 6, end: 8 },
        { day: 'II', start: 6, end: 8 },
        { day: 'III', start: 5, end: 7 },
        { day: 'IV', start: 6, end: 8 },
      ];

      labs.forEach((lab, idx) => {
        const block = labBlocks[idx % labBlocks.length];
        if (block) {
          const canFit = Array.from(
            { length: block.end - block.start + 1 },
            (_, i) => block.start + i
          ).every((p) => !grid[block.day][p] && isTeacherAvailable(lab.facultyName, block.day, p));

          if (canFit) {
            for (let p = block.start; p <= block.end; p++) {
              grid[block.day][p] = {
                subjectCode: lab.subjectCode,
                subjectName: lab.subjectName,
                facultyName: lab.facultyName,
                roomNo: lab.roomNo || 'CS-LAB-1',
                category: 'lab',
              };
              markBusy(lab.facultyName, block.day, p, classId);
              totalAssignedPeriods++;
            }
          }
        }
      });

      // C. Place Theory Subjects Across Remaining Slots
      const theories = classAllocations.filter((a) => !a.isLab);
      const subjectQueue: ExtractedAllocationRow[] = [];
      theories.forEach((t) => {
        const count = Math.max(1, Math.min(6, t.periodsPerWeek || 5));
        for (let i = 0; i < count; i++) {
          subjectQueue.push(t);
        }
      });

      subjectQueue.sort(() => Math.random() - 0.5);

      for (const day of DAYS) {
        for (const period of PERIODS) {
          if (grid[day][period]) continue;

          const candIndex = subjectQueue.findIndex((cand) => {
            const countToday = Object.values(grid[day]).filter(
              (s: any) => s && s.subjectCode === cand.subjectCode
            ).length;
            if (countToday >= 2) return false;
            const prevSlot = grid[day][period - 1];
            if (prevSlot && prevSlot.subjectCode === cand.subjectCode) return false;
            return isTeacherAvailable(cand.facultyName, day, period);
          });

          if (candIndex !== -1) {
            const chosen = subjectQueue.splice(candIndex, 1)[0];
            grid[day][period] = {
              subjectCode: chosen.subjectCode,
              subjectName: chosen.subjectName,
              facultyName: chosen.facultyName,
              roomNo: chosen.roomNo || 'LH-201',
              category: 'theory',
            };
            markBusy(chosen.facultyName, day, period, classId);
            totalAssignedPeriods++;
          }
        }
      }

      for (const day of DAYS) {
        for (const period of PERIODS) {
          const slot = grid[day][period];
          if (slot) {
            generatedSlots.push({
              classId,
              dayOrder: day,
              period,
              timeRange: DEFAULT_TIMINGS[period] || '08:05 - 08:55',
              subjectCode: slot.subjectCode,
              subjectName: slot.subjectName,
              facultyName: slot.facultyName,
              roomNo: slot.roomNo,
              category: slot.category,
              semType: 'ODD',
            });
          }
        }
      }
    }

    // 5. Batch insert generated slots into database
    await prisma.timetableEntry.createMany({
      data: generatedSlots,
      skipDuplicates: true,
    });

    // 6. Update Faculty Profiles
    try {
      const allFacultyProfiles = await prisma.facultyProfile.findMany();
      for (const a of allocations) {
        if (!a.facultyName) continue;
        const names = a.facultyName.split(/[,/]+/).map((n) => n.trim().toLowerCase());
        const matched = allFacultyProfiles.find((fp) => {
          const fpUser = (fp as any).user?.name?.toLowerCase() || '';
          return names.some((n) => fpUser.includes(n) || n.includes(fpUser));
        });

        if (matched) {
          if (a.isLab && !matched.lab1) {
            await prisma.facultyProfile.update({
              where: { vmNo: matched.vmNo },
              data: { lab1: `${a.subjectCode} ${a.subjectName || ''}`.trim() },
            });
          } else if (!a.isLab && !matched.subject1) {
            await prisma.facultyProfile.update({
              where: { vmNo: matched.vmNo },
              data: { subject1: `${a.subjectCode} ${a.subjectName || ''}`.trim() },
            });
          }
        }
      }
    } catch (profErr) {
      console.warn('Non-blocking faculty profile sync warning:', profErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated conflict-free timetables for ${targetClasses.length} classes across ${totalAssignedPeriods} total periods.`,
      classesCount: targetClasses.length,
      classes: targetClasses,
      totalSlots: generatedSlots.length,
      sampleSlots: generatedSlots.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Error generating batch timetables from Excel allocation:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate timetables from Excel.' },
      { status: 500 }
    );
  }
}
