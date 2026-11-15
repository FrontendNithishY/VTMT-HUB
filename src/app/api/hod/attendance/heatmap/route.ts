import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = "force-dynamic";

// Universal flexible classId parser for any year, department, and section entered
function parseClassIdentifier(raw: string) {
  if (!raw) return { classId: 'UNKNOWN', year: 'II', department: 'CSE', section: 'A' };
  const str = raw.trim().toUpperCase();

  // Pattern 1: e.g. "2ndyearcseb", "2ndyear-cse-b", "3rdyear_ece_a", "1styear-it-b"
  let m = str.match(/^(I{1,3}|IV|[1-4])(?:ST|ND|RD|TH)?[\s_-]*(?:YEAR)?[\s_-]*([A-Z]+)[\s_-]*([A-Z0-9]+)$/i);
  
  // Pattern 2: e.g. "2CSEB", "IICSEA", "3ECEB", "4MECHA"
  if (!m) m = str.match(/^(I{1,3}|IV|[1-4])(?:ST|ND|RD|TH)?(?:YEAR)?([A-Z]+)([A-Z0-9])$/i);

  // Pattern 3: e.g. "II-CSE-A", "2-CSE-B"
  if (!m) m = str.match(/^([1-4]|I{1,3}|IV)-([A-Z]+)-([A-Z0-9]+)$/i);

  if (m) {
    let yr = m[1].toUpperCase();
    if (yr === '1') yr = 'I';
    else if (yr === '2') yr = 'II';
    else if (yr === '3') yr = 'III';
    else if (yr === '4') yr = 'IV';
    const dept = m[2].toUpperCase();
    const sec = m[3].toUpperCase();
    return {
      classId: `${yr}-${dept}-${sec}`,
      year: yr,
      department: dept,
      section: sec
    };
  }

  return {
    classId: str,
    year: str.includes('I') ? 'I' : 'II',
    department: str.includes('ECE') ? 'ECE' : str.includes('MECH') ? 'MECH' : str.includes('IT') ? 'IT' : 'CSE',
    section: 'A'
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any)?.role !== 'HOD' && (session.user as any)?.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Today's date string YYYY-MM-DD
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Fetch all existing classes across StudentProfile, TimetableEntry, and Attendance
  const [studentProfiles, timetableClasses, distinctAttendanceClasses] = await Promise.all([
    prisma.studentProfile.findMany({
      select: {
        year: true,
        department: true,
        section: true,
      }
    }),
    prisma.timetableEntry.findMany({
      select: { classId: true },
      distinct: ['classId'],
      where: { classId: { not: null } }
    }),
    prisma.attendance.findMany({
      select: { classId: true },
      distinct: ['classId']
    })
  ]);

  const enrolledPerClass: Record<string, number> = {};
  const allKnownClassIds = new Set<string>();

  studentProfiles.forEach(sp => {
    if (sp.year && sp.section) {
      const parsed = parseClassIdentifier(`${sp.year}-${sp.department || 'CSE'}-${sp.section}`);
      enrolledPerClass[parsed.classId] = (enrolledPerClass[parsed.classId] || 0) + 1;
      allKnownClassIds.add(parsed.classId);
    }
  });

  timetableClasses.forEach(tc => {
    if (tc.classId) {
      const parsed = parseClassIdentifier(tc.classId);
      allKnownClassIds.add(parsed.classId);
    }
  });

  distinctAttendanceClasses.forEach(ac => {
    if (ac.classId) {
      const parsed = parseClassIdentifier(ac.classId);
      allKnownClassIds.add(parsed.classId);
    }
  });

  // 2. Fetch Period 1 attendance records strictly for today
  let effectiveDate = todayDateStr;
  let p1Records = await prisma.attendance.findMany({
    where: {
      dateString: todayDateStr,
      period: 1
    },
    select: {
      studentId: true,
      classId: true,
      status: true,
      period: true
    }
  });

  // If today has no records yet (e.g., weekend or early morning before Period 1), fetch latest roll call date
  let isToday = true;
  if (p1Records.length === 0) {
    const latestRec = await prisma.attendance.findFirst({
      where: { period: 1 },
      orderBy: { createdAt: 'desc' },
      select: { dateString: true }
    });
    if (latestRec?.dateString) {
      effectiveDate = latestRec.dateString;
      isToday = effectiveDate === todayDateStr;
      p1Records = await prisma.attendance.findMany({
        where: {
          dateString: effectiveDate,
          period: 1
        },
        select: {
          studentId: true,
          classId: true,
          status: true,
          period: true
        }
      });
    }
  }

  // 3. Aggregate Period 1 attendance by normalized classId
  const classP1Stats: Record<string, { present: number, totalMarked: number, originalClassId: string }> = {};

  p1Records.forEach(rec => {
    const parsed = parseClassIdentifier(rec.classId || "II-CSE-A");
    const cid = parsed.classId;
    if (!classP1Stats[cid]) {
      classP1Stats[cid] = { present: 0, totalMarked: 0, originalClassId: rec.classId };
    }
    classP1Stats[cid].totalMarked++;
    if (rec.status === 'PRESENT' || rec.status === 'ON_DUTY' || rec.status === 'OD') {
      classP1Stats[cid].present++;
    }
  });

  // Combine every existing class in the college across all students, timetables, and attendance
  const allActiveClasses = new Set<string>([
    ...Array.from(allKnownClassIds),
    ...Object.keys(enrolledPerClass),
    ...Object.keys(classP1Stats)
  ]);

  const result = Array.from(allActiveClasses).map(classId => {
    const parsed = parseClassIdentifier(classId);
    const enrolledTotal = enrolledPerClass[classId] || 0;
    const stat = classP1Stats[classId];

    const presentCount = stat ? stat.present : 0;
    const totalMarked = stat ? stat.totalMarked : 0;

    // Use enrolled student count if available, otherwise totalMarked
    const finalTotal = enrolledTotal > 0 ? enrolledTotal : (totalMarked > 0 ? totalMarked : 0);
    const percentage = finalTotal > 0 ? Math.round((presentCount / finalTotal) * 100) : 0;

    return {
      classId: parsed.classId,
      rawClassId: classId,
      year: parsed.year,
      department: parsed.department,
      section: parsed.section,
      presentCount,
      totalCount: finalTotal,
      percentage,
      hasRecords: totalMarked > 0
    };
  });

  // Sort logically by Year (I -> II -> III -> IV), Department, and Section
  const yearWeight: Record<string, number> = { "I": 1, "II": 2, "III": 3, "IV": 4 };
  result.sort((a, b) => {
    const yw = (yearWeight[a.year] || 99) - (yearWeight[b.year] || 99);
    if (yw !== 0) return yw;
    const dw = a.department.localeCompare(b.department);
    if (dw !== 0) return dw;
    return a.section.localeCompare(b.section);
  });

  return NextResponse.json({
    success: true,
    date: effectiveDate,
    isToday,
    period: 1,
    data: result
  });
}
