<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();
</script>
<svelte:head><title>Profil – smartcooked</title></svelte:head>
<main class="wrap"><div class="cat-head"><h1>Profil</h1></div>
	<section class="card" style="max-width:520px">
		<p><b>{data.profile?.display_name || data.profile?.username}</b><br /><small style="color:var(--muted)">@{data.profile?.username} · Rolle: {data.profile?.role}</small></p>
		<form method="post" action="/logout"><button class="btn" type="submit"><Icon name="logout" />Abmelden</button></form>
	</section>
</main>
