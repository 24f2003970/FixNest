import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { BrandMark, ResidenceIllustration } from './Brand';
export function AuthFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return <section className="auth-layout">
        <aside className="auth-story"><div className="auth-story-top"><BrandMark /><span>Considered spaces.<br />Connected people.</span></div><div><p className="eyebrow">A little care goes a long way.</p><h2>Good homes.<br /><em>In good hands.</em></h2><p className="auth-story-copy">A thoughtful workspace for the people who live in, look after, and care for a property.</p></div><ResidenceIllustration /><div className="auth-story-footer"><span>Report. Coordinate. Resolve.</span><ArrowUpRight aria-hidden="true" size={18} /></div></aside>
        <div className="auth-form-side"><header><p className="eyebrow">Make yourself at home</p><h1>{title}</h1><p className="auth-description">{description}</p></header><div className="auth-fields">{children}</div><p className="auth-security"><LockKeyhole aria-hidden="true" size={14} />Private records. Access that fits your role.</p></div>
    </section>;
}
