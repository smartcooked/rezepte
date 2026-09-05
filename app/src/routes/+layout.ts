import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { env as pub } from '$env/dynamic/public';
import type { LayoutLoad } from './$types';
export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');
	const url = pub.PUBLIC_SUPABASE_URL, key = pub.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return { ...data, supabase: null };
	const supabase = isBrowser()
		? createBrowserClient(url, key, { global: { fetch } })
		: createServerClient(url, key, { global: { fetch }, cookies: { getAll: () => data.cookies } });
	return { ...data, supabase };
};
