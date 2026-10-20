import type { TicketSummary } from '@/lib/types';
import { Badge } from './ui/badge';

export function TicketBadges({ ticket }: { ticket: Pick<TicketSummary, 'status' | 'priority'> }) {
    const status = { OPEN: 'Open', ASSIGNED: 'Assigned', IN_PROGRESS: 'In progress', DONE: 'Completed', CANCELLED: 'Cancelled' }[ticket.status];
    const statuses = { OPEN: 'border-amber-200 bg-amber-50 text-amber-900', ASSIGNED: 'border-sky-200 bg-sky-50 text-sky-900', IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-900', DONE: 'border-emerald-200 bg-emerald-50 text-emerald-900', CANCELLED: 'border-rose-200 bg-rose-50 text-rose-900' };
    const priorities = { LOW: 'border-slate-200 bg-slate-50 text-slate-600', MEDIUM: 'border-slate-200 bg-white text-slate-600', HIGH: 'border-orange-200 bg-orange-50 text-orange-900', URGENT: 'border-red-200 bg-red-50 text-red-900' };
    return <div className="flex flex-wrap gap-1.5"><Badge variant="outline" className={'gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium '+statuses[ticket.status]}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{status}</Badge><Badge variant="outline" className={'rounded-md px-2 py-1 text-[11px] font-medium '+priorities[ticket.priority]}>{ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()} priority</Badge></div>;
}
