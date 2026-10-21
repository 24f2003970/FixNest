'use client';
import { GoogleMark, GoogleNotice, useGoogleEnabled } from './GoogleSignIn';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation } from '@/hooks/use-mutation';
import { requestData } from '@/lib/client-request';

export function GoogleAccountSettings({ connected }: { connected: boolean }) {
    const enabled = useGoogleEnabled();
    const { pending, run } = useMutation();
    return <section className="surface min-w-0 space-y-5 p-5 sm:p-8"><div className="border-b border-slate-200 pb-5"><p className="eyebrow">03 / Sign-in methods</p><h2 className="flex items-center gap-3 text-lg font-semibold"><GoogleMark />Google sign-in</h2><p className="section-subtitle">One account. Another secure way to sign in.</p></div><GoogleNotice />{connected ? <p role="status" className="text-sm text-slate-700">Google is connected to this account. Your role, property access and password stay the same.</p> : <><p className="text-sm leading-relaxed text-slate-600">Connect the Google account with the same email as your FixNest account. Confirm your current password first. Your workspace and permissions stay the same.</p><form className="space-y-4" aria-busy={pending} onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const password = new FormData(form).get('password'); void run(async () => { const result = await requestData<{ url: string }>('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); form.reset(); window.location.assign(result.url); }, 'Could not connect Google'); }}><div className="space-y-2"><Label htmlFor="google-current-password">Current FixNest password</Label><Input id="google-current-password" name="password" type="password" autoComplete="current-password" required disabled={!enabled || pending} /></div><Button type="submit" variant="outline" disabled={!enabled || pending}>{pending ? 'Connecting…' : 'Connect Google'}</Button></form>{enabled === false && <p className="text-sm text-slate-600">Google sign-in is not configured yet. Your password sign-in continues to work.</p>}</>}</section>;
}
