# Blossom Kindergarten School — Attendance demonstration

A complete interactive Next.js App Router demonstration using **fictional data only**. The supplied original purple school logo is bundled unchanged. This is a local demonstration, not a production authentication or student-information system.

## Run locally

Requires Node.js 20.9+ and npm. Node 24 was used for verification.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. If that port is busy, run `npm run dev -- --port 3001`.

For an optimized local build:

```sh
npm run build
npm start
```

No environment variables or database credentials are required. `.env.example` explains the boundary. Do not supply production secrets.

## Demo sign-in

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `demo123` |
| UKG teacher | `ukg_teacher` | `demo123` |

Both roles use the shared login. The account selectors fill these demonstration credentials. The administrator can create additional fictional teacher accounts, assign one class, reset demo passwords, and disable accounts. Existing accounts cannot be reassigned. Teachers cannot change their passwords.

## Reproducible presentation

1. Sign in as **UKG teacher**. The default demo clock is **15 October 2026, 10:00 AM IST**. The seeded register contains 18 of 24 marks.
2. Open **Attendance**. Mark the remaining students or choose **Mark all present**, then set individual Absent and Leave values. Reload to demonstrate draft persistence.
3. Choose **Review & submit**, inspect the totals, and explicitly confirm. The submitted register becomes read-only.
4. In **Correction Requests**, request a change for the submitted date, select a student, choose a different status, and provide a reason.
5. Sign out and enter as **administrator**. Approve or reject the request. Approval recalculates official statistics; rejection requires a reason visible to the requesting teacher.
6. Open Attendance for **7 October 2026**, the seeded missed register. Choose **Reopen for teacher** and set **15 October 2026, 5:00 PM IST** as the expiry. The extension applies only to that class/date. Alternatively, complete and submit as administrator.
7. Sign in as teacher and complete the reopened register. Use **Demo Time Simulation → Closed** to show an ordinary register locked after the 2 PM deadline.
8. In the original seed, **Aarav Meadow** has low attendance and **Anaya Wren** has four consecutive recorded absences on 10, 12, 13 and 14 October. Approving the seeded Leave correction ends that streak. Sunday 11 October is skipped.
9. Explore Students: add/edit a fictional profile, leave admission blank for provisional enrollment, upload a neutral image, or try the camera. Only synthetic guardian phones in the form `DEMO-0025` are accepted.
10. Explore the bundled sample import. External CSV/XLSX uploads are intentionally disabled. The wizard maps columns, validates duplicates, previews two fictional records, and requires confirmation.
11. In Reports, generate daily, monthly, individual, academic-year, or alert reports as PDF and Excel. Only administrators can export. Guardian phones and photographs are excluded.
12. Create a next academic year using explicit dates, then open a student profile to preview and confirm an individual promotion or repeat enrollment. No automatic bulk promotion occurs.

## Reset and persistence

**Administrator → Settings → Reset synthetic demo → Confirm** restores the original 24 fictional students and seeded scenarios. The approved school logo is retained.

Records are stored in this browser's localStorage under `blossom-demo-v1`. The sign-in selection is tab-local sessionStorage. Two tabs on the same origin share data. Browser Web Locks serialize writes where supported, and version checks protect final submissions. Different browsers, devices, ports, and origins have separate records. Clearing site data resets the demo.

The header always labels the environment **DEMO**. Device time and demo time are distinct: business-window simulation uses the selected clock; audit timestamps record actual action time.

## Attendance rules

- Present / (Present + Absent + Leave) × 100; no valid submitted data means **N/A**.
- Leave reduces the percentage but resets an absence streak.
- Unsubmitted registers are **Not Submitted**, never assumed absences.
- Only submitted school days contribute to attendance calculations.
- Missing recorded days interrupt absence streaks. Sundays and configured holidays are skipped.
- Low attendance is strictly below 75%. Four consecutive recorded school-day absences trigger an alert.
- Normal teacher submission is Monday–Saturday, 08:00 inclusive to 14:00 exclusive, IST, excluding holidays.
- Submitted registers preserve their student roster. Withdrawal and new enrollment do not rewrite historical marks.
- Archived/non-active academic years are read-only for attendance and teacher corrections.

The initial fictional academic year is explicitly seeded as **1 September 2026–30 June 2027**. It is not an assumption about the school's official calendar.

## Verification

```sh
npm run typecheck
npm test
npm run build
# With the app running, Microsoft Edge installed:
npm run test:browser
node tests/accessibility.cjs
```

The browser suite uses Edge by default. Set `BROWSER_CHANNEL=chrome` if needed. `DEMO_URL` and `QA_OUTPUT` can override the preview URL and artifact directory. See [test results](docs/TEST-RESULTS.md) for the checks actually executed.

## Project structure

- `app/`: Next.js App Router entry point, layout, error boundary, and shared design system.
- `components/`: shared application shell and complete workflow screens.
- `lib/domain.ts`: typed attendance rules, validation, mutations, role guards, alerts, and audit events.
- `lib/seed.ts`: entirely fictional, reproducible dataset.
- `lib/reports.ts`: lazy-loaded A4 PDF and XLSX generation.
- `public/blossom-approved.png`: exact school logo supplied by the user.
- `tests/`: domain/export tests and browser workflow suite.
- `docs/`: limitations, verification results, and production architecture checklist.

## Known boundaries

- Authentication and authorization are **browser simulations**. They are deliberately not presented as production protection. Anyone controlling this browser can inspect or change local demo data.
- No external database, private object storage, real accounts, messaging service, or real student workbook is connected.
- Photo data is browser-local. Uploads are validated for signatures, size and decoding, but are not malware-scanned or stored in a production private bucket. Camera availability and permission depend on the device/browser.
- UKG is the fully seeded demonstration. Future classes have enrollment/account structures but no automatically created rosters or attendance history. The school-wide alert dashboard is initially scoped to UKG.
- The import wizard is a controlled CSV-shaped sample flow, not a general-purpose CSV/XLSX parser.
- Audit history and data are not tamper-resistant. Browser storage has a quota; save failures are surfaced, and unsaved changes are not reported as saved.
- The hosted demonstration uses the same browser-local data model. Hosting it on Vercel does not create a production school backend or shared database.

## GitHub and Vercel

The application is published under `attendance/` in `mufaddalkt/blossom`. The repository's existing school website remains at the root. Vercel must use **Root Directory: `attendance`**, **Framework: Next.js**, **Install Command: `npm ci`**, and **Build Command: `npm run build`**. No environment variables are needed for this synthetic demonstration.

See [production readiness](docs/PRODUCTION.md) before considering real school use.
