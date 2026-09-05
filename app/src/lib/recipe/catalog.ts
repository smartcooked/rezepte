import type { RecipeCardRow } from './types';
export type Facet = { key: string; label: string; icon: string; type: 'radio' | 'multi'; field?: keyof RecipeCardRow; options?: [string, string][]; def?: string };
export const ORDER: Record<string, string[]> = {
	meal: ['Frühstück', 'Vorspeise', 'Hauptspeise', 'Beilage', 'Dessert', 'Snack'],
	daytime: ['Frühstück', 'Mittag', 'Abendessen'],
	properties: ['Einfach', 'Schnell', 'Wenige Zutaten', 'Preiswert', 'Meal Prep', 'Basisrezept'],
	occasion: ['Frühling', 'Sommer', 'Herbst', 'Winter', 'Für Kinder', 'Party', 'Büro', 'Picknick', 'Grillen', 'Ostern', 'Weihnachten', 'Silvester']
};
export const FACETS: Facet[] = [
	{ key: 'sort', label: 'Sortieren', icon: 'sort', type: 'radio', options: [['new', 'Neueste zuerst'], ['az', 'A bis Z'], ['time', 'Kürzeste Arbeitszeit'], ['kcal', 'Wenigste Kalorien'], ['rating', 'Beste Bewertung']], def: 'new' },
	{ key: 'rating', label: 'Bewertung', icon: 'star', type: 'radio', options: [['2', 'ab 2 Sterne'], ['3', 'ab 3 Sterne'], ['4', 'ab 4 Sterne'], ['5', 'Top, 5 Sterne']] },
	{ key: 'prep', label: 'Arbeitszeit', icon: 'clock', type: 'radio', options: [['15', 'bis 15 Min.'], ['30', 'bis 30 Min.'], ['45', 'bis 45 Min.'], ['60', 'bis 60 Min.']] },
	{ key: 'diet', label: 'Ernährung', icon: 'leaf', type: 'multi', field: 'diet' },
	{ key: 'dish', label: 'Rezeptkategorie', icon: 'bowl', type: 'multi', field: 'dish_type' },
	{ key: 'props', label: 'Rezepteigenschaften', icon: 'spark', type: 'multi', field: 'properties' },
	{ key: 'method', label: 'Zubereitung', icon: 'cook', type: 'multi', field: 'method' },
	{ key: 'cuisine', label: 'Länderküche', icon: 'globe', type: 'multi', field: 'cuisine' },
	{ key: 'meal', label: 'Mahlzeit', icon: 'cloche', type: 'multi', field: 'meal' },
	{ key: 'daytime', label: 'Tageszeit', icon: 'sun', type: 'multi', field: 'daytime' },
	{ key: 'occasion', label: 'Anlass', icon: 'flag', type: 'multi', field: 'occasion' }
];
export type FilterState = Record<string, string | string[]>;
export function initialState(params: URLSearchParams): FilterState {
	const s: FilterState = {};
	for (const f of FACETS) { const v = params.get(f.key); s[f.key] = f.type === 'multi' ? (v ? v.split(',') : []) : v || f.def || ''; }
	return s;
}
export function norm(s: string | null | undefined) { return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
export function fieldValues(r: RecipeCardRow, field: keyof RecipeCardRow): string[] {
	const v = r[field]; if (Array.isArray(v)) return v as string[]; if (typeof v === 'string' && v) return [v]; return [];
}
export function searchText(r: RecipeCardRow) {
	return norm([r.title, r.subtitle, r.description, ...(r.ingredient_names || []), ...r.tags, ...r.categories, r.cuisine, ...r.meal, ...r.dish_type, ...r.method, ...r.occasion, ...r.properties].filter(Boolean).join(' '));
}
export function optionsFor(all: RecipeCardRow[], f: Facet): [string, string][] {
	if (f.type === 'radio') return f.options!;
	const seen = new Set<string>(); all.forEach((r) => fieldValues(r, f.field!).forEach((v) => seen.add(v)));
	const ord = ORDER[f.field as string] || [];
	return [...seen].sort((a, b) => { const ia = ord.indexOf(a), ib = ord.indexOf(b); if (ia < 0 && ib < 0) return a.localeCompare(b, 'de'); if (ia < 0) return 1; if (ib < 0) return -1; return ia - ib; }).map((v) => [v, v]);
}
export function passes(r: RecipeCardRow, state: FilterState, q: string, skipKey?: string): boolean {
	const needle = norm(q.trim());
	if (needle && !searchText(r).includes(needle)) return false;
	for (const f of FACETS) {
		if (f.key === skipKey || f.key === 'sort') continue;
		const v = state[f.key];
		if (f.type === 'multi') { const arr = v as string[]; if (arr.length && !arr.some((x) => fieldValues(r, f.field!).includes(x))) return false; }
		else if (f.key === 'rating') { if (v && (r.my_rating || 0) < parseInt(v as string, 10)) return false; }
		else if (f.key === 'prep') { if (v && r.prep_min > parseInt(v as string, 10)) return false; }
	}
	return true;
}
export function isActive(f: Facet, state: FilterState) { const v = state[f.key]; return f.type === 'multi' ? (v as string[]).length > 0 : !!v && v !== (f.def || ''); }
export function sortList(list: RecipeCardRow[], sort: string) {
	return [...list].sort((a, b) => {
		if (sort === 'az') return a.title.localeCompare(b.title, 'de');
		if (sort === 'time') return (a.prep_min || 0) - (b.prep_min || 0);
		if (sort === 'kcal') return (a.kcal ?? 9999) - (b.kcal ?? 9999);
		if (sort === 'rating') return (b.my_rating || b.rating_avg || 0) - (a.my_rating || a.rating_avg || 0);
		return (b.updated_at || '').localeCompare(a.updated_at || '');
	});
}
export function toParams(state: FilterState, q: string): URLSearchParams {
	const p = new URLSearchParams(); if (q) p.set('q', q);
	for (const f of FACETS) if (isActive(f, state)) p.set(f.key, f.type === 'multi' ? (state[f.key] as string[]).join(',') : (state[f.key] as string));
	return p;
}
