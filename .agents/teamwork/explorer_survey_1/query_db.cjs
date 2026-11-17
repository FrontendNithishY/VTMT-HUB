const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userModes = await prisma.userMode.findMany();
  console.log('USER_MODES:', JSON.stringify(userModes, null, 2));

  const deptCount = await prisma.department.count();
  const depts = await prisma.department.findMany();
  console.log('DEPTS:', JSON.stringify(depts, null, 2));

  const ttCount = await prisma.timetableEntry.count();
  console.log('TIMETABLE_COUNT:', ttCount);
  const sampleTT = await prisma.timetableEntry.findMany({ take: 3 });
  console.log('SAMPLE_TT:', JSON.stringify(sampleTT, null, 2));

  // Check unique classes in TimetableEntry
  const classes = await prisma.timetableEntry.findMany({
    select: { classId: true },
    distinct: ['classId']
  });
  console.log('DISTINCT_CLASSES_IN_TT:', JSON.stringify(classes.map(c => c.classId), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
