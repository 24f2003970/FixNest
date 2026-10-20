import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ResidenceIllustration } from '@/components/Brand';
import { ArrowUpRight, ArrowRight, Check, House, ClipboardList, Wrench } from 'lucide-react';
export default async function Home() {
    const session = await getSession();
    if (session) redirect(session.role === 'MANAGER' ? '/manager/dashboard' : session.role === 'TECHNICIAN' ? '/tech/dashboard' : '/dashboard');
    return <div className="landing">
        <section className="landing-hero"><div className="hero-copy"><p className="eyebrow"><span className="small-rule" />A more considered way to care for property</p><h1>Good homes.<br />Better care.<br /><em>All connected.</em></h1><p className="hero-description">From the first report to the finishing touch. Bring residents, property managers and technicians together in one calm maintenance workspace.</p><div className="hero-actions"><Button asChild size="lg"><Link href="/login">Enter your workspace<ArrowUpRight aria-hidden="true" /></Link></Button><Button asChild variant="link"><Link href="/register">Create a tenant account<ArrowRight aria-hidden="true" /></Link></Button></div><div className="hero-assurance"><Check aria-hidden="true" size={15} />Clear responsibilities<span>·</span>Private records<span>·</span>Less back-and-forth</div></div>
        <div className="hero-visual"><div className="drawing-label"><span>THE CONNECTED RESIDENCE</span><span>EST. FOR EVERYDAY CARE</span></div><ResidenceIllustration /><div className="illustration-note"><span className="note-dot" /><div><strong>A place for every request.</strong><span>And everyone who helps resolve it.</span></div><ArrowUpRight aria-hidden="true" size={20} /></div><span className="drawing-coordinate">01 / THE HOME</span></div></section>
        <section className="landing-workflow" aria-label="How FixNest works"><div className="workflow-intro"><p className="eyebrow">One shared rhythm</p><h2>Small problems.<br /><em>Clear next steps.</em></h2></div>{[{icon:House,number:'01',title:'Make it known.',body:'Tenants report an issue, choose a priority, and add photos.'},{icon:ClipboardList,number:'02',title:'Put it in good hands.',body:'Managers review the request and assign the right technician.'},{icon:Wrench,number:'03',title:'See it through.',body:'Technicians share updates and complete the work. The history stays together.'}].map(item=><article key={item.number}><div className="workflow-number"><span>{item.number}</span><item.icon aria-hidden="true" size={21}/></div><h3>{item.title}</h3><p>{item.body}</p></article>)}</section>
        <footer className="landing-footer"><span>FixNest — property maintenance, thoughtfully connected.</span><span>Built around people. Designed for everyday.</span></footer>
    </div>;
}
