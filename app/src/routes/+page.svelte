<script lang="ts">
	import FilterBar from '$lib/components/FilterBar.svelte';
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { RecipeCardRow } from '$lib/recipe/types';
	let { data } = $props();
	let list: RecipeCardRow[] = $state([]);
</script>
<svelte:head><title>smartcooked</title><meta name="description" content="Rezeptkatalog mit Suche, Filter und Sortierung." /></svelte:head>
<main class="wrap">
	<div class="cat-head"><h1>Alle Rezepte</h1>{#if !data.dbConnected}<p>Noch keine Datenbank verbunden. Sobald Supabase eingerichtet ist, erscheinen hier die Rezepte.</p>{/if}</div>
	{#if data.dbConnected}
		<FilterBar all={data.recipes} onresult={(l) => (list = l)} />
		<div class="grid-cards">
			{#each list as r (r.id)}<RecipeCard {r} />{:else}<div class="empty"><Icon name="search" /><p>Kein Rezept passt zu dieser Auswahl.</p></div>{/each}
		</div>
	{/if}
</main>
<footer class="foot"><div class="wrap"><span class="brand small"><span class="wm">smart<em>cooked</em></span></span><span>·</span><span>{data.recipes.length} Rezepte</span></div></footer>
