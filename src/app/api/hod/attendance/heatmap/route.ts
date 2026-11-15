import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any)?.role !== 'HOD' && (session.user as any)?.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine today's date in YYYY-MM-DD
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Fetch all student profiles to identify all active Years & Sections (teams)
  const studentProfiles = await prisma.studentProfile.findMany({
    select: {
      year: true,
      department: true,
      section: true,
    }
  });

  // Standard CSE classes across all 4 years (I to IV) and sections A, B
  const standardClasses = [
    { year: "I", dept: "CSE", section: "A", classId: "I-CSE-A" },
    { year: "I", dept: "CSE", section: "B", classId: "I-CSE-B" },
    { year: "II", dept: "CSE", section: "A", classId: "II-CSE-A" },
    { year: "II", dept: "CSE", section: "B", classId: "II-CSE-B" },
    { year: "III", dept: "CSE", section: "A", classId: "III-CSE-A" },
    { year: "III", dept: "CSE", section: "B", classId: "III-CSE-B" },
    { year: "IV", dept: "CSE", section: "A", classId: "IV-CSE-A" },
    { year: "IV", dept: "CSE", section: "B", classId: "IV-CSE-B" },
  ];

  // Build a set of unique class groups from student profiles, merged with standard classes
  const classMap = new Map<string, { year: string, dept: string, section: string, classId: string }>();

  standardClasses.forEach(c => {
    classMap.set(c.classId, c);
  });

  studentProfiles.forEach(sp => {
    if (sp.year && sp.section) {
      const yr = sp.year.toUpperCase();
      const dept = (sp.department || "CSE").toUpperCase();
      const sec = sp.section.toUpperCase();
      const cid = `${yr}-${dept}-${sec}`;
      classMap.set(cid, { year: yr, dept, section: sec, classId: cid });
    }
  });

  // 2. Fetch today's Period 1 (or today's overall) attendance records from DB
  const todayRecords = await prisma.attendance.findMany({
    where: {
      dateString: todayDateStr,
      period: 1
    },
    select: {
      status: true,
      classId: true,
      period: true
    }
  });

  // If no Period 1 records for today yet, check if any period has attendance today
  let activeTodayRecords = todayRecords;
  if (activeTodayRecords.length === 0) {
    activeTodayRecords = await prisma.attendance.findMany({
      where: { dateString: todayDateStr },
      select: {
        status: true,
        classId: true,
        period: true
      }
    });
  }

  // If still empty (e.g. today is Sunday or holiday), fallback to the latest available attendance date in DB
  let effectiveDate = todayDateStr;
  let effectiveRecords = activeTodayRecords;
  if (effectiveRecords.length === 0) {
    const latestRec = await prisma.attendance.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { dateString: true }
    });
    if (latestRec?.dateString) {
      effectiveDate = latestRec.dateString;
      effectiveRecords = await prisma.attendance.findMany({
        where: { dateString: effectiveDate, period: 1 },
        select: { status: true, classId: true, period: true }
      });
      if (effectiveRecords.length === 0) {
        effectiveRecords = await prisma.attendance.findMany({
          where: { dateString: effectiveDate },
          select: { status: true, classId: true, period: true }
        });
      }
    }
  }

  // Aggregate stats per class
  const classStats: Record<string, { present: number, total: number }> = {};

  effectiveRecords.forEach(rec => {
    const cid = (rec.classId || "II-CSE-A").trim();
    if (!classStats[cid]) {
      classStats[cid] = { present: 0, total: 0 };
    }
    classStats[cid].total++;
    if (rec.status === 'PRESENT' || rec.status === 'ON_DUTY' || rec.status === 'OD') {
      classStats[cid].present++;
    }
  });

  // Construct complete list of classes across all years and sections
  const result = Array.from(classMap.values()).map(c => {
    const stat = classStats[c.classId];
    let percentage = 0;
    let presentCount = 0;
    let totalCount = 0;

    if (stat && stat.total > 0) {
      presentCount = stat.present;
      totalCount = stat.total;
      percentage = Math.round((stat.present / stat.total) * 100);
    }

    return {
      classId: c.classId,
      year: c.year,
      department: c.dept,
      section: c.section,
      percentage,
      presentCount,
      totalCount,
      hasRecords: !!stat && stat.total > 0
    };
  });

  // Sort by Year (I -> II -> III -> IV) and Section (A -> B)
  const yearWeight: Record<string, number> = { "I": 1, "II": 2, "III": 3, "IV": 4 };
  result.sort((a, b) => {
    const yw = (yearWeight[a.year] || 99) - (yearWeight[b.year] || 99);
    if (yw !== 0) return yw;
    return a.section.localeCompare(b.section);
  });

  return NextResponse.json({
    success: true,
    date: effectiveDate,
    isToday: effectiveDate === todayDateStr,
    data: result
  });
}
