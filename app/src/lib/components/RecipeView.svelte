<script lang="ts">
	import Icon from './Icon.svelte';
	import { DIFFICULTY_LEVEL, type Recipe } from '$lib/recipe/types';
	import { formatAmount, minutesLabel, ingredientLine } from '$lib/recipe/format';
	import { toast } from '$lib/state/toast.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	let { recipe, img, pageUrl, myRating = null, myNote = '', hearted = false }: { recipe: Recipe; img: string | null; pageUrl: string; myRating?: number | null; myNote?: string; hearted?: boolean } = $props();
	const r = recipe;
	let cur = $state(r.servings);
	const factor = $derived(cur / r.servings);
	const total = r.prep_min + r.cook_min + r.rest_min;
	const est = new Set(r.estimated.includes('all') ? [...r.estimated, 'times', 'calories', 'difficulty'] : r.estimated);
	const groups = new Set(r.ingredients.map((i) => i.group || null));
	const showGroups = [...groups].filter(Boolean).length > 0 && (groups.size > 1 || r.ingredients.length > 3);
	const chips = (() => { const seen = new Set<string>(), out: string[] = []; for (const x of [...r.tags, ...r.categories.map((c) => c.split('>').pop()!.trim())]) { const k = x.trim().toLowerCase(); if (k && !seen.has(k)) { seen.add(k); out.push(x.trim()); } } return out; })();
	let shareOpen = $state(false);
	let rating = $state(myRating || 0), note = $state(myNote), heart = $state(hearted);
	const LBL = ['', 'Nicht so meins', 'Geht so', 'Gut', 'Sehr gut', 'Top, immer wieder'];
	const supabase = $derived(page.data.supabase);
	const user = $derived(page.data.user);
	async function setRating(v: number) {
		if (!supabase || !user) return; const nv = rating === v ? 0 : v; rating = nv;
		const { error } = nv ? await supabase.from('ratings').upsert({ recipe_id: r.id, user_id: user.id, stars: nv }) : await supabase.from('ratings').delete().eq('recipe_id', r.id).eq('user_id', user.id);
		toast(error ? 'Fehler beim Speichern' : nv ? 'Bewertung gespeichert' : 'Bewertung entfernt');
	}
	let noteTimer: ReturnType<typeof setTimeout>;
	function saveNote() { clearTimeout(noteTimer); noteTimer = setTimeout(async () => { if (!supabase || !user) return; const { error } = note.trim() ? await supabase.from('recipe_notes').upsert({ recipe_id: r.id, user_id: user.id, body: note }) : await supabase.from('recipe_notes').delete().eq('recipe_id', r.id).eq('user_id', user.id); toast(error ? 'Fehler beim Speichern' : 'Notiz gespeichert'); }, 800); }
	async function toggleHeart() {
		if (!supabase || !user) return; heart = !heart;
		const { data: cb } = await supabase.from('cookbooks').select('id').eq('owner_id', user.id).eq('is_default', true).maybeSingle(); if (!cb) return;
		const { error } = heart ? await supabase.from('cookbook_recipes').upsert({ cookbook_id: cb.id, recipe_id: r.id, added_by: user.id }) : await supabase.from('cookbook_recipes').delete().eq('cookbook_id', cb.id).eq('recipe_id', r.id);
		if (error) { heart = !heart; toast('Fehler beim Speichern'); } else toast(heart ? 'Im Kochbuch gespeichert' : 'Aus dem Kochbuch entfernt');
	}
	function copy(text: string, ok: string) { navigator.clipboard?.writeText(text).then(() => toast(ok)); shareOpen = false; }
	function share() { const d = { title: r.title, text: r.title, url: pageUrl }; if (navigator.share) navigator.share(d).catch(() => {}); else copy(pageUrl, 'Link kopiert'); shareOpen = false; }
	const copyIngredients = () => copy(r.ingredients.map((i) => `${formatAmount(i.amount)}\t${i.unit || ''}\t${i.name}${i.note ? ` (${i.note})` : ''}`).join('\n'), 'Zutaten kopiert');
	const copySteps = () => copy(r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), 'Zubereitung kopiert');
	let qrSvg = $state(''); let canShare = $state(false);
	onMount(async () => { canShare = 'share' in navigator; try { const QR = await import('qrcode'); qrSvg = await QR.toString(pageUrl, { type: 'svg', margin: 0 }); } catch {} });
</script>
<main class="wrap">
	<div class="print-head"><span class="brand"><Icon name="logo" /><span class="wm">smart<em>cooked</em></span></span><span class="qr"><span>Rezept online<br />aufrufen</span><span>{@html qrSvg}</span></span></div>
	<section class="hero">
		{#if img}<div class="hero-img"><img src={img} alt={r.title} /></div>{:else}<div class="hero-img empty" aria-hidden="true"><Icon name="logo" /></div>{/if}
		<div>
			<h1>{r.title}</h1>
			{#if r.subtitle}<p class="sub">{r.subtitle}</p>{/if}
			<ul class="meta">
				<li><Icon name="clock" /><span><b>{minutesLabel(total)}</b><small>Gesamtzeit{#if est.has('times')} <span class="est">geschätzt</span>{/if}</small></span></li>
				<li><Icon name="work" /><span><b>{minutesLabel(r.prep_min)}</b><small>Arbeitszeit</small></span></li>
				<li><Icon name="gauge" class="lvl-{DIFFICULTY_LEVEL[r.difficulty]}" /><span><b>{r.difficulty[0].toUpperCase() + r.difficulty.slice(1)}</b><small>Schwierigkeit{#if est.has('difficulty')} <span class="est">geschätzt</span>{/if}</small></span></li>
				{#if r.diet.length}<li><Icon name="leaf" /><span><b>{r.diet.join(', ')}</b><small>Ernährung</small></span></li>{/if}
				<li><Icon name="user" /><span><b>{r.author || 'smartcooked'}</b><small>Rezeptautor:in</small></span></li>
			</ul>
			{#if chips.length || r.cuisine}<div class="tags">{#each chips as t}<span class="tag">{t}</span>{/each}{#if r.cuisine}<span class="tag neutral"><Icon name="globe" />{r.cuisine}</span>{/if}</div>{/if}
			{#if user}
				<div class="actions-row" style="padding-top:14px">
					<button class="btn" class:primary={heart} type="button" onclick={toggleHeart}><Icon name="heart" />{heart ? 'Im Kochbuch' : 'Merken'}</button>
					<button class="btn" type="button" onclick={() => (shareOpen = !shareOpen)}><Icon name="share" />Teilen</button>
					<button class="btn" type="button" onclick={() => window.print()}><Icon name="print" />Drucken</button>
				</div>
			{:else}
				<div class="actions-row" style="padding-top:14px"><button class="btn" type="button" onclick={() => (shareOpen = !shareOpen)}><Icon name="share" />Teilen</button><button class="btn" type="button" onclick={() => window.print()}><Icon name="print" />Drucken</button></div>
			{/if}
		</div>
	</section>
	<div class="main">
		<section class="card" aria-labelledby="h-zutaten">
			<div class="sect-head"><h2 id="h-zutaten">Zutaten</h2></div>
			<div class="portions">
				<span class="p-text">Für <b>{cur}</b> {cur === 1 ? 'Portion' : 'Portionen'}</span>
				<div class="stepper" aria-label="Portionen anpassen">
					<button type="button" aria-label="Eine Portion weniger" onclick={() => cur > 1 && cur--}><Icon name="minus" /></button>
					<label class="p-field"><span class="sr">Portionen</span><input type="number" min="1" max="99" inputmode="numeric" bind:value={cur} onfocus={(e) => (e.currentTarget as HTMLInputElement).select()} /></label>
					<button type="button" aria-label="Eine Portion mehr" onclick={() => cur < 99 && cur++}><Icon name="plus" /></button>
				</div>
			</div>
			<table class="ings">
				<tbody>
					{#each r.ingredients as ing, i}
						{#if showGroups && ing.group && (i === 0 || r.ingredients[i - 1].group !== ing.group)}<tr class="grp"><th colspan="3">{ing.group}</th></tr>{/if}
						<tr><td class="n">{ing.amount != null ? formatAmount(ing.amount * factor) : ''}</td><td class="u">{ing.unit || ''}</td><td class="i">{ing.name}{#if ing.note}<small>{ing.note}</small>{/if}</td></tr>
					{/each}
				</tbody>
			</table>
		</section>
		<section class="card" aria-labelledby="h-zub">
			<div class="sect-head"><h2 id="h-zub">Zubereitung</h2></div>
			<div class="times">
				<div><Icon name="clock" /><span><b>{minutesLabel(total)}</b><small>Gesamtzeit</small></span></div>
				<div><Icon name="work" /><span><b>{minutesLabel(r.prep_min)}</b><small>Arbeitszeit</small></span></div>
				{#if r.cook_min}<div><Icon name="cook" /><span><b>{minutesLabel(r.cook_min)}</b><small>Koch-/Backzeit</small></span></div>{/if}
				{#if r.rest_min}<div><Icon name="rest" /><span><b>{minutesLabel(r.rest_min)}</b><small>Ruhezeit</small></span></div>{/if}
			</div>
			<ol class="steps">{#each r.steps as s}<li><p>{s}</p></li>{/each}</ol>
			{#if r.tip}<div class="tip"><Icon name="bulb" /><p><b>Tipp:</b> {r.tip}</p></div>{/if}
		</section>
	</div>
	{#if r.nutrition_per_serving}
		{@const n = r.nutrition_per_serving}
		<section class="nutri-sect" aria-labelledby="h-nutri">
			<div class="sect-head"><h2 id="h-nutri">Nährwerte pro Portion</h2><small>{r.nutrition_source === 'berechnet' ? 'berechnet aus den Zutaten' : r.nutrition_source === 'angabe' ? 'laut Quelle' : 'geschätzt'}</small></div>
			<div class="nutri-tiles">
				<div><Icon name="flame" /><span><b>{Math.round(n.kcal)} kcal</b><small>Energie</small></span></div>
				<div><Icon name="egg" /><span><b>{n.protein_g != null ? Math.round(n.protein_g) + ' g' : '–'}</b><small>Eiweiß</small></span></div>
				<div><Icon name="drop" /><span><b>{n.fat_g != null ? Math.round(n.fat_g) + ' g' : '–'}</b><small>Fett</small></span></div>
				<div><Icon name="bread" /><span><b>{n.carbs_g != null ? Math.round(n.carbs_g) + ' g' : '–'}</b><small>Kohlenhydrate</small></span></div>
			</div>
		</section>
	{/if}
	{#if user}
		<section class="card mine" aria-labelledby="h-mine">
			<div class="sect-head"><h2 id="h-mine">Meine Bewertung &amp; Notizen</h2></div>
			<div class="stars" role="radiogroup" aria-label="Bewertung in Sternen">
				{#each [1, 2, 3, 4, 5] as v}<button type="button" class:on={v <= rating} aria-label="{v} Sterne" onclick={() => setRating(v)}><Icon name="star" /></button>{/each}
				<span class="stars-lbl">{rating ? `${rating} von 5 · ${LBL[rating]}` : 'Noch nicht bewertet'}</span>
			</div>
			<label class="notes"><span>Notizen</span><textarea rows="3" bind:value={note} oninput={saveNote} placeholder="z.B. weniger Salz, Kinder fanden es super, nächstes Mal mit Reis …"></textarea></label>
		</section>
	{/if}
	<div class="actions-row"><button class="btn primary" type="button" onclick={() => window.print()}><Icon name="print" />Drucken</button><button class="btn" type="button" onclick={() => (shareOpen = !shareOpen)}><Icon name="share" />Teilen</button><a class="btn" href="/"><Icon name="book" />Alle Rezepte</a></div>
	{#if shareOpen}
		<div class="share-backdrop" onclick={() => (shareOpen = false)} role="presentation"></div>
		<div class="share-menu" role="menu" style="top:auto;bottom:24px;left:50%;transform:translateX(-50%)">
			{#if canShare}<button type="button" role="menuitem" onclick={share}><Icon name="share" />Link teilen</button>{/if}
			<button type="button" role="menuitem" onclick={() => copy(pageUrl, 'Link kopiert')}><Icon name="link" />Link kopieren</button>
			<button type="button" role="menuitem" onclick={copyIngredients}><Icon name="copy" />Zutaten kopieren</button>
			<button type="button" role="menuitem" onclick={copySteps}><Icon name="copy" />Zubereitung kopieren</button>
			<button type="button" role="menuitem" onclick={() => { shareOpen = false; window.print(); }}><Icon name="print" />Drucken</button>
		</div>
	{/if}
</main>
<footer class="foot"><div class="wrap"><span class="brand small"><span class="wm">smart<em>cooked</em></span></span><span>·</span><a href="/">Alle Rezepte</a><span>·</span><span>Stand {r.updated_at.slice(0, 10)}</span></div></footer>
