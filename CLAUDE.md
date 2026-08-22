## Project Overview

**Nashi Gold Admin Hub** is an internal, web-based admin console for Nashi Gold Jewellery (Saudi Arabia), used by head-office admins to manage staff, monitor attendance, track sales targets, and post announcements.

This is a **rebuild** of an existing console. The goal is to preserve the features admins already rely on while fixing foundational gaps: proper authentication, access control, secure handling of sensitive data, accurate timezones, and a scalable data layer.

## Core Features

- **Employees** — staff roster: name, branch, contact info, monthly sales target, and progress toward that target.
- **Attendance** — daily check-in/check-out records. **Read-only** in this console; records are produced by a separate employee-facing app.
- **Announcements** — short broadcast notices posted by admins.
- **Dashboard** — summary view of headcount, today's attendance, branch performance, and recent announcements.

## Roles

- **Admin** (`role: "admin"`) — full control over employees, branches, complaints, and announcements; read access to attendance, leave requests, and dashboard. Unrestricted across all branches.
- **Branch Admin** (`role: "secondary_admin"`) — scoped to a `managedBranches: string[]` array on their `nashigold_users` document (e.g. `["D1","D2","D3"]`). Can view Dashboard, Employees (read-only), Attendance, and Leave Requests (can approve/reject) filtered to those branches. Branches, Complaints, and Announcements are hidden entirely — both the nav item and the route redirect to `/`. A user with this role but an empty/missing `managedBranches` is refused at login (fail closed).

Role and branch scoping (`src/lib/permissions.ts`, `src/hooks/use-branch-scope.ts`) are enforced **client-side only**. This app has no per-user Firebase Auth identity — the only real Firebase Auth session is anonymous (see `ensureAnonymousSession` in `src/lib/firebase.ts`), used solely so `firestore.rules` can require `request.auth != null`. Credentials and role/branch data are read from a client-side query against `nashigold_users`. A determined client can bypass all of this. Real enforcement would require migrating to per-user Firebase Auth with custom claims and rewriting the rules around them — see the `TODO` on the `nashigold_users` rule.

(The role model may grow further — don't hardcode assumptions that only these two roles will ever exist.)

## Tech Stack

- **Frontend:** Vite + React
- **UI:** shadcn/ui, Tailwind CSS
- **Backend:** Firebase (Cloud Firestore) — no Firebase Auth, Storage, or Functions in use currently

## Data Model (Current — Firestore)

Several top-level collections. No relational integrity is enforced by Firestore itself, so application code must validate references.

### `nashigold-employee-data`
One document per employee.

| Field | Notes |
|---|---|
| `id` | Numeric string, e.g. `"1000"` |
| `name` | — |
| `job_title` | — |
| `branch` | Branch code; must reference a document in `nashigold_branches` |
| `monthly_target` | Sales target amount |
| `target_unit` | `SAR` (currency) or `Grams` (gold weight) |
| `target_achieved` | Progress toward target |
| `email` | — |
| `contact` | Phone number |
| `password` | **Plaintext — known security issue, must be remediated** |

### `attendance`
One document per daily record. **Read-only from this console.**

| Field | Notes |
|---|---|
| `employeeId` | Links to an employee's `id` |
| `date` | Calendar day (`YYYY-MM-DD`) |
| `checkIn` / `checkOut` | Time in / out, or empty if absent |
| `status` | `Present`, `Absent`, or `Late` |

### `nashigold-announcements`
One document per announcement.

| Field | Notes |
|---|---|
| `heading` | Title |
| `date` | Publish date |
| `content` | Body text |

### `nashigold_branches`
One document per branch. Document ID is the branch code itself (e.g. `H1`), so it doubles as the primary key referenced by `nashigold-employee-data.branch`.

| Field | Notes |
|---|---|
| `id` | Branch code, same value as the document ID |
| `address` | Street address; may be empty |
| `createdDate` | Server timestamp set on creation |

## Known Issues to Address in the Rebuild

- **No authentication** — the console currently has no login/auth layer at all.
- **No access control** — no enforcement of who can read/write which collections (Firestore security rules are effectively open or unspecified).
- **Timezone handling** — `date`, `checkIn`, `checkOut` fields need to consistently reflect Saudi Arabia local time (AST, UTC+3); confirm whether values are currently stored as local strings or UTC timestamps before making changes.
- **Data layer scalability** — current model is three flat top-level collections with client-side joins (e.g. matching `attendance.employeeId` to `nashigold-employee-data.id`). Consider indexing, pagination, and whether Firestore is still the right fit at scale.

## Working Conventions

- **Attendance is effectively read-only.** Never add create or update paths to the `attendance` collection from this console — that data is owned by the employee-facing app. The single exception is `deleteAttendanceForEmployee()` in `src/lib/firestore/attendance.ts`, which cascades from employee deletion (and re-sweeps on employee creation) because employee ids are recycled and would otherwise hand a new hire the previous holder's history. Don't expose it as a standalone action or widen it beyond delete.
- **Sensitive fields** (`email`, `contact`, `password`/credentials) should be treated as PII — avoid logging them, exposing them in client-side error messages, or including them in analytics.
- Branch codes are managed data, not a hardcoded list — validate `branch` against the `nashigold_branches` collection (via the `useBranches()` hook) rather than treating it as free text.
- `target_unit` determines how `monthly_target`/`target_achieved` should be formatted and compared (currency vs. weight) — don't assume SAR everywhere.
- When touching Firestore security rules, err toward least privilege and confirm role checks match the roles actually defined in the app (currently just Admin).

## Out of Scope (for now)

- Firebase Storage, Firebase Functions — not in use; don't introduce them without discussion.
- Any create/update functionality for attendance records (the employee-delete cascade is the only sanctioned write — see Working Conventions).
