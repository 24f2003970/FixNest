import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roles';
import { errorResponse, handleApiError, successResponse } from '@/lib/errors/api-response';
import { appOrigin, authorizationUrl, GOOGLE_COOKIE, googleConfig, googleCookieOptions, googleEnabled, hashState, newAttempt, OAUTH_TTL, sealAttempt, type GoogleAttempt } from '@/lib/google-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function begin(mode: GoogleAttempt['mode'], account?: { userId: string; authVersion: number }) {
    googleConfig();
    const attempt = newAttempt(mode, account);
    // Expired attempts contain no identities or credentials and can be safely pruned.
    await prisma.oAuthAttempt.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await prisma.oAuthAttempt.create({ data: { stateHash: hashState(attempt.state), expiresAt: new Date(Date.now() + OAUTH_TTL * 1000) } });
    return { url: authorizationUrl(attempt), cookie: await sealAttempt(attempt) };
}
export async function GET(req: NextRequest) {
    if (req.nextUrl.searchParams.get('status') === '1') return successResponse({ enabled: googleEnabled() });
    if (!googleEnabled()) return errorResponse('Google sign-in is not configured yet. Use email and password.', 503);
    if (req.headers.get('sec-fetch-site') === 'cross-site') return errorResponse('Start Google sign-in from FixNest.', 403);
    try {
        const mode = req.nextUrl.searchParams.get('mode') === 'register' ? 'register' : 'login';
        const result = await begin(mode);
        const response = NextResponse.redirect(result.url, 303);
        response.cookies.set(GOOGLE_COOKIE, result.cookie, googleCookieOptions());
        response.headers.set('Cache-Control', 'private, no-store');
        response.headers.set('Referrer-Policy', 'no-referrer');
        return response;
    } catch { return errorResponse('Could not start Google sign-in. Please try again.', 503); }
}
// Connecting an existing account requires a current session AND its password.
export async function POST(req: NextRequest) {
    if (!googleEnabled()) return errorResponse('Google sign-in is not configured yet.', 503);
    try {
        if (req.headers.get('origin') !== appOrigin()) return errorResponse('Invalid request origin', 403);
        const session = await requireAuth(req);
        if (session instanceof Response) return session;
        const { password } = z.object({ password: z.string().min(1).refine(value => Buffer.byteLength(value, 'utf8') <= 72) }).strict().parse(await req.json());
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (!user?.active || !user.password || user.authVersion !== (session.authVersion ?? 0) || !await bcrypt.compare(password, user.password)) return errorResponse('Current password is incorrect or the session expired.', 400);
        if (user.googleSubject) return errorResponse('Google is already connected.', 409);
        const result = await begin('link', { userId: user.id, authVersion: user.authVersion });
        const response = successResponse({ url: result.url });
        response.cookies.set(GOOGLE_COOKIE, result.cookie, googleCookieOptions());
        return response;
    } catch (error) { return handleApiError(error); }
}
