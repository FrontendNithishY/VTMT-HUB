// Client script to post entries from import-master-timetable to localhost:3000/api/admin/timetable/import-master
const fs = require('fs');

async function run() {
  const fileContent = fs.readFileSync('scripts/import-master-timetable.ts', 'utf8');

  // Regex extract entries from add(...) calls
  // add("II-CSE-A", "I", 1, "231CS301", "Digital Principles and Computer Organization", "Dr. Stalin David", "N 201");
  const regex = /add\(\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*"([^"]+)")?\s*\)/g;
  
  const TIMINGS = {
    1: "08:05 - 08:55",
    2: "08:55 - 09:45",
    3: "10:00 - 10:50",
    4: "10:50 - 11:40",
    5: "12:20 - 01:05",
    6: "01:05 - 01:50",
    7: "02:00 - 02:45",
    8: "02:45 - 03:30",
  };

  const entries = [];
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    const period = parseInt(match[3], 10);
    entries.push({
      classId: match[1],
      dayOrder: match[2],
      period: period,
      timeRange: TIMINGS[period] || `Period ${period}`,
      subjectCode: match[4],
      subjectName: match[5],
      facultyName: match[6],
      roomNo: match[7],
      category: match[8] || 'sub1',
      academicYear: '2026-2027',
      semType: 'ODD',
    });
  }

  console.log(`Parsed ${entries.length} slots from scripts/import-master-timetable.ts`);

  const response = await fetch('http://localhost:3000/api/admin/timetable/import-master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'vtmt-import-master-odd-2026',
      entries: entries
    })
  });

  const resJson = await response.json();
  console.log('Server response:', JSON.stringify(resJson, null, 2));
}

run().catch(console.error);

