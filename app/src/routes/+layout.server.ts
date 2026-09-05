import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return { session: locals.session, user: locals.user, profile: locals.profile, cookies: cookies.getAll(), dbConnected: !!locals.supabase };
};
