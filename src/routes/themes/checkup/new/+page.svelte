<script lang="ts">
	import { goto } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import Plus from 'lucide-svelte/icons/plus';
	import X from 'lucide-svelte/icons/x';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

	let { data } = $props();

	type Status = 'present' | 'broken' | 'missing' | 'needs_more';

	const STATUS_CONFIG: Record<Status, { label: string; color: string; activeColor: string }> = {
		present: { label: 'Présent', color: 'border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50', activeColor: 'border-green-400 bg-green-100 text-green-800 font-semibold' },
		broken: { label: 'Cassé', color: 'border-gray-200 text-gray-500 hover:border-orange-300 hover:bg-orange-50', activeColor: 'border-orange-400 bg-orange-100 text-orange-800 font-semibold' },
		missing: { label: 'Perdu', color: 'border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50', activeColor: 'border-red-400 bg-red-100 text-red-800 font-semibold' },
		needs_more: { label: 'À rajouter', color: 'border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50', activeColor: 'border-blue-400 bg-blue-100 text-blue-800 font-semibold' }
	};

	// Item statuses: default all to 'present'
	let statuses = $state<Record<string, Status>>(
		Object.fromEntries(data.items.map((item) => [item.id, 'present' as Status]))
	);

	// Suggestions
	let suggestions = $state<string[]>([]);
	let newSuggestion = $state('');

	// General note
	let note = $state('');

	let submitLoading = $state(false);
	let submitError = $state('');

	function addSuggestion() {
		const val = newSuggestion.trim();
		if (val) {
			suggestions = [...suggestions, val];
			newSuggestion = '';
		}
	}

	function removeSuggestion(i: number) {
		suggestions = suggestions.filter((_, j) => j !== i);
	}

	async function submitCheckup() {
		submitLoading = true;
		submitError = '';

		// 1. Create checkup
		const createRes = await fetchJson('/api/themes/checkups', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});

		if (!createRes.ok) {
			submitError = createRes.error;
			submitLoading = false;
			return;
		}

		const checkupId: string = createRes.data.id;

		// 2. Build entries
		const entries = data.items.map((item) => ({
			themeItemId: item.id,
			status: statuses[item.id] ?? 'present'
		}));

		for (const sug of suggestions) {
			entries.push({ themeItemId: null as any, status: 'suggestion' as any, suggestedName: sug } as any);
		}

		const entriesRes = await fetchJson(`/api/themes/checkups/${checkupId}/entries`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entries })
		});

		if (!entriesRes.ok) {
			submitError = entriesRes.error;
			submitLoading = false;
			return;
		}

		// 3. Complete checkup
		const completeRes = await fetchJson(`/api/themes/checkups/${checkupId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ note: note.trim() || null })
		});

		submitLoading = false;
		if (completeRes.ok) {
			goto(`/themes/checkup/${checkupId}`);
		} else {
			submitError = completeRes.error;
		}
	}

	let problemCount = $derived(
		Object.values(statuses).filter((s) => s !== 'present').length
	);
</script>

<svelte:head>
	<title>Check-up — {data.theme?.name ?? 'Thème'} — LudoTools</title>
</svelte:head>

<div class="flex items-center gap-3 mb-1">
	<a href="/themes" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
		<ArrowLeft size={18} />
	</a>
	<div>
		<h1 class="text-xl font-bold text-gray-900">Check-up</h1>
		<p class="text-sm text-gray-500">{data.theme?.name}</p>
	</div>
</div>

{#if data.items.length === 0}
	<div class="mt-10 flex flex-col items-center text-center">
		<p class="text-gray-500">Aucun objet dans ce thème.</p>
		<a href="/themes" class="mt-3 text-sm text-royal hover:underline">← Retour aux thèmes</a>
	</div>
{:else}
	<div class="mt-4 space-y-2">
		{#each data.items as item}
			<div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span class="font-medium text-gray-800">
						{item.name}
						{#if item.quantity > 1}
							<span class="ml-1 text-xs text-gray-400">×{item.quantity}</span>
						{/if}
					</span>
					<div class="flex gap-1.5 flex-wrap">
						{#each Object.entries(STATUS_CONFIG) as [status, cfg]}
							{@const active = statuses[item.id] === status}
							<button
								onclick={() => (statuses[item.id] = status as Status)}
								class="rounded-full border px-3 py-1 text-xs transition-colors {active ? cfg.activeColor : cfg.color}"
							>
								{cfg.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Suggestions section -->
	<div class="mt-6">
		<h3 class="mb-2 text-sm font-semibold text-gray-700">Nouveaux objets à ajouter</h3>
		{#if suggestions.length > 0}
			<div class="mb-2 space-y-1">
				{#each suggestions as sug, i}
					<div class="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
						<span class="text-blue-800">{sug}</span>
						<button onclick={() => removeSuggestion(i)} class="text-blue-300 hover:text-blue-600">
							<X size={14} />
						</button>
					</div>
				{/each}
			</div>
		{/if}
		<div class="flex gap-2">
			<input
				bind:value={newSuggestion}
				type="text"
				placeholder="ex: Dé géant"
				onkeydown={(e) => e.key === 'Enter' && addSuggestion()}
				class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
			<button
				onclick={addSuggestion}
				disabled={!newSuggestion.trim()}
				class="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
			>
				<Plus size={14} /> Ajouter
			</button>
		</div>
	</div>

	<!-- Note générale -->
	<div class="mt-5">
		<label for="checkup-note" class="block text-sm font-medium text-gray-700">Note générale (optionnel)</label>
		<textarea
			id="checkup-note"
			bind:value={note}
			rows="3"
			placeholder="Observations, remarques…"
			class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		></textarea>
	</div>

	<!-- Summary + submit -->
	{#if problemCount > 0}
		<div class="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-800">
			⚠ {problemCount} objet{problemCount !== 1 ? 's' : ''} avec un problème signalé.
		</div>
	{/if}

	{#if submitError}
		<p class="mt-2 text-sm text-red-600">{submitError}</p>
	{/if}

	<button
		onclick={submitCheckup}
		disabled={submitLoading}
		class="mt-4 w-full rounded-lg bg-royal py-3 text-sm font-semibold text-white hover:bg-royal-700 disabled:opacity-50"
	>
		{submitLoading ? 'Validation en cours…' : 'Valider le check-up'}
	</button>
{/if}
