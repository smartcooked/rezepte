<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>
<svelte:head><title>Passwort vergessen – smartcooked</title></svelte:head>
<main class="auth"><div class="card">
	<h1 style="font-size:1.5rem;margin-bottom:6px">Passwort vergessen</h1>
	{#if form?.sent}<div class="notice">Falls das Konto existiert, wurde ein Link verschickt. Alternativ kann der Admin dir einen Link zum Zurücksetzen geben.</div>
	{:else}<form method="post" use:enhance><label class="field"><span>Benutzername oder E-Mail</span><input name="identifier" required /></label><button class="btn primary" type="submit" style="width:100%">Link anfordern</button></form>{/if}
	<p style="margin-top:14px;text-align:center"><a href="/login">Zur Anmeldung</a></p>
</div></main>
