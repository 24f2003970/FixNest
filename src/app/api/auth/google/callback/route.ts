import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';
import { requireAuth } from '@/lib/roles';
import { errorResponse } from '@/lib/errors/api-response';
import { appOrigin, exchangeGoogleCode, GOOGLE_COOKIE, googleConfig, googleCookieOptions, hashState, openAttempt, roleHome } from '@/lib/google-oauth';
import { GoogleAccountError, resolveGoogleAccount } from '@/lib/services/GoogleAuthService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
    let destination = '/login?google=failed';
    let origin: string;
    try { origin = appOrigin(); googleConfig(); } catch { return errorResponse('Google sign-in is not configured.', 503); }
    try {
        const cookie = req.cookies.get(GOOGLE_COOKIE)?.value;
        const states = req.nextUrl.searchParams.getAll('state');
        if (!cookie || states.length !== 1) throw new Error('Missing OAuth state');
        const attempt = await openAttempt(cookie, states[0]);
        if (attempt.mode === 'link') destination = '/account?google=failed';
        // Atomic consumption prevents two callbacks (or replayed cookies) from winning.
        const consumed = await prisma.oAuthAttempt.deleteMany({ where: { stateHash: hashState(attempt.state), expiresAt: { gt: new Date() } } });
        if (consumed.count !== 1) throw new Error('Expired or consumed OAuth state');
        if (req.nextUrl.searchParams.has('error')) {
            destination = attempt.mode === 'link' ? '/account?google=cancelled' : '/login?google=cancelled';
        } else {
            const codes = req.nextUrl.searchParams.getAll('code');
            if (codes.length !== 1) throw new Error('Invalid authorization response');
            if (attempt.mode === 'link') {
                const session = await requireAuth(req);
                if (session instanceof Response || session.userId !== attempt.userId || (session.authVersion ?? 0) !== attempt.authVersion) throw new Error('Link session changed');
            }
            const identity = await exchangeGoogleCode(codes[0], attempt);
            const user = await resolveGoogleAccount(identity, attempt);
            await setSessionCookie({ userId: user.id, role: user.role, authVersion: user.authVersion });
            destination = attempt.mode === 'link' ? '/account?google=connected' : roleHome(user.role);
        }
    } catch (error) {
        // Never log provider responses, codes, cookies, tokens, email or secrets.
        if (error instanceof GoogleAccountError && error.reason === 'link_required') destination = '/login?google=link_required';
    }
    const response = NextResponse.redirect(new URL(destination, origin), 303);
    response.cookies.set(GOOGLE_COOKIE, '', { ...googleCookieOptions(), maxAge: 0 });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
}
