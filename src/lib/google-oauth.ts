import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, EncryptJWT, jwtDecrypt, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';
import { getSessionKey } from './session';
import { appOrigin } from './app-origin';
export { appOrigin } from './app-origin';

export const GOOGLE_COOKIE = 'fixnest_google_oauth';
export const OAUTH_TTL = 600;
export const hashState = (value: string) => createHash('sha256').update(value).digest('hex');
export const googleCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api/auth/google', maxAge: OAUTH_TTL });
export function googleConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) throw new Error('Google sign-in is not configured');
    const origin = appOrigin();
    return { clientId, clientSecret, origin, redirectUri: origin + '/api/auth/google/callback' };
}
export function googleEnabled() { try { googleConfig(); return true; } catch { return false; } }
const attemptSchema = z.object({
    state: z.string().regex(/^[a-f0-9]{64}$/), verifier: z.string().regex(/^[a-f0-9]{64}$/), nonce: z.string().regex(/^[a-f0-9]{64}$/),
    mode: z.enum(['login', 'register', 'link']), userId: z.string().uuid().optional(), authVersion: z.number().int().nonnegative().optional(),
}).refine(value => value.mode !== 'link' || (value.userId !== undefined && value.authVersion !== undefined));
export type GoogleAttempt = z.infer<typeof attemptSchema>;
function encryptionKey() { return createHash('sha256').update('fixnest-google-oauth-v1\0').update(getSessionKey()).digest(); }
export async function sealAttempt(attempt: GoogleAttempt) {
    return new EncryptJWT(attempt).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setIssuer('fixnest-google-oauth').setAudience('fixnest-google-callback').setIssuedAt().setExpirationTime(`${OAUTH_TTL}s`).encrypt(encryptionKey());
}
export async function openAttempt(cookie: string, state: string) {
    if (!/^[a-f0-9]{64}$/.test(state) || cookie.length > 4096) throw new Error('Invalid OAuth attempt');
    const { payload } = await jwtDecrypt(cookie, encryptionKey(), { keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'], issuer: 'fixnest-google-oauth', audience: 'fixnest-google-callback' });
    const attempt = attemptSchema.parse(payload);
    if (!timingSafeEqual(Buffer.from(attempt.state), Buffer.from(state))) throw new Error('Invalid OAuth state');
    return attempt;
}
export function newAttempt(mode: GoogleAttempt['mode'], account?: { userId: string; authVersion: number }): GoogleAttempt {
    return { state: randomBytes(32).toString('hex'), verifier: randomBytes(32).toString('hex'), nonce: randomBytes(32).toString('hex'), mode, ...account };
}
export function authorizationUrl(attempt: GoogleAttempt) {
    const config = googleConfig();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: 'openid email profile', state: attempt.state, nonce: attempt.nonce, code_challenge: createHash('sha256').update(attempt.verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
    return url.toString();
}
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export function googleIdentity(payload: JWTPayload, nonce: string) {
    if (typeof payload.nonce !== 'string' || payload.nonce !== nonce || payload.email_verified !== true ||
        typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
        !z.string().email().max(254).safeParse(payload.email).success) throw new Error('Invalid Google identity');
    return { subject: payload.sub, email: String(payload.email).toLowerCase(), name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 100) : 'FixNest tenant' };
}
export type GoogleIdentity = ReturnType<typeof googleIdentity>;
export async function exchangeGoogleCode(code: string, attempt: GoogleAttempt) {
    if (!code || code.length > 4096) throw new Error('Invalid authorization code');
    const config = googleConfig();
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: attempt.verifier }) });
    if (!response.ok) throw new Error('Google exchange failed');
    const result: unknown = await response.json();
    const token = z.object({ id_token: z.string().max(16384) }).parse(result).id_token;
    const { payload } = await jwtVerify(token, googleKeys, { algorithms: ['RS256'], issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.clientId, requiredClaims: ['sub', 'exp', 'iat', 'nonce', 'email', 'email_verified'] });
    if (payload.aud !== config.clientId) throw new Error('Invalid audience');
    if (payload.azp !== undefined && payload.azp !== config.clientId) throw new Error('Invalid authorized party');
    return googleIdentity(payload, attempt.nonce);
}
export function roleHome(role: string) { return role === 'MANAGER' ? '/manager/dashboard' : role === 'TECHNICIAN' ? '/tech/dashboard' : '/dashboard'; }
