<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fetchJson } from '$lib/utils/api';
	import DatePickerCalendar from '$lib/components/calendar/DatePickerCalendar.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import X from 'lucide-svelte/icons/x';
	import { formatSamedi } from '$lib/utils/dates';
	import type { PageData } from './$types';
	import type { EventStatus } from '$lib/server/schema';

	let { data }: { data: PageData } = $props();

	let prefillDate = $derived($page.url.searchParams.get('date') ?? '');

	let title = $state('');
	let startTime = $state('14:00');
	let endTime = $state('15:00');
	let location = $state('Ludothèque Pâquis');
	let memberIds = $state<string[]>([]);
	let status = $state<EventStatus>('confirmed');
	let notes = $state('');

	let selectedDates = $state(new Set<string>());

	// Preselect date from query param
	let prefilled = false;
	$effect(() => {
		if (prefillDate && !prefilled) {
			selectedDates = new Set([prefillDate]);
			prefilled = true;
		}
	});

	let submitting = $state(false);
	let error = $state('');
	let progress = $state({ current: 0, total: 0 });

	function toggleDate(date: string) {
		const next = new Set(selectedDates);
		if (next.has(date)) next.delete(date);
		else next.add(date);
		selectedDates = next;
	}

	function removeDate(date: string) {
		const next = new Set(selectedDates);
		next.delete(date);
		selectedDates = next;
	}

	function clearDates() {
		selectedDates = new Set();
	}

	function toggleMember(id: string) {
		if (memberIds.includes(id)) memberIds = memberIds.filter((m) => m !== id);
		else memberIds = [...memberIds, id];
	}

	let sortedDates = $derived(Array.from(selectedDates).sort());

	async function createAll() {
		if (!title.trim()) {
			error = 'Titre requis';
			return;
		}
		if (selectedDates.size === 0) {
			error = 'Sélectionner au moins une date';
			return;
		}
		if (startTime >= endTime) {
			error = 'Heure de fin avant début';
			return;
		}
		submitting = true;
		error = '';
		progress = { current: 0, total: sortedDates.length };

		const failures: string[] = [];
		for (const date of sortedDates) {
			const res = await fetchJson('/api/calendar/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					kind: 'internal',
					date,
					startTime,
					endTime,
					location: location.trim() || null,
					memberIds,
					status,
					notes: notes.trim() || null
				})
			});
			if (!res.ok) failures.push(date);
			progress.current++;
		}

		submitting = false;
		if (failures.length > 0) {
			error = `Échec sur ${failures.length} date(s) : ${failures.join(', ')}`;
			return;
		}
		await goto('/calendrier/events');
	}
</script>

<svelte:head>
	<title>Nouvel événement interne — LudoTools</title>
</svelte:head>

<div class="flex items-center gap-2">
	<a href="/calendrier/events" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
	<h1 class="text-2xl font-bold text-royal">Nouvel événement interne</h1>
</div>

<div class="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
	<!-- Calendar picker -->
	<div class="order-2 lg:order-1">
		<h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
			Sélectionner les dates ({selectedDates.size})
		</h2>
		<DatePickerCalendar
			{selectedDates}
			events={data.events}
			assignments={data.assignments}
			absences={data.absences}
			periods={data.periods}
			saturdays={data.saturdays}
			{memberIds}
			onToggle={toggleDate}
		/>

		{#if selectedDates.size > 0}
			<div class="mt-3 rounded-xl border border-gray-200 bg-white p-3">
				<div class="flex items-center justify-between">
					<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
						Dates retenues
					</p>
					<button
						type="button"
						onclick={clearDates}
						class="text-[11px] text-gray-500 hover:text-red-600"
					>
						Tout effacer
					</button>
				</div>
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each sortedDates as date (date)}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-medium text-royal"
						>
							{formatSamedi(date)}
							<button
								type="button"
								onclick={() => removeDate(date)}
								class="rounded-full hover:bg-royal-100"
								aria-label="Retirer"
							>
								<X size={11} />
							</button>
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Form settings -->
	<div class="order-1 space-y-4 lg:order-2">
		<div>
			<label for="e-title" class="block text-sm font-medium text-gray-700">Titre *</label>
			<input
				id="e-title"
				bind:value={title}
				type="text"
				placeholder="ex: Après-midi pré-ados"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>

		<div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
				Créneau par défaut (toutes les dates)
			</p>
			<div class="mt-2 grid grid-cols-2 gap-2">
				<div>
					<label for="e-start" class="block text-[10px] font-medium uppercase text-gray-500">Début</label>
					<input
						id="e-start"
						bind:value={startTime}
						type="time"
						class="mt-0.5 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label for="e-end" class="block text-[10px] font-medium uppercase text-gray-500">Fin</label>
					<input
						id="e-end"
						bind:value={endTime}
						type="time"
						class="mt-0.5 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
					/>
				</div>
			</div>
			<div class="mt-2">
				<label for="e-loc" class="block text-[10px] font-medium uppercase text-gray-500">Lieu</label>
				<input
					id="e-loc"
					bind:value={location}
					type="text"
					class="mt-0.5 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
				/>
			</div>
			<div class="mt-2">
				<span class="block text-[10px] font-medium uppercase text-gray-500">Membres</span>
				<div class="mt-1 flex flex-wrap gap-1">
					{#each data.members as m}
						{@const selected = memberIds.includes(m.id)}
						<button
							type="button"
							onclick={() => toggleMember(m.id)}
							class="rounded-full px-2 py-0.5 text-[11px] font-medium {selected
								? 'bg-royal text-white'
								: 'bg-white text-gray-600 hover:bg-gray-100'}"
						>
							{m.name}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div>
			<label for="e-status" class="block text-sm font-medium text-gray-700">Statut</label>
			<select
				id="e-status"
				bind:value={status}
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				<option value="draft">Brouillon</option>
				<option value="confirmed">Confirmé</option>
			</select>
		</div>

		<div>
			<label for="e-notes" class="block text-sm font-medium text-gray-700">Notes</label>
			<textarea
				id="e-notes"
				bind:value={notes}
				rows="2"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			></textarea>
		</div>

		{#if error}
			<p class="text-sm text-red-600">{error}</p>
		{/if}

		{#if submitting && progress.total > 0}
			<p class="text-xs text-gray-500">Création : {progress.current} / {progress.total}</p>
		{/if}

		<button
			type="button"
			onclick={createAll}
			disabled={submitting}
			class="w-full rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
		>
			{selectedDates.size > 1 ? `Créer ${selectedDates.size} événements` : 'Créer'}
		</button>
	</div>
</div>
