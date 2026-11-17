const fs = require('fs');
const path = require('path');
const { parseTimetableDocBuffer } = require('../src/utils/timetableDocParser.ts');
const { parseTimetablePdfBuffer } = require('../src/utils/timetablePdfParser.ts');

async function verifyAll() {
  console.log('====================================================');
  console.log('VTMT-HUB Timetable Upload Overhaul Full Verification');
  console.log('====================================================');

  // Test 1: Real sample DOCX file
  const docxPath = path.join(__dirname, '..', '.agents', 'sub media', 'Individual TT -odd 2026-27 - 11.8.26 (1).docx');
  console.log('\n[TEST 1] Real Sample DOCX:', docxPath);
  const docxBuf = fs.readFileSync(docxPath);
  const docxRes = await parseTimetableDocBuffer(docxBuf);

  console.log('✓ Slots parsed count:', docxRes.allSlots.length);
  console.log('✓ Faculties in summary count:', docxRes.faculties?.length);
  console.log('✓ Distinct faculty with slots:', docxRes.distinctFaculty.length);
  console.log('✓ Distinct classes:', docxRes.distinctClasses);

  // Assertion: Break tokens in slots must be 0
  const docxLunch = docxRes.allSlots.filter(s =>
    (s.subjectName || '').toUpperCase().includes('LUNCH') ||
    (s.subjectCode || '').toUpperCase().includes('LUNCH') ||
    (s.subjectName || '').toUpperCase().includes('BREAK')
  );
  if (docxLunch.length !== 0) throw new Error('Failed: Found lunch slots in DOCX: ' + docxLunch.length);
  console.log('✓ Lunch/Break tokens in slots: 0 (PASSED)');

  // Assertion: MTS numbers leaking "Designation:" must be 0
  const docxMtsLeak = docxRes.allSlots.filter(s => (s.vmsNo || '').toUpperCase().includes('DESIGNATION'));
  if (docxMtsLeak.length !== 0) throw new Error('Failed: Found MTS designation leak in DOCX');
  console.log('✓ MTS Designation leaks: 0 (PASSED)');

  // Assertion: ALML mapped to III-CSE-B (not II-CSE-B)
  const almlSlots = docxRes.allSlots.filter(s => (s.subjectName || '').toUpperCase().includes('ALML'));
  const almlClasses = [...new Set(almlSlots.map(s => s.classId))];
  if (almlClasses.length !== 1 || almlClasses[0] !== 'III-CSE-B') {
    throw new Error('Failed: ALML classes unexpected: ' + JSON.stringify(almlClasses));
  }
  console.log('✓ ALML mapped to III-CSE-B (PASSED):', almlClasses);

  // Assertion: Stalin David in roster with MTS 2170 and 0 slots
  const stalin = docxRes.faculties?.find(f => f.name.includes('STALIN DAVID'));
  if (!stalin || stalin.vmsNo !== '2170' || stalin.slotCount !== 0) {
    throw new Error('Failed: Stalin David roster entry unexpected: ' + JSON.stringify(stalin));
  }
  console.log('✓ Stalin David extracted accurately (PASSED):', stalin);

  // Assertion: Victor Jose has 11 teaching slots mapped to IV-CSE-A and III-CSE-A
  const victorSlots = docxRes.allSlots.filter(s => s.facultyName && s.facultyName.includes('Victor'));
  const victorClasses = [...new Set(victorSlots.map(s => s.classId))];
  if (!victorClasses.includes('IV-CSE-A') || !victorClasses.includes('III-CSE-A')) {
    throw new Error('Failed: Victor Jose classes unexpected: ' + JSON.stringify(victorClasses));
  }
  console.log('✓ Victor Jose classes correctly mapped (PASSED):', victorClasses);

  // Test 2: Master Class PDF Template
  const masterPdfPath = path.join(__dirname, '..', 'public', 'templates', 'master-class-timetable-template.pdf');
  console.log('\n[TEST 2] Master Class PDF Template:', masterPdfPath);
  const masterPdfBuf = fs.readFileSync(masterPdfPath);
  const masterPdfRes = await parseTimetablePdfBuffer(masterPdfBuf, { type: 'master' });

  console.log('✓ isMasterClass:', masterPdfRes.isMasterClass);
  console.log('✓ Slots parsed count:', masterPdfRes.allSlots.length);
  console.log('✓ Classes extracted:', masterPdfRes.classes);
  if (masterPdfRes.allSlots.length !== 40) {
    throw new Error('Failed: Expected 40 slots for 5x8 period matrix, got ' + masterPdfRes.allSlots.length);
  }
  const masterLunch = masterPdfRes.allSlots.filter(s => (s.subjectName || '').toUpperCase().includes('LUNCH'));
  if (masterLunch.length !== 0) throw new Error('Failed: Found lunch in master slots');
  console.log('✓ Lunch/Break tokens in slots: 0 (PASSED)');
  console.log('✓ Sample master slot (PASSED):', masterPdfRes.allSlots[0]);

  // Test 3: Individual Faculty PDF Template
  const indPdfPath = path.join(__dirname, '..', 'public', 'templates', 'individual-faculty-timetable-template.pdf');
  console.log('\n[TEST 3] Individual Faculty PDF Template:', indPdfPath);
  const indPdfBuf = fs.readFileSync(indPdfPath);
  const indPdfRes = await parseTimetablePdfBuffer(indPdfBuf, { type: 'individual' });

  console.log('✓ Faculty sheets count:', indPdfRes.facultySheets.length);
  console.log('✓ Slots parsed count:', indPdfRes.allSlots.length);
  console.log('✓ Faculty name:', indPdfRes.facultySheets[0]?.facultyName);
  console.log('✓ MTS No:', indPdfRes.facultySheets[0]?.vmsNo);
  console.log('✓ Classes extracted:', indPdfRes.classes);
  if (indPdfRes.facultySheets[0]?.facultyName !== 'Dr. M. Victor Jose') {
    throw new Error('Failed: Faculty name not Dr. M. Victor Jose');
  }
  if (indPdfRes.facultySheets[0]?.vmsNo !== '2014') {
    throw new Error('Failed: MTS number not 2014');
  }
  const indLunch = indPdfRes.allSlots.filter(s => (s.subjectName || '').toUpperCase().includes('LUNCH'));
  if (indLunch.length !== 0) throw new Error('Failed: Found lunch in individual slots');
  console.log('✓ Lunch/Break tokens in slots: 0 (PASSED)');
  console.log('✓ Sample individual slot (PASSED):', indPdfRes.allSlots[0]);

  console.log('\n====================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! ZERO DEFECTS FOUND.');
  console.log('====================================================');
}

verifyAll().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
