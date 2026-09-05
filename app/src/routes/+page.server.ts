import type { PageServerLoad } from './$types';
import type { RecipeCardRow } from '$lib/recipe/types';
const COLS = 'id,slug,title,subtitle,description,image_path,visibility,difficulty,prep_min,cook_min,rest_min,meal,daytime,dish_type,diet,properties,method,occasion,cuisine,tags,categories,rating_avg,rating_count,updated_at,ingredient_names,nutrition_per_serving';
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase) return { recipes: [] as RecipeCardRow[], dbConnected: false };
	const { data, error } = await locals.supabase.from('recipes').select(COLS).is('archived_at', null).order('updated_at', { ascending: false });
	if (error) return { recipes: [] as RecipeCardRow[], dbConnected: true, error: error.message };
	let mine: Record<string, number> = {};
	if (locals.user) { const { data: r } = await locals.supabase.from('ratings').select('recipe_id,stars').eq('user_id', locals.user.id); (r || []).forEach((x) => (mine[x.recipe_id] = x.stars)); }
	const recipes: RecipeCardRow[] = (data || []).map((r) => ({ ...r, total_min: r.prep_min + r.cook_min + r.rest_min, kcal: r.nutrition_per_serving?.kcal ?? null, my_rating: mine[r.id] ?? null }));
	return { recipes, dbConnected: true };
};
