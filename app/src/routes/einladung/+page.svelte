<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>
<svelte:head><title>Willkommen – smartcooked</title></svelte:head>
<main class="auth"><div class="card"><h1 style="font-size:1.5rem;margin-bottom:6px">Willkommen bei smartcooked</h1><p style="color:var(--muted)">Lege ein Passwort für dein Konto fest.</p>
	{#if form?.msg}<div class="error">{form.msg}</div>{/if}
	<form method="post" use:enhance><label class="field"><span>Passwort</span><input name="password" type="password" minlength="8" autocomplete="new-password" required /></label><label class="field"><span>Wiederholen</span><input name="password2" type="password" minlength="8" autocomplete="new-password" required /></label><button class="btn primary" type="submit" style="width:100%">Los geht's</button></form>
</div></main>
