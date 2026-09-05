<script lang="ts">
	import { toastState } from '$lib/state/toast.svelte';
</script>
<div class="toast" class:show={!!toastState.msg} role="status" aria-live="polite">{toastState.msg}</div>
