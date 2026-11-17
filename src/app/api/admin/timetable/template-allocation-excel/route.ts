import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch current active faculty from database for reference
    const facultyUsers = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: {
        name: true,
        email: true,
        vmNo: true,
        facultyProfile: {
          select: {
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch current catalog courses for reference
    const catalogSubjects = await prisma.subject.findMany({
      select: {
        code: true,
        name: true,
        departmentCode: true,
        semester: true,
        credits: true,
      },
      orderBy: [{ semester: 'asc' }, { code: 'asc' }],
    });

    // 3. Sheet 1: Sample Allocation Template Rows
    const allocationTemplateData = [
      {
        "Faculty Name": "Dr. R. Saravanan",
        "MTS No": "1944",
        "Department": "CSE",
        "Subject Code": "CS3351",
        "Subject Name": "Digital Principles & System Design",
        "Target Class(es)": "II-CSE-A",
        "Periods Per Week": 5,
        "Is Lab (Yes/No)": "No",
        "Room No": "LH-201",
      },
      {
        "Faculty Name": "Ms. V. Vijayashanthi",
        "MTS No": "1950",
        "Department": "CSE",
        "Subject Code": "CS3352",
        "Subject Name": "Foundations of Data Science",
        "Target Class(es)": "II-CSE-A",
        "Periods Per Week": 5,
        "Is Lab (Yes/No)": "No",
        "Room No": "LH-201",
      },
      {
        "Faculty Name": "Dr.Insozhan.N",
        "MTS No": "1069",
        "Department": "CSE",
        "Subject Code": "CS3391",
        "Subject Name": "Object Oriented Programming",
        "Target Class(es)": "II-CSE-A",
        "Periods Per Week": 5,
        "Is Lab (Yes/No)": "No",
        "Room No": "LH-201",
      },
      {
        "Faculty Name": "Dr Victor Jose M",
        "MTS No": "2014",
        "Department": "CSE",
        "Subject Code": "CS3701",
        "Subject Name": "Software Project Management",
        "Target Class(es)": "IV-CSE-A",
        "Periods Per Week": 5,
        "Is Lab (Yes/No)": "No",
        "Room No": "LH-201",
      },
      {
        "Faculty Name": "Dr Muthukannan K",
        "MTS No": "2236",
        "Department": "CSE",
        "Subject Code": "CS3591",
        "Subject Name": "Computer Networks",
        "Target Class(es)": "III-CSE-A",
        "Periods Per Week": 5,
        "Is Lab (Yes/No)": "No",
        "Room No": "LH-202",
      },
      {
        "Faculty Name": "Dr.Insozhan.N, Mr Vinod S",
        "MTS No": "1069, 948",
        "Department": "CSE",
        "Subject Code": "CS3361",
        "Subject Name": "Data Science Laboratory",
        "Target Class(es)": "II-CSE-A",
        "Periods Per Week": 3,
        "Is Lab (Yes/No)": "Yes",
        "Room No": "CS-LAB-1",
      },
    ];

    // 4. Sheet 2: Faculty Roster Reference
    const facultyRosterData = facultyUsers.map((f) => ({
      "Faculty Name": f.name,
      "MTS / Staff ID": f.vmNo || f.email.split('@')[0],
      "Department": f.facultyProfile?.department || "CSE",
      "Designation": f.facultyProfile?.designation || "Faculty",
      "Email Address": f.email,
    }));

    // 5. Sheet 3: Course Catalog Reference
    const courseCatalogData = catalogSubjects.map((c) => ({
      "Subject Code": c.code,
      "Subject Name": c.name,
      "Department": c.departmentCode,
      "Semester": c.semester,
      "Default Credits": c.credits,
    }));

    // Build workbook
    const wb = XLSX.utils.book_new();

    const wsAllocation = XLSX.utils.json_to_sheet(allocationTemplateData);
    const wsFaculty = XLSX.utils.json_to_sheet(facultyRosterData);
    const wsCourses = XLSX.utils.json_to_sheet(courseCatalogData);

    // Set column widths for readability
    wsAllocation['!cols'] = [
      { wch: 24 }, // Faculty Name
      { wch: 14 }, // MTS No
      { wch: 12 }, // Department
      { wch: 16 }, // Subject Code
      { wch: 34 }, // Subject Name
      { wch: 18 }, // Target Class(es)
      { wch: 18 }, // Periods Per Week
      { wch: 16 }, // Is Lab
      { wch: 14 }, // Room No
    ];

    wsFaculty['!cols'] = [
      { wch: 26 },
      { wch: 16 },
      { wch: 14 },
      { wch: 24 },
      { wch: 32 },
    ];

    wsCourses['!cols'] = [
      { wch: 16 },
      { wch: 36 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, wsAllocation, 'Faculty_Allocation');
    XLSX.utils.book_append_sheet(wb, wsFaculty, 'Faculty_Reference');
    XLSX.utils.book_append_sheet(wb, wsCourses, 'Active_Courses');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Faculty_Timetable_Allocation_Template.xlsx"',
      },
    });
  } catch (err: any) {
    console.error('Error generating allocation template:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate allocation template' },
      { status: 500 }
    );
  }
}

