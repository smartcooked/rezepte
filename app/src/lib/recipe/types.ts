export type Ingredient = { amount: number | null; unit: string | null; name: string; note?: string | null; group?: string | null; grams?: number | null; per100?: { kcal: number; protein_g?: number; fat_g?: number; carbs_g?: number } | null };
export type Recipe = {
	id: string; slug: string; owner_id: string | null; visibility: 'public' | 'members' | 'private'; forked_from: string | null;
	title: string; subtitle: string | null; description: string | null; servings: number;
	ingredients: Ingredient[]; steps: string[]; prep_min: number; cook_min: number; rest_min: number;
	difficulty: 'simpel' | 'normal' | 'pfiffig'; calories_per_serving: number | null; nutrition: { carbs_g?: number; protein_g?: number; fat_g?: number } | null;
	tip: string | null; image_path: string | null; image_source: string | null; source_type: string | null; source_note: string | null; source_url: string | null;
	author: string | null; estimated: string[]; diet: string[]; categories: string[]; cuisine: string | null; keywords: string[]; tags: string[];
	meal: string[]; daytime: string[]; dish_type: string[]; properties: string[]; method: string[]; occasion: string[];
	ingredient_names: string[]; nutrition_per_serving: { kcal: number; protein_g: number | null; fat_g: number | null; carbs_g: number | null } | null; nutrition_source: 'berechnet' | 'angabe' | 'geschaetzt' | null;
	rating_avg: number | null; rating_count: number; created_at: string; updated_at: string; published_at: string | null;
};
/** Leichte Zeile für Katalog/Kochbuch (View recipe_previews oder Auswahl aus recipes). */
export type RecipeCardRow = Pick<Recipe, 'id' | 'slug' | 'title' | 'subtitle' | 'image_path' | 'visibility' | 'difficulty' | 'prep_min' | 'meal' | 'daytime' | 'dish_type' | 'diet' | 'properties' | 'method' | 'occasion' | 'cuisine' | 'tags' | 'categories' | 'rating_avg' | 'rating_count' | 'updated_at'> & { total_min: number; kcal: number | null; description?: string | null; ingredient_names?: string[]; my_rating?: number | null; hearted?: boolean };
export const DIFFICULTY_LEVEL: Record<string, number> = { simpel: 1, normal: 2, pfiffig: 3 };
