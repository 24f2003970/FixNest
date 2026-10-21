import { prisma } from '../prisma';
import { lockStaff } from '../staff-lock';
import type { GoogleAttempt, GoogleIdentity } from '../google-oauth';

export class GoogleAccountError extends Error {
    constructor(public readonly reason: 'link_required' | 'unavailable' | 'conflict') { super(reason); }
}
const select = { id: true, email: true, name: true, role: true, active: true, authVersion: true } as const;
// Provider subject, never email alone, is the persistent sign-in identifier.
export async function resolveGoogleAccount(identity: GoogleIdentity, attempt: GoogleAttempt) {
    try {
        return await prisma.$transaction(async db => {
            if (attempt.mode === 'link') {
                await lockStaff(db, attempt.userId!);
                const user = await db.user.findUnique({ where: { id: attempt.userId } });
                if (!user?.active || user.authVersion !== attempt.authVersion || user.email.toLowerCase() !== identity.email || user.googleSubject) throw new GoogleAccountError('unavailable');
                const updated = await db.user.update({ where: { id: user.id }, data: { googleSubject: identity.subject }, select });
                await db.accountEvent.create({ data: { userId: user.id, actorId: user.id, action: 'GOOGLE_CONNECTED' } });
                return updated;
            }
            const linked = await db.user.findUnique({ where: { googleSubject: identity.subject }, select: { id: true } });
            if (linked) {
                await lockStaff(db, linked.id);
                const user = await db.user.findUniqueOrThrow({ where: { id: linked.id }, select });
                if (!user.active) throw new GoogleAccountError('unavailable');
                return user;
            }
            // Includes pending invitations, inactive staff, and mixed-case legacy emails.
            const collision = await db.user.findFirst({ where: { email: { equals: identity.email, mode: 'insensitive' } }, select: { id: true } });
            if (collision) throw new GoogleAccountError('link_required');
            const user = await db.user.create({ data: { email: identity.email, name: identity.name, googleSubject: identity.subject, password: null, role: 'TENANT' }, select });
            await db.accountEvent.create({ data: { userId: user.id, actorId: user.id, action: 'GOOGLE_TENANT_REGISTERED' } });
            return user;
        }, { isolationLevel: 'Serializable' });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) throw new GoogleAccountError('conflict');
        throw error;
    }
}
