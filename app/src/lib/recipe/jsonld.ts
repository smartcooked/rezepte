import { ingredientLine, isoDuration } from './format';
import type { Recipe } from './types';
const DIET_SCHEMA: Record<string, string> = { vegetarisch: 'VegetarianDiet', vegan: 'VeganDiet', glutenfrei: 'GlutenFreeDiet', laktosefrei: 'LowLactoseDiet', 'low carb': 'LowCalorieDiet', halal: 'HalalDiet', koscher: 'KosherDiet' };
/** Port von build_jsonld() aus scripts/build.py. */
export function buildJsonLd(r: Recipe, url: string, imageUrl: string | null, author: string) {
	const total = r.prep_min + r.cook_min + r.rest_min;
	const ld: Record<string, unknown> = {
		'@context': 'https://schema.org', '@type': 'Recipe',
		name: r.title, description: r.subtitle || r.description || '', url, mainEntityOfPage: url,
		author: { '@type': 'Person', name: r.author || author }, datePublished: (r.published_at || r.created_at).slice(0, 10), dateModified: r.updated_at.slice(0, 10), inLanguage: 'de',
		recipeYield: [String(r.servings), `${r.servings} Portionen`],
		recipeIngredient: r.ingredients.map(ingredientLine),
		recipeInstructions: r.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s }))
	};
	if (imageUrl) ld.image = [imageUrl];
	if (r.prep_min) ld.prepTime = isoDuration(r.prep_min);
	if (r.cook_min) ld.cookTime = isoDuration(r.cook_min);
	if (total) ld.totalTime = isoDuration(total);
	const n = r.nutrition_per_serving;
	if (n?.kcal != null) {
		const nu: Record<string, string> = { '@type': 'NutritionInformation', calories: `${Math.round(n.kcal)} kcal`, servingSize: '1 Portion' };
		if (n.carbs_g != null) nu.carbohydrateContent = `${Math.round(n.carbs_g)} g`;
		if (n.protein_g != null) nu.proteinContent = `${Math.round(n.protein_g)} g`;
		if (n.fat_g != null) nu.fatContent = `${Math.round(n.fat_g)} g`;
		ld.nutrition = nu;
	}
	const cats = r.categories.map((c) => c.split('>').pop()!.trim());
	if (cats.length) ld.recipeCategory = cats;
	if (r.cuisine) ld.recipeCuisine = r.cuisine;
	const diets = r.diet.filter((d) => DIET_SCHEMA[d]).map((d) => 'https://schema.org/' + DIET_SCHEMA[d]);
	if (diets.length) ld.suitableForDiet = diets;
	ld.keywords = [...new Set([...r.keywords, ...r.diet, r.difficulty])].join(', ');
	return ld;
}
export function serializeJsonLd(ld: unknown): string { return JSON.stringify(ld).replace(/</g, '\\u003c'); }
