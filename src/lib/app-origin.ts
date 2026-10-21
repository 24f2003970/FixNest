// Edge-compatible: never derive a production redirect from the internal server
// address or an untrusted forwarded Host header.
export function appOrigin(developmentOrigin?: string) {
    const url = new URL(process.env.APP_ORIGIN || (process.env.NODE_ENV !== 'production' ? developmentOrigin || '' : ''));
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:'))) throw new Error('Invalid APP_ORIGIN');
    return url.origin;
}
