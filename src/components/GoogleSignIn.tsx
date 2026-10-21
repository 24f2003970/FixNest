'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { requestData } from '@/lib/client-request';

export function GoogleMark() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.04a10 10 0 0 0 0 9.02l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.35 2.59C7.18 7.71 9.39 5.95 12 5.95Z"/></svg>;
}
export function useGoogleEnabled() {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    useEffect(() => { let active = true; requestData<{ enabled: boolean }>('/api/auth/google?status=1').then(value => { if (active) setEnabled(value.enabled); }).catch(() => { if (active) setEnabled(false); }); return () => { active = false; }; }, []);
    return enabled;
}
const messages: Record<string, string> = {
    failed: 'Google sign-in could not be completed. Please try again or use your password.',
    cancelled: 'Google sign-in was cancelled. Your account has not changed.',
    link_required: 'An account already uses this email. Sign in with your password, then connect Google in Account settings. Technicians must accept their invitation first.',
    connected: 'Google is connected. You can now use it to sign in to your existing account.',
};
export function GoogleNotice() {
    const [message, setMessage] = useState('');
    useEffect(() => { setMessage(messages[new URLSearchParams(window.location.search).get('google') || ''] || ''); }, []);
    return message ? <p role="status" className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{message}</p> : null;
}
export function GoogleSignIn({ register = false }: { register?: boolean }) {
    const enabled = useGoogleEnabled();
    const [pending, setPending] = useState(false);
    return <div className="mb-5 space-y-3"><GoogleNotice /><Button type="button" variant="outline" className="min-h-11 w-full gap-3 bg-white text-slate-800" disabled={!enabled || pending} onClick={() => { setPending(true); window.location.assign('/api/auth/google' + (register ? '?mode=register' : '')); }}><GoogleMark />{pending ? 'Connecting to Google…' : 'Sign in with Google'}</Button>{enabled === false ? <p className="text-center text-xs leading-relaxed text-slate-600">Google sign-in is not available yet. Use email and password below.</p> : register ? <p className="text-center text-xs leading-relaxed text-slate-600">New Google accounts join as tenants. Staff use their existing invitation.</p> : null}<p className="text-center text-xs text-slate-600"><a href="/privacy" className="inline-flex min-h-6 items-center underline underline-offset-2">How FixNest uses your information</a></p><div className="flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />or use your email<span className="h-px flex-1 bg-slate-200" /></div></div>;
}
