<script lang="ts">
	import '../app.css';
	import Icons from '$lib/components/Icons.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data, children } = $props();
	const tabs = [
		{ href: '/', icon: 'logo', label: 'Rezepte' }, { href: '/kochbuch', icon: 'heart', label: 'Kochbuch' },
		{ href: '/planer', icon: 'calendar', label: 'Planer' }, { href: '/einkauf', icon: 'cart', label: 'Einkauf' }, { href: '/profil', icon: 'user', label: 'Profil' }
	];
	const isActive = (href: string) => (href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/r/') : page.url.pathname.startsWith(href));
	onMount(() => {
		if (!data.supabase) return;
		const { data: sub } = data.supabase.auth.onAuthStateChange((_e, s) => { if (s?.expires_at !== data.session?.expires_at) invalidate('supabase:auth'); });
		return () => sub.subscription.unsubscribe();
	});
</script>
<svelte:body class:has-tabbar={!!data.user} />
<Icons />
<header class="topbar">
	<div class="wrap">
		<a class="brand" href="/"><Icon name="logo" /><span class="wm">smart<em>cooked</em></span></a>
		{#if data.user}
			<nav class="nav">
				{#each tabs.slice(1) as t}<a href={t.href} class:active={isActive(t.href)}><Icon name={t.icon} />{t.label}</a>{/each}
				{#if data.profile?.role !== 'user'}<a href="/backend" class:active={page.url.pathname.startsWith('/backend')}><Icon name="settings" />Backend</a>{/if}
			</nav>
		{/if}
		<div class="actions">
			{#if !data.user && data.dbConnected}<a class="btn small" href="/login"><Icon name="user" />Anmelden</a>{/if}
		</div>
	</div>
</header>
{@render children()}
{#if data.user}
	<nav class="tabbar" aria-label="Hauptnavigation">
		{#each tabs as t}<a href={t.href} class:active={isActive(t.href)}><Icon name={t.icon} />{t.label}</a>{/each}
	</nav>
{/if}
<Toast />
