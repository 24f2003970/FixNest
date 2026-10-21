# Google sign-in verification — 21 October 2026

## Implementation

Server-side Google Authorization Code/S256 PKCE flow with encrypted browser attempts, PostgreSQL single-use state, verified Google OIDC claims, subject-based identity and existing FixNest sessions. New identities create only tenants. Existing accounts require authenticated password confirmation and a same-email Google identity before linking. No automatic email linking, public staff signup, provider-token persistence, new SDK dependency or CSP relaxation.

Login, Register and Account settings include matching UI and safe unavailable/cancel/error states. A public privacy notice documents actual data use and is linked from authentication and the homepage. Production credentials are configured separately in private Railway variables, never in source.

## Local verification completed

- 88 application/security/reliability tests passed, including 12 Google/redirect tests.
- 14 production/Railway checks passed, including paired optional Google configuration validation.
- Lint, TypeScript, operator TypeScript compilation, Prisma validation, production build and standalone smoke passed.
- Dependency security audit passed with only the previously authorized braces advisory/depth-guard exception; no new exceptions.
- The additive migration was applied only to the existing isolated loopback PostgreSQL database on port 55432. Existing record fields were snapshotted and preserved; no reset or demo seed.
- Entire existing PostgreSQL integration suite passed, plus Google tenant creation/reuse, role-preserving explicit linking, pending/inactive technician denial, passwordless password-login rejection, duplicate/concurrent creation, one-winner state consumption, expiry and real transaction rollback on event failure.
- Identity exchange tests use real RSA-signed JWTs and a local keyset, rejecting wrong signatures, issuer, audience, expiry, nonce, authorized party and unverified email. Provider transport is simulated; this is distinct from a real Google-account login.
- Browser inspection covered Login, Register, existing password sign-in and Account Google-linking controls. Desktop captures are in local `output/google-sign-in/`. The browser viewport override did not reliably change the reported viewport, so mobile-specific visual verification is not claimed from those captures.

## Live acceptance

Google Cloud project, Web client and consent branding were prepared under the user's account. Google policy agreements and credential creation were explicitly confirmed by the user. Client ID and secret were entered directly into private Railway app variables using browser memory, without chat/log/file disclosure. Production deployment, Google audience publishing and real-account sign-in results are recorded separately after completion; local test success alone is not a claim of live sign-in success.

The initial Google release (`994b9f5`) passed hosted CI and became active on Railway. Google was published to an External production audience with explicit user confirmation. Production Google configuration returned enabled, health and privacy returned HTTP 200, and deployment logs confirmed the additive migration completed successfully.

Opening the protected Account page without a session revealed an existing proxy redirect bug: middleware built the login URL from the internal Next.js listener address. Redirects now use the validated public `APP_ORIGIN`; only loopback development can fall back to its request origin. Tests cover absent/invalid sessions, each wrong-role redirect, hostile forwarded Host headers, missing production configuration and the real HTTP protected-page redirects in the local integration suite.
