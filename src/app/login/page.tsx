'use client';

import { useState } from 'react';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { useRouter } from 'next/navigation';
import { AuthFrame } from '@/components/AuthFrame';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@/hooks/use-mutation';
import { requestData } from '@/lib/client-request';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { toast } = useToast();
    const router = useRouter();
    const { pending, run } = useMutation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        await run(async () => {
            const user = await requestData<{ role: string }>('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            toast({ title: 'Login successful' });
            router.push(user.role === 'MANAGER' ? '/manager/dashboard' : user.role === 'TECHNICIAN' ? '/tech/dashboard' : '/dashboard');
            router.refresh();
        }, 'Login failed');
    };

    return (
        <AuthFrame title="Welcome back" description="Sign in to your FixNest account.">
                    <GoogleSignIn />
                    <form aria-busy={pending} onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <Input type="email" id="login-email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-password">Password</Label>
                            <Input type="password" id="login-password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                        </div>
                        <Button type="submit" disabled={pending} className="w-full">{pending ? "Signing in…" : "Sign in"}</Button>
                    </form><a href="/forgot-password" className="inline-flex min-h-11 items-center text-teal-800 underline">Forgot password?</a><p className="mt-5 text-sm text-slate-600">New tenant? <a className="text-teal-800 underline" href="/register">Create an account</a></p>
        </AuthFrame>
    );
}
