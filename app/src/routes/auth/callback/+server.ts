import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code'); const next = url.searchParams.get('next') || '/';
	if (code && locals.supabase) { const { error } = await locals.supabase.auth.exchangeCodeForSession(code); if (!error) throw redirect(303, next); }
	throw redirect(303, '/login?fehler=link');
};
