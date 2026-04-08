<script lang="ts">
	import { goto } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import X from 'lucide-svelte/icons/x';
	import DatePickerCalendar from '$lib/components/calendar/DatePickerCalendar.svelte';
	import { addDays, today, formatSamedi } from '$lib/utils/dates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let title = $state('');
	let schoolId = $state('');
	let deadline = $state(addDays(today(), 14));
	let message = $state('');

	// Default slot settings applied to ALL selected dates
	let startTime = $state('14:00');
	let endTime = $state('15:30');
	let location = $state('Ludothèque Pâquis');
	let memberIds = $state<string[]>([]);

	let selectedDates = $state(new Set<string>());

	let submitting = $state(false);
	let error = $state('');

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

	async function save(activate: boolean) {
		if (!title.trim() || !schoolId || !deadline) {
			error = 'Titre, partenaire et deadline requis';
			return;
		}
		if (selectedDates.size === 0) {
			error = 'Sélectionner au moins une date dans le calendrier';
			return;
		}
		if (startTime >= endTime) {
			error = 'Heure de fin avant début';
			return;
		}
		submitting = true;
		error = '';
		const slots = sortedDates.map((date) => ({
			date,
			startTime,
			endTime,
			location: location.trim() || null,
			memberIds,
			recurrenceWeeks: 1
		}));
		const res = await fetchJson<{ success: boolean; id: string }>('/api/calendar/proposals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: title.trim(),
				schoolId,
				deadline,
				message: message.trim() || null,
				slots
			})
		});
		if (!res.ok) {
			submitting = false;
			error = res.error;
			return;
		}
		if (activate) {
			await fetchJson(`/api/calendar/proposals/${res.data.id}/send`, { method: 'POST' });
		}
		submitting = false;
		await goto(`/calendrier/proposals/${res.data.id}`);
	}
</script>

<svelte:head>
	<title>Nouvelle proposition — LudoTools</title>
</svelte:head>

<div class="flex items-center gap-2">
	<a href="/calendrier/proposals" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
	<h1 class="text-2xl font-bold text-royal">Nouvelle proposition</h1>
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
			<label for="p-title" class="block text-sm font-medium text-gray-700">Titre *</label>
			<input
				id="p-title"
				bind:value={title}
				type="text"
				placeholder="ex: Accueils automne 2026"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div>
			<label for="p-school" class="block text-sm font-medium text-gray-700">Partenaire *</label>
			<select
				id="p-school"
				bind:value={schoolId}
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				<option value="">— Sélectionner —</option>
				{#each data.schools as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="p-deadline" class="block text-sm font-medium text-gray-700">Deadline *</label>
			<input
				id="p-deadline"
				bind:value={deadline}
				type="date"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div>
			<label for="p-message" class="block text-sm font-medium text-gray-700">Message (optionnel)</label>
			<textarea
				id="p-message"
				bind:value={message}
				rows="2"
				placeholder="Bonjour, voici les créneaux…"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			></textarea>
		</div>

		<div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
				Créneau par défaut (toutes les dates)
			</p>
			<div class="mt-2 grid grid-cols-2 gap-2">
				<div>
					<label for="p-start" class="block text-[10px] font-medium uppercase text-gray-500">Début</label>
					<input
						id="p-start"
						bind:value={startTime}
						type="time"
						class="mt-0.5 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label for="p-end" class="block text-[10px] font-medium uppercase text-gray-500">Fin</label>
					<input
						id="p-end"
						bind:value={endTime}
						type="time"
						class="mt-0.5 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
					/>
				</div>
			</div>
			<div class="mt-2">
				<label for="p-loc" class="block text-[10px] font-medium uppercase text-gray-500">Lieu</label>
				<input
					id="p-loc"
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

		{#if error}
			<p class="text-sm text-red-600">{error}</p>
		{/if}

		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => save(true)}
				disabled={submitting}
				class="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
			>
				Enregistrer & activer le lien
			</button>
			<button
				type="button"
				onclick={() => save(false)}
				disabled={submitting}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
			>
				Enregistrer en brouillon
			</button>
		</div>
	</div>
</div>
