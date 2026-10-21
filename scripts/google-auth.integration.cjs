// Called only by integration.cjs after its loopback/port/database safety checks.
module.exports = async function verifyGoogle({ db, api, load, tenantCookie, managerCookie, techCookie }) {
    const assert = require('node:assert/strict');
    const { randomUUID, createHash } = require('node:crypto');
    const prefix = 'google.qa.' + Date.now();
    const { resolveGoogleAccount } = load('src/lib/services/GoogleAuthService.ts', { '../prisma': { prisma: db } });
    const identity = suffix => ({ subject: prefix + '.' + suffix, email: prefix + '.' + suffix + '@example.test', name: 'Google integration fixture' });
    const first = await resolveGoogleAccount(identity('tenant'), { mode: 'register' });
    assert.equal(first.role, 'TENANT');
    const stored = await db.user.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(stored.password, null); assert.equal(stored.unitId, null);
    const repeat = await resolveGoogleAccount({ ...identity('tenant'), email: 'changed@example.test' }, { mode: 'login' });
    assert.equal(repeat.id, first.id);
    await api('/api/auth/login', '', 'POST', { email: stored.email, password: 'not-a-password' }, 400);
    for (const cookie of [tenantCookie, managerCookie, techCookie]) {
        const profile = (await api('/api/account', cookie)).body;
        assert.equal(profile.hasPassword, true); assert.equal(profile.googleConnected, false);
        assert.equal('password' in profile, false); assert.equal('googleSubject' in profile, false);
    }
    const status = (await api('/api/auth/google?status=1')).body;
    assert.equal(status.enabled, false); // live Google credentials are never used in isolated tests
    await api('/api/auth/google', '', 'GET', undefined, 503);
    for (const role of ['TENANT', 'MANAGER', 'TECHNICIAN']) {
        const user = await db.user.create({ data: { name: 'Link fixture', email: prefix + role + '@example.test', role, password: 'test-only-unusable-hash', active: true } });
        const claims = { subject: prefix + role, email: user.email.toLowerCase(), name: user.name };
        await assert.rejects(resolveGoogleAccount(claims, { mode: 'login' }), /link_required/);
        const linked = await resolveGoogleAccount(claims, { mode: 'link', userId: user.id, authVersion: 0 });
        assert.equal(linked.role, role);
        const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
        assert.equal(after.password, user.password); assert.equal(after.role, role);
        await db.user.update({ where: { id: user.id }, data: { active: false, authVersion: { increment: 1 } } });
        await assert.rejects(resolveGoogleAccount(claims, { mode: 'login' }), /unavailable/);
    }
    const pending = await db.user.create({ data: { name: 'Pending technician', email: identity('pending').email, password: 'test-only-unusable-hash', role: 'TECHNICIAN', active: false } });
    await assert.rejects(resolveGoogleAccount(identity('pending'), { mode: 'register' }), /link_required/);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: pending.id } })).active, false);
    const race = identity('race');
    const results = await Promise.allSettled([resolveGoogleAccount(race, { mode: 'register' }), resolveGoogleAccount(race, { mode: 'register' })]);
    assert.ok(results.some(result => result.status === 'fulfilled'));
    assert.equal(await db.user.count({ where: { googleSubject: race.subject } }), 1);
    const rollback = identity('rollback');
    const failing = load('src/lib/services/GoogleAuthService.ts', { '../prisma': { prisma: { $transaction: (fn, opts) => db.$transaction(tx => fn(new Proxy(tx, { get(target, key) { return key === 'accountEvent' ? { create: async () => { throw Error('Injected event failure'); } } : target[key]; } })), opts) } } }).resolveGoogleAccount;
    await assert.rejects(failing(rollback, { mode: 'register' }), /Injected event failure/);
    assert.equal(await db.user.count({ where: { googleSubject: rollback.subject } }), 0);
    const stateHash = createHash('sha256').update(randomUUID()).digest('hex');
    await db.oAuthAttempt.create({ data: { stateHash, expiresAt: new Date(Date.now() + 60000) } });
    const consume = () => db.oAuthAttempt.deleteMany({ where: { stateHash, expiresAt: { gt: new Date() } } });
    const consumption = await Promise.all([consume(), consume()]);
    assert.equal(consumption.reduce((sum, value) => sum + value.count, 0), 1);
    const expiredHash = createHash('sha256').update(randomUUID()).digest('hex');
    await db.oAuthAttempt.create({ data: { stateHash: expiredHash, expiresAt: new Date(0) } });
    assert.equal((await db.oAuthAttempt.deleteMany({ where: { stateHash: expiredHash, expiresAt: { gt: new Date() } } })).count, 0);
    console.log('PASS: Google tenant creation/reuse, explicit role-preserving linking, blocked invitation bypass, passwordless login rejection, no profile secrets, real PostgreSQL concurrency, state single-use/expiry and transaction rollback');
};
