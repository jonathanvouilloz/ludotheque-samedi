<script lang="ts">
	import { goto } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import { getSaturdaysBetween, formatSamedi, getNthSaturdayOfAugust } from '$lib/utils/dates';
	import { generatePlanning } from '$lib/utils/planning';
	import SlotCard from '$lib/components/planning/SlotCard.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import Check from 'lucide-svelte/icons/check';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';

	let { data } = $props();

	// Wizard step
	let step = $state(1);

	// Step 1: Year selector
	let selectedYear = $state<number | null>(null);
	let defaultSlots = $state(2);

	const currentYear = new Date().getFullYear();
	const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

	function seasonNameForYear(year: number): string {
		return `Saison ${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
	}

	function isYearTaken(year: number): boolean {
		return data.existingSeasonNames.includes(seasonNameForYear(year));
	}

	let name = $derived(selectedYear ? seasonNameForYear(selectedYear) : '');
	let startDate = $derived(selectedYear ? getNthSaturdayOfAugust(selectedYear, 3) : '');
	let endDate = $derived(selectedYear ? getNthSaturdayOfAugust(selectedYear + 1, 2) : '');

	// Step 2: Calendar
	let closedDates = $state(new Set<string>());
	let events = $state(new Map<string, { label: string; requiredCount: number }>());
	let editingEvent = $state<string | null>(null);
	let eventLabel = $state('');
	let eventCount = $state(3);

	// Step 3: Members
	let selectedMemberIds = $state(new Set<string>());

	// Step 4: Preview
	let previewSlots = $state<
		Array<{
			date: string;
			type: string;
			eventLabel: string | null;
			isClosed: boolean;
			assignments: Array<{
				id: string;
				member: { id: string; name: string; isPermanent: boolean };
			}>;
		}>
	>([]);
	let submitting = $state(false);
	let errorMsg = $state('');

	// Computed saturdays
	let allSaturdays = $derived(
		startDate && endDate && startDate < endDate
			? getSaturdaysBetween(startDate, endDate)
			: []
	);

	let openSaturdayCount = $derived(
		allSaturdays.filter((d) => !closedDates.has(d)).length
	);

	// Init selected members on step 3
	function initMembers() {
		if (selectedMemberIds.size === 0) {
			selectedMemberIds = new Set(data.rotatingMembers.map((m) => m.id));
		}
	}

	// Generate preview
	function generatePreview() {
		const memberMap = new Map(
			[...data.rotatingMembers, ...data.permanentMembers].map((m) => [m.id, m])
		);

		const openSaturdays = allSaturdays
			.filter((d) => !closedDates.has(d))
			.map((d) => ({
				date: d,
				requiredCount: events.get(d)?.requiredCount ?? defaultSlots
			}));

		const planningResult = generatePlanning(
			openSaturdays,
			[...selectedMemberIds]
		);

		// Build preview slots for ALL saturdays (including closed)
		previewSlots = allSaturdays.map((date) => {
			const isClosed = closedDates.has(date);
			const event = events.get(date);
			const planning = planningResult.find((p) => p.date === date);

			// Rotating members from algorithm
			const rotatingAssignments = (planning?.memberIds ?? []).map((id) => ({
				id: `preview-${date}-${id}`,
				member: {
					id,
					name: memberMap.get(id)?.name ?? '?',
					isPermanent: false
				}
			}));

			// Permanent members (auto-assigned to all open slots)
			const permanentAssignments = isClosed
				? []
				: data.permanentMembers.map((m) => ({
						id: `preview-${date}-${m.id}`,
						member: { id: m.id, name: m.name, isPermanent: true }
					}));

			return {
				date,
				type: isClosed ? 'closed' : event ? 'event' : 'normal',
				eventLabel: event?.label ?? null,
				isClosed,
				assignments: [...permanentAssignments, ...rotatingAssignments]
			};
		});
	}

	function toggleClosed(date: string) {
		const next = new Set(closedDates);
		if (next.has(date)) {
			next.delete(date);
		} else {
			next.add(date);
			// Remove event if marked closed
			if (events.has(date)) {
				const nextEvents = new Map(events);
				nextEvents.delete(date);
				events = nextEvents;
			}
		}
		closedDates = next;
	}

	function startEditEvent(date: string) {
		const existing = events.get(date);
		eventLabel = existing?.label ?? '';
		eventCount = existing?.requiredCount ?? 3;
		editingEvent = date;
	}

	function saveEvent() {
		if (!editingEvent || !eventLabel.trim()) return;
		const next = new Map(events);
		next.set(editingEvent, { label: eventLabel.trim(), requiredCount: eventCount });
		events = next;
		editingEvent = null;
	}

	function removeEvent(date: string) {
		const next = new Map(events);
		next.delete(date);
		events = next;
	}

	function toggleMember(id: string) {
		const next = new Set(selectedMemberIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedMemberIds = next;
	}

	async function submit() {
		submitting = true;
		errorMsg = '';

		const res = await fetchJson<{ id: string }>('/api/seasons', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name,
				startDate,
				endDate,
				defaultSlots,
				closedDates: [...closedDates],
				events: [...events.entries()].map(([date, e]) => ({
					date,
					label: e.label,
					requiredCount: e.requiredCount
				})),
				memberIds: [...selectedMemberIds]
			})
		});

		submitting = false;
		if (res.ok) {
			goto('/');
		} else {
			errorMsg = res.error;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<!-- Header -->
	<div class="flex items-center gap-3">
		{#if step > 1}
			<button
				onclick={() => step--}
				class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
			>
				<ArrowLeft size={20} />
			</button>
		{:else}
			<a
				href="/settings"
				class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
			>
				<ArrowLeft size={20} />
			</a>
		{/if}
		<h1 class="text-xl font-bold text-royal">Nouvelle saison</h1>
		<span class="ml-auto text-sm text-gray-400">Étape {step}/4</span>
	</div>

	<!-- Progress bar -->
	<div class="mt-3 h-1 rounded-full bg-gray-200">
		<div
			class="h-1 rounded-full bg-royal transition-all"
			style="width: {(step / 4) * 100}%"
		></div>
	</div>

	<!-- Step 1: Year selection -->
	{#if step === 1}
		<div class="mt-6 space-y-5">
			<div>
				<p class="text-sm font-medium text-gray-700">Saison à partir de</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each yearOptions as year}
						{@const taken = isYearTaken(year)}
						<button
							onclick={() => { if (!taken) selectedYear = year; }}
							disabled={taken}
							class="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors
								{selectedYear === year
								? 'border-royal bg-royal text-white'
								: taken
								? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
								: 'border-gray-200 bg-white text-gray-700 hover:border-royal-300 hover:bg-royal-50'}"
						>
							{year}
							{#if taken}
								<span class="ml-1 text-[10px]">(existe)</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			{#if selectedYear}
				<div class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-1">
					<p class="font-medium text-gray-900">{name}</p>
					<p>Août {selectedYear} — Août {selectedYear + 1}</p>
					<p>{allSaturdays.length} samedis</p>
				</div>
			{/if}

			<div>
				<label for="default-slots" class="block text-sm font-medium text-gray-700">
					Personnes par samedi (tournantes)
				</label>
				<input
					id="default-slots"
					bind:value={defaultSlots}
					type="number"
					min="1"
					max="10"
					class="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>

			<button
				onclick={() => step = 2}
				disabled={!selectedYear}
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
			>
				Suivant <ArrowRight size={16} />
			</button>
		</div>
	{/if}

	<!-- Step 2: Calendar -->
	{#if step === 2}
		<div class="mt-6">
			<p class="text-sm text-gray-500">
				{allSaturdays.length} samedis — {closedDates.size} fermés, {events.size} événements
			</p>

			<div class="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
				{#each allSaturdays as date}
					{@const isClosed = closedDates.has(date)}
					{@const event = events.get(date)}
					<div
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
							{isClosed ? 'border-red-200 bg-red-50' : event ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white'}"
					>
						<span class="flex-1 capitalize {isClosed ? 'text-red-600 line-through' : 'text-gray-700'}">
							{formatSamedi(date)}
						</span>

						{#if event && !isClosed}
							<span class="text-xs text-purple-600">{event.label} ({event.requiredCount}p)</span>
							<button
								onclick={() => removeEvent(date)}
								class="text-xs text-gray-400 hover:text-red-500"
							>×</button>
						{/if}

						{#if !isClosed && editingEvent !== date}
							<button
								onclick={() => startEditEvent(date)}
								class="rounded px-1.5 py-0.5 text-xs text-purple-500 hover:bg-purple-100"
							>
								Événement
							</button>
						{/if}

						<button
							onclick={() => toggleClosed(date)}
							class="rounded px-1.5 py-0.5 text-xs {isClosed ? 'text-green-600 hover:bg-green-100' : 'text-red-500 hover:bg-red-100'}"
						>
							{isClosed ? 'Ouvrir' : 'Fermer'}
						</button>
					</div>

					{#if editingEvent === date}
						<div class="ml-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2">
							<input
								bind:value={eventLabel}
								type="text"
								placeholder="Nom événement"
								class="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-royal focus:outline-none"
							/>
							<input
								bind:value={eventCount}
								type="number"
								min="1"
								max="10"
								class="w-14 rounded border border-gray-300 px-2 py-1 text-xs focus:border-royal focus:outline-none"
							/>
							<span class="text-xs text-gray-400">pers.</span>
							<button
								onclick={saveEvent}
								disabled={!eventLabel.trim()}
								class="rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
							>
								OK
							</button>
							<button
								onclick={() => (editingEvent = null)}
								class="text-xs text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
					{/if}
				{/each}
			</div>

			<button
				onclick={() => { initMembers(); step = 3; }}
				disabled={openSaturdayCount === 0}
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
			>
				Suivant <ArrowRight size={16} />
			</button>
		</div>
	{/if}

	<!-- Step 3: Members -->
	{#if step === 3}
		<div class="mt-6">
			{#if data.permanentMembers.length > 0}
				<div class="mb-4">
					<h3 class="text-sm font-medium text-gray-700">Permanents (auto-assignés)</h3>
					<div class="mt-2 space-y-1">
						{#each data.permanentMembers as m}
							<div class="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
								<span class="flex h-6 w-6 items-center justify-center rounded-full bg-royal-100 text-xs font-semibold text-royal">
									{m.name.charAt(0)}
								</span>
								{m.name}
								<span class="ml-auto text-xs text-gray-400">Tous les samedis</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<h3 class="text-sm font-medium text-gray-700">Membres tournants</h3>
			<p class="text-xs text-gray-400">{selectedMemberIds.size} sélectionnés sur {data.rotatingMembers.length}</p>
			<div class="mt-2 space-y-1">
				{#each data.rotatingMembers as m}
					<label
						class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors
							{selectedMemberIds.has(m.id) ? 'border-royal-200 bg-royal-50' : 'border-gray-200 bg-white'}"
					>
						<input
							type="checkbox"
							checked={selectedMemberIds.has(m.id)}
							onchange={() => toggleMember(m.id)}
							class="h-4 w-4 rounded border-gray-300 text-royal focus:ring-royal"
						/>
						<span class="flex h-6 w-6 items-center justify-center rounded-full bg-royal-100 text-xs font-semibold text-royal">
							{m.name.charAt(0)}
						</span>
						{m.name}
						{#if m.label}
							<span class="text-xs text-gray-400">{m.label}</span>
						{/if}
					</label>
				{/each}
			</div>

			<button
				onclick={() => { generatePreview(); step = 4; }}
				disabled={selectedMemberIds.size === 0}
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
			>
				Générer le planning <ArrowRight size={16} />
			</button>
		</div>
	{/if}

	<!-- Step 4: Preview -->
	{#if step === 4}
		<div class="mt-6">
			<div class="flex items-center justify-between">
				<p class="text-sm text-gray-500">
					{previewSlots.filter((s) => !s.isClosed).length} samedis ouverts
				</p>
				<button
					onclick={generatePreview}
					class="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
				>
					<RefreshCw size={12} />
					Régénérer
				</button>
			</div>

			<div class="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
				{#each previewSlots as slot}
					<SlotCard
						date={slot.date}
						type={slot.type}
						eventLabel={slot.eventLabel}
						isClosed={slot.isClosed}
						assignments={slot.assignments}
					/>
				{/each}
			</div>

			{#if errorMsg}
				<p class="mt-3 text-sm text-red-600">{errorMsg}</p>
			{/if}

			<button
				onclick={submit}
				disabled={submitting}
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
			>
				<Check size={16} />
				{submitting ? 'Création...' : 'Confirmer et créer la saison'}
			</button>
		</div>
	{/if}
</div>
