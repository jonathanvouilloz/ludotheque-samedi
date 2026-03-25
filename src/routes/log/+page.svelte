<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchJson } from '$lib/utils/api';
	import LogEntry from '$lib/components/ui/LogEntry.svelte';
	import ScrollText from 'lucide-svelte/icons/scroll-text';

	let { data } = $props();

	let extraEntries = $state<typeof data.entries>([]);
	let overrideTotal = $state<number | undefined>(undefined);
	let loadingMore = $state(false);

	let entries = $derived([...data.entries, ...extraEntries]);
	let total = $derived(overrideTotal ?? data.total);
	let hasMore = $derived(entries.length < total);

	onMount(() => {
		// Mark as visited for badge calculation
		if (typeof window !== 'undefined') {
			localStorage.setItem('ludotools_last_log_visit', new Date().toISOString());
		}
	});

	async function loadMore() {
		loadingMore = true;
		const res = await fetchJson<{ entries: typeof data.entries; total: number }>(
			`/api/log?limit=50&offset=${entries.length}`
		);
		loadingMore = false;
		if (res.ok) {
			extraEntries = [...extraEntries, ...res.data.entries];
			overrideTotal = res.data.total;
		}
	}
</script>

<svelte:head>
	<title>Journal — LudoTools</title>
</svelte:head>

<h1 class="text-2xl font-bold text-royal">Journal d'activité</h1>

{#if entries.length === 0}
	<div class="mt-12 flex flex-col items-center text-center">
		<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
			<ScrollText size={28} class="text-gray-400" />
		</div>
		<p class="text-gray-500">Aucune activité enregistrée.</p>
	</div>
{:else}
	<p class="mt-1 text-sm text-gray-400">{total} modifications au total</p>

	<div class="mt-4 divide-y divide-gray-100">
		{#each entries as entry}
			<LogEntry
				type={entry.type}
				description={entry.description}
				actorName={entry.actorName}
				createdAt={entry.createdAt}
			/>
		{/each}
	</div>

	{#if hasMore}
		<button
			onclick={loadMore}
			disabled={loadingMore}
			class="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
		>
			{loadingMore ? 'Chargement...' : `Charger plus (${total - entries.length} restantes)`}
		</button>
	{/if}
{/if}
