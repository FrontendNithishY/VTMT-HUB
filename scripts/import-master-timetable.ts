import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Full master timetable definitions extracted from the official 9-page college document
// Pages 1-3: Year II (Semester III), Sections A, B, C (Room N 201, N 201, N 203)
// Pages 4-6: Year III (Semester V), Sections A, B, C (Room N 204, N 205, N 206)
// Pages 7-9: Year IV (Semester VII), Sections A, B, C (Room I 305, I 306, J 301)

const TIMINGS: Record<number, string> = {
  1: "08:05 - 08:55",
  2: "08:55 - 09:45",
  3: "10:00 - 10:50",
  4: "10:50 - 11:40",
  5: "12:20 - 01:05",
  6: "01:05 - 01:50",
  7: "02:00 - 02:45",
  8: "02:45 - 03:30",
};

interface SlotDef {
  classId: string;
  dayOrder: string;
  period: number;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  roomNo: string;
  category: string;
  academicYear: string;
  semType: string;
}

const entries: SlotDef[] = [];

function add(
  classId: string,
  dayOrder: string,
  period: number,
  subjectCode: string,
  subjectName: string,
  facultyName: string,
  roomNo: string,
  category = "sub1"
) {
  entries.push({
    classId,
    dayOrder,
    period,
    subjectCode,
    subjectName,
    facultyName,
    roomNo,
    category,
    academicYear: "2026-2027",
    semType: "ODD",
  });
}

// ==========================================
// PAGE 1: II-CSE-A (Semester III, Room N 201)
// ==========================================
// Subjects & Faculty:
// 231MA302 PQT - Dr. Mattuvarkuzhali
// 231CS323 OOPS - Mr R Prabhakaran
// 231CS321 DS - Ms A Vinothini
// 231CS322 DP&CO - Ms. R. Kokilapriya
// 231CS325 SE - Ms. S. Alfiya
// 231CS324 OS - Mr C Pandi
// 231CS32A DS LAB - Ms A Vinothini (BAY3)
// 231CS32B OOPS LAB - Mr R Prabhakaran (BAY3)
// 231CS32C OS LAB - Mr C Pandi (BAY3)
// SPORTS - Mr. Sathish Kumar
// LIBRARY - Mr R Prabhakaran
// PPT - Placement Trainer

// DO I: DS/DPCO LAB (1,2), OOPS (3), SE (4), SE LAB (5,6), DPCO (7), OS (8)
add("II-CSE-A", "I", 1, "231CS32A", "Data Structures Lab", "Ms A Vinothini", "BAY3", "lab1");
add("II-CSE-A", "I", 2, "231CS322", "Digital Principles and Computer Organization", "Ms. R. Kokilapriya", "BAY3", "lab1");
add("II-CSE-A", "I", 3, "231CS323", "Object Oriented Programming", "Mr R Prabhakaran", "N 201");
add("II-CSE-A", "I", 4, "231CS325", "Software Engineering", "Ms. S. Alfiya", "N 201");
add("II-CSE-A", "I", 5, "231CS325", "Software Engineering Lab", "Ms. S. Alfiya", "BAY3", "lab1");
add("II-CSE-A", "I", 6, "231CS325", "Software Engineering Lab", "Ms. S. Alfiya", "BAY3", "lab1");
add("II-CSE-A", "I", 7, "231CS322", "Digital Principles and Computer Organization", "Ms. R. Kokilapriya", "N 201");
add("II-CSE-A", "I", 8, "231CS324", "Operating Systems", "Mr C Pandi", "N 201");

// DO II: DS (1), OOPS (2), DS/DPCO LAB (3,4), PQT (5), LIB (6), OS (7), SE (8)
add("II-CSE-A", "II", 1, "231CS321", "Data Structures", "Ms A Vinothini", "N 201");
add("II-CSE-A", "II", 2, "231CS323", "Object Oriented Programming", "Mr R Prabhakaran", "N 201");
add("II-CSE-A", "II", 3, "231CS32A", "Data Structures Lab", "Ms A Vinothini", "BAY3", "lab1");
add("II-CSE-A", "II", 4, "231CS322", "Digital Principles and Computer Organization", "Ms. R. Kokilapriya", "BAY3", "lab1");
add("II-CSE-A", "II", 5, "231MA302", "Probability and Queuing Theory", "Dr. Mattuvarkuzhali", "N 201");
add("II-CSE-A", "II", 6, "LIB", "Library", "Mr R Prabhakaran", "N 201");
add("II-CSE-A", "II", 7, "231CS324", "Operating Systems", "Mr C Pandi", "N 201");
add("II-CSE-A", "II", 8, "231CS325", "Software Engineering", "Ms. S. Alfiya", "N 201");

// DO III: PQT (1), OOPS (2), DPCO (3), SE (4), OS/OOPS LAB (5,6), SPORTS (7,8)
add("II-CSE-A", "III", 1, "231MA302", "Probability and Queuing Theory", "Dr. Mattuvarkuzhali", "N 201");
add("II-CSE-A", "III", 2, "231CS323", "Object Oriented Programming", "Mr R Prabhakaran", "N 201");
add("II-CSE-A", "III", 3, "231CS322", "Digital Principles and Computer Organization", "Ms. R. Kokilapriya", "N 201");
add("II-CSE-A", "III", 4, "231CS325", "Software Engineering", "Ms. S. Alfiya", "N 201");
add("II-CSE-A", "III", 5, "231CS32C", "Operating Systems Laboratory", "Mr C Pandi", "BAY3", "lab1");
add("II-CSE-A", "III", 6, "231CS32B", "Object Oriented Programming Laboratory", "Mr R Prabhakaran", "BAY3", "lab1");
add("II-CSE-A", "III", 7, "SPORTS", "Sports", "Mr. Sathish Kumar", "Playground");
add("II-CSE-A", "III", 8, "SPORTS", "Sports", "Mr. Sathish Kumar", "Playground");

// DO IV: PPT (1,2), SE (3), OOPS (4), DS (5), DPCO (6), PQT (7), OS (8)
add("II-CSE-A", "IV", 1, "PPT", "Placement Training", "Placement Trainer", "N 201");
add("II-CSE-A", "IV", 2, "PPT", "Placement Training", "Placement Trainer", "N 201");
add("II-CSE-A", "IV", 3, "231CS325", "Software Engineering", "Ms. S. Alfiya", "N 201");
add("II-CSE-A", "IV", 4, "231CS323", "Object Oriented Programming", "Mr R Prabhakaran", "N 201");
add("II-CSE-A", "IV", 5, "231CS321", "Data Structures", "Ms A Vinothini", "N 201");
add("II-CSE-A", "IV", 6, "231CS322", "Digital Principles and Computer Organization", "Ms. R. Kokilapriya", "N 201");
add("II-CSE-A", "IV", 7, "231MA302", "Probability and Queuing Theory", "Dr. Mattuvarkuzhali", "N 201");
add("II-CSE-A", "IV", 8, "231CS324", "Operating Systems", "Mr C Pandi", "N 201");

// DO V: DPCO (1), DS (2), OS/OOPS LAB (3,4), OS (5), DS (6), PQT LAB (7,8)
add("II-CSE-A", "V", 1, "231CS322", "Digital Principles and Computer Organization", "Ms. R. Kokilapriya", "N 201");
add("II-CSE-A", "V", 2, "231CS321", "Data Structures", "Ms A Vinothini", "N 201");
add("II-CSE-A", "V", 3, "231CS32C", "Operating Systems Laboratory", "Mr C Pandi", "BAY3", "lab1");
add("II-CSE-A", "V", 4, "231CS32B", "Object Oriented Programming Laboratory", "Mr R Prabhakaran", "BAY3", "lab1");
add("II-CSE-A", "V", 5, "231CS324", "Operating Systems", "Mr C Pandi", "N 201");
add("II-CSE-A", "V", 6, "231CS321", "Data Structures", "Ms A Vinothini", "N 201");
add("II-CSE-A", "V", 7, "231MA302", "Probability and Queuing Theory Lab", "Dr. Mattuvarkuzhali", "BAY4", "lab1");
add("II-CSE-A", "V", 8, "231MA302", "Probability and Queuing Theory Lab", "Dr. Mattuvarkuzhali", "BAY4", "lab1");

// ==========================================
// PAGE 2: II-CSE-B (Semester III, Room N 201)
// ==========================================
// Subjects & Faculty:
// 231MA302 PQT - Ms. Anurathi
// 231CS323 OOPS - Mr V Nehru
// 231CS321 DS - Ms D Parkavi
// 231CS322 DP&CO - Mr. V. Senthilkumar
// 231CS325 SE - Ms V Divya
// 231CS324 OS - Ms Alfiya
// 231CS32A DS LAB - Ms D Parkavi
// 231CS32B OOPS LAB - Ms. P. Selvarathinam
// 231CS32C OS LAB - Ms Alfiya
// SPORTS - Mr. Sathish Kumar
// LIBRARY - Ms Alfiya
// PPT - Placement Trainer

// DO I: DS (1), OS (2), PQT LAB (3,4), SE (5), OOPS (6), PQT (7), DPCO (8)
add("II-CSE-B", "I", 1, "231CS321", "Data Structures", "Ms D Parkavi", "N 201");
add("II-CSE-B", "I", 2, "231CS324", "Operating Systems", "Ms Alfiya", "N 201");
add("II-CSE-B", "I", 3, "231MA302", "PQT Lab", "Ms. Anurathi", "BAY4", "lab1");
add("II-CSE-B", "I", 4, "231MA302", "PQT Lab", "Ms. Anurathi", "BAY4", "lab1");
add("II-CSE-B", "I", 5, "231CS325", "Software Engineering", "Ms V Divya", "N 201");
add("II-CSE-B", "I", 6, "231CS323", "Object Oriented Programming", "Mr V Nehru", "N 201");
add("II-CSE-B", "I", 7, "231MA302", "Probability and Queuing Theory", "Ms. Anurathi", "N 201");
add("II-CSE-B", "I", 8, "231CS322", "Digital Principles and Computer Organization", "Mr. V. Senthilkumar", "N 201");

// DO II: SE (1), PQT (2), OS/OOPS LAB (3,4), OOPS (5), DS (6), SE LAB (7,8)
add("II-CSE-B", "II", 1, "231CS325", "Software Engineering", "Ms V Divya", "N 201");
add("II-CSE-B", "II", 2, "231MA302", "Probability and Queuing Theory", "Ms. Anurathi", "N 201");
add("II-CSE-B", "II", 3, "231CS32C", "Operating Systems Laboratory", "Ms Alfiya", "BAY4", "lab1");
add("II-CSE-B", "II", 4, "231CS32B", "Object Oriented Programming Laboratory", "Ms. P. Selvarathinam", "BAY4", "lab1");
add("II-CSE-B", "II", 5, "231CS323", "Object Oriented Programming", "Mr V Nehru", "N 201");
add("II-CSE-B", "II", 6, "231CS321", "Data Structures", "Ms D Parkavi", "N 201");
add("II-CSE-B", "II", 7, "231CS325", "Software Engineering Lab", "Ms V Divya", "BAY3", "lab1");
add("II-CSE-B", "II", 8, "231CS325", "Software Engineering Lab", "Ms V Divya", "BAY3", "lab1");

// DO III: OS (1), PQT (2), DPCO (3), DS (4), DS/DPCO LAB (5,6), SPORTS (7,8)
add("II-CSE-B", "III", 1, "231CS324", "Operating Systems", "Ms Alfiya", "N 201");
add("II-CSE-B", "III", 2, "231MA302", "Probability and Queuing Theory", "Ms. Anurathi", "N 201");
add("II-CSE-B", "III", 3, "231CS322", "Digital Principles and Computer Organization", "Mr. V. Senthilkumar", "N 201");
add("II-CSE-B", "III", 4, "231CS321", "Data Structures", "Ms D Parkavi", "N 201");
add("II-CSE-B", "III", 5, "231CS32A", "Data Structures Lab", "Ms D Parkavi", "BAY4", "lab1");
add("II-CSE-B", "III", 6, "231CS322", "DPCO Lab", "Mr. V. Senthilkumar", "BAY4", "lab1");
add("II-CSE-B", "III", 7, "SPORTS", "Sports", "Mr. Sathish Kumar", "Playground");
add("II-CSE-B", "III", 8, "SPORTS", "Sports", "Mr. Sathish Kumar", "Playground");

// DO IV: PPT (1,2), OOPS (3), DPCO (4), DS/DPCO LAB (5,6), OS (7), SE (8)
add("II-CSE-B", "IV", 1, "PPT", "Placement Training", "Placement Trainer", "N 201");
add("II-CSE-B", "IV", 2, "PPT", "Placement Training", "Placement Trainer", "N 201");
add("II-CSE-B", "IV", 3, "231CS323", "Object Oriented Programming", "Mr V Nehru", "N 201");
add("II-CSE-B", "IV", 4, "231CS322", "Digital Principles and Computer Organization", "Mr. V. Senthilkumar", "N 201");
add("II-CSE-B", "IV", 5, "231CS32A", "Data Structures Lab", "Ms D Parkavi", "BAY4", "lab1");
add("II-CSE-B", "IV", 6, "231CS322", "DPCO Lab", "Mr. V. Senthilkumar", "BAY4", "lab1");
add("II-CSE-B", "IV", 7, "231CS324", "Operating Systems", "Ms Alfiya", "N 201");
add("II-CSE-B", "IV", 8, "231CS325", "Software Engineering", "Ms V Divya", "N 201");

// DO V: OS/OOPS LAB (1,2), DS (3), LIB (4), DPCO (5), SE (6), OS (7), OOPS (8)
add("II-CSE-B", "V", 1, "231CS32C", "Operating Systems Laboratory", "Ms Alfiya", "BAY4", "lab1");
add("II-CSE-B", "V", 2, "231CS32B", "Object Oriented Programming Laboratory", "Ms. P. Selvarathinam", "BAY4", "lab1");
add("II-CSE-B", "V", 3, "231CS321", "Data Structures", "Ms D Parkavi", "N 201");
add("II-CSE-B", "V", 4, "LIB", "Library", "Ms Alfiya", "N 201");
add("II-CSE-B", "V", 5, "231CS322", "Digital Principles and Computer Organization", "Mr. V. Senthilkumar", "N 201");
add("II-CSE-B", "V", 6, "231CS325", "Software Engineering", "Ms V Divya", "N 201");
add("II-CSE-B", "V", 7, "231CS324", "Operating Systems", "Ms Alfiya", "N 201");
add("II-CSE-B", "V", 8, "231CS323", "Object Oriented Programming", "Mr V Nehru", "N 201");

// ==========================================
// PAGE 3: II-CSE-C (Semester III, Room N 203)
// ==========================================
// Subjects & Faculty:
// 231MA302 PQT - Dr. T. Mary Shalin
// 231CS323 OOPS with Java - Ms. R. Harini
// 231CS321 DS - Dr. E. Mercy Beulah
// 231CS322 DP&CO - Mr. P. Sathish Kumar
// 231CS325 SE - Ms. D. Parkavi
// 231CS324 OS - Ms. J. Bebitha
// 231CS32A DS LAB - Dr. E. Mercy Beulah (BAY4)
// 231CS32B OOPS LAB - Ms. Sandhiya Sree (BAY3)
// 231CS32C OS LAB - Ms. J. Bebitha (BAY3)
// SPORTS - Mr. Sathish Kumar
// LIBRARY - Ms. Sandhiya Sree
// PPT - Placement Trainer

// DO I: DS (1), DPCO (2), SE (3), OS (4), DS/DPCO LAB (5,6), SE LAB (7,8)
add("II-CSE-C", "I", 1, "231CS321", "Data Structures", "Dr. E. Mercy Beulah", "N 203");
add("II-CSE-C", "I", 2, "231CS322", "Digital Principles and Computer Organization", "Mr. P. Sathish Kumar", "N 203");
add("II-CSE-C", "I", 3, "231CS325", "Software Engineering", "Ms. D. Parkavi", "N 203");
add("II-CSE-C", "I", 4, "231CS324", "Operating Systems", "Ms. J. Bebitha", "N 203");
add("II-CSE-C", "I", 5, "231CS32A", "Data Structures Lab", "Dr. E. Mercy Beulah", "BAY 4", "lab1");
add("II-CSE-C", "I", 6, "231CS322", "DPCO Lab", "Mr. P. Sathish Kumar", "BAY 4", "lab1");
add("II-CSE-C", "I", 7, "231CS325", "Software Engineering Lab", "Ms. D. Parkavi", "BAY 4", "lab1");
add("II-CSE-C", "I", 8, "231CS325", "Software Engineering Lab", "Ms. D. Parkavi", "BAY 4", "lab1");

// DO II: OOPS/OS LAB (1,2), DS (3), DPCO (4), PQT (5), OOPS (6), DS/DPCO LAB (7,8)
add("II-CSE-C", "II", 1, "231CS32B", "Object Oriented Programming Lab", "Ms. Sandhiya Sree", "BAY 3", "lab1");
add("II-CSE-C", "II", 2, "231CS32C", "Operating Systems Lab", "Ms. J. Bebitha", "BAY 3", "lab1");
add("II-CSE-C", "II", 3, "231CS321", "Data Structures", "Dr. E. Mercy Beulah", "N 203");
add("II-CSE-C", "II", 4, "231CS322", "Digital Principles and Computer Organization", "Mr. P. Sathish Kumar", "N 203");
add("II-CSE-C", "II", 5, "231MA302", "Probability and Queuing Theory", "Dr. T. Mary Shalin", "N 203");
add("II-CSE-C", "II", 6, "231CS323", "Object Oriented Programming with Java", "Ms. R. Harini", "N 203");
add("II-CSE-C", "II", 7, "231CS32A", "Data Structures Lab", "Dr. E. Mercy Beulah", "BAY 4", "lab1");
add("II-CSE-C", "II", 8, "231CS322", "DPCO Lab", "Mr. P. Sathish Kumar", "BAY 4", "lab1");

// DO III: OS (1), SE (2), OOPS (3), LIB (4), DS (5), DPCO (6), SPORTS (7,8)
add("II-CSE-C", "III", 1, "231CS324", "Operating Systems", "Ms. J. Bebitha", "N 203");
add("II-CSE-C", "III", 2, "231CS325", "Software Engineering", "Ms. D. Parkavi", "N 203");
add("II-CSE-C", "III", 3, "231CS323", "Object Oriented Programming with Java", "Ms. R. Harini", "N 203");
add("II-CSE-C", "III", 4, "LIB", "Library", "Ms. Sandhiya Sree", "N 203");
add("II-CSE-C", "III", 5, "231CS321", "Data Structures", "Dr. E. Mercy Beulah", "N 203");
add("II-CSE-C", "III", 6, "231CS322", "Digital Principles and Computer Organization", "Mr. P. Sathish Kumar", "N 203");
add("II-CSE-C", "III", 7, "SPORTS", "Sports", "Mr. Sathish Kumar", "Playground");
add("II-CSE-C", "III", 8, "SPORTS", "Sports", "Mr. Sathish Kumar", "Playground");

// DO IV: OOPS (1), PQT (2), OS (3), SE (4), OOPS/OS BAY 3 (5,6), PPT (7,8)
add("II-CSE-C", "IV", 1, "231CS323", "Object Oriented Programming with Java", "Ms. R. Harini", "N 203");
add("II-CSE-C", "IV", 2, "231MA302", "Probability and Queuing Theory", "Dr. T. Mary Shalin", "N 203");
add("II-CSE-C", "IV", 3, "231CS324", "Operating Systems", "Ms. J. Bebitha", "N 203");
add("II-CSE-C", "IV", 4, "231CS325", "Software Engineering", "Ms. D. Parkavi", "N 203");
add("II-CSE-C", "IV", 5, "231CS32B", "Object Oriented Programming Lab", "Ms. Sandhiya Sree", "BAY 3", "lab1");
add("II-CSE-C", "IV", 6, "231CS32C", "Operating Systems Lab", "Ms. J. Bebitha", "BAY 3", "lab1");
add("II-CSE-C", "IV", 7, "PPT", "Placement Training", "Placement Trainer", "N 203");
add("II-CSE-C", "IV", 8, "PPT", "Placement Training", "Placement Trainer", "N 203");

// DO V: SE (1), DPCO (2), PQT LAB (3,4), DS (5), PQT (6), OS (7), OOPS (8)
add("II-CSE-C", "V", 1, "231CS325", "Software Engineering", "Ms. D. Parkavi", "N 203");
add("II-CSE-C", "V", 2, "231CS322", "Digital Principles and Computer Organization", "Mr. P. Sathish Kumar", "N 203");
add("II-CSE-C", "V", 3, "231MA302", "PQT Lab", "Dr. T. Mary Shalin", "RL", "lab1");
add("II-CSE-C", "V", 4, "231MA302", "PQT Lab", "Dr. T. Mary Shalin", "RL", "lab1");
add("II-CSE-C", "V", 5, "231CS321", "Data Structures", "Dr. E. Mercy Beulah", "N 203");
add("II-CSE-C", "V", 6, "231MA302", "Probability and Queuing Theory", "Dr. T. Mary Shalin", "N 203");
add("II-CSE-C", "V", 7, "231CS324", "Operating Systems", "Ms. J. Bebitha", "N 203");
add("II-CSE-C", "V", 8, "231CS323", "Object Oriented Programming with Java", "Ms. R. Harini", "N 203");

// ==========================================
// PAGE 4: III-CSE-A (Semester V, Room N 204)
// ==========================================
// Subjects & Faculty:
// 231IT521 AI&ML - Mr R Harini
// 231CS521 CD - Ms V Vijayashanthi
// 231CS522 ES&IOT - Mr. V. Nehru
// 231CSV44 Ethical Hacking (PE 1) - Mr P Karthick
// 231ITV66 Web application Security (PE 1) - Ms S Vaitheeswari
// 231CSV47 Social Network Security (PE 1) - Ms K Dhanalakshmi
// 231ITV64 Software Testing and Automation (PE 2) - Mr N Insozhan
// 231CBV73 Entrepreneurship Development (PE 2) - Mr R Prabhakaran
// 231AIV16 Knowledge Engineering (PE 2) - Mr P Karthick
// Open Elective-1 (OE) - Ms V Lavanya / Dr K Muthukannan / Ms P Selvarathinam
// 231CS52A CD LAB - Ms V Vijayashanthi
// 231CS52B ES&IOT LAB - Mr. V. Nehru
// 231MC56A Standards for Engineering (Seminar) - Dr Victor Jose
// SPORTS - Mr. V. Nehru
// LIBRARY - Ms V Vijayashanthi
// PPT - Placement Trainer

// DO I: AI&ML (1), CD (2), ES&IOT/CD LAB (3,4), PE-II (5), OE-1 (6), Seminar (7,8)
add("III-CSE-A", "I", 1, "231IT521", "Artificial Intelligence and Machine Learning", "Mr R Harini", "N 204");
add("III-CSE-A", "I", 2, "231CS521", "Compiler Design", "Ms V Vijayashanthi", "N 204");
add("III-CSE-A", "I", 3, "231CS52B", "Embedded Systems and IoT Laboratory", "Mr. V. Nehru", "Bay4", "lab1");
add("III-CSE-A", "I", 4, "231CS52A", "Compiler Design Laboratory", "Ms V Vijayashanthi", "Bay4", "lab1");
add("III-CSE-A", "I", 5, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 204", "pe");
add("III-CSE-A", "I", 6, "OE-1", "Open Elective - 1", "Ms V Lavanya", "N 204", "oe");
add("III-CSE-A", "I", 7, "231MC56A", "Standards for Engineering (Seminar)", "Dr Victor Jose", "N 204");
add("III-CSE-A", "I", 8, "231MC56A", "Standards for Engineering (Seminar)", "Dr Victor Jose", "N 204");

// DO II: PE-1 (1), ES&IOT (2), PPT (3,4), PE-1 LAB (5,6), PE-II (7), CD (8)
add("III-CSE-A", "II", 1, "PE-1", "Program Elective - 1", "Mr P Karthick", "N 204", "pe");
add("III-CSE-A", "II", 2, "231CS522", "Embedded Systems and IoT", "Mr. V. Nehru", "N 204");
add("III-CSE-A", "II", 3, "PPT", "Placement Training", "Placement Trainer", "N 204");
add("III-CSE-A", "II", 4, "PPT", "Placement Training", "Placement Trainer", "N 204");
add("III-CSE-A", "II", 5, "PE-1 LAB", "Program Elective - 1 Lab", "Ms S Vaitheeswari", "Bay 4", "lab1");
add("III-CSE-A", "II", 6, "PE-1 LAB", "Program Elective - 1 Lab", "Ms S Vaitheeswari", "Bay 4", "lab1");
add("III-CSE-A", "II", 7, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 204", "pe");
add("III-CSE-A", "II", 8, "231CS521", "Compiler Design", "Ms V Vijayashanthi", "N 204");

// DO III: ES&IOT/CD LAB (1,2), OE-1 (3), ES&IOT (4), LIB (5), AI&ML (6), SPORTS (7,8)
add("III-CSE-A", "III", 1, "231CS52B", "Embedded Systems and IoT Laboratory", "Mr. V. Nehru", "Bay4", "lab1");
add("III-CSE-A", "III", 2, "231CS52A", "Compiler Design Laboratory", "Ms V Vijayashanthi", "Bay4", "lab1");
add("III-CSE-A", "III", 3, "OE-1", "Open Elective - 1", "Dr K Muthukannan", "N 204", "oe");
add("III-CSE-A", "III", 4, "231CS522", "Embedded Systems and IoT", "Mr. V. Nehru", "N 204");
add("III-CSE-A", "III", 5, "LIB", "Library", "Ms V Vijayashanthi", "N 204");
add("III-CSE-A", "III", 6, "231IT521", "Artificial Intelligence and Machine Learning", "Mr R Harini", "N 204");
add("III-CSE-A", "III", 7, "SPORTS", "Sports", "Mr. V. Nehru", "Playground");
add("III-CSE-A", "III", 8, "SPORTS", "Sports", "Mr. V. Nehru", "Playground");

// DO IV: PPT (1,2), OE-1 LAB (3,4), PE-1 (5), ES&IOT (6), PE-II LAB (7,8)
add("III-CSE-A", "IV", 1, "PPT", "Placement Training", "Placement Trainer", "N 204");
add("III-CSE-A", "IV", 2, "PPT", "Placement Training", "Placement Trainer", "N 204");
add("III-CSE-A", "IV", 3, "OE-1 LAB", "Open Elective - 1 Lab", "Ms P Selvarathinam", "Bay 4", "lab1");
add("III-CSE-A", "IV", 4, "OE-1 LAB", "Open Elective - 1 Lab", "Ms P Selvarathinam", "Bay 4", "lab1");
add("III-CSE-A", "IV", 5, "PE-1", "Program Elective - 1", "Mr P Karthick", "N 204", "pe");
add("III-CSE-A", "IV", 6, "231CS522", "Embedded Systems and IoT", "Mr. V. Nehru", "N 204");
add("III-CSE-A", "IV", 7, "PE-II LAB", "Program Elective - II Lab", "Mr N Insozhan", "Bay 4", "lab1");
add("III-CSE-A", "IV", 8, "PE-II LAB", "Program Elective - II Lab", "Mr N Insozhan", "Bay 4", "lab1");

// DO V: PE-II (1), CD (2), AI&ML (3), ES&IOT (4), AI&ML lab (5,6), PE-1 (7), CD (8)
add("III-CSE-A", "V", 1, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 204", "pe");
add("III-CSE-A", "V", 2, "231CS521", "Compiler Design", "Ms V Vijayashanthi", "N 204");
add("III-CSE-A", "V", 3, "231IT521", "Artificial Intelligence and Machine Learning", "Mr R Harini", "N 204");
add("III-CSE-A", "V", 4, "231CS522", "Embedded Systems and IoT", "Mr. V. Nehru", "N 204");
add("III-CSE-A", "V", 5, "231IT521", "Artificial Intelligence and Machine Learning Lab", "Mr R Harini", "bay4", "lab1");
add("III-CSE-A", "V", 6, "231IT521", "Artificial Intelligence and Machine Learning Lab", "Mr R Harini", "bay4", "lab1");
add("III-CSE-A", "V", 7, "PE-1", "Program Elective - 1", "Ms K Dhanalakshmi", "N 204", "pe");
add("III-CSE-A", "V", 8, "231CS521", "Compiler Design", "Ms V Vijayashanthi", "N 204");

// ==========================================
// PAGE 5: III-CSE-B (Semester V, Room N 205)
// ==========================================
// Subjects & Faculty:
// 231IT521 AI&ML - Dr K Muthukannan
// 231CS521 CD - Ms R Chandra
// 231CS522 ES&IOT - Ms M Aswin Rani
// Professional Electives PE 1 & PE 2
// Open Elective OE 1
// 231CS52A CD LAB - Ms Chandra
// 231CS52B ES&IOT LAB - Ms M Aswin Rani
// 231MC56A Standards for Engineering (Seminar) - Dr K. Muthukannan
// SPORTS - Mr. V. Nehru
// LIBRARY - Ms Chandra
// PPT - Placement Trainer

// DO I: AI&ML LAB (1,2), LIB (3), ES&IOT (4), PE-II (5), OE-1 (6), ES&IOT/CD LAB (7,8)
add("III-CSE-B", "I", 1, "231IT521", "AI&ML Lab", "Dr K Muthukannan", "RLAB", "lab1");
add("III-CSE-B", "I", 2, "231IT521", "AI&ML Lab", "Dr K Muthukannan", "RLAB", "lab1");
add("III-CSE-B", "I", 3, "LIB", "Library", "Ms Chandra", "N 205");
add("III-CSE-B", "I", 4, "231CS522", "Embedded Systems and IoT", "Ms M Aswin Rani", "N 205");
add("III-CSE-B", "I", 5, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 205", "pe");
add("III-CSE-B", "I", 6, "OE-1", "Open Elective - 1", "Ms V Lavanya", "N 205", "oe");
add("III-CSE-B", "I", 7, "231CS52B", "Embedded Systems and IoT Laboratory", "Ms M Aswin Rani", "R Lab", "lab1");
add("III-CSE-B", "I", 8, "231CS52A", "Compiler Design Laboratory", "Ms Chandra", "R Lab", "lab1");

// DO II: PE-1 (1), ES&IOT (2), PPT (3,4), PE-1 Lab (5,6), PE-II (7), AI&ML (8)
add("III-CSE-B", "II", 1, "PE-1", "Program Elective - 1", "Mr P Karthick", "N 205", "pe");
add("III-CSE-B", "II", 2, "231CS522", "Embedded Systems and IoT", "Ms M Aswin Rani", "N 205");
add("III-CSE-B", "II", 3, "PPT", "Placement Training", "Placement Trainer", "N 205");
add("III-CSE-B", "II", 4, "PPT", "Placement Training", "Placement Trainer", "N 205");
add("III-CSE-B", "II", 5, "PE-1 LAB", "Program Elective - 1 Lab", "Ms S Vaitheeswari", "Bay 3", "lab1");
add("III-CSE-B", "II", 6, "PE-1 LAB", "Program Elective - 1 Lab", "Ms S Vaitheeswari", "Bay 3", "lab1");
add("III-CSE-B", "II", 7, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 205", "pe");
add("III-CSE-B", "II", 8, "231IT521", "Artificial Intelligence and Machine Learning", "Dr K Muthukannan", "N 205");

// DO III: AI&ML (1), ES&IOT (2), OE-1 (3), ES&IOT (4), CD (5), AI&ML (6), SPORTS (7,8)
add("III-CSE-B", "III", 1, "231IT521", "Artificial Intelligence and Machine Learning", "Dr K Muthukannan", "N 205");
add("III-CSE-B", "III", 2, "231CS522", "Embedded Systems and IoT", "Ms M Aswin Rani", "N 205");
add("III-CSE-B", "III", 3, "OE-1", "Open Elective - 1", "Dr K Muthukannan", "N 205", "oe");
add("III-CSE-B", "III", 4, "231CS522", "Embedded Systems and IoT", "Ms M Aswin Rani", "N 205");
add("III-CSE-B", "III", 5, "231CS521", "Compiler Design", "Ms R Chandra", "N 205");
add("III-CSE-B", "III", 6, "231IT521", "Artificial Intelligence and Machine Learning", "Dr K Muthukannan", "N 205");
add("III-CSE-B", "III", 7, "SPORTS", "Sports", "Mr. V. Nehru", "Playground");
add("III-CSE-B", "III", 8, "SPORTS", "Sports", "Mr. V. Nehru", "Playground");

// DO IV: PPT (1,2), OE-1 LAB (3,4), PE-1 (5), CD (6), PE-II LAB (7,8)
add("III-CSE-B", "IV", 1, "PPT", "Placement Training", "Placement Trainer", "N 205");
add("III-CSE-B", "IV", 2, "PPT", "Placement Training", "Placement Trainer", "N 205");
add("III-CSE-B", "IV", 3, "OE-1 LAB", "Open Elective - 1 Lab", "Dr K Muthukannan", "Bay 3", "lab1");
add("III-CSE-B", "IV", 4, "OE-1 LAB", "Open Elective - 1 Lab", "Dr K Muthukannan", "Bay 3", "lab1");
add("III-CSE-B", "IV", 5, "PE-1", "Program Elective - 1", "Mr P Karthick", "N 205", "pe");
add("III-CSE-B", "IV", 6, "231CS521", "Compiler Design", "Ms R Chandra", "N 205");
add("III-CSE-B", "IV", 7, "PE-II LAB", "Program Elective - II Lab", "Mr N Insozhan", "Bay 3", "lab1");
add("III-CSE-B", "IV", 8, "PE-II LAB", "Program Elective - II Lab", "Mr N Insozhan", "Bay 3", "lab1");

// DO V: PE-II (1), CD (2), SEMINAR (3,4), ES&IOT/CD LAB (5,6), PE-1 (7), CD (8)
add("III-CSE-B", "V", 1, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 205", "pe");
add("III-CSE-B", "V", 2, "231CS521", "Compiler Design", "Ms R Chandra", "N 205");
add("III-CSE-B", "V", 3, "231MC56A", "Standards for Engineering (Seminar)", "Dr K. Muthukannan", "N 205");
add("III-CSE-B", "V", 4, "231MC56A", "Standards for Engineering (Seminar)", "Dr K. Muthukannan", "N 205");
add("III-CSE-B", "V", 5, "231CS52B", "Embedded Systems and IoT Laboratory", "Ms M Aswin Rani", "Bay3", "lab1");
add("III-CSE-B", "V", 6, "231CS52A", "Compiler Design Laboratory", "Ms Chandra", "Bay3", "lab1");
add("III-CSE-B", "V", 7, "PE-1", "Program Elective - 1", "Ms K Dhanalakshmi", "N 205", "pe");
add("III-CSE-B", "V", 8, "231CS521", "Compiler Design", "Ms R Chandra", "N 205");

// ==========================================
// PAGE 6: III-CSE-C (Semester V, Room N 206)
// ==========================================
// Subjects & Faculty:
// 231IT521 AI&ML - Ms R Kokila Priya
// 231CS521 CD - Ms V Divya
// 231CS522 ES&IOT - Dr. R. Saravanan (HOD)
// Professional Electives PE 1 & PE 2
// Open Elective OE 1
// 231CS52A CD LAB - Ms V Divya
// 231CS52B ES&IOT LAB - Mrs. Chandra
// 231MC56A Standards for Engineering (Seminar) - Mr. P.Karthick
// SPORTS - Mr. Nehru
// LIBRARY - Ms R Kokila Priya
// PPT - Placement Trainer

// DO I: CD/ES&IOT LAB (1,2), AIML (3), ESIOT (4), PE-II (5), OE-1 (6), CD (7), LIB (8)
add("III-CSE-C", "I", 1, "231CS52A", "Compiler Design Laboratory", "Ms V Divya", "BAY4", "lab1");
add("III-CSE-C", "I", 2, "231CS52B", "Embedded Systems and IoT Laboratory", "Mrs. Chandra", "BAY4", "lab1");
add("III-CSE-C", "I", 3, "231IT521", "Artificial Intelligence and Machine Learning", "Ms R Kokila Priya", "N 206");
add("III-CSE-C", "I", 4, "231CS522", "Embedded Systems and IoT", "Dr. R. Saravanan", "N 206");
add("III-CSE-C", "I", 5, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 206", "pe");
add("III-CSE-C", "I", 6, "OE-1", "Open Elective - 1", "Ms V Lavanya", "N 206", "oe");
add("III-CSE-C", "I", 7, "231CS521", "Compiler Design", "Ms V Divya", "N 206");
add("III-CSE-C", "I", 8, "LIB", "Library", "Ms R Kokila Priya", "N 206");

// DO II: PE-1 (1), ESIOT (2), PPT (3,4), PE-1 Lab (5,6), PE-II (7), AI&ML (8)
add("III-CSE-C", "II", 1, "PE-1", "Program Elective - 1", "Mr P Karthick", "N 206", "pe");
add("III-CSE-C", "II", 2, "231CS522", "Embedded Systems and IoT", "Dr. R. Saravanan", "N 206");
add("III-CSE-C", "II", 3, "PPT", "Placement Training", "Placement Trainer", "N 206");
add("III-CSE-C", "II", 4, "PPT", "Placement Training", "Placement Trainer", "N 206");
add("III-CSE-C", "II", 5, "PE-1 LAB", "Program Elective - 1 Lab", "Ms S Vaitheeswari", "R Lab", "lab1");
add("III-CSE-C", "II", 6, "PE-1 LAB", "Program Elective - 1 Lab", "Ms S Vaitheeswari", "R Lab", "lab1");
add("III-CSE-C", "II", 7, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 206", "pe");
add("III-CSE-C", "II", 8, "231IT521", "Artificial Intelligence and Machine Learning", "Ms R Kokila Priya", "N 206");

// DO III: AI&ML LAB (1,2), OE-1 (3), CD (4), AIML (5), CD (6), SPORTS (7,8)
add("III-CSE-C", "III", 1, "231IT521", "AI&ML Lab", "Ms R Kokila Priya", "BAY3", "lab1");
add("III-CSE-C", "III", 2, "231IT521", "AI&ML Lab", "Ms R Kokila Priya", "BAY3", "lab1");
add("III-CSE-C", "III", 3, "OE-1", "Open Elective - 1", "Dr K Muthukannan", "N 206", "oe");
add("III-CSE-C", "III", 4, "231CS521", "Compiler Design", "Ms V Divya", "N 206");
add("III-CSE-C", "III", 5, "231IT521", "Artificial Intelligence and Machine Learning", "Ms R Kokila Priya", "N 206");
add("III-CSE-C", "III", 6, "231CS521", "Compiler Design", "Ms V Divya", "N 206");
add("III-CSE-C", "III", 7, "SPORTS", "Sports", "Mr. Nehru", "Playground");
add("III-CSE-C", "III", 8, "SPORTS", "Sports", "Mr. Nehru", "Playground");

// DO IV: PPT (1,2), OE-1 LAB (3,4), PE-1 (5), ESIOT (6), PE-II Lab (7,8)
add("III-CSE-C", "IV", 1, "PPT", "Placement Training", "Placement Trainer", "N 206");
add("III-CSE-C", "IV", 2, "PPT", "Placement Training", "Placement Trainer", "N 206");
add("III-CSE-C", "IV", 3, "OE-1 LAB", "Open Elective - 1 Lab", "Ms P Selvarathinam", "R Lab", "lab1");
add("III-CSE-C", "IV", 4, "OE-1 LAB", "Open Elective - 1 Lab", "Ms P Selvarathinam", "R Lab", "lab1");
add("III-CSE-C", "IV", 5, "PE-1", "Program Elective - 1", "Mr P Karthick", "N 206", "pe");
add("III-CSE-C", "IV", 6, "231CS522", "Embedded Systems and IoT", "Dr. R. Saravanan", "N 206");
add("III-CSE-C", "IV", 7, "PE-II LAB", "Program Elective - II Lab", "Mr N Insozhan", "R Lab", "lab1");
add("III-CSE-C", "IV", 8, "PE-II LAB", "Program Elective - II Lab", "Mr N Insozhan", "R Lab", "lab1");

// DO V: PE-II (1), ESIOT (2), CD/ES&IOT LAB (3,4), SEMINAR (5,6), PE-1 (7), CD (8)
add("III-CSE-C", "V", 1, "PE-II", "Program Elective - II", "Mr N Insozhan", "N 206", "pe");
add("III-CSE-C", "V", 2, "231CS522", "Embedded Systems and IoT", "Dr. R. Saravanan", "N 206");
add("III-CSE-C", "V", 3, "231CS52A", "Compiler Design Laboratory", "Ms V Divya", "BAY4", "lab1");
add("III-CSE-C", "V", 4, "231CS52B", "Embedded Systems and IoT Laboratory", "Mrs. Chandra", "BAY4", "lab1");
add("III-CSE-C", "V", 5, "231MC56A", "Standards for Engineering (Seminar)", "Mr. P.Karthick", "N 206");
add("III-CSE-C", "V", 6, "231MC56A", "Standards for Engineering (Seminar)", "Mr. P.Karthick", "N 206");
add("III-CSE-C", "V", 7, "PE-1", "Program Elective - 1", "Ms K Dhanalakshmi", "N 206", "pe");
add("III-CSE-C", "V", 8, "231CS521", "Compiler Design", "Ms V Divya", "N 206");

// ==========================================
// PAGE 7: IV-CSE-A (Semester VII, Room I 305)
// ==========================================
// Subjects & Faculty:
// 231HS701 PEHV - Dr M Buvana
// 231CB721 SPM - Dr B Swaminathan
// PE-5 Soft Computing / Cognitive Science / Network Security
// PE-6 AI in Media / Social Text / Visual Effects
// OE-II AI ML for Electrical / PLC & SCADA
// OE-III Wearable Devices / 4G 5G / Satellite
// 231CS77A Project Phase-I - Dr M Buvana
// SPORTS - Mr N Insozhan
// LIBRARY - Ms M K Geedtha
// PPT - Placement Trainer

// DO I: OE-II (1), PEHV (2), PE-V (3), SPM (4), PE-VI (5), SPM (6), OE-III Lab (7,8)
add("IV-CSE-A", "I", 1, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 305", "oe");
add("IV-CSE-A", "I", 2, "231HS701", "Professional Ethics and Human Values", "Dr M Buvana", "I 305");
add("IV-CSE-A", "I", 3, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "I 305", "pe");
add("IV-CSE-A", "I", 4, "231CB721", "Software Project Management", "Dr B Swaminathan", "I 305");
add("IV-CSE-A", "I", 5, "PE-VI", "Professional Elective - VI", "Dr M Victor Jose", "I 305", "pe");
add("IV-CSE-A", "I", 6, "231CB721", "Software Project Management", "Dr B Swaminathan", "I 305");
add("IV-CSE-A", "I", 7, "OE-III LAB", "Open Elective - III Lab", "Dr. R.Kalpana", "Bay 3", "lab1");
add("IV-CSE-A", "I", 8, "OE-III LAB", "Open Elective - III Lab", "Dr. R.Kalpana", "Bay 3", "lab1");

// DO II: PROJECT PHASE-I (1,2), OE-II (3), SPM (4), OE-III (5), PEHV (6), PPT (7), PE-V (8)
add("IV-CSE-A", "II", 1, "231CS77A", "Project Phase -I", "Dr M Buvana", "Bay4", "lab2");
add("IV-CSE-A", "II", 2, "231CS77A", "Project Phase -I", "Dr M Buvana", "Bay4", "lab2");
add("IV-CSE-A", "II", 3, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 305", "oe");
add("IV-CSE-A", "II", 4, "231CB721", "Software Project Management", "Dr B Swaminathan", "I 305");
add("IV-CSE-A", "II", 5, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "I 305", "oe");
add("IV-CSE-A", "II", 6, "231HS701", "Professional Ethics and Human Values", "Dr M Buvana", "I 305");
add("IV-CSE-A", "II", 7, "PPT", "Placement Training", "Placement Trainer", "I 305");
add("IV-CSE-A", "II", 8, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "I 305", "pe");

// DO III: PE-VI (1), PEHV (2), PE-VI LAB (3,4), OE-II (5), PEHV (6), SPORTS (7,8)
add("IV-CSE-A", "III", 1, "PE-VI", "Professional Elective - VI", "Ms S Vaitheeshwari", "I 305", "pe");
add("IV-CSE-A", "III", 2, "231HS701", "Professional Ethics and Human Values", "Dr M Buvana", "I 305");
add("IV-CSE-A", "III", 3, "PE-VI LAB", "Professional Elective - VI Lab", "Dr M Victor Jose", "Bay 4", "lab1");
add("IV-CSE-A", "III", 4, "PE-VI LAB", "Professional Elective - VI Lab", "Dr M Victor Jose", "Bay 4", "lab1");
add("IV-CSE-A", "III", 5, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 305", "oe");
add("IV-CSE-A", "III", 6, "231HS701", "Professional Ethics and Human Values", "Dr M Buvana", "I 305");
add("IV-CSE-A", "III", 7, "SPORTS", "Sports", "Mr N Insozhan", "Playground");
add("IV-CSE-A", "III", 8, "SPORTS", "Sports", "Mr N Insozhan", "Playground");

// DO IV: PE-V LAB (1,2), PE-VI (3), LIB (4), OE-III (5), SPM (6), OE-II (7), PPT (8)
add("IV-CSE-A", "IV", 1, "PE-V LAB", "Professional Elective - V Lab", "Dr M Victor Jose", "Bay 3", "lab1");
add("IV-CSE-A", "IV", 2, "PE-V LAB", "Professional Elective - V Lab", "Dr M Victor Jose", "Bay 3", "lab1");
add("IV-CSE-A", "IV", 3, "PE-VI", "Professional Elective - VI", "Ms A Vinothini", "I 305", "pe");
add("IV-CSE-A", "IV", 4, "LIB", "Library", "Ms M K Geedtha", "I 305");
add("IV-CSE-A", "IV", 5, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "I 305", "oe");
add("IV-CSE-A", "IV", 6, "231CB721", "Software Project Management", "Dr B Swaminathan", "I 305");
add("IV-CSE-A", "IV", 7, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 305", "oe");
add("IV-CSE-A", "IV", 8, "PPT", "Placement Training", "Placement Trainer", "I 305");

// DO V: PEHV (1), PPT (2), OE-III (3), PE-V (4), OE-II (5), SPM (6), PROJECT PHASE-I (7,8)
add("IV-CSE-A", "V", 1, "231HS701", "Professional Ethics and Human Values", "Dr M Buvana", "I 305");
add("IV-CSE-A", "V", 2, "PPT", "Placement Training", "Placement Trainer", "I 305");
add("IV-CSE-A", "V", 3, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "I 305", "oe");
add("IV-CSE-A", "V", 4, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "I 305", "pe");
add("IV-CSE-A", "V", 5, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 305", "oe");
add("IV-CSE-A", "V", 6, "231CB721", "Software Project Management", "Dr B Swaminathan", "I 305");
add("IV-CSE-A", "V", 7, "231CS77A", "Project Phase -I", "Dr M Buvana", "Seminar Hall", "lab2");
add("IV-CSE-A", "V", 8, "231CS77A", "Project Phase -I", "Dr M Buvana", "Seminar Hall", "lab2");

// ==========================================
// PAGE 8: IV-CSE-B (Semester VII, Room I 306)
// ==========================================
// Subjects & Faculty:
// 231HS701 PEHV - Ms J Bebitha
// 231CB721 SPM - Dr E Mercy Beullah
// Professional Electives PE-5 & PE-VI
// Open Electives OE-II & OE-III
// 231CS77A Project Phase -I - Mr S Vinod
// SPORTS - Mr N Insozhan
// LIBRARY - Ms S Vaitheeshwari
// PPT - Placement Trainer

// DO I: OE-II (1), PEHV (2), PE-V (3), SPM (4), PE-VI (5), PEHV (6), OE-III LAB (7,8)
add("IV-CSE-B", "I", 1, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 306", "oe");
add("IV-CSE-B", "I", 2, "231HS701", "Professional Ethics and Human Values", "Ms J Bebitha", "I 306");
add("IV-CSE-B", "I", 3, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "I 306", "pe");
add("IV-CSE-B", "I", 4, "231CB721", "Software Project Management", "Dr E Mercy Beullah", "I 306");
add("IV-CSE-B", "I", 5, "PE-VI", "Professional Elective - VI", "Dr M Victor Jose", "I 306", "pe");
add("IV-CSE-B", "I", 6, "231HS701", "Professional Ethics and Human Values", "Ms J Bebitha", "I 306");
add("IV-CSE-B", "I", 7, "OE-III LAB", "Open Elective - III Lab", "Dr. R.Kalpana", "Class Room", "lab1");
add("IV-CSE-B", "I", 8, "OE-III LAB", "Open Elective - III Lab", "Dr. R.Kalpana", "Class Room", "lab1");

// DO II: PROJECT PHASE-I (1,2), OE-II (3), PEHV (4), OE-III (5), SPM (6), PPT (7), PE-V (8)
add("IV-CSE-B", "II", 1, "231CS77A", "Project Phase -I", "Mr S Vinod", "Seminar Hall", "lab2");
add("IV-CSE-B", "II", 2, "231CS77A", "Project Phase -I", "Mr S Vinod", "Seminar Hall", "lab2");
add("IV-CSE-B", "II", 3, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 306", "oe");
add("IV-CSE-B", "II", 4, "231HS701", "Professional Ethics and Human Values", "Ms J Bebitha", "I 306");
add("IV-CSE-B", "II", 5, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "I 306", "oe");
add("IV-CSE-B", "II", 6, "231CB721", "Software Project Management", "Dr E Mercy Beullah", "I 306");
add("IV-CSE-B", "II", 7, "PPT", "Placement Training", "Placement Trainer", "I 306");
add("IV-CSE-B", "II", 8, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "I 306", "pe");

// DO III: PE-VI (1), SPM (2), PE-VI LAB (3,4), OE-II (5), PEHV (6), SPORTS (7,8)
add("IV-CSE-B", "III", 1, "PE-VI", "Professional Elective - VI", "Ms S Vaitheeshwari", "I 306", "pe");
add("IV-CSE-B", "III", 2, "231CB721", "Software Project Management", "Dr E Mercy Beullah", "I 306");
add("IV-CSE-B", "III", 3, "PE-VI LAB", "Professional Elective - VI Lab", "Dr M Victor Jose", "Bay 3", "lab1");
add("IV-CSE-B", "III", 4, "PE-VI LAB", "Professional Elective - VI Lab", "Dr M Victor Jose", "Bay 3", "lab1");
add("IV-CSE-B", "III", 5, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 306", "oe");
add("IV-CSE-B", "III", 6, "231HS701", "Professional Ethics and Human Values", "Ms J Bebitha", "I 306");
add("IV-CSE-B", "III", 7, "SPORTS", "Sports", "Mr N Insozhan", "Playground");
add("IV-CSE-B", "III", 8, "SPORTS", "Sports", "Mr N Insozhan", "Playground");

// DO IV: PE-V LAB (1,2), PE-VI (3), SPM (4), OE-III (5), PPT (6), OE-II (7), LIB (8)
add("IV-CSE-B", "IV", 1, "PE-V LAB", "Professional Elective - V Lab", "Dr M Victor Jose", "Bay 3", "lab1");
add("IV-CSE-B", "IV", 2, "PE-V LAB", "Professional Elective - V Lab", "Dr M Victor Jose", "Bay 3", "lab1");
add("IV-CSE-B", "IV", 3, "PE-VI", "Professional Elective - VI", "Ms A Vinothini", "I 306", "pe");
add("IV-CSE-B", "IV", 4, "231CB721", "Software Project Management", "Dr E Mercy Beullah", "I 306");
add("IV-CSE-B", "IV", 5, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "I 306", "oe");
add("IV-CSE-B", "IV", 6, "PPT", "Placement Training", "Placement Trainer", "I 306");
add("IV-CSE-B", "IV", 7, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 306", "oe");
add("IV-CSE-B", "IV", 8, "LIB", "Library", "Ms S Vaitheeshwari", "I 306");

// DO V: SPM (1), PPT (2), OE-III (3), PE-V (4), OE-II (5), PEHV (6), PROJECT PHASE-I (7,8)
add("IV-CSE-B", "V", 1, "231CB721", "Software Project Management", "Dr E Mercy Beullah", "I 306");
add("IV-CSE-B", "V", 2, "PPT", "Placement Training", "Placement Trainer", "I 306");
add("IV-CSE-B", "V", 3, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "I 306", "oe");
add("IV-CSE-B", "V", 4, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "I 306", "pe");
add("IV-CSE-B", "V", 5, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "I 306", "oe");
add("IV-CSE-B", "V", 6, "231HS701", "Professional Ethics and Human Values", "Ms J Bebitha", "I 306");
add("IV-CSE-B", "V", 7, "231CS77A", "Project Phase -I", "Mr S Vinod", "Bay 3", "lab2");
add("IV-CSE-B", "V", 8, "231CS77A", "Project Phase -I", "Mr S Vinod", "Bay 3", "lab2");

// ==========================================
// PAGE 9: IV-CSE-C (Semester VII, Room J 301)
// ==========================================
// Subjects & Faculty:
// 231HS701 PEHV - Ms M Aswin Rani
// 231CB721 SPM - Ms M.K. Geedtha
// Professional Electives PE-5 & PE-VI
// Open Electives OE-II & OE-III
// 231CS77A Project Phase -I - Dr. E. Mercy Beulah
// SPORTS - Mr N Insozhan
// LIBRARY - Ms P Selvarathinam
// PPT - Placement Trainer

// DO I: OE-II (1), PEHV (2), PE-V (3), PPT (4), PE-VI (5), SPM (6), OE-III LAB (7,8)
add("IV-CSE-C", "I", 1, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "J 301", "oe");
add("IV-CSE-C", "I", 2, "231HS701", "Professional Ethics and Human Values", "Ms M Aswin Rani", "J 301");
add("IV-CSE-C", "I", 3, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "J 301", "pe");
add("IV-CSE-C", "I", 4, "PPT", "Placement Training", "Placement Trainer", "J 301");
add("IV-CSE-C", "I", 5, "PE-VI", "Professional Elective - VI", "Dr M Victor Jose", "J 301", "pe");
add("IV-CSE-C", "I", 6, "231CB721", "Software Project Management", "Ms M.K. Geedtha", "J 301");
add("IV-CSE-C", "I", 7, "OE-III LAB", "Open Elective - III Lab", "Dr. R.Kalpana", "Class Room", "lab1");
add("IV-CSE-C", "I", 8, "OE-III LAB", "Open Elective - III Lab", "Dr. R.Kalpana", "Class Room", "lab1");

// DO II: PROJECT PHASE-I (1,2), OE-II (3), SPM (4), OE-III (5), PEHV (6), PPT (7), PE-V (8)
add("IV-CSE-C", "II", 1, "231CS77A", "Project Phase -I", "Dr. E. Mercy Beulah", "Class Room", "lab2");
add("IV-CSE-C", "II", 2, "231CS77A", "Project Phase -I", "Dr. E. Mercy Beulah", "Class Room", "lab2");
add("IV-CSE-C", "II", 3, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "J 301", "oe");
add("IV-CSE-C", "II", 4, "231CB721", "Software Project Management", "Ms M.K. Geedtha", "J 301");
add("IV-CSE-C", "II", 5, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "J 301", "oe");
add("IV-CSE-C", "II", 6, "231HS701", "Professional Ethics and Human Values", "Ms M Aswin Rani", "J 301");
add("IV-CSE-C", "II", 7, "PPT", "Placement Training", "Placement Trainer", "J 301");
add("IV-CSE-C", "II", 8, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "J 301", "pe");

// DO III: PE-VI (1), SPM (2), PE-VI LAB (3,4), OE-II (5), PEHV (6), SPORTS (7,8)
add("IV-CSE-C", "III", 1, "PE-VI", "Professional Elective - VI", "Ms S Vaitheeshwari", "J 301", "pe");
add("IV-CSE-C", "III", 2, "231CB721", "Software Project Management", "Ms M.K. Geedtha", "J 301");
add("IV-CSE-C", "III", 3, "PE-VI LAB", "Professional Elective - VI Lab", "Dr M Victor Jose", "Research Lab", "lab1");
add("IV-CSE-C", "III", 4, "PE-VI LAB", "Professional Elective - VI Lab", "Dr M Victor Jose", "Research Lab", "lab1");
add("IV-CSE-C", "III", 5, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "J 301", "oe");
add("IV-CSE-C", "III", 6, "231HS701", "Professional Ethics and Human Values", "Ms M Aswin Rani", "J 301");
add("IV-CSE-C", "III", 7, "SPORTS", "Sports", "Mr N Insozhan", "Playground");
add("IV-CSE-C", "III", 8, "SPORTS", "Sports", "Mr N Insozhan", "Playground");

// DO IV: PE-V LAB (1,2), PE-VI (3), PEHV (4), OE-III (5), SPM (6), OE-II (7), PPT (8)
add("IV-CSE-C", "IV", 1, "PE-V LAB", "Professional Elective - V Lab", "Dr M Victor Jose", "Bay 4", "lab1");
add("IV-CSE-C", "IV", 2, "PE-V LAB", "Professional Elective - V Lab", "Dr M Victor Jose", "Bay 4", "lab1");
add("IV-CSE-C", "IV", 3, "PE-VI", "Professional Elective - VI", "Ms A Vinothini", "J 301", "pe");
add("IV-CSE-C", "IV", 4, "231HS701", "Professional Ethics and Human Values", "Ms M Aswin Rani", "J 301");
add("IV-CSE-C", "IV", 5, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "J 301", "oe");
add("IV-CSE-C", "IV", 6, "231CB721", "Software Project Management", "Ms M.K. Geedtha", "J 301");
add("IV-CSE-C", "IV", 7, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "J 301", "oe");
add("IV-CSE-C", "IV", 8, "PPT", "Placement Training", "Placement Trainer", "J 301");

// DO V: PROJECT PHASE-I (1,2), OE-III (3), PE-V (4), OE-II (5), LIB (6), SPM (7), PEHV (8)
add("IV-CSE-C", "V", 1, "231CS77A", "Project Phase -I", "Dr. E. Mercy Beulah", "Bay3 Lab", "lab2");
add("IV-CSE-C", "V", 2, "231CS77A", "Project Phase -I", "Dr. E. Mercy Beulah", "Bay3 Lab", "lab2");
add("IV-CSE-C", "V", 3, "OE-III", "Open Elective - III", "Dr. R.Kalpana", "J 301", "oe");
add("IV-CSE-C", "V", 4, "PE-5", "Professional Elective - V", "Dr M Victor Jose", "J 301", "pe");
add("IV-CSE-C", "V", 5, "OE-II", "Open Elective - II", "Dr. Vasantharaj S", "J 301", "oe");
add("IV-CSE-C", "V", 6, "LIB", "Library", "Ms P Selvarathinam", "J 301");
add("IV-CSE-C", "V", 7, "231CB721", "Software Project Management", "Ms M.K. Geedtha", "J 301");
add("IV-CSE-C", "V", 8, "231HS701", "Professional Ethics and Human Values", "Ms M Aswin Rani", "J 301");

async function main() {
  console.log(`Starting direct database import of ${entries.length} timetable entries across 9 classes...`);

  // Clean existing entries for these classes to prevent duplicates
  const classIds = [...new Set(entries.map(e => e.classId))];
  console.log("Target Classes:", classIds);

  const deleted = await prisma.timetableEntry.deleteMany({
    where: { classId: { in: classIds } }
  });
  console.log(`Cleared ${deleted.count} previous entries for these classes.`);

  // Batch insert all 360 official slots
  const inserted = await prisma.timetableEntry.createMany({
    data: entries.map(e => ({
      classId: e.classId,
      dayOrder: e.dayOrder,
      period: e.period,
      timeRange: TIMINGS[e.period] || `Period ${e.period}`,
      subjectCode: e.subjectCode,
      subjectName: e.subjectName,
      facultyName: e.facultyName,
      roomNo: e.roomNo,
      category: e.category,
      academicYear: e.academicYear,
      semType: e.semType,
    }))
  });

  console.log(`SUCCESS! Inserted ${inserted.count} master timetable records directly into the database!`);
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});

