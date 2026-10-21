# Google sign-in for FixNest

## What changes for users

- Login and tenant registration offer **Sign in with Google** when configured. With no configuration, the button explains its unavailable state and password sign-in continues to work.
- A new Google identity creates a **Tenant** without a local password or assigned unit. The existing property/unit assignment rule still applies.
- An existing email is never automatically linked. Sign in using the existing FixNest password, open **Account → Google sign-in**, confirm that password, and connect the Google account with the same email. Manager and Technician roles and all existing records stay unchanged.
- Technicians must accept their Manager invitation before linking. Disabled accounts cannot sign in. Public staff registration remains disabled.
- Google-only accounts keep using Google; password recovery can add a password when recovery delivery is configured. No disconnect feature is exposed, so users cannot accidentally remove their only sign-in method.

## Google Cloud setup (one time)

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview), select or create the FixNest project.
2. Configure branding with app name **FixNest** and your support/developer email. Choose **External** audience for tenants outside your organization. If the consent screen is in Testing, add the Google accounts used for verification as test users. Publish the audience when ready for public use; complete any Google-required verification. Do not add sensitive Gmail/Drive/Contacts scopes.
3. Create an OAuth client with application type **Web application**, name **FixNest Web**.
4. Add the exact authorized redirect URI:

   `https://fixnest.up.railway.app/api/auth/google/callback`

   For local testing, add a separate local URI matching the local `APP_ORIGIN`, for example `http://localhost:3000/api/auth/google/callback`. HTTPS is required outside loopback development.
5. Save the client ID and client secret privately in Railway → FixNest → production → app → Variables:

   ```text
   APP_ORIGIN=https://fixnest.up.railway.app
   GOOGLE_CLIENT_ID=<Web application client ID>
   GOOGLE_CLIENT_SECRET=<Web application client secret>
   ```

   Keep the existing JWT secret unchanged. These are server-only variables: never use `NEXT_PUBLIC_`, include them in Git, or paste a secret into chat. No Resend setup is needed for Google sign-in.
6. Deploy the matching code and run the normal non-destructive `prisma migrate deploy` release step. The migration only adds Google identity/attempt storage and makes the password nullable; it preserves existing password hashes, roles and application records. Never run reset or demo seed.
7. Verify a new Tenant login and subsequent login reuse the same account; test cancellation. For each existing role, password sign-in → Account → Connect Google → same-email Google account → role-correct dashboard. Test inactive/pending technicians remain blocked.

This is a redirect-based server OAuth flow, so no Google browser SDK, remote script, broad CSP change, JavaScript origin authorization, refresh tokens, or Google API permissions are needed. The exact callback URI must be registered on the Web client.

## Security and operations

- Authorization Code + S256 PKCE, random state and nonce; 10-minute encrypted, HttpOnly, SameSite=Lax browser cookie; Secure in production.
- A hashed state in PostgreSQL is consumed atomically once before code exchange. Expired attempts are pruned when a new attempt starts.
- Google RS256 signature/JWKS, issuer, audience, expiry, nonce, authorized party and verified email are checked on the server. Stable Google `sub`, not mutable email, is the persistent identity key. Google email changes do not move/link another FixNest account.
- Account linking also checks the initiating user/session version at callback and uses a serializable transaction. Creation/link conflicts fail safely without granting a role or creating duplicates.
- Existing FixNest signed session, `authVersion`, active-account checks and role authorization remain authoritative. Google does not supply a FixNest role.
- Provider access/ID tokens are not stored. The DB stores only the Google subject on the User and a short-lived hashed attempt state. No OAuth client secret, verifier or token is stored in the DB.
- Callback errors never log provider bodies, tokens, cookies, authorization codes or email. Redirects use the configured origin and fixed paths, ignoring arbitrary callback/return destinations. Deployment proxies redact request URLs and apply existing credential rate limits to both Google routes.
- Optional provider configuration fails closed; production startup rejects partially configured credentials. Rotating the JWT secret invalidates pending OAuth cookies as well as existing sessions; do not rotate it just to enable Google.

## Verification commands

`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run audit:security`.

The isolated PostgreSQL integration suite also exercises Google account transactions and concurrency. Its existing loopback/port guard must remain enabled. Unit tests validate signed RSA identity tokens with a local keyset and simulate provider exchange; they do not contact a real Google identity or replace the final real-account acceptance test.

Reference: [Google OpenID Connect documentation](https://developers.google.com/identity/openid-connect/openid-connect).
