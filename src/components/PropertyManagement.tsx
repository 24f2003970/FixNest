'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useResource } from '@/hooks/use-resource';
import { useMutation } from '@/hooks/use-mutation';
import { requestData } from '@/lib/client-request';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { LoadingState, ErrorState } from './RequestState';
import { Building2, MapPin, ArrowUpRight, DoorOpen, UsersRound, Plus } from 'lucide-react';

type Tenant = { id: string; name: string; email: string; occupancyVersion: number; unit: { id: string; identifier: string; property: { name: string } } | null };
type Unit = { id: string; identifier: string; floor: string | null; description: string | null; updatedAt: string; tenants: Tenant[] };
type Property = { id: string; name: string; address: string; description: string | null; updatedAt: string; units: Unit[]; _count?: { units: number } };
type Fields = { name?: string; address?: string; identifier?: string; floor?: string | null; description?: string | null };

function Editor({ initial = {}, unit = false, save, pending, prefix }: { initial?: Fields; unit?: boolean; save: (body: object) => Promise<void>; pending: boolean; prefix: string }) {
    return <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void save(Object.fromEntries(data)); }} className="space-y-3">
        <fieldset disabled={pending} className="space-y-3">
            <Label htmlFor={prefix + '-name'}>{unit ? 'Unit identifier' : 'Property name'}</Label>
            <Input id={prefix + '-name'} name={unit ? 'identifier' : 'name'} required minLength={unit ? 1 : 2} maxLength={unit ? 50 : 120} defaultValue={unit ? initial.identifier : initial.name} />
            <Label htmlFor={prefix + '-address'}>{unit ? 'Floor (optional)' : 'Address'}</Label>
            <Input id={prefix + '-address'} name={unit ? 'floor' : 'address'} required={!unit} minLength={unit ? undefined : 5} maxLength={unit ? 50 : 500} defaultValue={(unit ? initial.floor : initial.address) ?? ''} />
            <Label htmlFor={prefix + '-description'}>Description (optional)</Label>
            <Textarea id={prefix + '-description'} name="description" maxLength={unit ? 1000 : 2000} defaultValue={initial.description ?? ''} />
            <Button type="submit">{pending ? 'Saving…' : 'Save ' + (unit ? 'unit' : 'property')}</Button>
        </fieldset>
    </form>;
}

export function PropertyList() {
    const resource = useResource<Property[]>('/api/properties');
    const mutation = useMutation();
    const [error, setError] = useState<unknown>(null);
    const [revision, setRevision] = useState(0);
    async function save(body: object) {
        await mutation.run(async () => { setError(null); try { await requestData('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); setRevision(value => value + 1); await resource.reload(); } catch (failure) { setError(failure); throw failure; } }, 'Could not create property');
    }
    return <div className="space-y-6"><header className="page-heading"><div><p className="eyebrow">Your portfolio</p><h1>Properties & units</h1><p>Manage property details, unit records and tenant occupancy.</p></div><Link href="/manager/dashboard" className="text-teal-800 inline-flex min-h-11 items-center text-sm">← Dashboard</Link></header><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><section aria-label="Your properties" className="min-w-0">
        {resource.loading ? <LoadingState label="Loading properties…" /> : resource.error ? <ErrorState error={resource.error} retry={resource.reload} entity="property" /> : resource.data?.length === 0 ? <div className="empty-state py-10"><Building2 aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p>No properties yet. Create your first property to get started.</p></div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{resource.data?.map(property => <Link href={'/manager/properties/' + property.id} key={property.id} className="group min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"><Card className="h-full overflow-hidden transition-colors group-hover:border-teal-300"><div className="flex h-24 items-end justify-between border-b border-slate-200 portfolio-cover p-4"><Building2 aria-hidden="true" className="h-12 w-12 text-slate-400" /><span className="rounded-md border border-white bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Managed property</span></div><CardHeader className="pb-3"><CardTitle className="text-base break-words">{property.name}</CardTitle><p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"><MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{property.address}</p></CardHeader><CardContent><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><DoorOpen aria-hidden="true" className="h-4 w-4" />{property._count?.units ?? 0} units</span><span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800">Manage property<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span></div></CardContent></Card></Link>)}</div>}
        </section><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus aria-hidden="true" className="h-4 w-4 text-teal-800" />Create property</CardTitle><p className="section-subtitle">Add a property to your managed portfolio.</p></CardHeader><CardContent>{!!error && <p role="alert" className="mb-4 text-sm text-red-800">{error instanceof Error ? error.message : 'Could not save change. Please try again.'}</p>}<Editor key={revision} prefix="new-property" save={save} pending={mutation.pending} /></CardContent></Card></div>
    </div>;
}

export function PropertyDetail() {
    const params = useParams();
    const endpoint = '/api/properties/' + params.id;
    const resource = useResource<Property>(endpoint);
    const mutation = useMutation();
    const [error, setError] = useState<unknown>(null);
    const [email, setEmail] = useState('');
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [unitId, setUnitId] = useState('');
    const [unitRevision, setUnitRevision] = useState(0);
    const [notice, setNotice] = useState('');
    async function save(path: string, method: string, body: object) {
        await mutation.run(async () => { setError(null); setNotice(''); try { await requestData(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); setUnitRevision(value => value + 1); setNotice('Saved successfully.'); await resource.reload(); } catch (failure) { setError(failure); throw failure; } }, 'Could not save change');
    }
    async function lookup(event: FormEvent) {
        event.preventDefault();
        await mutation.run(async () => { setError(null); setTenant(null); setNotice(''); try { const found = await requestData<Tenant>('/api/tenant-assignment?email=' + encodeURIComponent(email)); setTenant(found); setUnitId(resource.data?.units.some(unit => unit.id === found.unit?.id) ? found.unit!.id : ''); } catch (failure) { setError(failure); throw failure; } }, 'Could not find tenant');
    }
    async function assign(event: FormEvent) {
        event.preventDefault(); if (!tenant) return;
        await mutation.run(async () => { setError(null); setNotice(''); try {
            const updated = await requestData<Tenant>('/api/tenant-assignment', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: tenant.email, unitId: unitId === '__UNASSIGNED__' ? null : unitId, expectedVersion: tenant.occupancyVersion }) });
            setTenant(updated); setNotice('Tenant assignment saved.'); await resource.reload();
        } catch (failure) { setError(failure); setTenant(null); throw failure; } }, 'Could not assign tenant');
    }
    const property = resource.data;
    return <div className="space-y-6"><Link href="/manager/properties" className="text-teal-800 inline-flex min-h-11 items-center">← My properties</Link>
        {resource.loading ? <LoadingState label="Loading property…" /> : resource.error ? <ErrorState error={resource.error} retry={resource.reload} entity="property" /> : property && <>
            <header className="page-heading"><div><p className="eyebrow">Property workspace</p><h1>{property.name}</h1><p className="flex items-start gap-1.5"><MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />{property.address}</p></div><span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><DoorOpen aria-hidden="true" className="h-4 w-4" />{property.units.length} units</span></header>
            {!!error && <p role="alert" className="text-red-800">{error instanceof Error ? error.message : 'Could not save change. Please try again.'}</p>}<p role="status" className="text-green-800">{notice}</p>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <details className="surface"><summary className="min-h-11 cursor-pointer p-5 text-sm font-semibold">Edit property details</summary><div className="border-t border-slate-100 p-5"><Editor key={property.updatedAt} prefix="edit-property" initial={property} save={body => save(endpoint, 'PATCH', body)} pending={mutation.pending} /></div></details>
                <details className="surface"><summary className="min-h-11 cursor-pointer p-5 text-sm font-semibold">Add a unit</summary><div className="border-t border-slate-100 p-5"><Editor key={unitRevision} unit prefix="new-unit" save={body => save(endpoint + '/units', 'POST', body)} pending={mutation.pending} /></div></details>
            </div>
            <section className="space-y-4"><h2 className="text-xl font-semibold">Units and current tenants</h2>{property.units.length === 0 && <p>No units yet. Add a unit above to assign tenants.</p>}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{property.units.map(unit => <Card key={unit.id}><CardHeader className="flex-row items-center gap-3 space-y-0"><span className="rounded-md bg-slate-100 p-2.5 text-slate-500"><DoorOpen aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><CardTitle className="text-base">Unit {unit.identifier}</CardTitle><p className="mt-1 text-xs text-slate-500">{property.name}{unit.floor && ' · Floor '+unit.floor}</p></div></CardHeader><CardContent className="space-y-4"><div className="border-t border-slate-100 pt-4"><h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><UsersRound aria-hidden="true" className="h-3.5 w-3.5" />Current occupants</h3>{unit.tenants.length ? <ul className="space-y-2">{unit.tenants.map(occupant => <li key={occupant.id} className="rounded-md bg-slate-50 p-3 text-sm"><p className="font-medium">{occupant.name}</p><p className="mt-1 text-xs text-slate-500">{occupant.email}</p></li>)}</ul> : <p className="text-sm text-slate-500">No tenants assigned.</p>}</div><details className="border-t border-slate-100 pt-3"><summary className="min-h-11 cursor-pointer text-xs font-semibold text-teal-800">Edit unit details</summary><Editor key={unit.updatedAt} unit prefix={unit.id} initial={unit} pending={mutation.pending} save={body => save(endpoint + '/units/' + unit.id, 'PATCH', body)} /></details></CardContent></Card>)}</div>
            </section>
            <Card><CardHeader><CardTitle>Assign existing tenant</CardTitle></CardHeader><CardContent className="space-y-4">
                <p className="text-sm text-slate-600">Look up an exact tenant email. Only unassigned tenants and tenants in your properties are eligible.</p>
                <form onSubmit={lookup} className="space-y-3"><Label htmlFor="tenant-email">Tenant email</Label><Input id="tenant-email" type="email" value={email} required disabled={mutation.pending} onChange={event => { setEmail(event.target.value); setTenant(null); }} /><Button disabled={mutation.pending}>Look up tenant</Button></form>
                {tenant && <form onSubmit={assign} className="space-y-3"><p className="break-words">{tenant.name} · Current: {tenant.unit ? tenant.unit.property.name + ' / ' + tenant.unit.identifier : 'Unassigned'}</p><Label htmlFor="assigned-unit">New unit</Label><select id="assigned-unit" value={unitId} onChange={event => setUnitId(event.target.value)} disabled={mutation.pending} className="w-full h-11 rounded-md border px-3"><option value="" disabled>Select a unit or remove assignment</option><option value="__UNASSIGNED__">Remove current assignment</option>{property.units.map(unit => <option key={unit.id} value={unit.id}>Unit {unit.identifier}</option>)}</select><Button disabled={mutation.pending || !unitId}>Save tenant assignment</Button><p className="text-sm text-slate-600">Existing tickets retain their original location.</p></form>}
            </CardContent></Card>
        </>}
    </div>;
}
