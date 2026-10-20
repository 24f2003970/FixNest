import Link from 'next/link';
import { BrandMark } from './Brand';
import { Button } from './ui/button';
import { getSession } from '@/lib/auth';
import { ApplicationShell } from './ApplicationShell';
export async function Navbar({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (session) return <ApplicationShell role={session.role}>{children}</ApplicationShell>;
    return <div className="public-shell"><nav aria-label="Main navigation" className="public-nav"><Link href="/" className="wordmark"><BrandMark />FixNest<span className="brand-period">.</span></Link><span className="nav-caption">The everyday, taken care of.</span><div className="flex items-center gap-2 sm:gap-4"><Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button><Button asChild size="sm" variant="outline"><Link href="/register">Register</Link></Button></div></nav><main id="main-content" tabIndex={-1} className="public-main">{children}</main></div>;
}
