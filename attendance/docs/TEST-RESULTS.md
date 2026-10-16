# Verification results

Executed locally on 16 October 2026 using Node.js 24.21.0, Next.js 16.4.1, React 19.3.1, TypeScript 5.9.3 and Microsoft Edge through Playwright. All records used during testing were synthetic.

| Check | Executed result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | 35 tests passed, 0 failed |
| `npm run build` | Optimized Next.js build passed |
| `npm run test:browser` | 26 browser workflow checkpoints passed |
| `node tests/accessibility.cjs` | 0 automated violations across 14 inspected views |
| `npm audit --omit=dev` | 0 known runtime dependency vulnerabilities at the time checked |
| Original school logo integrity | SHA-256 of supplied file and bundled file match |
| PDF layout | A4 PDF rendered and visually inspected; original logo, totals, pagination and signature area verified |
| Excel output | XLSX generated, reopened and checked for expected totals and absence of guardian phone fields |

## Domain and export checks

- Fictional seed integrity, all three attendance statuses, correct denominator, and N/A when no submitted data exists.
- Draft persistence/serialization and exclusion of drafts/missing registers from official statistics.
- Complete-register requirement, final locking, duplicate submissions and version conflicts.
- Teacher class restrictions, administrator-only actions, disabled accounts and one active teacher per class.
- Exact 08:00/14:00 IST boundaries, Sunday/holiday exclusions, future dates, scoped extensions and expired extensions.
- Correction approval, rejection reasons, duplicate pending requests and unchanged originals on rejection.
- Four-day absence streaks, resets on Present/Leave, interruption at missing records and episode deduplication.
- Strictly-below-75% alerts and retained notification history.
- Student add/edit/withdraw, provisional admissions, duplicate roll/admission validation and synthetic phone restrictions.
- Individual promotion, preserved identity, academic-year overlaps, active-year archive guard and fresh year statistics.
- Holiday conflicts, explicit exclusion decisions and preservation of original submitted registers.
- Real PDF and Excel generation, administrator export restriction, all alert categories and report data checks.

## Browser checks

1. Invalid login reports an error.
2. Teacher login exposes only the four teacher navigation items.
3. Closed attendance blocks teacher marking.
4. Present, Absent and Leave marks survive reload.
5. Review dialog receives focus and dismisses with Escape.
6. Final confirmation submits and locks the register.
7. Teacher correction request is saved.
8. Every administrator navigation item renders.
9. Approval updates official attendance.
10. Rejection preserves attendance and records its reason.
11. Administrator authorizes a scoped late extension.
12. Teacher completes the reopened historical register.
13. Provisional fictional student is added.
14. Student edit and validated neutral image upload work.
15. Withdrawal preserves the profile.
16. Synthetic import mapping, preview and confirmation work.
17. Explicit academic-year dates are saved.
18. Manual promotion preview preserves historical identity.
19. Holiday conflict requires explicit acknowledgement.
20. Browser PDF and Excel downloads succeed.
21. Administrator resets, disables and creates replacement teacher accounts.
22. Camera capture works with a synthetic browser camera.
23. Alert acknowledgement persists.
24. Dashboard and register fit a 390px viewport; responsive navigation works.
25. Reset restores the original synthetic scenarios and retains the logo.
26. No browser runtime or console errors during the final sequence.

## Accessibility scope

Automated axe checks used WCAG 2 A/AA and WCAG 2.1 AA tags on the login, all eleven administrator pages, the student editor and the mobile student directory. The tests found zero violations after contrast fixes. Focus handling and Escape were separately exercised. This is not a claim of exhaustive accessibility certification or screen-reader testing.

## Fixes made during verification

Corrected the Excel module import, accessible form labels, sample-import validation for withdrawn roll numbers, report row keys, draft roster normalization, absence-episode deduplication, text contrast and the favicon request. Browser tests now wait for asynchronous saves before asserting persistence.

## Limits of the evidence

No real student workbook was opened. No real database, server authentication or production row-level security exists in this demo. Physical camera hardware, multiple real devices, browser quota exhaustion, adversarial penetration testing and a complete screen-reader audit were not performed. The camera test used a synthetic browser source. Browser-local role guards are workflow simulations, not protection from a user who controls the browser.

The cloud deployment must also be checked after Vercel finishes building; a successful local build alone is not evidence of a successful hosted deployment.
