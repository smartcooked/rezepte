import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { serviceClient } from '$lib/supabase/server';
import { buildJsonLd } from '$lib/recipe/jsonld';
import { imageUrl } from '$lib/recipe/format';
import { env as pub } from '$env/dynamic/public';
import type { Recipe } from '$lib/recipe/types';
export const load: PageServerLoad = async ({ params, locals, url, setHeaders }) => {
	if (!locals.supabase) throw error(503, 'Datenbank nicht verbunden');
	const site = (pub.PUBLIC_SITE_URL || url.origin).replace(/\/$/, '');
	const pageUrl = `${site}/r/${params.slug}`;
	const { data: full } = await locals.supabase.from('recipes').select('*').eq('slug', params.slug).maybeSingle();
	if (full) {
		const r = full as Recipe;
		let myRating: number | null = null, myNote = '', hearted = false;
		if (locals.user) {
			const [{ data: rt }, { data: nt }, { data: cb }] = await Promise.all([
				locals.supabase.from('ratings').select('stars').eq('recipe_id', r.id).eq('user_id', locals.user.id).maybeSingle(),
				locals.supabase.from('recipe_notes').select('body').eq('recipe_id', r.id).eq('user_id', locals.user.id).maybeSingle(),
				locals.supabase.from('cookbook_recipes').select('cookbook_id, cookbooks!inner(owner_id,is_default)').eq('recipe_id', r.id).eq('cookbooks.owner_id', locals.user.id).eq('cookbooks.is_default', true).maybeSingle()
			]);
			myRating = rt?.stars ?? null; myNote = nt?.body ?? ''; hearted = !!cb;
		} else if (r.visibility === 'public') setHeaders({ 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' });
		const img = imageUrl(pub.PUBLIC_SUPABASE_URL || '', r.image_path);
		const jsonld = r.visibility === 'public' ? buildJsonLd(r, pageUrl, img, 'smartcooked') : null;
		return { mode: 'full' as const, recipe: r, jsonld, img, pageUrl, myRating, myNote, hearted };
	}
	// Redirect alter Slugs
	const { data: red } = await locals.supabase.from('slug_redirects').select('recipes(slug)').eq('old_slug', params.slug).maybeSingle();
	const newSlug = (red as { recipes?: { slug: string } } | null)?.recipes?.slug;
	if (newSlug) return { mode: 'redirect' as const, to: `/r/${newSlug}` };
	// Reduzierte Vorschau (nur Titel, Bild, Teaser) für members-Rezepte ohne Login
	const svc = serviceClient();
	const { data: prev } = svc ? await svc.from('recipes').select('slug,title,subtitle,description,image_path,visibility').eq('slug', params.slug).is('archived_at', null).maybeSingle() : { data: null };
	if (prev && prev.visibility !== 'private') return { mode: 'preview' as const, recipe: prev, img: imageUrl(pub.PUBLIC_SUPABASE_URL || '', prev.image_path), pageUrl };
	throw error(404, 'Rezept nicht gefunden');
};
