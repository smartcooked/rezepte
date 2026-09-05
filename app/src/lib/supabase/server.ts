import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
/** Service-Rolle: nur serverseitig, umgeht RLS. */
export function serviceClient() {
	const url = pub.PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return null;
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
