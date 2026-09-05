<script lang="ts">
	import Icon from './Icon.svelte';
	import { DIFFICULTY_LEVEL, type RecipeCardRow } from '$lib/recipe/types';
	import { imageUrl, minutesLabel } from '$lib/recipe/format';
	import { env as pub } from '$env/dynamic/public';
	let { r }: { r: RecipeCardRow } = $props();
	const img = $derived(imageUrl(pub.PUBLIC_SUPABASE_URL || '', r.image_path, 'thumb'));
	const rating = $derived(r.my_rating || r.rating_avg || 0);
</script>
<a class="rcard" href="/r/{r.slug}">
	<div class="img">{#if img}<img src={img} alt="" loading="lazy" onerror={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.dataset.fb) { el.dataset.fb = '1'; el.src = img.replace('thumb.jpg', 'bild.jpg'); } }} />{:else}<Icon name="logo" />{/if}</div>
	<div class="body">
		<h3>{r.title}</h3>
		{#if r.subtitle}<p class="sub">{r.subtitle}</p>{/if}
		<div class="row">
			<span><Icon name="clock" />{minutesLabel(r.total_min)}</span>
			<span><Icon name="gauge" class="lvl-{DIFFICULTY_LEVEL[r.difficulty]}" />{r.difficulty}</span>
			{#if r.kcal}<span><Icon name="flame" />{Math.round(r.kcal)} kcal</span>{/if}
			{#if r.diet?.length}<span><Icon name="leaf" />{r.diet[0]}</span>{/if}
			{#if rating}<span class="rt"><Icon name="star" />{Number(rating).toFixed(rating % 1 ? 1 : 0).replace('.', ',')}</span>{/if}
			{#if r.visibility === 'private'}<span><Icon name="lock" />privat</span>{/if}
		</div>
	</div>
</a>
