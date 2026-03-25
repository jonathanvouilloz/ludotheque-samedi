<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { identity } from '$lib/stores/identity.svelte';
	import { fetchJson } from '$lib/utils/api';
	import { today, daysUntil, formatDay, formatMonth } from '$lib/utils/dates';
	import SlotRow from '$lib/components/planning/SlotRow.svelte';
	import SwapDialog from '$lib/components/planning/SwapDialog.svelte';
	import SlotEditDialog from '$lib/components/planning/SlotEditDialog.svelte';
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';
	import CalendarPlus from 'lucide-svelte/icons/calendar-plus';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';

	let { data } = $props();

	let overrideSeason = $state<typeof data.season | undefined>(undefined);
	let overrideSlots = $state<typeof data.slots | undefined>(undefined);
	let loading = $state(false);
	let showPastSlots = $state(false);
	let selectedMemberId = $state<string>('');
	let members = $state<{ id: string; name: string }[]>([]);

	let currentSeason = $derived(overrideSeason ?? data.season);
	let slots = $derived(overrideSlots ?? data.slots);

	let todayStr = today();

	// Filter slots by selected member
	let filteredSlots = $derived.by(() => {
		if (!selectedMemberId) return slots;
		return slots.filter((s) => s.assignments.some((a: { member: { id: string } }) => a.member.id === selectedMemberId));
	});

	// Next slot where the current user is assigned
	let nextSlot = $derived(
		slots.find((s) =>
			s.date >= todayStr && !s.isClosed &&
			s.assignments.some((a: { member: { id: string } }) => a.member.id === identity.memberId)
		) ?? null
	);

	// Split filtered slots into past and current/future
	let pastSlots = $derived(filteredSlots.filter((s) => s.date < todayStr));
	let currentAndFutureSlots = $derived(filteredSlots.filter((s) => s.date >= todayStr));

	// Group current/future slots by month
	let monthGroups = $derived.by(() => {
		const groups: { month: string; slots: typeof currentAndFutureSlots }[] = [];
		for (const slot of currentAndFutureSlots) {
			const month = formatMonth(slot.date);
			const lastGroup = groups[groups.length - 1];
			if (lastGroup && lastGroup.month === month) {
				lastGroup.slots.push(slot);
			} else {
				groups.push({ month, slots: [slot] });
			}
		}
		return groups;
	});

	let isResponsable = $state(false);

	$effect(() => {
		if (identity.memberId) {
			fetch('/api/members')
				.then((r) => r.json())
				.then((memberList: { id: string; name: string; label?: string }[]) => {
					members = memberList.map((m) => ({ id: m.id, name: m.name }));
					const me = memberList.find((m) => m.id === identity.memberId);
					isResponsable = me?.label?.toLowerCase().includes('responsable') ?? false;
				})
				.catch(() => {});
		}
	});

	let swapFromSlot = $state<(typeof slots)[0] | null>(null);
	let editSlot = $state<(typeof slots)[0] | null>(null);

	function openSwap(slot: (typeof slots)[0]): void {
		swapFromSlot = slot;
	}

	function openEdit(slot: (typeof slots)[0]): void {
		editSlot = slot;
	}

	async function onSwapped(): Promise<void> {
		swapFromSlot = null;
		overrideSeason = undefined;
		overrideSlots = undefined;
		await invalidateAll();
	}

	async function onSlotUpdated(): Promise<void> {
		editSlot = null;
		overrideSeason = undefined;
		overrideSlots = undefined;
		await invalidateAll();
	}

	async function switchSeason(seasonId: string): Promise<void> {
		if (seasonId === currentSeason?.id) return;
		loading = true;
		const res = await fetchJson<{ season: typeof currentSeason; slots: typeof slots }>(
			`/api/planning/${seasonId}`
		);
		loading = false;
		if (res.ok) {
			overrideSeason = res.data.season;
			overrideSlots = res.data.slots;
		}
	}

	// Scroll to current month on mount
	onMount(async () => {
		await tick();
		const nextEl = document.querySelector('[data-next="true"]');
		if (nextEl) {
			nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
</script>

<svelte:head>
	<title>Planning — LudoTools</title>
</svelte:head>

<!-- Header -->
<div class="flex items-center justify-between">
	<h1 class="text-3xl font-semibold text-gray-900">Planning</h1>

	<div class="flex items-center gap-2">
		{#if data.allSeasons.length > 1}
			<select
				onchange={(e) => switchSeason(e.currentTarget.value)}
				value={currentSeason?.id ?? ''}
				disabled={loading}
				class="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				{#each data.allSeasons as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		{/if}

		{#if isResponsable}
			<a
				href="/settings/season/new"
				class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
			>
				<CalendarPlus size={14} />
				<span class="hidden sm:inline">Nouvelle saison</span>
			</a>
		{/if}
	</div>
</div>

{#if !currentSeason}
	<div class="mt-12 flex flex-col items-center text-center">
		<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
			<CalendarPlus size={28} class="text-gray-400" />
		</div>
		<p class="text-gray-500">Aucune saison configurée.</p>
		{#if isResponsable}
			<a
				href="/settings/season/new"
				class="mt-3 rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700"
			>
				Créer une saison
			</a>
		{:else}
			<p class="mt-1 text-sm text-gray-400">
				La responsable peut en créer une depuis les Paramètres.
			</p>
		{/if}
	</div>
{:else if loading}
	<p class="mt-1 text-sm text-gray-400">{currentSeason.name}</p>
	<div class="mt-4 space-y-2">
		{#each { length: 5 } as _}
			<SkeletonCard />
		{/each}
	</div>
{:else}
	<!-- Filter by member -->
	<div class="mt-2 flex items-center gap-3">
		<span class="text-sm text-gray-400">{currentSeason.name}</span>
		<select
			bind:value={selectedMemberId}
			class="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		>
			<option value="">Tous les membres</option>
			{#each members as m}
				<option value={m.id}>{m.name}</option>
			{/each}
		</select>
	</div>

	<!-- Hero card: prochain créneau -->
	{#if nextSlot}
		{@const days = daysUntil(nextSlot.date)}
		<div class="mt-4 rounded-xl bg-royal px-4 py-3">
			<div class="flex items-baseline justify-between">
				<span class="text-base text-white/70">Mon prochain samedi</span>
				<span class="text-sm text-white/70">
					{#if days === 0}
						aujourd'hui
					{:else if days === 1}
						demain
					{:else}
						dans {days} jours
					{/if}
				</span>
			</div>
			<p class="mt-1 text-2xl font-semibold text-white capitalize">
				Samedi {formatDay(nextSlot.date)}
			</p>
			{#if !nextSlot.isClosed && nextSlot.assignments.length > 0}
				<ul class="mt-1.5 space-y-0.5">
					{#each nextSlot.assignments as a}
						<li class="text-sm text-white/80">
							<span class="mr-1 text-white/40">&bull;</span>
							{a.member.name}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<!-- Past slots: collapsed block -->
	{#if pastSlots.length > 0}
		<button
			onclick={() => (showPastSlots = !showPastSlots)}
			class="mt-4 flex w-full items-center gap-1.5 py-2 text-sm text-gray-400 transition-colors hover:text-gray-600"
		>
			{#if showPastSlots}
				<ChevronDown size={14} />
			{:else}
				<ChevronRight size={14} />
			{/if}
			{pastSlots.length} samedi{pastSlots.length > 1 ? 's' : ''} passé{pastSlots.length > 1 ? 's' : ''}
		</button>

		{#if showPastSlots}
			<div class="-mx-4 border-y border-gray-100 bg-gray-50/50 sm:mx-0 sm:rounded-lg sm:border">
				{#each pastSlots as slot}
					<SlotRow
						date={slot.date}
						type={slot.type}
						eventLabel={slot.eventLabel}
						isClosed={slot.isClosed}
						assignments={slot.assignments}
						isNext={false}
						isPast={true}
						currentUserId={identity.memberId}
					/>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Current/future slots grouped by month -->
	{#each monthGroups as group}
		<div class="mt-4">
			<div class="flex items-center gap-2 px-1 pb-1.5">
				<div class="h-px flex-1 bg-gray-200"></div>
				<span class="text-xs font-semibold tracking-wide text-gray-400">{group.month}</span>
				<div class="h-px flex-1 bg-gray-200"></div>
			</div>
			<div class="-mx-4 border-y border-gray-100 bg-white sm:mx-0 sm:rounded-lg sm:border">
				{#each group.slots as slot}
					<div data-next={slot === nextSlot ? 'true' : undefined}>
						<SlotRow
							date={slot.date}
							type={slot.type}
							eventLabel={slot.eventLabel}
							isClosed={slot.isClosed}
							assignments={slot.assignments}
							isNext={slot === nextSlot}
							isPast={false}
							currentUserId={identity.memberId}
							{isResponsable}
							onswap={() => openSwap(slot)}
							onedit={() => openEdit(slot)}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if filteredSlots.length === 0}
		<p class="mt-8 text-center text-sm text-gray-400">
			Aucun samedi trouvé pour ce membre.
		</p>
	{/if}
{/if}

{#if swapFromSlot}
	<SwapDialog
		fromSlot={swapFromSlot}
		allSlots={slots}
		currentUserId={identity.memberId ?? ''}
		{isResponsable}
		onclose={() => (swapFromSlot = null)}
		onswapped={onSwapped}
	/>
{/if}

{#if editSlot}
	<SlotEditDialog
		slot={editSlot}
		onclose={() => (editSlot = null)}
		onupdated={onSlotUpdated}
	/>
{/if}
