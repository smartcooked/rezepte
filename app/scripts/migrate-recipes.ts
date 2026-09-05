// Einmalige Übernahme: ../_data/*.json + ../docs/rezepte/<slug>/bild.jpg -> Supabase (idempotent, Upsert auf slug)
// Aufruf: npx tsx scripts/migrate-recipes.ts   (liest app/.env)
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const env = Object.fromEntries(readFileSync(resolve(import.meta.dirname, '../.env'), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const root = resolve(import.meta.dirname, '../..');
const { data: admin } = await sb.from('profiles').select('id').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
if (!admin) { console.error('Kein Admin-Profil gefunden. Zuerst den Admin einladen und Rolle setzen.'); process.exit(1); }
for (const f of readdirSync(resolve(root, '_data')).filter((x) => x.endsWith('.json'))) {
	const j = JSON.parse(readFileSync(resolve(root, '_data', f), 'utf8'));
	const row = {
		slug: j.slug, owner_id: admin.id, visibility: j.status === 'published' ? 'public' : 'private',
		title: j.title, subtitle: j.subtitle ?? null, description: j.description ?? null, servings: j.servings,
		ingredients: j.ingredients, steps: j.steps, prep_min: j.times?.prep_min ?? 0, cook_min: j.times?.cook_min ?? 0, rest_min: j.times?.rest_min ?? 0,
		difficulty: j.difficulty, calories_per_serving: j.calories_per_serving ?? null, nutrition: j.nutrition ?? null, tip: j.tip ?? null,
		image_source: j.image_source ?? null, source_type: j.source?.type ?? null, source_note: j.source?.note ?? null, author: j.author ?? null,
		estimated: j.estimated ?? [], diet: j.diet ?? [], categories: j.categories ?? [], cuisine: j.cuisine ?? null, keywords: j.keywords ?? [], tags: j.tags ?? [],
		meal: j.meal ?? [], daytime: j.daytime ?? [], dish_type: j.dish_type ?? [], properties: j.properties ?? [], method: j.method ?? [], occasion: j.occasion ?? [],
		created_at: j.created ? j.created + 'T12:00:00Z' : undefined, updated_at: j.updated ? j.updated + 'T12:00:00Z' : undefined
	};
	const { data: rec, error } = await sb.from('recipes').upsert(row, { onConflict: 'slug' }).select('id,slug').single();
	if (error) { console.error(j.slug, error.message); continue; }
	const img = resolve(root, 'docs/rezepte', j.slug, 'bild.jpg');
	if (j.image && existsSync(img)) {
		const buf = readFileSync(img);
		const up = await sb.storage.from('recipe-images').upload(`${rec.id}/bild.jpg`, buf, { contentType: 'image/jpeg', upsert: true });
		if (up.error) console.error(j.slug, 'Bild:', up.error.message);
		else await sb.from('recipes').update({ image_path: `${rec.id}/bild.jpg` }).eq('id', rec.id);
	}
	if (j.rating) await sb.from('ratings').upsert({ recipe_id: rec.id, user_id: admin.id, stars: j.rating });
	if (j.notes) await sb.from('recipe_notes').upsert({ recipe_id: rec.id, user_id: admin.id, body: j.notes });
	console.log('ok', j.slug);
}
