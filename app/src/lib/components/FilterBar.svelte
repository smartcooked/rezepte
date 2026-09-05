<script lang="ts">
	import Icon from './Icon.svelte';
	import { FACETS, initialState, isActive, optionsFor, passes, sortList, toParams, type FilterState } from '$lib/recipe/catalog';
	import type { RecipeCardRow } from '$lib/recipe/types';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	let { all, onresult, placeholder = 'Rezept, Zutat oder Stichwort suchen' }: { all: RecipeCardRow[]; onresult: (list: RecipeCardRow[]) => void; placeholder?: string } = $props();
	let q = $state(page.url.searchParams.get('q') || '');
	let fs: FilterState = $state(initialState(page.url.searchParams));
	let open: string | null = $state(null);
	const list = $derived(sortList(all.filter((r) => passes(r, fs, q)), fs.sort as string));
	const anyActive = $derived(!!q || FACETS.some((f) => isActive(f, fs)));
	$effect(() => { onresult(list); });
	$effect(() => { const p = toParams(fs, q).toString(); const url = p ? '?' + p : page.url.pathname; if (typeof window !== 'undefined' && window.location.search !== (p ? '?' + p : '')) replaceState(url, {}); });
	function count(f: (typeof FACETS)[number], val: string) {
		return all.filter((r) => passes(r, fs, q, f.key) && (f.type === 'multi' ? (Array.isArray(r[f.field!]) ? (r[f.field!] as string[]).includes(val) : r[f.field!] === val) : f.key === 'rating' ? (r.my_rating || 0) >= +val : f.key === 'prep' ? r.prep_min <= +val : true)).length;
	}
	function toggle(f: (typeof FACETS)[number], val: string, checked: boolean) {
		if (f.type === 'multi') { const arr = [...(fs[f.key] as string[])]; const i = arr.indexOf(val); if (checked && i < 0) arr.push(val); if (!checked && i >= 0) arr.splice(i, 1); fs[f.key] = arr; }
		else fs[f.key] = val;
	}
	function reset(key?: string) {
		if (key) { const f = FACETS.find((x) => x.key === key)!; fs[key] = f.type === 'multi' ? [] : f.def || ''; }
		else { q = ''; for (const f of FACETS) fs[f.key] = f.type === 'multi' ? [] : f.def || ''; }
	}
	onMount(() => { const close = (e?: Event) => { if (e && (e.target as Element | null)?.closest?.('.fpanel')) return; open = null; }; document.addEventListener('click', close); document.addEventListener('keydown', (e) => e.key === 'Escape' && close()); return () => document.removeEventListener('click', close); });
</script>
<div class="toolbar">
	<label class="search"><Icon name="search" /><span class="sr">Suchen</span><input type="search" bind:value={q} {placeholder} autocomplete="off" />{#if q}<button type="button" aria-label="Suche löschen" onclick={() => (q = '')}><Icon name="x" /></button>{/if}</label>
	<div class="fbar" aria-label="Filter">
		{#each FACETS as f (f.key)}
			{@const opts = optionsFor(all, f)}
			{#if opts.length}
				{@const n = f.type === 'multi' ? (fs[f.key] as string[]).length : 0}
				<div class="fchip" class:open={open === f.key} class:active={isActive(f, fs)}>
					<button type="button" aria-expanded={open === f.key} onclick={(e) => { e.stopPropagation(); open = open === f.key ? null : f.key; }}>
						<Icon name={f.icon} />{f.label}{#if n}<span class="n">{n}</span>{/if}<Icon name="chevron" class="chev" />
					</button>
					<div class="fpanel" hidden={open !== f.key} role="group" aria-label={f.label}>
						<ul>
							{#each opts as [val, lbl] (val)}
								{@const c = f.key === 'sort' ? -1 : count(f, val)}
								<li class:zero={c === 0}><label>
									<input type={f.type === 'multi' ? 'checkbox' : 'radio'} name="f-{f.key}" value={val} checked={f.type === 'multi' ? (fs[f.key] as string[]).includes(val) : fs[f.key] === val} onchange={(e) => toggle(f, val, (e.currentTarget as HTMLInputElement).checked)} />
									{#if f.key === 'rating'}<span class="stars-row">{#each Array(+val) as _}<Icon name="star" />{/each}</span>{/if}
									<span>{lbl}</span>{#if c >= 0}<small style="color:var(--muted);margin-left:auto">{c}</small>{/if}
								</label></li>
							{/each}
						</ul>
						{#if f.key !== 'sort'}<div class="fp-foot"><button type="button" disabled={!isActive(f, fs)} onclick={() => reset(f.key)}>Zurücksetzen</button></div>{/if}
					</div>
				</div>
			{/if}
		{/each}
	</div>
	<div class="fmeta"><span class="count">{list.length === all.length ? (all.length === 1 ? '1 Rezept' : all.length + ' Rezepte') : list.length + ' von ' + all.length + ' Rezepten'}</span>{#if anyActive}<button class="chip reset" type="button" onclick={() => reset()}><Icon name="x" />Alle Filter zurücksetzen</button>{/if}</div>
</div>
