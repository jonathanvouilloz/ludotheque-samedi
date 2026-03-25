<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchJson } from '$lib/utils/api';
	import { formatSamedi } from '$lib/utils/dates';
	import X from 'lucide-svelte/icons/x';
	import Pencil from 'lucide-svelte/icons/pencil';

	interface Slot {
		id: string;
		date: string;
		type: string;
		eventLabel: string | null;
		isClosed: boolean;
	}

	let {
		slot,
		onclose,
		onupdated
	}: {
		slot: Slot;
		onclose: () => void;
		onupdated: () => void;
	} = $props();

	let isClosed = $state(slot.isClosed);
	let eventLabel = $state(slot.eventLabel ?? '');
	let loading = $state(false);
	let errorMsg = $state('');

	const PRESETS = ['', 'Vacances', 'Fermé', 'Fermeture été'];

	// Lock body scroll while modal is open
	onMount(() => {
		document.body.classList.add('modal-open');
		return () => document.body.classList.remove('modal-open');
	});

	async function save(): Promise<void> {
		loading = true;
		errorMsg = '';

		const res = await fetchJson<{ success: boolean }>(`/api/planning/slots/${slot.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				isClosed,
				eventLabel: eventLabel.trim() || null
			})
		});

		loading = false;
		if (res.ok) {
			onupdated();
		} else {
			errorMsg = res.error;
		}
	}
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/40 sm:items-center"
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<!-- Dialog -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Pencil size={18} class="text-gray-500" />
				<h2 class="text-lg font-bold text-gray-900">Modifier le samedi</h2>
			</div>
			<button onclick={onclose} class="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
				<X size={20} />
			</button>
		</div>

		<!-- Date -->
		<p class="mt-2 text-sm capitalize text-gray-500">{formatSamedi(slot.date)}</p>

		<!-- Toggle ouvert/fermé -->
		<div class="mt-4">
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700">Fermé</span>
				<button
					type="button"
					onclick={() => (isClosed = !isClosed)}
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
						{isClosed ? 'bg-red-500' : 'bg-gray-200'}"
				>
					<span
						class="inline-block h-4 w-4 rounded-full bg-white transition-transform
							{isClosed ? 'translate-x-6' : 'translate-x-1'}"
					></span>
				</button>
			</label>
		</div>

		<!-- Label -->
		<div class="mt-4">
			<label class="block text-sm font-medium text-gray-700">
				Label
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					{#each PRESETS as preset}
						<button
							type="button"
							onclick={() => (eventLabel = preset)}
							class="rounded-full border px-2.5 py-1 text-xs transition-colors
								{eventLabel === preset
								? 'border-royal bg-royal-50 text-royal font-medium'
								: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
						>
							{preset || 'Aucun'}
						</button>
					{/each}
				</div>
				<input
					type="text"
					bind:value={eventLabel}
					placeholder="Label personnalisé..."
					class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</label>
		</div>

		{#if errorMsg}
			<p class="mt-3 text-sm text-red-600">{errorMsg}</p>
		{/if}

		<!-- Actions -->
		<div class="mt-5 flex gap-2">
			<button
				onclick={save}
				disabled={loading}
				class="flex-1 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
			>
				{loading ? 'Enregistrement...' : 'Enregistrer'}
			</button>
			<button
				onclick={onclose}
				class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
			>
				Annuler
			</button>
		</div>
	</div>
</div>
