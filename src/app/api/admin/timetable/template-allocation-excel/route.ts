import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Official Vel Tech Multi Tech Department of CSE Workload Template
    const headers = [
      'S. No.',
      'MTS No.',
      'Faculty Name and Qualification',
      'Designation',
      'Theory',
      'Practical',
      'Additional Responsibilities 1',
      'Additional Responsibilities 2',
    ];

    const sampleWorkloadRows = [
      {
        'S. No.': 1,
        'MTS No.': '1944',
        'Faculty Name and Qualification': 'Dr. R Saravanan, Ph.D',
        'Designation': 'Professor & Head',
        'Theory': '231CS52B- Embedded Systems and IoT Laboratory',
        'Practical': '',
        'Additional Responsibilities 1': 'TEACHING AND OVERALL ADMINISTRATION',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 2,
        'MTS No.': '2014',
        'Faculty Name and Qualification': 'Dr. M Victor Jose, Ph.D',
        'Designation': 'Professor',
        'Theory': '231CSV46 -Network Security\n231CB721Software Project Management',
        'Practical': '231MC56A Standards for Engineering',
        'Additional Responsibilities 1': 'Research Coordinator',
        'Additional Responsibilities 2': 'Department Hackathon coordinator',
      },
      {
        'S. No.': 3,
        'MTS No.': '2315',
        'Faculty Name and Qualification': 'Dr. M.Swaminathan',
        'Designation': 'Professor',
        'Theory': '231ITV51- AI in Media Communication\nEngineering Secure Software Systems (H)',
        'Practical': '231C7S7A Project Phase -I',
        'Additional Responsibilities 1': 'Department Autonomous Coordinator BOS',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 4,
        'MTS No.': '2236',
        'Faculty Name and Qualification': 'Dr. Muthu Kannan, Ph.D',
        'Designation': 'Associate Professor',
        'Theory': '231ECV22 - Computer Vision\n231IT521- Artificial Intelligence and Machine Learning - Lab Integrated',
        'Practical': '231MC56A Standards for Engineering',
        'Additional Responsibilities 1': 'CSE Association & Symposium',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 5,
        'MTS No.': '2224',
        'Faculty Name and Qualification': 'Dr.M.Buvana, Ph.D',
        'Designation': 'Associate Professor',
        'Theory': '231HS701 Professional Ethics and Human Values\n231CSV44  Ethical Hacking',
        'Practical': '231C7S7A Project Phase -I',
        'Additional Responsibilities 1': 'FDP, Feedback, Publication and Patent File',
        'Additional Responsibilities 2': 'PhD Pursuing &External PhD Scholar Details',
      },
      {
        'S. No.': 6,
        'MTS No.': '2103',
        'Faculty Name and Qualification': 'Dr. E Mercy Beulah',
        'Designation': 'Assistant Professor',
        'Theory': '231CS321   Data Structures\n231CB721Software Project Management',
        'Practical': '231CS32A Data Structures Laboratory',
        'Additional Responsibilities 1': 'IIC Coordinator, SIH, TNSCST, FAER',
        'Additional Responsibilities 2': 'Timetable I/c',
      },
      {
        'S. No.': 7,
        'MTS No.': '2317',
        'Faculty Name and Qualification': 'Dr.R.Vijay',
        'Designation': 'Assistant Professor',
        'Theory': '231CBV73  Entrepreneurship Development\n231CS111 PROGRAMMING IN C',
        'Practical': '231CS32C Operating Systems Laboratory\n231CS11A  PROGRAMMING IN C Lab',
        'Additional Responsibilities 1': '',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 8,
        'MTS No.': '948',
        'Faculty Name and Qualification': 'Mr S Vinod',
        'Designation': 'Assistant Professor',
        'Theory': '231CSV33  Data Warehousing  (H)',
        'Practical': '231C7S7A Project Phase –I',
        'Additional Responsibilities 1': 'Training and Placement Coordinator',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 9,
        'MTS No.': '1069',
        'Faculty Name and Qualification': 'Dr. N Insozhan',
        'Designation': 'Assistant Professor',
        'Theory': '231ITV64  -Software Testing and Automation\n231CSV32   Cloud Service Management (H)',
        'Practical': '',
        'Additional Responsibilities 1': 'Faculty File- AU & NBA, Scholarship',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 10,
        'MTS No.': '1651',
        'Faculty Name and Qualification': 'Mr P Sathishkumar',
        'Designation': 'Assistant Professor',
        'Theory': '231CS322  - Digital Principles and Computer Organization(Lab Integrated)',
        'Practical': '',
        'Additional Responsibilities 1': 'Student Admission (Office)',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 11,
        'MTS No.': '1853',
        'Faculty Name and Qualification': 'Dr V Nehru',
        'Designation': 'Assistant Professor',
        'Theory': '231CS323 Object Oriented Programming\n231CS522- Embedded Systems and  IoT',
        'Practical': '231CS52B ESIoT Laboratory\n231CS32B  Object Oriented Programming  Laboratory',
        'Additional Responsibilities 1': 'Value Added Course',
        'Additional Responsibilities 2': 'Lab Incharge, Classroom Maintenance',
      },
      {
        'S. No.': 12,
        'MTS No.': '1947',
        'Faculty Name and Qualification': 'Mrs A Vinothini',
        'Designation': 'Assistant Professor',
        'Theory': '231CS321   Data Structures\n231ITV57 - Visual Effects',
        'Practical': '231CS32A Data Structures Laboratory',
        'Additional Responsibilities 1': 'Alumni Coordinator',
        'Additional Responsibilities 2': 'Seminar, Course file',
      },
      {
        'S. No.': 13,
        'MTS No.': '1948',
        'Faculty Name and Qualification': 'Mrs D Parkavi',
        'Designation': 'Assistant Professor',
        'Theory': '231CS321   Data Structures\n231CS325  Software Engineering',
        'Practical': '231CS32A Data Structures Laboratory',
        'Additional Responsibilities 1': 'Store I/c, Faculty Participation',
        'Additional Responsibilities 2': 'PHD Pursuing &External PHD Scholar Details',
      },
      {
        'S. No.': 14,
        'MTS No.': '1950',
        'Faculty Name and Qualification': 'Mrs V Vijayashanthi',
        'Designation': 'Assistant Professor',
        'Theory': '231CS521 COMPILER DESIGN\n231CSV42  Digital and Mobile Forensics (H)',
        'Practical': '231CS52A Compiler Design Laboratory',
        'Additional Responsibilities 1': 'Expert Lecture I/C, Women Grievance Cell',
        'Additional Responsibilities 2': 'Academic Audit, Discipline Coordinator',
      },
      {
        'S. No.': 15,
        'MTS No.': '1958',
        'Faculty Name and Qualification': 'Mrs.Harini',
        'Designation': 'Assistant Professor',
        'Theory': '231IT521 Artificial Intelligence and Machine Learning\n231CS323 Object Oriented Programming',
        'Practical': '231CS32B  Object Oriented Programming  Laboratory',
        'Additional Responsibilities 1': 'IQAC Coordinator',
        'Additional Responsibilities 2': 'Feedback',
      },
      {
        'S. No.': 16,
        'MTS No.': '2000',
        'Faculty Name and Qualification': 'Mrs V Divya',
        'Designation': 'Assistant Professor',
        'Theory': '231CS325  Software Engineering\n231CS521 COMPILER DESIGN',
        'Practical': '231CS52A Compiler Design Laboratory',
        'Additional Responsibilities 1': 'BIS',
        'Additional Responsibilities 2': 'Attendance',
      },
      {
        'S. No.': 17,
        'MTS No.': '2002',
        'Faculty Name and Qualification': 'Mr C Pandi',
        'Designation': 'Assistant Professor',
        'Theory': '231CS324  Operating Systems',
        'Practical': '',
        'Additional Responsibilities 1': 'Office  (IQAC)',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 18,
        'MTS No.': '2003',
        'Faculty Name and Qualification': 'Mrs S Vaitheeshwari',
        'Designation': 'Assistant Professor',
        'Theory': '231ITV66- Web application Security\n231CBV87 Social Text and Media Analytics',
        'Practical': '',
        'Additional Responsibilities 1': 'NPTEL Participation  Result Analysis',
        'Additional Responsibilities 2': 'Students Competition Certificate',
      },
      {
        'S. No.': 19,
        'MTS No.': '2016',
        'Faculty Name and Qualification': 'Mrs V Lavanya',
        'Designation': 'Assistant Professor',
        'Theory': '231CS321   Data Structures\n231ECV43 - Industrial IoT & Industry 4.0',
        'Practical': '231CS32A Data Structures and Algorithms Laboratory',
        'Additional Responsibilities 1': 'Faculty File-AU&NBA',
        'Additional Responsibilities 2': 'Time Table  Social Awareness Program Incharge',
      },
      {
        'S. No.': 20,
        'MTS No.': '2017',
        'Faculty Name and Qualification': 'Mrs K Dhanalakshmi',
        'Designation': 'Assistant Professor',
        'Theory': '231CS321   Data Structures\n231CSV47 Social Network Security',
        'Practical': '231CS32A Data Structures and Algorithms Laboratory',
        'Additional Responsibilities 1': 'Slow Learner / Fast Learner',
        'Additional Responsibilities 2': 'Social Awareness Program Incharge',
      },
      {
        'S. No.': 21,
        'MTS No.': '2034',
        'Faculty Name and Qualification': 'Mr P Karthick',
        'Designation': 'Assistant Professor',
        'Theory': '231CSV44 - Ethical Hacking\n231AIV16 Knowledge Engineering',
        'Practical': '231MC56A Standards for Engineering',
        'Additional Responsibilities 1': 'Department Industrial Visit   Internship co-ordinator',
        'Additional Responsibilities 2': 'Lab Incharge   Discipline Coordinator',
      },
      {
        'S. No.': 22,
        'MTS No.': '2052',
        'Faculty Name and Qualification': 'Ms P Selvarathinam',
        'Designation': 'Assistant Professor',
        'Theory': '231ECV22 - Computer Vision\n231AIV17 - Soft Computing\n231CSV34  Security and Privacy in Cloud (H)',
        'Practical': '',
        'Additional Responsibilities 1': 'CSE Association & Symposium  News Letter , Magazine',
        'Additional Responsibilities 2': 'CO-PO  Attainment',
      },
      {
        'S. No.': 23,
        'MTS No.': '2065',
        'Faculty Name and Qualification': 'Mrs M.Aswin Rani',
        'Designation': 'Assistant Professor',
        'Theory': '231HS701 Professional Ethics and Human Values\n231CS522 Embedded Systems and  IoT',
        'Practical': '231CS52B - Embedded Systems and IoT Laboratory*',
        'Additional Responsibilities 1': 'Workshop I/c   Course file',
        'Additional Responsibilities 2': 'CO-PO  Attainment',
      },
      {
        'S. No.': 24,
        'MTS No.': '2071',
        'Faculty Name and Qualification': 'Mrs V Vinothini',
        'Designation': 'Assistant Professor',
        'Theory': '231CS111 PROGRAMMING IN C',
        'Practical': '231CS11A PROGRAMMING IN C LAB',
        'Additional Responsibilities 1': 'Website incharge',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 25,
        'MTS No.': '2105',
        'Faculty Name and Qualification': 'Mrs R Kokila priya',
        'Designation': 'Assistant Professor',
        'Theory': '231IT521 Artificial Intelligence and Machine Learning - Lab Integrated\n231CS322  - Digital Principles and Computer Organization (Lab Integrated)',
        'Practical': '',
        'Additional Responsibilities 1': 'Exam Cell Coordinator',
        'Additional Responsibilities 2': 'Higher Education',
      },
      {
        'S. No.': 26,
        'MTS No.': '2106',
        'Faculty Name and Qualification': 'Mrs J Bebitha',
        'Designation': 'Assistant Professor',
        'Theory': '231CS324  Operating Systems\n231HS701 Professional Ethics and Human Values',
        'Practical': '231CS32C Operating Systems Laboratory',
        'Additional Responsibilities 1': 'Professional Society I/c  Department Placement Co-ordinator',
        'Additional Responsibilities 2': 'Innovative Teaching  Department  Academic Calendar',
      },
      {
        'S. No.': 27,
        'MTS No.': '2238',
        'Faculty Name and Qualification': 'Mrs.Geetha',
        'Designation': 'Assistant Professor',
        'Theory': '231AIV12  Cognitive Science\n231CB721Software Project Management\n231CSV47 Social Network Security ( H)',
        'Practical': '',
        'Additional Responsibilities 1': 'Class Committee Meeting',
        'Additional Responsibilities 2': 'Circular file & Notice Board',
      },
      {
        'S. No.': 28,
        'MTS No.': '2228',
        'Faculty Name and Qualification': 'Ms.Chandra',
        'Designation': 'Assistant Professor',
        'Theory': '231CS521 COMPILER DESIGN\n231CS111 PROGRAMMING IN C',
        'Practical': '231CS52B - Embedded Systems and IoT Laboratory*\n231CS52A Compiler Design Laboratory',
        'Additional Responsibilities 1': 'Publication and Patent File',
        'Additional Responsibilities 2': 'Competition Team i/c',
      },
      {
        'S. No.': 29,
        'MTS No.': '2223',
        'Faculty Name and Qualification': 'Ms.Alfia',
        'Designation': 'Assistant Professor',
        'Theory': '231CS324  Operating Systems\n231CS111 PROGRAMMING IN C',
        'Practical': '231CS32C Operating Systems Laboratory',
        'Additional Responsibilities 1': 'Student Feedback',
        'Additional Responsibilities 2': 'Class Committee Meeting',
      },
      {
        'S. No.': 30,
        'MTS No.': '2284',
        'Faculty Name and Qualification': 'Ms.Sandhya Sri',
        'Designation': 'Assistant Professor',
        'Theory': '231CS111 PROGRAMMING IN C\n231CS323 Object Oriented Programming',
        'Practical': '231CS11A PROGRAMMING IN C LAB\n231CS32B  Object Oriented Programming  Laboratory',
        'Additional Responsibilities 1': 'Attendance member',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 31,
        'MTS No.': '2287',
        'Faculty Name and Qualification': 'Ms.Yerrukkamma',
        'Designation': 'Assistant Professor',
        'Theory': '231CS111 PROGRAMMING IN C\n231CS325 Software Engineering   (Lab Integrated)\n231CSV37  Virtualization(H)',
        'Practical': '231CS11A PROGRAMMING IN C LAB',
        'Additional Responsibilities 1': 'Department Review Meeting- Minutes',
        'Additional Responsibilities 2': '',
      },
      {
        'S. No.': 32,
        'MTS No.': '2323',
        'Faculty Name and Qualification': 'Ms.R.Gayathri',
        'Designation': 'Assistant Professor',
        'Theory': '231AIV23 Image and Video Analytics (H)\nProgramming in C\n231AIV24 Optimization Technique(H)',
        'Practical': 'Programming in C Lab',
        'Additional Responsibilities 1': '',
        'Additional Responsibilities 2': '',
      },
    ];

    // Build workbook
    const wb = XLSX.utils.book_new();

    // Create Workload Sheet with custom institution header banner
    const wsData = [
      ['Vel Tech Multi Tech Dr.Rangarajan Dr.Sakunthala Engineering College'],
      ['An Autonomous Institution'],
      ['DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING'],
      ['ACADEMIC YEAR 2026-2027 (ODD SEMESTER JULY 2026-DEC 2026)'],
      ['WORKLOAD  w.e.f  24/8/2026'],
      [],
      headers,
      ...sampleWorkloadRows.map((r) => [
        r['S. No.'],
        r['MTS No.'],
        r['Faculty Name and Qualification'],
        r['Designation'],
        r['Theory'],
        r['Practical'],
        r['Additional Responsibilities 1'],
        r['Additional Responsibilities 2'],
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 8 },  // S. No.
      { wch: 12 }, // MTS No.
      { wch: 34 }, // Faculty Name
      { wch: 24 }, // Designation
      { wch: 48 }, // Theory
      { wch: 44 }, // Practical
      { wch: 36 }, // Resp 1
      { wch: 36 }, // Resp 2
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'CSE_Faculty_Workload');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="VelTech_CSE_Faculty_Workload_Template.xlsx"',
      },
    });
  } catch (err: any) {
    console.error('Error generating workload template:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate workload template' },
      { status: 500 }
    );
  }
}
