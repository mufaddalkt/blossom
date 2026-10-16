# Production architecture and release checklist

This repository is an isolated browser-local demonstration. **None of the items below should be inferred as implemented merely because a demonstration workflow passes.** The demo's domain functions are reusable specifications, but browser checks are not a security boundary.

## Required server architecture

Use a separate production repository/environment, reviewed Next.js server routes or server actions, a transactional PostgreSQL database, and private photo storage. Supabase is one possible implementation, but no Supabase project, service key or production connection is included here.

Suggested normalized entities: academic_years, classes, students, enrollments, teacher_accounts, registers, register_students, attendance_marks, register_extensions, correction_requests, holidays, audit_events, alerts and alert_acknowledgements. Preserve stable student IDs, historical enrollments, immutable submission attribution, and original values for approved corrections. Snapshot roll/name metadata where the school requires immutable printed historical registers.

## Authentication and authorization

- Replace the browser selector and local password digests with a reviewed authentication service and slow, salted password hashing.
- Provision one initial administrator. Honor the specified username/password flow without mandatory administrator MFA.
- Allow administrators to choose teacher usernames and passwords and reset them. Do not allow teacher self-service password changes or require a temporary password flow.
- Disable departing accounts; create new identities for replacements. Never reassign an existing teacher's class identity.
- Use protected, expiring server sessions with HttpOnly/Secure cookies, appropriate SameSite policy, revocation, and login/session rate limits. The demo's browser-local login throttling is not a production control.
- Check role, enabled account, assigned class, active year and operation permissions on **every server operation**, including exports, photographs and history reads. Do not trust client role or class values.
- Apply database policies/row-level security and test cross-class access where applicable. Never expose service-role secrets to the browser.

## Data integrity and time

- Use trusted server time and the Asia/Kolkata timezone for the submission window. Remove/disable demo simulation in production.
- Perform submission, correction approval, extension authorization and related audit changes in database transactions.
- Enforce a unique register per class/year/date; unique student mark per register; unique active roll per class/year; unique admission numbers when present; and one pending correction per student/date.
- Check optimistic versions and lock rows for conflicting writes. Ensure idempotent submission retries cannot create duplicates.
- Calculate official statistics from submitted records only, applying the tested leave, missing-record, holiday and streak rules.
- Require administrators to configure the school's official start/end dates during initial setup. No default April–March calendar.
- Handle holiday conflicts with an explicit policy decision, preserving the original records and a complete audit trail.
- Keep dashboard notifications internal. No email/SMS/WhatsApp integrations are required.

## Files and input handling

- Validate all input on the server with bounded schemas and parameterized database queries.
- Keep React text escaping; do not render untrusted HTML. Add tested content security and other appropriate response headers.
- Apply CSRF protections to cookie-authenticated mutation endpoints and validate request origins.
- Validate photo type by decoded content, restrict dimensions/size, re-encode on the server, scan where appropriate, and store privately with short-lived authorized access URLs.
- Implement real CSV/XLSX imports only after a separate review. Include row validation, column mapping, duplicates, dry-run preview, explicit approval, transaction behavior and auditable import summaries. Do not use the earlier real student workbook for demo testing.
- Keep credentials and unnecessary personal information out of logs and exports. Never introduce Aadhaar fields.

## Operations and release gate

- Maintain separate development, test and production secrets and databases. Commit only an environment-variable template.
- Define backup frequency, encrypted storage, retention, restore procedures and recovery objectives; execute a restore drill.
- Make production audit events append-only and attributable, with access restrictions and retention controls.
- Add monitoring, safe error handling, dependency scanning and alerts for failures without logging private student data.
- Verify real-device camera permissions, supported browsers, accessible keyboard flows, screen-reader behavior, print rendering and storage failure recovery.
- Run end-to-end tests against the actual server/database path, including denial tests for every administrator-only route and teacher class boundary.
- Conduct security and operational review before any real student data is added.
- Obtain explicit school authorization before a production launch. This demo has not been launched into production.
