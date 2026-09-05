<script lang="ts">
	let { name, class: cls = '' }: { name: string; class?: string } = $props();
</script>
<svg class="icon {cls}"><use href="#i-{name}" /></svg>
