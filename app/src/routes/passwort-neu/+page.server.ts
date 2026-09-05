import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => { if (!locals.user) throw redirect(303, '/login?fehler=link'); return {}; };
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const f = await request.formData(); const p1 = String(f.get('password') || ''), p2 = String(f.get('password2') || '');
		if (p1.length < 8) return fail(400, { msg: 'Mindestens 8 Zeichen.' }); if (p1 !== p2) return fail(400, { msg: 'Die Passwörter stimmen nicht überein.' });
		const { error } = await locals.supabase.auth.updateUser({ password: p1 }); if (error) return fail(400, { msg: error.message });
		throw redirect(303, '/?willkommen=1');
	}
};
