<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Plus from 'lucide-svelte/icons/plus';

	let { data } = $props();

	// ── Resolution state per entry ────────────────────────────────────
	let resolvingId = $state<string | null>(null);
	let resolutionType = $state('');
	let resolutionNote = $state('');
	let resolveLoading = $state(false);
	let resolveError = $state('');

	// ── "Ajouter à la liste" per suggestion ──────────────────────────
	let addingToListId = $state<string | null>(null);

	// ── Collapsibles ──────────────────────────────────────────────────
	let showResolved = $state(false);
	let showOK = $state(false);

	// ── Derived lists ─────────────────────────────────────────────────
	type Entry = (typeof data.entries)[number];

	let problems = $derived(
		data.entries.filter((e) => e.status === 'broken' || e.status === 'missing' || e.status === 'needs_more')
	);
	let unresolvedProblems = $derived(problems.filter((e) => !e.resolvedAt));
	let resolvedProblems = $derived(problems.filter((e) => e.resolvedAt));
	let okEntries = $derived(data.entries.filter((e) => e.status === 'present'));
	let suggestions = $derived(data.entries.filter((e) => e.status === 'suggestion'));

	// ── Resolution options per status ─────────────────────────────────
	function resolutionOptions(status: string): { value: string; label: string }[] {
		if (status === 'broken') return [{ value: 'repaired', label: 'Réparé' }, { value: 'replaced', label: 'Remplacé' }];
		if (status === 'missing') return [{ value: 'found', label: 'Retrouvé' }, { value: 'replaced', label: 'Remplacé' }];
		if (status === 'needs_more') return [{ value: 'replaced', label: 'Complété / rajouté' }];
		return [];
	}

	function openResolve(entry: Entry) {
		resolvingId = entry.id;
		const opts = resolutionOptions(entry.status);
		resolutionType = opts[0]?.value ?? '';
		resolutionNote = '';
		resolveError = '';
	}

	async function confirmResolve(entry: Entry) {
		resolveLoading = true;
		resolveError = '';
		const res = await fetchJson(
			`/api/themes/checkups/${data.checkup.id}/entries/${entry.id}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resolutionType, note: resolutionNote || undefined })
			}
		);
		resolveLoading = false;
		if (res.ok) {
			resolvingId = null;
			await invalidateAll();
		} else {
			resolveError = res.error;
		}
	}

	async function addSuggestionToList(entry: Entry) {
		if (!entry.suggestedName || !data.themeId) return;
		addingToListId = entry.id;
		const res = await fetchJson(`/api/themes/${data.themeId}/items`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: entry.suggestedName, quantity: 1 })
		});
		if (res.ok) {
			// Mark suggestion as resolved
			await fetchJson(
				`/api/themes/checkups/${data.checkup.id}/entries/${entry.id}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ resolutionType: 'replaced' })
				}
			);
			await invalidateAll();
		}
		addingToListId = null;
	}

	const RESOLUTION_LABELS: Record<string, string> = {
		repaired: 'Réparé',
		replaced: 'Remplacé',
		found: 'Retrouvé'
	};

	const STATUS_COLORS: Record<string, string> = {
		broken: 'border-orange-200 bg-orange-50',
		missing: 'border-red-200 bg-red-50',
		needs_more: 'border-blue-200 bg-blue-50'
	};

	const STATUS_BADGE: Record<string, string> = {
		broken: 'bg-orange-100 text-orange-800',
		missing: 'bg-red-100 text-red-800',
		needs_more: 'bg-blue-100 text-blue-800'
	};

	const STATUS_LABELS_MAP: Record<string, string> = {
		broken: 'Cassé',
		missing: 'Perdu',
		needs_more: 'À rajouter'
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatShortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
	}
</script>

<svelte:head>
	<title>Check-up — {data.themeName} — LudoTools</title>
</svelte:head>

<div class="flex items-center gap-3 mb-1">
	<a href="/themes" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
		<ArrowLeft size={18} />
	</a>
	<div>
		<h1 class="text-xl font-bold text-gray-900">Check-up</h1>
		<p class="text-sm text-gray-500">{data.themeName}</p>
	</div>
</div>

<!-- Header info -->
<div class="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
	<div class="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
		{#if data.checkup.completedAt}
			<span>📅 {formatDate(data.checkup.completedAt)}</span>
		{:else}
			<span class="text-amber-600 font-medium">En cours…</span>
		{/if}
		{#if data.doneByName}
			<span>👤 {data.doneByName}</span>
		{/if}
	</div>
	{#if data.checkup.note}
		<p class="mt-2 text-gray-500 italic">"{data.checkup.note}"</p>
	{/if}
</div>

<!-- Summary badges -->
<div class="mt-3 flex flex-wrap gap-2">
	<span class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
		✓ {okEntries.length} OK
	</span>
	{#if unresolvedProblems.length > 0}
		<span class="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
			⚠ {unresolvedProblems.length} à résoudre
		</span>
	{/if}
	{#if resolvedProblems.length > 0}
		<span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
			✓ {resolvedProblems.length} résolu{resolvedProblems.length !== 1 ? 's' : ''}
		</span>
	{/if}
	{#if suggestions.length > 0}
		<span class="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
			+ {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
		</span>
	{/if}
</div>

<!-- ── Section Problèmes ──────────────────────────────────────────── -->
{#if problems.length > 0}
	<div class="mt-5">
		<h3 class="mb-2 text-sm font-semibold text-gray-700">Problèmes</h3>

		<!-- Unresolved -->
		{#if unresolvedProblems.length > 0}
			<div class="space-y-2">
				{#each unresolvedProblems as entry}
					<div class="rounded-xl border {STATUS_COLORS[entry.status] ?? 'border-gray-200 bg-white'} overflow-hidden">
						<div class="flex items-center justify-between gap-2 px-4 py-3">
							<div class="flex items-center gap-2 min-w-0">
								<span class="font-medium text-gray-800 truncate">{entry.itemName ?? entry.suggestedName ?? '?'}</span>
								<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {STATUS_BADGE[entry.status] ?? ''}">
									{STATUS_LABELS_MAP[entry.status] ?? entry.status}
								</span>
							</div>
							{#if data.checkup.completedAt}
								<button
									onclick={() => resolvingId === entry.id ? (resolvingId = null) : openResolve(entry)}
									class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
								>
									{resolvingId === entry.id ? 'Annuler' : 'Résoudre'}
								</button>
							{/if}
						</div>

						{#if resolvingId === entry.id}
							<div class="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
								<div class="flex gap-2 flex-wrap">
									{#each resolutionOptions(entry.status) as opt}
										<button
											onclick={() => (resolutionType = opt.value)}
											class="rounded-full border px-3 py-1 text-xs transition-colors {resolutionType === opt.value ? 'border-royal bg-royal-50 text-royal font-semibold' : 'border-gray-200 text-gray-500 hover:border-royal-300'}"
										>
											{opt.label}
										</button>
									{/each}
								</div>
								<input
									bind:value={resolutionNote}
									type="text"
									placeholder="Note (optionnel)"
									class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
								/>
								{#if resolveError}
									<p class="text-xs text-red-600">{resolveError}</p>
								{/if}
								<button
									onclick={() => confirmResolve(entry)}
									disabled={resolveLoading || !resolutionType}
									class="w-full rounded-lg bg-royal py-2 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
								>
									{resolveLoading ? 'Confirmation…' : 'Confirmer la résolution'}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Resolved (collapsible) -->
		{#if resolvedProblems.length > 0}
			<button
				onclick={() => (showResolved = !showResolved)}
				class="mt-2 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
			>
				{#if showResolved}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
				{resolvedProblems.length} problème{resolvedProblems.length !== 1 ? 's' : ''} résolu{resolvedProblems.length !== 1 ? 's' : ''}
			</button>
			{#if showResolved}
				<div class="mt-2 space-y-2">
					{#each resolvedProblems as entry}
						<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 opacity-70">
							<span class="text-sm text-gray-500 line-through">{entry.itemName ?? '?'}</span>
							<span class="text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5">
								✓ {RESOLUTION_LABELS[entry.resolutionType ?? ''] ?? entry.resolutionType}
								{#if entry.resolvedAt}
									le {formatShortDate(entry.resolvedAt)}
								{/if}
								{#if entry.resolvedByName}
									par {entry.resolvedByName}
								{/if}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
{/if}

<!-- ── Section Besoins & Suggestions ────────────────────────────── -->
{#if suggestions.length > 0}
	<div class="mt-5">
		<h3 class="mb-2 text-sm font-semibold text-gray-700">Objets à ajouter</h3>
		<div class="space-y-2">
			{#each suggestions as entry}
				{@const isResolved = !!entry.resolvedAt}
				<div class="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="text-sm {isResolved ? 'line-through text-gray-400' : 'text-purple-800'}">
							+ {entry.suggestedName}
						</span>
						{#if isResolved}
							<span class="text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5">Ajouté</span>
						{/if}
					</div>
					{#if !isResolved && data.themeId}
						<button
							onclick={() => addSuggestionToList(entry)}
							disabled={addingToListId === entry.id}
							class="flex items-center gap-1 rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
						>
							<Plus size={12} />
							{addingToListId === entry.id ? '…' : 'Ajouter à la liste'}
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- ── Section Objets OK ─────────────────────────────────────────── -->
{#if okEntries.length > 0}
	<div class="mt-5">
		<button
			onclick={() => (showOK = !showOK)}
			class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
		>
			{#if showOK}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
			{okEntries.length} objet{okEntries.length !== 1 ? 's' : ''} OK
		</button>
		{#if showOK}
			<div class="mt-2 space-y-1.5">
				{#each okEntries as entry}
					<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-2.5">
						<span class="text-sm text-gray-700">{entry.itemName ?? '?'}</span>
						<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">OK</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

{#if data.entries.length === 0}
	<p class="mt-8 text-center text-sm text-gray-400">Aucun objet enregistré dans ce check-up.</p>
{/if}
