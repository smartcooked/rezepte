import { createServerClient } from '@supabase/ssr';
import { env as pub } from '$env/dynamic/public';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const PUBLIC_PREFIXES = ['/', '/r/', '/login', '/passwort-vergessen', '/passwort-neu', '/einladung', '/auth/', '/einkauf/rezept/', '/api/cron/', '/manifest.webmanifest', '/robots.txt', '/favicon', '/apple-touch-icon', '/icon-512'];
function isPublic(path: string) {
	if (path === '/') return true;
	return PUBLIC_PREFIXES.some((p) => p !== '/' && path.startsWith(p));
}

const supabase: Handle = async ({ event, resolve }) => {
	const url = pub.PUBLIC_SUPABASE_URL, key = pub.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		// Noch keine Datenbank verbunden: App läuft im Demo-Modus ohne Login.
		event.locals.supabase = null as never;
		event.locals.safeGetSession = async () => ({ session: null, user: null });
		event.locals.session = null; event.locals.user = null; event.locals.profile = null;
		return resolve(event);
	}
	event.locals.supabase = createServerClient(url, key, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => cookies.forEach(({ name, value, options }) => event.cookies.set(name, value, { ...options, path: '/' }))
		}
	});
	event.locals.safeGetSession = async () => {
		const { data: { session } } = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };
		const { data: { user }, error } = await event.locals.supabase.auth.getUser();
		if (error || !user) return { session: null, user: null };
		return { session, user };
	};
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session; event.locals.user = user; event.locals.profile = null;
	if (user) {
		const { data } = await event.locals.supabase.from('profiles').select('id,username,display_name,role,active').eq('id', user.id).maybeSingle();
		event.locals.profile = data ?? null;
		if (data && !data.active) { await event.locals.supabase.auth.signOut(); throw redirect(303, '/login?deaktiviert=1'); }
	}
	return resolve(event, { filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version' });
};

const guard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (!isPublic(path) && !event.locals.user && event.locals.supabase) {
		throw redirect(303, '/login?next=' + encodeURIComponent(path + event.url.search));
	}
	if (path.startsWith('/backend/nutzer') && event.locals.profile?.role !== 'admin') throw redirect(303, '/backend');
	return resolve(event);
};

export const handle = sequence(supabase, guard);
