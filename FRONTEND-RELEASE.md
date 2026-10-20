# Frontend release — 20 October 2026

This release publishes the approved FixNest frontend redesign and final refinement to the existing Railway service. It does not migrate hosting to Vercel or change the database schema, account roles, business rules or attachment authorization.

## Presentation

The warm ivory/forest/sage design covers public and account entry pages, role dashboards, grouped navigation, properties/units, staff invitations, ticket composition/detail, account settings and notifications. Responsive layouts, readable secondary text and control states, keyboard focus and the mobile drawer are included. Details and local browser evidence are recorded in `DESIGN-SYSTEM.md`, `FRONTEND-VERIFICATION.md` and `UI-POLISH-VERIFICATION.md`.

## Dependency release prerequisites

The earlier UI-only verification documented blocking advisories. They are addressed for this release without bypassing the security gate:

- Next.js and its matching ESLint configuration: **15.5.24 → 15.5.28**. See [Next.js cache advisories](https://github.com/advisories/GHSA-4jqv-mc3x-m676) and [the second cache advisory](https://github.com/advisories/GHSA-mcj8-r9mp-w47p).
- `postcss-selector-parser`: **6.1.4 → 7.1.7**, pinned through an override for Tailwind 3 and postcss-nested. This keeps the established Tailwind design system and avoids a Tailwind 4 migration. The production build and browser checks exercise the consuming CSS pipeline. See [upstream security release](https://github.com/postcss/postcss-selector-parser/releases/tag/7.1.6).
- `source-map-js`: **1.2.1 → 1.2.2**, through the lockfile within PostCSS's existing compatible dependency range. See [upstream advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

`npm run audit:security` passes with only the previously authorized, exact `GHSA-vfj7-8cjw-p6xm` braces exception and its transitive findings. The installed depth guard is verified. No advisory exception was added or broadened, and no dependency/security check was disabled.

## Release verification

Local application tests: 76 passed. Production/Railway tests: 13 passed. Lint, TypeScript, compiled operator checks and the Next.js 15.5.28 production build passed. Standalone smoke checks passed. The complete real PostgreSQL integration suite passed against the existing isolated development database on localhost:55432, including migrations, ticket lifecycle, concurrency, transaction rollback, scoped files/notifications and account/invitation security. The final browser regression passed all 27 workflow checks, produced 52 desktop/tablet/phone screenshots and reported zero page JavaScript errors.

The existing Railway service is configured to deploy `main` after GitHub CI succeeds. Hosted CI and production rollout outcomes are verified after pushing these release commits; no deployment gate is bypassed.

Only source, tests, dependency manifests and design/release notes are committed. Temporary credentials, screenshots, generated PDFs, outreach files and local database/upload artifacts are excluded from the release commits. Existing Railway database, persistent volume, domain and secrets are retained.
