import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'section_matrix'; // 'section_matrix' (default) or 'workload'

    const wb = XLSX.utils.book_new();

    if (format === 'section_matrix') {
      // 1. Template: DEPT | SEMESTER | SUBJECT CODE | SUBJECT NAME | SEC A | SEC B | SEC C
      const headers = ['DEPT', 'SEMESTER', 'SUBJECT CODE', 'SUBJECT NAME', 'SEC A', 'SEC B', 'SEC C'];

      // Sample rows matching Vel Tech Multi Tech CSE curriculum
      const sampleRows = [
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS321',
          'SUBJECT NAME': 'Data Structures',
          'SEC A': 'Dr. E Mercy Beulah',
          'SEC B': 'Mrs A Vinothini',
          'SEC C': 'Mrs D Parkavi',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS322',
          'SUBJECT NAME': 'Digital Principles and Computer Organization',
          'SEC A': 'Mr P Sathishkumar',
          'SEC B': 'Mrs R Kokila priya',
          'SEC C': 'Mr P Sathishkumar',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS323',
          'SUBJECT NAME': 'Object Oriented Programming',
          'SEC A': 'Dr V Nehru',
          'SEC B': 'Mrs.Harini',
          'SEC C': 'Ms.Sandhya Sri',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS324',
          'SUBJECT NAME': 'Operating Systems',
          'SEC A': 'Mr C Pandi',
          'SEC B': 'Mrs J Bebitha',
          'SEC C': 'Ms.Alfia',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS325',
          'SUBJECT NAME': 'Software Engineering',
          'SEC A': 'Mrs D Parkavi',
          'SEC B': 'Mrs V Divya',
          'SEC C': 'Ms.Yerrukkamma',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS32A',
          'SUBJECT NAME': 'Data Structures and Algorithms Laboratory',
          'SEC A': 'Dr. E Mercy Beulah',
          'SEC B': 'Mrs V Lavanya',
          'SEC C': 'Mrs K Dhanalakshmi',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS32B',
          'SUBJECT NAME': 'Object Oriented Programming Laboratory',
          'SEC A': 'Dr V Nehru',
          'SEC B': 'Mrs.Harini',
          'SEC C': 'Ms.Sandhya Sri',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 3,
          'SUBJECT CODE': '231CS32C',
          'SUBJECT NAME': 'Operating Systems Laboratory',
          'SEC A': 'Dr.R.Vijay',
          'SEC B': 'Mrs J Bebitha',
          'SEC C': 'Ms.Alfia',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 5,
          'SUBJECT CODE': '231CS521',
          'SUBJECT NAME': 'Compiler Design',
          'SEC A': 'Mrs V Vijayashanthi',
          'SEC B': 'Mrs V Divya',
          'SEC C': 'Ms.Chandra',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 5,
          'SUBJECT CODE': '231CS522',
          'SUBJECT NAME': 'Embedded Systems and IoT',
          'SEC A': 'Dr. R Saravanan, Ph.D',
          'SEC B': 'Dr V Nehru',
          'SEC C': 'Mrs M.Aswin Rani',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 5,
          'SUBJECT CODE': '231IT521',
          'SUBJECT NAME': 'Artificial Intelligence and Machine Learning',
          'SEC A': 'Dr. Muthu Kannan, Ph.D',
          'SEC B': 'Mrs.Harini',
          'SEC C': 'Mrs R Kokila priya',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 5,
          'SUBJECT CODE': '231CS52A',
          'SUBJECT NAME': 'Compiler Design Laboratory',
          'SEC A': 'Mrs V Vijayashanthi',
          'SEC B': 'Mrs V Divya',
          'SEC C': 'Ms.Chandra',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 5,
          'SUBJECT CODE': '231CS52B',
          'SUBJECT NAME': 'Embedded Systems and IoT Laboratory',
          'SEC A': 'Dr. R Saravanan, Ph.D',
          'SEC B': 'Dr V Nehru',
          'SEC C': 'Mrs M.Aswin Rani',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 7,
          'SUBJECT CODE': '231CB721',
          'SUBJECT NAME': 'Software Project Management',
          'SEC A': 'Dr. M Victor Jose, Ph.D',
          'SEC B': 'Dr. E Mercy Beulah',
          'SEC C': 'Mrs.Geetha',
        },
        {
          DEPT: 'CSE',
          SEMESTER: 7,
          'SUBJECT CODE': '231HS701',
          'SUBJECT NAME': 'Professional Ethics and Human Values',
          'SEC A': 'Dr.M.Buvana, Ph.D',
          'SEC B': 'Mrs M.Aswin Rani',
          'SEC C': 'Mrs J Bebitha',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });

      ws['!cols'] = [
        { wch: 10 }, // DEPT
        { wch: 12 }, // SEMESTER
        { wch: 18 }, // SUBJECT CODE
        { wch: 42 }, // SUBJECT NAME
        { wch: 28 }, // SEC A
        { wch: 28 }, // SEC B
        { wch: 28 }, // SEC C
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Section_Allocation');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Teacher_Subject_Allocation_Template.xlsx"',
      },
    });
  } catch (err: any) {
    console.error('Error generating template:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
