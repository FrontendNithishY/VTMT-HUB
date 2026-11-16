# Project: VTMT-HUB Timetable Upload Enhancement

## Architecture
- **Framework**: Next.js (App Router), TypeScript, Prisma ORM (PostgreSQL), Tailwind CSS.
- **Upload Channels**:
  1. **Excel Upload (`.xlsx`, `.xls`, `.csv`)**: Fast spreadsheet parsing with column normalization, 10-row preview, and batch database import via `/api/admin/timetable/import-excel`.
  2. **Document & PDF Upload (`.pdf`, `.docx`, `.doc`)**: Dual-mode extraction via `/api/admin/timetable/import-pdf` and `/api/admin/timetable/import-doc`:
     - **Mode 1: Master Class Timetable**: 9-page college master class grids (Days I–V x Periods 1–8 for II-CSE-A/B/C, III-CSE-A/B/C, IV-CSE-A/B/C) with period coordinate binning and subject distribution mapping.
     - **Mode 2: Individual Faculty Timetable**: 33-faculty packets containing faculty metadata (Name, MTS ID, Designation), period matrices, and subject/lab mapping tables.
- **Database Model**: `TimetableEntry` (`classId`, `dayOrder`, `period`, `timeRange`, `subjectCode`, `subjectName`, `facultyName`, `roomNo`, `vmsNo`, `category`, `academicYear`, `semType`) with `TimetableHistory` archival.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Excel Upload Separation | Restrict `AdminTimetableExcelUpload.tsx` strictly to `.xlsx`, `.xls`, `.csv` (remove rogue `.docx` handler) | M1 | Survey (Explorer 3) |
| 2 | PDF Coordinate-Aware Grid Parser | Replace flat text splitter in `timetablePdfParser.ts` with coordinate-based extraction (`pagerender`) supporting 2D period grids for both Master Class and Individual Faculty | M1 | Survey (Explorer 1) |
| 3 | PDF Template XRef Integrity & Self-Healing | Fix 20-byte XRef lines in `scripts/generate-templates.cjs` and add transparent XRef self-healing in parser | M1 | Survey (Explorer 1) |
| 4 | DOCX Token Hardening & Break Stripping | Collapse all whitespace in break cells so vertical `"L\nU\nN\nC\nH\nB\nR\nE\nA\nK"` -> `"LUNCHBREAK"` is filtered cleanly | M1 | Survey (Explorer 1) |
| 5 | DOCX Matrix Header & MTS Parsing | Parse Word header tables as 2D cell matrices instead of greedy regex to stop MTS from leaking `"Designation:"` on empty cells | M1 | Survey (Explorer 1) |
| 6 | Subject Mapping Priority Over Bare Section | Prioritize `facultySubjectMap` lookup before bare section regex in `timetableDocParser.ts` to prevent Year II corruption for 3rd/4th year courses | M1 | Survey (Explorer 1) |
| 7 | Master Class DOCX Parser | Support Master Class Word documents containing 9-class grids and subject distribution tables | M1 | Survey (Explorer 1) |
| 8 | API Parameter Disambiguation | Update `import-doc/route.ts` and `import-pdf/route.ts` to accept `timetableType: "master" | "individual"` and `writeStrategy: "replace" | "append"` | M1 | Survey (Explorer 2) |
| 9 | API Replacement Scope Isolation | In `master` mode, replace entries strictly by `classId`; in `individual` mode, replace strictly by `facultyName` and `vmsNo` (prevent accidental class deletion) | M1 | Survey (Explorer 2) |
| 10 | API Academic Year & Sem Type Persistence | Persist `academicYear` and `semType` in `import-pdf/route.ts` and `import-doc/route.ts` | M1 | Survey (Explorer 2) |
| 11 | Unified API Response Contract | Standardize response schema across PDF and DOC routes with `type`, `count`, `classes`, `faculty`, `sampleSlots`, `faculties` | M1 | Survey (Explorer 2) |
| 12 | UI Dual Sub-Tab Architecture | Implement Master Class vs Individual Faculty sub-tabs in `AdminTimetablePdfUpload.tsx` with contextual templates, drag-and-drop zones, and clear instructions | M1 | Survey (Explorer 3) |
| 13 | Interactive Post-Extraction Previews | Render 9-class interactive period matrix grid for Master Class uploads and 33-faculty directory with expandable weekly matrices for Individual Faculty uploads | M1 | Survey (Explorer 3) |
| 14 | TypeScript & Build Verification | Clean build with zero TypeScript errors (`npx tsc --noEmit`) | M1 | Survey (All) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Complete Timetable Upload Overhaul | Parsers (PDF/DOCX hardening), API routes (mode & replace isolation), UI (Excel vs Doc/PDF with Master & Individual sub-tabs), and template fixes | None | IN_PROGRESS |

## Interface Contracts
### Client ↔ API (`POST /api/admin/timetable/import-doc` and `POST /api/admin/timetable/import-pdf`)
- **Request Form Data**:
  - `file`: File (Binary PDF or DOCX/DOC)
  - `type` or `timetableType`: `"master" | "individual"`
  - `mode` or `strategy`: `"replace" | "append"`
  - `academicYear`: `string` (e.g. `"2026-2027"`)
  - `semType`: `"ODD" | "EVEN"`
- **Response JSON**:
  ```typescript
  {
    success: boolean;
    timetableType: "master" | "individual";
    writeStrategy: "replace" | "append";
    isMasterClass: boolean;
    count: number;
    totalProcessed: number;
    classCount: number;
    classes: string[];
    facultyCount: number;
    faculty: string[];
    faculties?: Array<{
      name: string;
      vmsNo: string;
      designation: string;
      slotCount: number;
    }>;
    sampleSlots: Array<{
      classId: string | null;
      dayOrder: string | null;
      period: number | null;
      timeRange: string | null;
      subjectCode: string | null;
      subjectName: string | null;
      facultyName: string | null;
      vmsNo?: string | null;
      roomNo: string | null;
      category?: string | null;
    }>;
    warnings: string[];
    message: string;
  }
  ```

## Code Layout
- `src/utils/timetablePdfParser.ts`: PDF parser engine with coordinate-aware extraction for Master and Individual timetables.
- `src/utils/timetableDocParser.ts`: Word (.docx/.doc) parser engine with token collapsing, 2D matrix header parsing, and subject map priority.
- `src/app/api/admin/timetable/import-pdf/route.ts`: PDF upload API endpoint.
- `src/app/api/admin/timetable/import-doc/route.ts`: Word document upload API endpoint.
- `src/components/AdminTimetableExcelUpload.tsx`: Excel upload component (.xlsx, .csv only).
- `src/components/AdminTimetablePdfUpload.tsx`: Document/PDF upload component with Master Class and Individual Faculty sub-tabs.
- `scripts/generate-templates.cjs`: PDF template generator script.
