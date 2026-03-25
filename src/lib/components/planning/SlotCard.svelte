<script lang="ts">
	import { formatSamedi } from '$lib/utils/dates';
	import MemberPill from './MemberPill.svelte';
	import ArrowLeftRight from 'lucide-svelte/icons/arrow-left-right';

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
		onswap = undefined
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
	class="rounded-xl border px-4 py-3 transition-all
		{isClosedOrEvent && !isPast ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-200'}
		{isPast ? 'opacity-50' : ''}
		{isMySlot && !isPast && !isClosedOrEvent ? 'border-l-4 border-l-royal border-t-gray-200 border-r-gray-200 border-b-gray-200' : ''}
		{isNext ? 'ring-2 ring-royal-200' : ''}"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if isNext}
				<span class="rounded-full bg-royal px-2 py-0.5 text-[10px] font-semibold text-white">
					Prochain
				</span>
			{/if}
			<span class="text-sm font-medium text-gray-900 capitalize">{formatSamedi(date)}</span>
		</div>
		<div class="flex items-center gap-1.5">
			{#if canSwap}
				<button
					onclick={onswap}
					class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-royal transition-colors hover:bg-royal-50"
					title="Échanger ce samedi"
				>
					<ArrowLeftRight size={14} />
					Échanger
				</button>
			{/if}
		</div>
	</div>

	{#if isClosedOrEvent}
		<div class="mt-2 text-sm text-amber-700">{closedText}</div>
	{:else if assignments.length > 0}
		<div class="mt-2 flex flex-wrap gap-1.5">
			{#each assignments as a}
				<MemberPill
					name={a.member.name}
					isPermanent={a.member.isPermanent}
					isCurrentUser={a.member.id === currentUserId}
				/>
			{/each}
		</div>
	{/if}
</div>
