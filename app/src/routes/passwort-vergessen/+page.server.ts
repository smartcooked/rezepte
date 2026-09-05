import type { Actions } from './$types';
import { serviceClient } from '$lib/supabase/server';
import { env as pub } from '$env/dynamic/public';
export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const ident = String((await request.formData()).get('identifier') || '').trim();
		let email = ident;
		if (ident && !ident.includes('@')) { const svc = serviceClient(); const { data } = svc ? await svc.rpc('email_for_username', { u: ident.toLowerCase() }) : { data: null }; email = (data as string) || ''; }
		if (email && locals.supabase) await locals.supabase.auth.resetPasswordForEmail(email, { redirectTo: `${(pub.PUBLIC_SITE_URL || url.origin).replace(/\/$/, '')}/auth/callback?next=/passwort-neu` });
		return { sent: true };
	}
};
