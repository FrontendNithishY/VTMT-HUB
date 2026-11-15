import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { requireAdmin } from "@/lib/adminAuth";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds execution limit for bulk batching

type Role = "STUDENT" | "FACULTY" | "HOD" | "ADMIN";

function normalizeRole(value: unknown): Role {
  const role = String(value ?? "").trim().toUpperCase();
  if (role === "HOD" || role.includes("HEAD")) return "HOD";
  if (role === "FACULTY" || role === "TEACHER" || role === "STAFF" || role.includes("PROF")) return "FACULTY";
  if (role === "ADMIN" || role.includes("ADMINISTRATOR")) return "ADMIN";
  return "STUDENT";
}

function field(row: Record<string, unknown>, ...names: string[]) {
  const aliases = new Set(names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const key = Object.keys(row).find((name) => aliases.has(name.toLowerCase().replace(/[^a-z0-9]/g, "")));
  return {
    provided: key !== undefined,
    value: key === undefined ? undefined : String(row[key] ?? "").trim(),
  };
}

function nullableText(value: string | undefined) {
  return value?.trim() || null;
}

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return NextResponse.json({ success: false, error: authorization.error }, { status: authorization.status });
  }

  try {
    const body = await req.json();
    const rows = body.users;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No user rows provided in request" }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // Pre-create any distinct departments upfront in parallel (1 query instead of 500)
    const distinctDepts = Array.from(new Set(
      rows.map((r: any) => nullableText(field(r, "department", "dept").value)?.toUpperCase()).filter(Boolean)
    )) as string[];

    if (distinctDepts.length > 0) {
      await Promise.all(
        distinctDepts.map(code => 
          prisma.department.upsert({
            where: { code },
            update: {},
            create: { code, name: `${code} Department` }
          }).catch(() => null)
        )
      );
    }

    // 1. Pre-fetch all existing users in ONE fast query to avoid thousands of roundtrips
    const allEmails = rows.map((r: any) => String(field(r, "email", "emailid", "email address", "email id").value ?? "").toLowerCase()).filter(Boolean);
    const allVmNos = rows.map((r: any) => nullableText(field(r, "vmNo", "vmno", "vms no", "mts no").value)).filter(Boolean) as string[];

    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: allEmails } },
          { vmNo: { in: allVmNos } },
          { vmNo: { in: allVmNos.map(v => v.startsWith("VM") ? v.replace(/^VM/i, "") : `VM${v}`) } }
        ]
      },
      select: { id: true, email: true, vmNo: true }
    });

    const userByEmail = new Map<string, { id: string, email: string, vmNo: string | null }>();
    const userByVm = new Map<string, { id: string, email: string, vmNo: string | null }>();

    existingUsers.forEach(u => {
      if (u.email) userByEmail.set(u.email.toLowerCase(), u);
      if (u.vmNo) {
        userByVm.set(u.vmNo, u);
        userByVm.set(u.vmNo.replace(/^VM/i, ""), u);
      }
    });

    // 2. Process rows with concurrent studentProfile and user operations per user
    await Promise.all(rows.map(async (rawRow: any, index: number) => {
      const row = rawRow as Record<string, unknown>;
      const rowNum = index + 2;
      const email = String(field(row, "email", "emailid", "email address", "email id").value ?? "").toLowerCase();
      const name = String(field(row, "name", "full name", "user name").value ?? "").trim();
      const role = normalizeRole(field(row, "role", "user role", "usermode").value);
      let vmNo = nullableText(field(row, "vmNo", "vmno", "vms no", "mts no").value);
      if (vmNo && role !== "ADMIN") {
        const upper = vmNo.toUpperCase();
        if (role === "STUDENT") {
          vmNo = upper.startsWith("VM") ? upper : `VM${vmNo.replace(/^#+/, "")}`;
        } else {
          vmNo = upper.startsWith("MTS") ? upper : `MTS${vmNo.replace(/^#+/, "")}`;
        }
      }
      const passwordValue = nullableText(field(row, "password", "pass").value);
      const password = encrypt(passwordValue || "Welcome@123");
      const departmentField = field(row, "department", "dept");
      const department = nullableText(departmentField.value)?.toUpperCase() ?? null;

      if (!email || !name) {
        errors.push(`Row ${rowNum}: skipped because ${!email ? "email" : "name"} is missing`);
        return;
      }

      // Memory lookup: zero roundtrip delay!
      const existingUser = userByEmail.get(email) || (vmNo ? (userByVm.get(vmNo) || userByVm.get(vmNo.replace(/^VM/i, ""))) : null);

      let userOp: Promise<any>;
      if (!existingUser) {
        const id = crypto.randomUUID();
        userOp = prisma.user.create({
          data: {
            id,
            email,
            name,
            password,
            role,
            status: "ACTIVE",
            vmNo,
          },
        }).then(newUser => {
          userByEmail.set(email, newUser);
          if (vmNo) userByVm.set(vmNo, newUser);
          createdCount++;
        }).catch(async (createErr: any) => {
          if (createErr?.code === 'P2002' || String(createErr).includes('Unique constraint failed')) {
            const conflictUser = await prisma.user.findFirst({
              where: { OR: [{ email }, ...(vmNo ? [{ vmNo }] : [])] }
            });
            if (conflictUser) {
              await prisma.user.update({
                where: { id: conflictUser.id },
                data: {
                  name,
                  role,
                  email,
                  ...(vmNo ? { vmNo } : {}),
                  ...(passwordValue ? { password } : {}),
                }
              });
              userByEmail.set(email, conflictUser);
              if (vmNo) userByVm.set(vmNo, conflictUser);
              updatedCount++;
            }
          }
        });
      } else {
        userOp = prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            email,
            role,
            ...(vmNo ? { vmNo } : {}),
            ...(passwordValue ? { password } : {}),
          },
        }).then(() => {
          updatedCount++;
        });
      }

      const effectiveVmNo = vmNo;
      const designationField = field(row, "designation");
      const designation = nullableText(designationField.value);

      const secondaryOps: Promise<any>[] = [userOp];

      if (role === "STUDENT") {
        const rollNumberField = field(row, "rollNumber", "roll number", "roll no");
        const yearField = field(row, "year");
        const sectionField = field(row, "section", "sec");
        const semesterField = field(row, "semester");
        const batchField = field(row, "batch");
        const parsedSemester = Number.parseInt(semesterField.value ?? "", 10);
        const createProfile = {
          userEmail: email,
          rollNumber: nullableText(rollNumberField.value),
          department,
          year: nullableText(yearField.value),
          section: nullableText(sectionField.value),
          semester: Number.isFinite(parsedSemester) && semesterField.value ? parsedSemester : null,
          batch: nullableText(batchField.value),
        };
        const updateProfile = {
          ...(rollNumberField.value ? { rollNumber: rollNumberField.value } : {}),
          ...(department ? { department } : {}),
          ...(nullableText(yearField.value) ? { year: yearField.value } : {}),
          ...(nullableText(sectionField.value) ? { section: sectionField.value } : {}),
          ...(Number.isFinite(parsedSemester) && semesterField.value ? { semester: parsedSemester } : {}),
          ...(nullableText(batchField.value) ? { batch: batchField.value } : {}),
        };
        secondaryOps.push(
          prisma.studentProfile.upsert({
            where: { userEmail: email },
            update: updateProfile,
            create: createProfile,
          }).catch(() => null)
        );
      } else if (role === "FACULTY" && effectiveVmNo) {
        const subjectFields = ["subject1", "subject2", "lab1", "additional1", "additional2"] as const;
        const assignments = Object.fromEntries(subjectFields.flatMap((key) => {
          const value = field(row, key);
          return value.value ? [[key, value.value]] : [];
        }));
        secondaryOps.push(
          prisma.facultyProfile.upsert({
            where: { vmNo: effectiveVmNo },
            update: { ...(department ? { department } : {}), ...(designation ? { designation } : {}), ...assignments },
            create: { vmNo: effectiveVmNo, department, designation },
          }).catch(() => null)
        );
      } else if (role === "HOD" && effectiveVmNo) {
        secondaryOps.push(
          prisma.hodProfile.upsert({
            where: { vmNo: effectiveVmNo },
            update: { ...(department ? { department } : {}), ...(designation ? { designation } : {}) },
            create: { vmNo: effectiveVmNo, department, designation },
          }).catch(() => null)
        );
      }

      if (effectiveVmNo) {
        secondaryOps.push(
          prisma.userMode.upsert({
            where: { vmno: effectiveVmNo },
            update: { emailid: email, ...(passwordValue ? { password } : {}), usermode: role },
            create: { vmno: effectiveVmNo, emailid: email, password, usermode: role },
          }).catch(() => null)
        );
      }

      await Promise.all(secondaryOps);
    }));

    try {
      await prisma.auditLog.create({
        data: {
          action: "EXCEL_BULK_USER_IMPORT",
          details: `Imported users from Excel. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${errors.length}`,
          performedBy: authorization.email,
        },
      });
    } catch (error) {
      console.warn("Audit log creation skipped:", error);
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      totalProcessed: rows.length,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Bulk User Import Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
