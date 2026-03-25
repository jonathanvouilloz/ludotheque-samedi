<script lang="ts">
	import { formatDay } from '$lib/utils/dates';
	import ArrowLeftRight from 'lucide-svelte/icons/arrow-left-right';
	import Pencil from 'lucide-svelte/icons/pencil';

	interface SlotAssignment {
		id: string;
		member: { id: string; name: string; isPermanent: boolean };
	}

	let {
		date,
		type = 'normal',
		eventLabel = null,
		isClosed = false,
		assignments = [],
		isNext = false,
		isPast = false,
		currentUserId = null,
		isResponsable = false,
		onswap = undefined,
		onedit = undefined
	}: {
		date: string;
		type?: string;
		eventLabel?: string | null;
		isClosed?: boolean;
		assignments?: SlotAssignment[];
		isNext?: boolean;
		isPast?: boolean;
		currentUserId?: string | null;
		isResponsable?: boolean;
		onswap?: (() => void) | undefined;
		onedit?: (() => void) | undefined;
	} = $props();

	let isMySlot = $derived(
		currentUserId ? assignments.some((a) => a.member.id === currentUserId) : false
	);

	let isCurrentUserPermanent = $derived(
		currentUserId
			? assignments.some((a) => a.member.id === currentUserId && a.member.isPermanent)
			: false
	);

	let hasSwappableMembers = $derived(
		assignments.some((a) => !a.member.isPermanent)
	);

	let canSwap = $derived(
		onswap != null && !isClosed && !isPast &&
		(isResponsable ? hasSwappableMembers : (isMySlot && !isCurrentUserPermanent))
	);

	let canEdit = $derived(onedit != null && isResponsable && !isPast);

	// Sort: current user first, then others
	let sortedAssignments = $derived.by(() => {
		if (!currentUserId) return assignments;
		const mine = assignments.filter((a) => a.member.id === currentUserId);
		const others = assignments.filter((a) => a.member.id !== currentUserId);
		return [...mine, ...others];
	});

	let isEvent = $derived(type === 'event' && eventLabel && !isClosed);

	let closedText = $derived.by(() => {
		if (isClosed && eventLabel) return eventLabel;
		if (isClosed) return 'Fermé';
		if (isEvent) return eventLabel;
		return '';
	});

	let isClosedOrEvent = $derived(isClosed || isEvent);
</script>

<div
	class="border-b border-gray-100 px-3 py-2.5 transition-colors
		{isClosedOrEvent && !isPast ? 'bg-amber-50/60' : ''}
		{isNext && !isClosedOrEvent ? 'border-l-4 border-l-royal bg-royal-50' : ''}
		{isMySlot && !isPast && !isNext && !isClosedOrEvent ? 'border-l-4 border-l-royal bg-royal-50' : ''}
		{!isMySlot && !isNext && !isClosedOrEvent ? 'border-l-4 border-l-transparent' : ''}
		{isPast ? 'text-gray-400' : ''}"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if isNext}
				<span class="inline-block h-2 w-2 rounded-full bg-royal"></span>
			{/if}
			<span class="text-lg font-semibold capitalize {isPast ? 'text-gray-400' : 'text-gray-900'}">
				{formatDay(date)}
			</span>
			{#if isNext}
				<span class="rounded bg-royal px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
					Prochain
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-1">
			{#if canSwap}
				<button
					onclick={onswap}
					class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-royal transition-colors hover:bg-royal-50"
					title="Échanger ce samedi"
				>
					<ArrowLeftRight size={14} />
				</button>
			{/if}
			{#if canEdit}
				<button
					onclick={onedit}
					class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
					title="Modifier ce samedi"
				>
					<Pencil size={14} />
				</button>
			{/if}
		</div>
	</div>
	<div class="mt-0.5 text-sm {isPast ? 'text-gray-300' : 'text-gray-500'}">
		{#if isClosedOrEvent}
			<span class="text-amber-700">{closedText}</span>
		{:else if sortedAssignments.length === 0}
			—
		{:else}
			{#each sortedAssignments as a, i}
				{#if i > 0}<span>, </span>{/if}
				{a.member.name}
			{/each}
		{/if}
	</div>
</div>
