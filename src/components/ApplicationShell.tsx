'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutDashboard, Wrench, Bell, Settings2, UsersRound, Menu, ChevronRight, House, Plus, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { NotificationBell } from './NotificationBell';
import { LogoutButton } from './LogoutButton';
import { BrandMark } from './Brand';
import { useResource } from '@/hooks/use-resource';

type Role = 'TENANT' | 'MANAGER' | 'TECHNICIAN';

export function ApplicationShell({ role, children }: { role: Role; children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [sectionHash, setSectionHash] = useState('');
    const menuButton = useRef<HTMLButtonElement>(null);
    const drawer = useRef<HTMLDivElement>(null);
    const account = useResource<{ name: string }>('/api/account');
    const dashboard = role === 'MANAGER' ? '/manager/dashboard' : role === 'TECHNICIAN' ? '/tech/dashboard' : '/dashboard';
    const roleName = { MANAGER: 'Property manager', TENANT: 'Tenant', TECHNICIAN: 'Technician' }[role];

    useEffect(() => {
        const syncSection = () => setSectionHash(window.location.hash);
        syncSection();
        window.addEventListener('hashchange', syncSection);
        window.addEventListener('popstate', syncSection);
        return () => {
            window.removeEventListener('hashchange', syncSection);
            window.removeEventListener('popstate', syncSection);
        };
    }, [pathname]);

    function navigate(href: string) {
        setSectionHash(href.includes('#') ? href.slice(href.indexOf('#')) : '');
        setOpen(false);
    }

    const groups = [
        { label: 'Workspace', items: [
            { href: dashboard, label: 'Overview', icon: LayoutDashboard },
            ...(role === 'MANAGER' ? [{ href: '/manager/properties', label: 'Properties & units', icon: Building2 }] : []),
            ...(role === 'TENANT' ? [{ href: dashboard + '#your-home', label: 'My unit', icon: House }] : []),
        ] },
        { label: 'Maintenance', items: [
            { href: dashboard + '#ticket-list-heading', label: role === 'TECHNICIAN' ? 'My tasks' : 'Maintenance requests', icon: Wrench },
            ...(role === 'TENANT' ? [{ href: '/tickets/new', label: 'New request', icon: Plus }] : []),
            ...(role === 'MANAGER' ? [{ href: '/manager/staff', label: 'Technicians', icon: UsersRound }] : []),
        ] },
        { label: 'Personal', items: [
            { href: '/notifications', label: 'Notifications', icon: Bell },
            { href: '/account', label: 'Account settings', icon: Settings2 },
        ] },
    ];
    const activeHash = sectionHash === '#your-home' && role === 'TENANT' || sectionHash === '#ticket-list-heading' ? sectionHash : '';
    const context = pathname.includes('/properties') ? 'Properties & units' : pathname.includes('/staff') ? 'Technicians' : pathname === '/notifications' ? 'Notifications' : pathname === '/account' ? 'Account settings' : pathname === '/tickets/new' ? 'New request' : pathname.includes('/tickets/') ? 'Maintenance request' : activeHash === '#your-home' ? 'My unit' : activeHash === '#ticket-list-heading' ? role === 'TECHNICIAN' ? 'My tasks' : 'Maintenance requests' : 'Overview';
    const sidebar = <div className="sidebar-content">
        <div className="sidebar-brand">
            <Link href={dashboard} onClick={() => navigate(dashboard)} className="wordmark"><BrandMark />FixNest<span className="brand-period">.</span></Link>
            <p className="sidebar-tagline">Property care, connected.</p>
        </div>
        <nav aria-label="Main navigation" className="sidebar-navigation">
            {groups.map(group => <div key={group.label} className="sidebar-group">
                <p className="sidebar-caption">{group.label}</p>
                <ul>{group.items.map(item => {
                    const active = (pathname === item.href && (item.href !== dashboard || !activeHash)) ||
                        (pathname === dashboard && activeHash && item.href === dashboard + activeHash) ||
                        (item.href === '/manager/properties' && pathname.startsWith(item.href + '/')) ||
                        (item.href === dashboard + '#ticket-list-heading' && pathname.includes('/tickets/') && pathname !== '/tickets/new');
                    const Icon = item.icon;
                    return <li key={item.href}><Link href={item.href} onClick={() => navigate(item.href)} aria-current={active ? 'page' : undefined} className={'sidebar-link ' + (active ? 'sidebar-link-active' : '')}>
                        <span className="sidebar-icon"><Icon aria-hidden="true" size={18} strokeWidth={1.7} /></span>
                        <span className="sidebar-label">{item.label}</span>
                        {active && <ChevronRight aria-hidden="true" className="sidebar-chevron" size={13} />}
                    </Link></li>;
                })}</ul>
            </div>)}
        </nav>
        <div className="sidebar-note"><span>A place for everything.</span><p>Care lives here.</p></div>
        <div className="sidebar-account">
            <Link href="/account" onClick={() => navigate('/account')} className="sidebar-profile">
                <span className="sidebar-avatar" aria-hidden="true">{account.data?.name?.slice(0, 1).toUpperCase() || roleName.slice(0, 1)}</span>
                <span className="min-w-0"><span className="sidebar-profile-name">{account.data?.name || 'Your account'}</span><span className="sidebar-profile-role">{roleName}</span></span>
            </Link>
            <LogoutButton sidebar />
        </div>
    </div>;
    return <div className="app-shell">
        <aside aria-label="Workspace sidebar" className="fixed inset-y-0 left-0 z-30 workspace-sidebar hidden w-64 lg:block">{sidebar}</aside>
        <div className="min-w-0 lg:ml-64">
            <header className="sticky top-0 z-20 flex items-center justify-between gap-3 workspace-topbar px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button ref={menuButton} variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Open navigation"><Menu aria-hidden="true" /></Button></DialogTrigger>
                        <DialogContent ref={drawer} onOpenAutoFocus={event => { event.preventDefault(); drawer.current?.querySelector<HTMLAnchorElement>('a')?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); menuButton.current?.focus(); }} className="sidebar-drawer data-[state=open]:animate-[sidebar-enter_180ms_ease-out] data-[state=closed]:animate-[sidebar-leave_120ms_ease-in] left-0 top-0 h-dvh w-[min(19rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 workspace-sidebar p-0 sm:rounded-none [&>button]:text-white">
                            <DialogTitle className="sr-only">FixNest navigation</DialogTitle><DialogDescription className="sr-only">Your {roleName.toLowerCase()} workspace navigation.</DialogDescription>{sidebar}
                        </DialogContent>
                    </Dialog>
                    <div className="min-w-0"><p className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-500 sm:block">{roleName} workspace</p><p className="truncate text-sm font-semibold text-slate-800">{context}</p></div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                    <span className="hidden items-center gap-1.5 text-xs text-slate-500 xl:flex"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-teal-700" />Role-based access</span>
                    <NotificationBell />
                    <Link href="/account" aria-label="Account settings" className="account-shortcut flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">{account.data?.name?.slice(0, 1).toUpperCase() || roleName.slice(0, 1)}</Link>
                </div>
            </header>
            <main id="main-content" tabIndex={-1} className="workspace-main">{children}</main>
        </div>
    </div>;
}
