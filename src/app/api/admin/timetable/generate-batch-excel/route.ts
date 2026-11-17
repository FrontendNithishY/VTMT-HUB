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

    // 1. Support direct JSON payload OR multipart Excel upload
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
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const cell = (r: any, ...keys: string[]) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
            return String(r[k]).trim();
          }
        }
        for (const actualKey of Object.keys(r)) {
          const cleanKey = actualKey.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const k of keys) {
            const cleanTarget = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanKey === cleanTarget && String(r[actualKey]).trim() !== '') {
              return String(r[actualKey]).trim();
            }
          }
        }
        return '';
      };

      rawRows.forEach((row) => {
        const facultyName = cell(row, 'Faculty Name', 'Faculty', 'Teacher Name', 'Teacher', 'Staff');
        const vmsNo = cell(row, 'MTS No', 'MTS', 'Staff ID', 'VMS No', 'Emp ID');
        const department = cell(row, 'Department', 'Dept', 'Branch');
        const subjectCode = cell(row, 'Subject Code', 'Course Code', 'Code', 'Sub Code');
        const subjectName = cell(row, 'Subject Name', 'Course Name', 'Subject');
        const targetClassRaw = cell(row, 'Target Class(es)', 'Target Class', 'Class ID', 'Class', 'Section');
        const rawPeriods = cell(row, 'Periods Per Week', 'Periods/Week', 'Periods', 'Hours');
        const rawLab = cell(row, 'Is Lab (Yes/No)', 'Is Lab', 'Lab', 'Practical').toLowerCase();
        const roomNo = cell(row, 'Room No', 'Room', 'Hall');

        if (!subjectCode && !subjectName) return;

        // Split multi-target classes (e.g. "II-CSE-A, II-CSE-B" or "II-CSE-A")
        const targetClasses = (targetClassRaw || 'II-CSE-A')
          .split(/[,;/]+/)
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean);

        const periodsPerWeek = parseInt(rawPeriods) || 5;
        const isLab = Boolean(rawLab.startsWith('y') || rawLab === '1' || rawLab === 'true' || subjectCode.toLowerCase().includes('lab') || (subjectName && subjectName.toLowerCase().includes('lab')));

        targetClasses.forEach((tClass) => {
          allocations.push({
            facultyName,
            vmsNo,
            department: department || 'CSE',
            subjectCode: subjectCode || subjectName,
            subjectName: subjectName || subjectCode,
            targetClass: tClass,
            periodsPerWeek,
            isLab,
            roomNo: roomNo || (isLab ? 'CS-LAB-1' : 'LH-201'),
          });
        });
      });
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
    // Global tracking: (teacherKey) -> Map<`${day}-${period}`, classId>
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
      // Day Order V, Periods 7-8: Sports
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

      // Day Order III, Period 8: Library
      grid['III'][8] = {
        subjectCode: 'LIB',
        subjectName: 'Library & Digital Knowledge Resource',
        facultyName: 'Librarian',
        roomNo: 'Central Library',
        category: 'library',
      };

      // B. Place Labs First (they require contiguous 2 or 3-period blocks)
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
      // Expand theory subject queue based on periodsPerWeek
      const subjectQueue: ExtractedAllocationRow[] = [];
      theories.forEach((t) => {
        const count = Math.max(1, Math.min(6, t.periodsPerWeek || 5));
        for (let i = 0; i < count; i++) {
          subjectQueue.push(t);
        }
      });

      // Shuffle subject queue for organic distribution
      subjectQueue.sort(() => Math.random() - 0.5);

      // Iterate days & periods to fill empty slots
      for (const day of DAYS) {
        for (const period of PERIODS) {
          if (grid[day][period]) continue; // already filled

          // Find candidate from queue that hasn't appeared twice today and teacher is free
          const candIndex = subjectQueue.findIndex((cand) => {
            // Count periods of this subject today
            const countToday = Object.values(grid[day]).filter(
              (s: any) => s && s.subjectCode === cand.subjectCode
            ).length;
            if (countToday >= 2) return false;
            // Prevent consecutive same subject
            const prevSlot = grid[day][period - 1];
            if (prevSlot && prevSlot.subjectCode === cand.subjectCode) return false;
            // Check teacher availability
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

      // Collect slots to write to DB
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

    // 6. Update Faculty Profiles with their assigned subjects and labs
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

