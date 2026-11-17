const fs = require('fs');
const path = require('path');
const { parseTimetableDocBuffer } = require('../src/utils/timetableDocParser.ts');

async function testDocx() {
  const docxPath = path.join(__dirname, '..', '.agents', 'sub media', 'Individual TT -odd 2026-27 - 11.8.26 (1).docx');
  console.log('Testing real sample docx:', docxPath);
  const buf = fs.readFileSync(docxPath);
  const res = await parseTimetableDocBuffer(buf);

  console.log('Results:');
  console.log('  Total slots parsed:', res.allSlots.length);
  console.log('  Distinct classes:', res.distinctClasses);
  console.log('  Total faculties summary count:', res.faculties?.length);
  console.log('  Distinct faculty with slots:', res.distinctFaculty.length);

  // Check 1: Are there any break tokens in slots?
  const lunchSlots = res.allSlots.filter(s =>
    (s.subjectName || '').toUpperCase().includes('LUNCH') ||
    (s.subjectCode || '').toUpperCase().includes('LUNCH') ||
    (s.subjectName || '').toUpperCase().includes('BREAK')
  );
  console.log('  Lunch/Break slots (MUST BE 0):', lunchSlots.length);

  // Check 2: Are there any MTS numbers containing "Designation:"?
  const badMts = res.allSlots.filter(s => (s.vmsNo || '').toUpperCase().includes('DESIGNATION'));
  console.log('  MTS containing Designation: (MUST BE 0):', badMts.length);

  // Check 3: Check ALML class mapping
  const almlSlots = res.allSlots.filter(s => (s.subjectName || '').toUpperCase().includes('ALML'));
  console.log('  ALML slots count:', almlSlots.length);
  const almlClasses = [...new Set(almlSlots.map(s => s.classId))];
  console.log('  ALML classes (MUST BE [ "III-CSE-B" ]):', almlClasses);

  // Check 4: Check Dr. Stalin David
  const stalin = res.faculties?.find(f => f.name.includes('STALIN DAVID'));
  console.log('  Stalin David in roster:', stalin);

  // Check 5: Check Dr. M. Victor Jose
  const victorSlots = res.allSlots.filter(s => s.facultyName && s.facultyName.includes('Victor'));
  console.log('  Victor Jose slots count:', victorSlots.length);
  console.log('  Victor Jose classes:', [...new Set(victorSlots.map(s => s.classId))]);
}

testDocx().catch(console.error);
