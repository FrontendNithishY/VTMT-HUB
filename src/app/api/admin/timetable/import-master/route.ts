import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { key, entries } = await request.json();
    if (key !== 'vtmt-import-master-odd-2026') {
      return NextResponse.json({ success: false, error: 'Unauthorized key' }, { status: 403 });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ success: false, error: 'No entries provided' }, { status: 400 });
    }

    const classIds = [...new Set(entries.map((e: any) => e.classId))];

    // Clear existing records for these target classes
    const deleted = await prisma.timetableEntry.deleteMany({
      where: { classId: { in: classIds } }
    });

    // Batch insert
    const inserted = await prisma.timetableEntry.createMany({
      data: entries.map((e: any) => ({
        classId: e.classId,
        dayOrder: e.dayOrder,
        period: e.period,
        timeRange: e.timeRange || `Period ${e.period}`,
        subjectCode: e.subjectCode || null,
        subjectName: e.subjectName || null,
        facultyName: e.facultyName || null,
        roomNo: e.roomNo || null,
        category: e.category || 'sub1',
        academicYear: e.academicYear || '2026-2027',
        semType: e.semType || 'ODD',
      }))
    });

    return NextResponse.json({
      success: true,
      cleared: deleted.count,
      inserted: inserted.count,
      classIds
    });
  } catch (error: any) {
    console.error('Master timetable import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

