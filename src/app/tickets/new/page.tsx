'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@/hooks/use-mutation';
import { requestData, RequestError } from '@/lib/client-request';
import { useToast } from '@/hooks/use-toast';
import { useResource } from '@/hooks/use-resource';
import type { Occupancy } from '@/components/TenantLocation';
import { LoadingState, ErrorState } from '@/components/RequestState';

export default function NewTicket() {
    const occupancy = useResource<Occupancy>('/api/occupancy');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [files, setFiles] = useState<File[]>([]);
    const { pending: uploading, run } = useMutation();
    const { toast } = useToast();
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            if (selectedFiles.length > 5 || selectedFiles.some(file => file.size > 5 * 1024 * 1024)) {
                e.target.value = '';
                setFiles([]);
                toast({ title: 'Select up to 5 images, 5 MB each', variant: 'destructive' });
                return;
            }
            setFiles(selectedFiles);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!occupancy.data?.unit || occupancy.error || occupancy.loading) return;
        await run(async () => {
            let imageUrls: string[] = [];
            try {
                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(file => formData.append('file', file));
                    const upload = await requestData<{ imageUrls: string[] }>('/api/upload', { method: 'POST', body: formData });
                    imageUrls = upload.imageUrls;
                }
                await requestData('/api/tickets', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description, priority, imageUrls }),
                });
            } catch (error) {
                if (imageUrls.length > 0) {
                    try {
                        await requestData('/api/upload', {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageUrls }),
                        });
                    } catch {
                        throw new Error('Ticket submission failed and upload cleanup could not be confirmed. Refresh your tickets before trying again.');
                    }
                }
                if (error instanceof RequestError && error.uncertain) {
                    throw new Error('The ticket response could not be confirmed. Refresh your tickets before submitting again; the request may have completed.');
                }
                throw error;
            }
            toast({ title: 'Ticket created successfully' });
            router.push('/dashboard');
        }, 'Failed to create ticket');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <header className="page-heading"><div><p className="eyebrow">Your home</p><h1>New maintenance request</h1><p>Tell your property manager what needs attention.</p></div></header>
            {occupancy.loading ? <LoadingState label="Loading your assigned unit…" /> : occupancy.error ? <ErrorState error={occupancy.error} retry={occupancy.reload} label="Could not load your assignment" /> : occupancy.data?.unit ? <p className="surface border-l-4 border-l-teal-700 p-4 text-sm font-medium">{occupancy.data.unit.property.name} · Unit {occupancy.data.unit.identifier}</p> : <p role="status">Your manager must assign you to a unit before you can submit a maintenance request.</p>}

            <div className="request-compose"><Card>
                <CardContent className="pt-6"><div className="compose-step"><span>01 /</span>Tell us what needs attention</div>
                    <form aria-busy={uploading} onSubmit={handleSubmit} className="space-y-4">
                        <fieldset disabled={uploading || occupancy.loading || !!occupancy.error || !occupancy.data?.unit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="issue-title">Title</Label>
                            <Input id="issue-title" maxLength={100} value={title} onChange={e => setTitle(e.target.value)} required minLength={5} placeholder="e.g. Broken AC in Unit 4B" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issue-description">Description</Label>
                            <Textarea id="issue-description" maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} required minLength={10} placeholder="Please provide details about the issue..." className="min-h-[120px]" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issue-priority">Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger id="issue-priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issue-images">Images (Max 5, JPG/PNG)</Label>
                            <Input id="issue-images" aria-describedby="upload-help" type="file" multiple accept="image/jpeg, image/png" onChange={handleFileChange} />
                            <p id="upload-help" className="text-sm text-slate-600">Up to 5 JPG/PNG images, 5 MB each. {files.length} selected.</p>
                        </div>

                        <Button type="submit" disabled={uploading} className="w-full">
                            {uploading ? 'Submitting...' : 'Submit request'}
                        </Button>
                        </fieldset>
                    </form>
                </CardContent>
            </Card><aside className="compose-guide"><p className="eyebrow">A good request helps</p><h2>The details make<br />the difference.</h2><p>Describe what happened and where. A clear description helps your manager assign the right person.</p><p>Add a photo if it helps explain the problem. Keep personal documents out of images.</p><p>After submitting, follow the request from your dashboard for assignments, notes and status updates.</p></aside></div>
        </div>
    );
}
