import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { serviceClient } from '$lib/supabase/server';
export const load: PageServerLoad = async ({ locals, url }) => { if (locals.user) throw redirect(303, url.searchParams.get('next') || '/'); return { deactivated: url.searchParams.has('deaktiviert') }; };
export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const ident = String(form.get('identifier') || '').trim(), password = String(form.get('password') || '');
		if (!ident || !password) return fail(400, { msg: 'Bitte Benutzername oder E-Mail und Passwort eingeben.', ident });
		let email = ident;
		if (!ident.includes('@')) {
			const svc = serviceClient(); const { data } = svc ? await svc.rpc('email_for_username', { u: ident.toLowerCase() }) : { data: null };
			if (!data) return fail(400, { msg: 'Anmeldung fehlgeschlagen.', ident });
			email = data as string;
		}
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { msg: 'Anmeldung fehlgeschlagen.', ident });
		throw redirect(303, url.searchParams.get('next') || '/');
	}
};
