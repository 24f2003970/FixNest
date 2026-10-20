import { Badge } from './ui/badge';
export function StateBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'waiting' | 'danger' }) {
    const colors = { neutral: 'border-slate-200 bg-slate-50 text-slate-600', success: 'border-emerald-200 bg-emerald-50 text-emerald-900', waiting: 'border-amber-200 bg-amber-50 text-amber-900', danger: 'border-rose-200 bg-rose-50 text-rose-900' };
    return <Badge variant="outline" className={'gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium '+colors[tone]}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{label}</Badge>;
}
