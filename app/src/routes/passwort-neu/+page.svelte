<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>
<svelte:head><title>Neues Passwort – smartcooked</title></svelte:head>
<main class="auth"><div class="card"><h1 style="font-size:1.5rem;margin-bottom:6px">Neues Passwort setzen</h1>
	{#if form?.msg}<div class="error">{form.msg}</div>{/if}
	<form method="post" use:enhance><label class="field"><span>Neues Passwort</span><input name="password" type="password" minlength="8" autocomplete="new-password" required /></label><label class="field"><span>Wiederholen</span><input name="password2" type="password" minlength="8" autocomplete="new-password" required /></label><button class="btn primary" type="submit" style="width:100%">Speichern</button></form>
</div></main>
