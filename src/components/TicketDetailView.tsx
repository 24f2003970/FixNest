'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { TicketDetail, UserSummary } from '@/lib/types';
import { useResource } from '@/hooks/use-resource';
import { useMutation } from '@/hooks/use-mutation';
import { useToast } from '@/hooks/use-toast';
import { requestData, RequestError } from '@/lib/client-request';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { LoadingState, ErrorState } from './RequestState';
import { TicketBadges } from './TicketBadges';
import { TicketLocation } from './TicketLocation';

export function TicketDetailView({ role }: { role: 'TENANT' | 'MANAGER' | 'TECHNICIAN' }) {
    const params = useParams();
    const resource = useResource<TicketDetail>('/api/tickets/' + params.id);
    const technicians = useResource<UserSummary[]>(role === 'MANAGER' ? '/api/users?role=TECHNICIAN' : null);
    const { pending, run } = useMutation();
    const { toast } = useToast();
    const [note, setNote] = useState('');
    const [selectedTech, setSelectedTech] = useState('');
    const dashboard = role === 'MANAGER' ? '/manager/dashboard' : role === 'TECHNICIAN' ? '/tech/dashboard' : '/dashboard';
    const ticket = resource.data;
    async function mutate(path: string, method: string, body: object, success: string, clearNote = false) {
        await run(async () => {
            try { await requestData('/api/tickets/' + params.id + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, expectedVersion: ticket?.version }) }); } catch (error) { if (error instanceof RequestError && [403, 404, 409].includes(error.status ?? 0)) await resource.reload(); throw error; }
            if (clearNote) setNote('');
            else setSelectedTech('');
            toast({ title: success });
            await resource.reload();
        }, 'Could not save change');
    }
    return <div className="max-w-5xl mx-auto space-y-6">
        <Link href={dashboard} className="inline-flex min-h-11 items-center text-sm text-teal-800 hover:underline">← Back to dashboard</Link>
        {resource.loading ? <LoadingState label="Loading ticket details…" /> : resource.error ? <ErrorState error={resource.error} retry={resource.reload} label="Could not load ticket details" /> : ticket && <>
            <header className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow mb-0">Maintenance request</p><TicketBadges ticket={ticket} /></div><h1 className="text-2xl sm:text-3xl font-semibold break-words [overflow-wrap:anywhere]">{ticket.title}</h1><div className="surface flex flex-wrap items-start justify-between gap-4 p-4"><TicketLocation ticket={ticket} /><p className="text-xs text-slate-500">Last updated<br /><time className="mt-1 block font-medium text-slate-700" dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleString()}</time></p></div></header>
            {ticket.status !== 'CANCELLED' && <ol className="request-progress" aria-label="Request progress">{['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE'].map((step, index) => { const current = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE'].indexOf(ticket.status); return <li key={step} aria-current={index === current ? 'step' : undefined} className={'progress-step ' + (index <= current ? 'is-reached ' : '') + (index === current ? 'is-current' : '')}><span className="block mb-1 text-[10px] tracking-widest">0{index + 1}</span>{['Reported', 'Assigned', 'In progress', 'Completed'][index]}</li>; })}</ol>}
            <div className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2 min-w-0 space-y-6">
                <Card><CardHeader><CardTitle className="text-base">Request details</CardTitle></CardHeader><CardContent className="space-y-5"><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-slate-700">{ticket.description}</p><dl className="grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Reported</dt><dd className="mt-1 font-medium">{new Date(ticket.createdAt).toLocaleString()}</dd></div><div><dt className="text-xs text-slate-500">Reporting tenant</dt><dd className="mt-1 font-medium">{ticket.tenant.name}{ticket.tenant.email && <span className="mt-1 block text-xs font-normal text-slate-500">{ticket.tenant.email}</span>}</dd></div><div><dt className="text-xs text-slate-500">Assigned technician</dt><dd className="mt-1 font-medium">{ticket.assignedTo?.name || 'Unassigned'}</dd></div></dl></CardContent></Card>
                {ticket.images.length > 0 && <Card><CardHeader><CardTitle className="text-base">Attachments</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{ticket.images.map((image, index) => <a href={image.imageUrl} key={image.id} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-md overflow-hidden border focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700" aria-label={`Open attachment ${index + 1} in a new tab`}><Image src={image.imageUrl} alt={`Issue attachment ${index + 1}`} fill sizes="(max-width: 640px) 40vw, 192px" className="object-cover" unoptimized /></a>)}</div></CardContent></Card>}
                <Card><CardHeader><CardTitle className="text-base">Activity & notes</CardTitle><p className="section-subtitle">A record of updates and maintenance work.</p></CardHeader><CardContent><ol aria-live="polite" className="ml-1">{ticket.activityLogs.map(log => <li key={log.id} className="timeline-entry"><p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{log.action}</p><div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span>{log.user.name} · {log.user.role.toLowerCase()}</span><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time></div></li>)}</ol>{ticket.activityLogs.length === 0 && <p className="text-sm text-slate-600">No activity yet.</p>}</CardContent></Card>
            </div><aside className="space-y-5 min-w-0">
                {role === 'MANAGER' && <Card><CardHeader><CardTitle className="text-base">{ticket.status === 'OPEN' ? 'Assign technician' : 'Reassign technician'}</CardTitle></CardHeader><CardContent className="space-y-4">
                    {['DONE', 'CANCELLED'].includes(ticket.status) ? <p className="text-sm text-slate-600">Assignment is closed. Completed tickets must be reopened first.</p> : technicians.loading ? <LoadingState label="Loading technicians…" /> : technicians.error ? <ErrorState error={technicians.error} retry={technicians.reload} label="Could not load technicians" /> : technicians.data?.length === 0 ? <p>No technicians are available.</p> :
                    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (ticket.status === 'OPEN') void mutate('/status', 'POST', { technicianId: selectedTech }, 'Technician assigned'); else if (window.confirm('Reassign this ticket? The previous technician loses access and work returns to Assigned.')) void mutate('/operations', 'POST', { action: 'reassign', technicianId: selectedTech }, 'Technician reassigned'); }}>
                        <Label htmlFor="technician">Technician</Label><select id="technician" required value={selectedTech} disabled={pending} onChange={e => setSelectedTech(e.target.value)} className="w-full min-w-0 h-11 rounded-md border bg-white px-3 text-sm"><option value="">Select a technician</option>{technicians.data?.filter(tech => ticket.status === 'OPEN' || tech.id !== ticket.assignedTo?.id).map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}</select>
                        <Button disabled={pending || !selectedTech} className="w-full">{pending ? 'Saving…' : ticket.status === 'OPEN' ? 'Assign ticket' : 'Reassign ticket'}</Button>
                    </form>}
                </CardContent></Card>}
                {(role === 'MANAGER' || (role === 'TENANT' && ticket.status === 'OPEN')) && <Card><CardHeader><CardTitle className="text-base">Ticket actions</CardTitle></CardHeader><CardContent className="space-y-3">
                    {ticket.status === 'DONE' && role === 'MANAGER' ? <Button disabled={pending} variant="outline" className="w-full" onClick={() => { if (window.confirm('Reopen this completed ticket? It returns to Open and its technician assignment is cleared.')) void mutate('/operations', 'POST', { action: 'reopen' }, 'Ticket reopened'); }}>Reopen ticket</Button> :
                    ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(ticket.status) ? <Button disabled={pending} variant="destructive" className="w-full" onClick={() => { if (window.confirm('Cancel this ticket? Work will stop. History and attachments are kept, and cancellation is final.')) void mutate('/operations', 'POST', { action: 'cancel' }, 'Ticket cancelled'); }}>Cancel ticket</Button> : <p>Cancellation is final; ticket history is retained.</p>}
                </CardContent></Card>}
                {role === 'TECHNICIAN' && <Card><CardHeader><CardTitle className="text-base">Update status</CardTitle></CardHeader><CardContent>{ticket.status === 'ASSIGNED' ? <Button disabled={pending} className="w-full" onClick={() => mutate('/status', 'PATCH', { status: 'IN_PROGRESS' }, 'Work started')}>{pending ? 'Saving…' : 'Start work'}</Button> : ticket.status === 'IN_PROGRESS' ? <Button disabled={pending} className="w-full" onClick={() => mutate('/status', 'PATCH', { status: 'DONE' }, 'Ticket completed')}>{pending ? 'Saving…' : 'Complete request'}</Button> : <p className="text-sm text-slate-600">{ticket.status === 'DONE' ? 'This ticket is completed.' : ticket.status === 'CANCELLED' ? 'This ticket is cancelled.' : 'This ticket is awaiting assignment.'}</p>}</CardContent></Card>}
                <Card><CardHeader><CardTitle className="text-base">Add a note</CardTitle></CardHeader><CardContent>{['DONE', 'CANCELLED'].includes(ticket.status) ? <p className="text-sm text-slate-600">Notes are closed for completed or cancelled tickets.</p> : <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (note.trim()) void mutate('/notes', 'POST', { note }, 'Note added', true); }}><Label htmlFor="ticket-note">Maintenance note</Label><Textarea id="ticket-note" value={note} disabled={pending} required maxLength={1000} onChange={e => setNote(e.target.value)} placeholder="Share an update about this issue…" className="min-h-32 resize-y" /><p className="text-xs text-slate-600">Visible to people with access to this ticket.</p><Button disabled={pending || !note.trim()} variant="outline" className="w-full">{pending ? 'Saving…' : 'Post note'}</Button></form>}</CardContent></Card>
            </aside></div>
        </>}
    </div>;
}
