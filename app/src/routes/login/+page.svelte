<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	let { form, data } = $props();
</script>
<svelte:head><title>Anmelden – smartcooked</title></svelte:head>
<main class="auth">
	<div class="card">
		<h1 style="font-size:1.5rem;margin-bottom:6px">Anmelden</h1>
		<p style="color:var(--muted)">Zugang gibt es nur auf Einladung.</p>
		{#if data.deactivated}<div class="error">Dieses Konto ist deaktiviert.</div>{/if}
		{#if form?.msg}<div class="error">{form.msg}</div>{/if}
		<form method="post" use:enhance>
			<label class="field"><span>Benutzername oder E-Mail</span><input name="identifier" value={form?.ident || ''} autocomplete="username" required /></label>
			<label class="field"><span>Passwort</span><input name="password" type="password" autocomplete="current-password" required /></label>
			<button class="btn primary" type="submit" style="width:100%"><Icon name="lock" />Anmelden</button>
		</form>
		<p style="margin-top:14px;text-align:center"><a href="/passwort-vergessen">Passwort vergessen?</a></p>
	</div>
</main>
