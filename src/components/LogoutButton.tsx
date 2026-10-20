'use client';

import { Button } from './ui/button';
import { useMutation } from '@/hooks/use-mutation';
import { requestData } from '@/lib/client-request';
import { LogOut } from 'lucide-react';

export function LogoutButton({ sidebar = false }: { sidebar?: boolean } = {}) {
    const { pending, run } = useMutation();
    return <Button variant="ghost" size="sm" className={sidebar ? 'sidebar-logout' : undefined} disabled={pending} onClick={() => run(async () => {
        await requestData('/api/auth/logout', { method: 'POST' });
        window.location.replace('/login');
    }, 'Logout failed')}>
        <LogOut aria-hidden="true" />{pending ? 'Logging out...' : 'Logout'}
    </Button>;
}
