'use client';
import { useResource } from '@/hooks/use-resource';
import { LoadingState, ErrorState } from './RequestState';
import { Building2, MapPin, House } from 'lucide-react';
export type Occupancy = { unit: { id: string; identifier: string; property: { id: string; name: string; address: string } } | null };
export function TenantLocation() {
    const resource = useResource<Occupancy>('/api/occupancy');
    return <section id="your-home" aria-label="Your location" className="tenant-home flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-800"><House aria-hidden="true" className="h-6 w-6" /></span><div className="min-w-0 flex-1">
        {resource.loading ? <LoadingState label="Loading your location…" /> : resource.error ? <ErrorState error={resource.error} retry={resource.reload} label="Could not load your location" /> :
        resource.data?.unit ? <><p className="eyebrow">Your home</p><h2 className="text-lg font-semibold">{resource.data.unit.property.name} · Unit {resource.data.unit.identifier}</h2><p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{resource.data.unit.property.address}</p></> :
        <><h2 className="font-semibold">Your home is awaiting assignment</h2><p className="mt-2 text-sm text-slate-600">Your manager must assign you to a unit before you can submit a maintenance request. Existing tickets remain available below.</p></>}
        </div>{resource.data?.unit && <span className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 sm:self-center"><Building2 aria-hidden="true" className="h-3.5 w-3.5" />Assigned unit</span>}
    </section>;
}
