<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import RecipeView from '$lib/components/RecipeView.svelte';
	import { serializeJsonLd } from '$lib/recipe/jsonld';
	import { goto } from '$app/navigation';
	let { data } = $props();
	$effect(() => { if (data.mode === 'redirect') goto(data.to, { replaceState: true }); });
</script>
<svelte:head>
	{#if data.mode === 'full'}
		<title>{data.recipe.title} – smartcooked</title>
		<meta name="description" content={data.recipe.description || data.recipe.subtitle || data.recipe.title} />
		<link rel="canonical" href={data.pageUrl} />
		<meta property="og:type" content="article" /><meta property="og:locale" content="de_DE" /><meta property="og:site_name" content="smartcooked" />
		<meta property="og:title" content={data.recipe.title} /><meta property="og:description" content={data.recipe.description || data.recipe.subtitle || ''} /><meta property="og:url" content={data.pageUrl} />
		{#if data.img}<meta property="og:image" content={data.img} />{/if}
		{#if data.jsonld}{@html '<script type="application/ld+json">' + serializeJsonLd(data.jsonld) + '</script>'}{:else}<meta name="robots" content="noindex" />{/if}
	{:else if data.mode === 'preview'}
		<title>{data.recipe.title} – smartcooked</title><meta name="robots" content="noindex" />
	{/if}
</svelte:head>
{#if data.mode === 'full'}
	<RecipeView recipe={data.recipe} img={data.img} pageUrl={data.pageUrl} myRating={data.myRating} myNote={data.myNote} hearted={data.hearted} />
{:else if data.mode === 'preview'}
	<main class="wrap">
		<section class="hero">
			{#if data.img}<div class="hero-img"><img src={data.img} alt={data.recipe.title} /></div>{:else}<div class="hero-img empty"><Icon name="logo" /></div>{/if}
			<div><h1>{data.recipe.title}</h1>{#if data.recipe.subtitle}<p class="sub">{data.recipe.subtitle}</p>{/if}{#if data.recipe.description}<p>{data.recipe.description}</p>{/if}
				<div class="preview-lock"><Icon name="lock" /><p><b>Zutaten und Zubereitung sind für angemeldete Mitglieder sichtbar.</b></p><a class="btn primary" href="/login?next=/r/{data.recipe.slug}">Anmelden</a></div>
			</div>
		</section>
	</main>
{/if}
