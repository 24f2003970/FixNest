const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
function load(file, overrides = {}, cache = new Map()) {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const local = name => Object.hasOwn(overrides, name) ? overrides[name] : name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts', overrides, cache) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts', overrides, cache) : require(name);
    new Function('require', 'module', 'exports', code)(local, mod, mod.exports); return mod.exports;
}
async function oauth(overrides = {}) { return load('src/lib/google-oauth.ts', { jose: await import('jose'), ...overrides }); }
function env() {
    const saved = { ...process.env };
    Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), APP_ORIGIN: 'http://localhost:3117', GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: randomBytes(32).toString('hex') });
    return () => { for (const key of ['NODE_ENV', 'JWT_SECRET', 'APP_ORIGIN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } };
}
test('Google configuration is optional, paired, server-only, HTTPS in production and origin-pinned', async () => {
    const restore = env(); try {
        const g = await oauth(); assert.equal(g.googleEnabled(), true);
        delete process.env.GOOGLE_CLIENT_SECRET; assert.equal(g.googleEnabled(), false);
        process.env.GOOGLE_CLIENT_SECRET = 'test';
        for (const origin of ['https://x.test/path', 'https://user:pass@x.test', 'https://x.test?next=evil', 'http://evil.test']) { process.env.APP_ORIGIN = origin; assert.equal(g.googleEnabled(), false); }
        process.env.NODE_ENV = 'production'; process.env.APP_ORIGIN = 'http://localhost:3117'; assert.equal(g.googleEnabled(), false);
        process.env.APP_ORIGIN = 'https://fixnest.example.test'; assert.equal(g.googleConfig().redirectUri, 'https://fixnest.example.test/api/auth/google/callback');
        const options = g.googleCookieOptions(); assert.equal(options.httpOnly, true); assert.equal(options.secure, true); assert.equal(options.sameSite, 'lax'); assert.equal(options.maxAge, 600);
    } finally { restore(); }
});
test('OAuth encrypted cookie binds state, nonce, PKCE, expiry and intent without exposing secrets', async () => {
    const restore = env(); try {
        const g = await oauth(); const attempt = g.newAttempt('login'); const sealed = await g.sealAttempt(attempt);
        for (const value of [attempt.verifier, attempt.nonce, attempt.state]) assert.ok(!sealed.includes(value));
        assert.deepEqual(await g.openAttempt(sealed, attempt.state), attempt);
        await assert.rejects(g.openAttempt(sealed, 'a'.repeat(64)));
        await assert.rejects(g.openAttempt(sealed.slice(0,-10)+'tampered', attempt.state));
        const j = await import('jose');
        const key = createHash('sha256').update('fixnest-google-oauth-v1\0').update(new TextEncoder().encode(process.env.JWT_SECRET)).digest();
        const expired = await new j.EncryptJWT(attempt).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuer('fixnest-google-oauth').setAudience('fixnest-google-callback').setExpirationTime(1).encrypt(key);
        await assert.rejects(g.openAttempt(expired, attempt.state));
        const url = new URL(g.authorizationUrl(attempt)); assert.equal(url.origin, 'https://accounts.google.com');
        assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(attempt.verifier).digest('base64url'));
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.equal(url.searchParams.get('nonce'), attempt.nonce);
        assert.equal(url.searchParams.get('scope'), 'openid email profile'); assert.ok(!url.href.includes(process.env.GOOGLE_CLIENT_SECRET));
        assert.ok(!url.searchParams.has('access_type')); // no offline/refresh-token scope
    } finally { restore(); }
});
test('Google exchange validates real RSA signatures, issuer, audience, expiry, nonce and verified email', async () => {
    const restore = env(), previousFetch = global.fetch; try {
        const j = await import('jose'); const pair = await j.generateKeyPair('RS256'); const attacker = await j.generateKeyPair('RS256');
        const jwk = await j.exportJWK(pair.publicKey); jwk.kid = 'google-test'; const localKeys = j.createLocalJWKSet({ keys: [jwk] });
        const g = await oauth({ jose: { ...j, createRemoteJWKSet: () => localKeys } }); const attempt = g.newAttempt('login');
        const claims = { sub: 'google-subject', email: 'Tenant@Example.test', email_verified: true, nonce: attempt.nonce, name: 'Tenant Name' };
        let token;
        global.fetch = async (url, options) => { assert.equal(url, 'https://oauth2.googleapis.com/token'); assert.equal(options.body.get('code_verifier'), attempt.verifier); assert.equal(options.body.get('redirect_uri'), g.googleConfig().redirectUri); assert.equal(options.cache,'no-store'); return Response.json({id_token:token}); };
        async function sign(changes = {}, key = pair.privateKey) { token = await new j.SignJWT({...claims,...changes}).setProtectedHeader({alg:'RS256',kid:'google-test'}).setIssuer('https://accounts.google.com').setAudience(process.env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(key); }
        await sign(); assert.deepEqual(await g.exchangeGoogleCode('valid-code', attempt), { subject: 'google-subject', email: 'tenant@example.test', name: 'Tenant Name' });
        for (const changes of [{nonce:'other'}, {email_verified:false}, {email_verified:'true'}, {email:'invalid'}, {sub:''}, {azp:'wrong-client'}]) { await sign(changes); await assert.rejects(g.exchangeGoogleCode('code',attempt)); }
        await sign({}, attacker.privateKey); await assert.rejects(g.exchangeGoogleCode('code',attempt));
        for (const [issuer,audience,expiry] of [['https://attacker.test',process.env.GOOGLE_CLIENT_ID,'5m'],['https://accounts.google.com','wrong-audience','5m'],['https://accounts.google.com',process.env.GOOGLE_CLIENT_ID,1]]) {
            token = await new j.SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'google-test'}).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expiry).sign(pair.privateKey); await assert.rejects(g.exchangeGoogleCode('code',attempt));
        }
        global.fetch = async () => Response.json({error:'private-provider-error'}, {status:400}); await assert.rejects(g.exchangeGoogleCode('bad',attempt), /Google exchange failed/);
    } finally { global.fetch = previousFetch; restore(); }
});
function accountDb(users = []) {
    const events = [];
    const db = { user: {
        findUnique: async ({where}) => users.find(u => where.id ? u.id===where.id : u.googleSubject===where.googleSubject) || null,
        findUniqueOrThrow: async ({where}) => { const u=users.find(u=>u.id===where.id); if(!u) throw Error('missing'); return u; },
        findFirst: async ({where}) => users.find(u=>u.email.toLowerCase()===where.email.equals) || null,
        create: async ({data}) => { const user={id:randomUUID(),active:true,authVersion:0,...data}; users.push(user); return user; },
        update: async ({where,data}) => Object.assign(users.find(u=>u.id===where.id),data),
    }, accountEvent: {create: async ({data}) => events.push(data)}, $queryRaw: async () => [] };
    db.$transaction = async fn => fn(db);
    return {db,users,events};
}
const identity = {subject:'provider-id',email:'tenant@example.test',name:'Tenant'};
test('new Google users are tenants with no password or unit; subsequent sign-ins reuse subject', async () => {
    const f=accountDb(); const {resolveGoogleAccount}=load('src/lib/services/GoogleAuthService.ts',{'../prisma':{prisma:f.db}});
    const first=await resolveGoogleAccount(identity,{mode:'register'}); assert.equal(first.role,'TENANT'); assert.equal(first.password,null); assert.equal(first.unitId,undefined);
    const again=await resolveGoogleAccount({...identity,email:'changed@example.test'},{mode:'login'}); assert.equal(again.id,first.id); assert.equal(f.users.length,1);
    first.active=false; await assert.rejects(resolveGoogleAccount(identity,{mode:'login'}), /unavailable/);
});
test('email matches never silently link existing accounts or bypass technician invitations/deactivation', async () => {
    for (const role of ['TENANT','MANAGER','TECHNICIAN']) for (const active of [true,false]) {
        const f=accountDb([{id:randomUUID(),email:'Tenant@Example.test',role,active,authVersion:0}]);
        const {resolveGoogleAccount}=load('src/lib/services/GoogleAuthService.ts',{'../prisma':{prisma:f.db}});
        await assert.rejects(resolveGoogleAccount(identity,{mode:'login'}), /link_required/); assert.equal(f.users.length,1); assert.equal(f.users[0].googleSubject,undefined);
    }
});
test('explicit linking preserves each role and rejects wrong email, auth version, disabled user or relinking', async () => {
    for (const role of ['TENANT','MANAGER','TECHNICIAN']) {
        const id=randomUUID(); const f=accountDb([{id,email:identity.email,role,active:true,authVersion:2,password:'existing-hash'}]);
        const {resolveGoogleAccount}=load('src/lib/services/GoogleAuthService.ts',{'../prisma':{prisma:f.db}}); const attempt={mode:'link',userId:id,authVersion:2};
        await assert.rejects(resolveGoogleAccount({...identity,email:'wrong@example.test'},attempt));
        await assert.rejects(resolveGoogleAccount(identity,{...attempt,authVersion:1}));
        f.users[0].active=false; await assert.rejects(resolveGoogleAccount(identity,attempt)); f.users[0].active=true;
        const linked=await resolveGoogleAccount(identity,attempt); assert.equal(linked.role,role); assert.equal(linked.password,'existing-hash'); assert.equal(linked.authVersion,2); assert.equal(f.events[0].action,'GOOGLE_CONNECTED');
        await assert.rejects(resolveGoogleAccount({...identity,subject:'other-id'},attempt));
    }
});
test('concurrent account creation/link uniqueness and serializable conflicts return safe retry errors', async () => {
    for (const code of ['P2002','P2034']) {
        const {resolveGoogleAccount}=load('src/lib/services/GoogleAuthService.ts',{'../prisma':{prisma:{$transaction:async()=>{throw {code,private:'secret'};}}}});
        await assert.rejects(resolveGoogleAccount(identity,{mode:'login'}), error=>error.message==='conflict');
    }
});
test('Google callback consumes state once, rejects replay/changed link sessions and never logs tokens', async () => {
    const restore=env(), originalLog=console.error; try {
        process.env.NODE_ENV='production'; process.env.APP_ORIGIN='https://fixnest.example.test';
        const g=await oauth(); const {NextRequest}=require('next/server'); const attempt=g.newAttempt('login'); const cookie=await g.sealAttempt(attempt); let remaining=1, sessions=[], writes=0;
        console.error=()=>{throw Error('Callback must not log sensitive provider errors');};
        const db={oAuthAttempt:{deleteMany:async ({where})=>{assert.equal(where.stateHash,g.hashState(attempt.state)); const count=remaining;remaining=0;return {count};}}};
        let currentAttempt=attempt, currentSession;
        const route=load('src/app/api/auth/google/callback/route.ts',{
            '@/lib/prisma':{prisma:db}, '@/lib/google-oauth':{...g,openAttempt:async(c,s)=>{await g.openAttempt(c,s);return currentAttempt;},exchangeGoogleCode:async()=>identity},
            '@/lib/auth':{setSessionCookie:async value=>sessions.push(value)}, '@/lib/roles':{requireAuth:async()=>currentSession},
            '@/lib/services/GoogleAuthService':{resolveGoogleAccount:async()=>{writes++;return {id:randomUUID(),role:'TENANT',authVersion:0};},GoogleAccountError:class extends Error{}},
        });
        const request=(extra='')=>new NextRequest('http://localhost:3117/api/auth/google/callback?state='+attempt.state+'&code=private-code'+extra,{headers:{cookie:g.GOOGLE_COOKIE+'='+cookie}});
        let res=await route.GET(request()); assert.equal(new URL(res.headers.get('location')).pathname,'/dashboard'); assert.equal(sessions.length,1); assert.equal(res.headers.get('referrer-policy'),'no-referrer'); assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
        await route.GET(request()); assert.equal(sessions.length,1); assert.equal(writes,1);
        remaining=1; res=await route.GET(request('&error=access_denied')); assert.match(res.headers.get('location'), /cancelled/); assert.equal(writes,1);
        remaining=1; currentAttempt={...attempt,mode:'link',userId:randomUUID(),authVersion:0}; currentSession=new Response(null,{status:401});
        res=await route.GET(request()); assert.match(res.headers.get('location'), /account\?google=failed/); assert.equal(writes,1);
        remaining=1; currentSession={userId:currentAttempt.userId,authVersion:1}; await route.GET(request()); assert.equal(writes,1);
        assert.ok(!res.headers.get('location').includes('private-code'));
    } finally {console.error=originalLog;restore();}
});
test('Google connect requires same-origin request, valid account session and correct existing password', async () => {
    const restore=env(); try {
        const g=await oauth(), {NextRequest}=require('next/server'); const user={id:randomUUID(),active:true,authVersion:0,password:await bcrypt.hash('correct-password',4)}; let session=new Response(null,{status:401}), attempts=0;
        const route=load('src/app/api/auth/google/route.ts',{'@/lib/google-oauth':g,'@/lib/prisma':{prisma:{user:{findUnique:async()=>user},oAuthAttempt:{deleteMany:async()=>({count:0}),create:async()=>{attempts++;}}}},'@/lib/roles':{requireAuth:async()=>session}});
        const request=(password,origin='http://localhost:3117')=>new NextRequest('http://localhost:3117/api/auth/google',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({password})});
        assert.equal((await route.POST(request('correct-password','https://evil.test'))).status,403);
        assert.equal((await route.POST(request('correct-password'))).status,401);
        session={userId:user.id,authVersion:0}; assert.equal((await route.POST(request('wrong'))).status,400); assert.equal(attempts,0);
        const res=await route.POST(request('correct-password')); assert.equal(res.status,200); assert.equal(attempts,1); assert.match(res.headers.get('set-cookie'),/HttpOnly/i);
        user.active=false; assert.equal((await route.POST(request('correct-password'))).status,400);
    } finally {restore();}
});
test('password sign-in rejects passwordless Google users without bcrypt or a session', async () => {
    const {AuthService}=load('src/lib/services/AuthService.ts',{'../prisma':{prisma:{user:{findUnique:async()=>({active:true,password:null})}}},'../auth':{setSessionCookie:()=>{throw Error('No session');}},bcrypt:{compare:()=>{throw Error('No comparison');}}});
    await assert.rejects(AuthService.login(identity.email,'anything'),/Invalid credentials/);
});
test('account profile exposes only sign-in flags, never password hashes or Google subjects', async () => {
    const {AccountService}=load('src/lib/services/AccountService.ts',{'../prisma':{prisma:{user:{findUniqueOrThrow:async()=>({id:'id',password:'private-hash',googleSubject:'private-provider-subject'})}}}});
    assert.deepEqual(await AccountService.profile('id'),{id:'id',hasPassword:true,googleConnected:true});
});
