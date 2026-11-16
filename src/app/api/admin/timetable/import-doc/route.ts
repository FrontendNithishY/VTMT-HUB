import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { parseTimetableDocBuffer } from "@/utils/timetableDocParser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return NextResponse.json({ success: false, error: authorization.error }, { status: authorization.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No Word document uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".doc")) {
      return NextResponse.json(
        { success: false, error: "Uploaded file must be a Word document (.docx or .doc)" },
        { status: 400 }
      );
    }

    // Disambiguate timetableType and writeStrategy
    const rawType = formData.get("timetableType") || formData.get("type") || formData.get("docType");
    const rawMode = formData.get("mode");
    const rawStrategy = formData.get("strategy") || formData.get("writeStrategy") || formData.get("dbMode");
    const academicYear = (formData.get("academicYear") as string) || "2026-2027";
    const semType = ((formData.get("semType") as string) || "ODD").toUpperCase() as "ODD" | "EVEN";

    let timetableType: "master" | "individual" = "master";
    if (rawType === "individual" || rawType === "master") {
      timetableType = rawType;
    } else if (rawMode === "individual" || rawMode === "master") {
      timetableType = rawMode;
    }

    let writeStrategy: "replace" | "append" = "append";
    if (rawStrategy === "replace" || rawStrategy === "append") {
      writeStrategy = rawStrategy;
    } else if (rawMode === "replace") {
      writeStrategy = "replace";
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { allSlots, faculties, distinctClasses, distinctFaculty, isMasterClass, warnings } =
      await parseTimetableDocBuffer(buffer, { type: timetableType, academicYear, semType });

    if (allSlots.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            timetableType === "master"
              ? "No valid class timetables could be parsed. Ensure the file contains standard class grids (Days I-V x Periods 1-8) and class headers."
              : "No valid faculty timetables could be parsed. Ensure the file contains faculty information headers (Name, MTS No) and period matrices.",
        },
        { status: 422 }
      );
    }

    // Scoped Replacement Isolation
    if (writeStrategy === "replace") {
      const targets: any[] = [];

      if (timetableType === "master" || isMasterClass) {
        // Master mode: delete strictly by class IDs present in this document
        if (distinctClasses.length > 0) {
          targets.push({ classId: { in: distinctClasses } });
        }
      } else {
        // Individual mode: delete strictly by faculty names and MTS numbers present in this document
        const vmsNumbers = [
          ...new Set(allSlots.map((slot) => slot.vmsNo).filter((v): v is string => Boolean(v))),
        ];
        if (distinctFaculty.length > 0) {
          targets.push({ facultyName: { in: distinctFaculty } });
        }
        if (vmsNumbers.length > 0) {
          targets.push({ vmsNo: { in: vmsNumbers } });
        }
      }

      if (targets.length > 0) {
        try {
          const oldEntries = await prisma.timetableEntry.findMany({ where: { OR: targets } });
          if (oldEntries.length > 0) {
            await (prisma as any).timetableHistory.createMany({
              data: oldEntries.map((e: any) => {
                let yr = 2;
                if (e.classId && e.classId.startsWith("I-")) yr = 1;
                else if (e.classId && e.classId.startsWith("II-")) yr = 2;
                else if (e.classId && e.classId.startsWith("III-")) yr = 3;
                else if (e.classId && e.classId.startsWith("IV-")) yr = 4;
                return {
                  classId: e.classId,
                  academicYear: e.academicYear || academicYear,
                  year: yr,
                  semType: e.semType || semType,
                  dayOrder: e.dayOrder,
                  period: e.period,
                  timeRange: e.timeRange,
                  subjectCode: e.subjectCode,
                  subjectName: e.subjectName,
                  facultyName: e.facultyName,
                  roomNo: e.roomNo,
                  vmsNo: e.vmsNo,
                  category: e.category,
                };
              }),
            });
          }
        } catch (hErr) {
          console.warn("Failed to archive timetable history:", hErr);
        }
        await prisma.timetableEntry.deleteMany({ where: { OR: targets } });
      }
    }

    // Persist to DB with academicYear and semType populated
    const dbEntries = allSlots.map((slot) => ({
      classId: slot.classId,
      dayOrder: slot.dayOrder,
      period: slot.period,
      timeRange: slot.timeRange,
      subjectCode: slot.subjectCode,
      subjectName: slot.subjectName,
      facultyName: slot.facultyName,
      roomNo: slot.roomNo,
      vmsNo: slot.vmsNo || null,
      category: slot.category || null,
      academicYear: slot.academicYear || academicYear,
      semType: slot.semType || semType,
    }));

    const result = await prisma.timetableEntry.createMany({ data: dbEntries });

    try {
      await prisma.auditLog.create({
        data: {
          action: "DOC_TIMETABLE_IMPORT",
          details: `Imported ${result.count} timetable slots from Word document (${file.name}). Mode: ${timetableType}, Strategy: ${writeStrategy}.`,
          performedBy: authorization.email,
        },
      });
    } catch (auditErr) {
      console.warn("Failed to create audit log for DOC import:", auditErr);
    }

    return NextResponse.json({
      success: true,
      timetableType,
      writeStrategy,
      isMasterClass: timetableType === "master" || isMasterClass,
      count: result.count,
      totalProcessed: allSlots.length,
      classCount: distinctClasses.length,
      classes: distinctClasses,
      facultyCount: faculties?.length || distinctFaculty.length,
      faculty: distinctFaculty,
      faculties,
      sampleSlots: allSlots.slice(0, 10),
      warnings,
      message: `Successfully imported ${result.count} timetable entries from Word document (${timetableType} mode, ${writeStrategy}).`,
    });
  } catch (error: any) {
    console.error("Error importing timetable from Word document:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process Word document" },
      { status: 500 }
    );
  }
}
