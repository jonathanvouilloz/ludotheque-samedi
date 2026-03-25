<script lang="ts">
	import { fetchJson } from '$lib/utils/api';
	import { formatSamedi, today } from '$lib/utils/dates';
	import MemberPill from './MemberPill.svelte';
	import ArrowLeftRight from 'lucide-svelte/icons/arrow-left-right';
	import X from 'lucide-svelte/icons/x';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';

	interface SlotAssignment {
		id: string;
		member: { id: string; name: string; isPermanent: boolean };
	}

	interface Slot {
		id: string;
		date: string;
		type: string;
		eventLabel: string | null;
		isClosed: boolean;
		requiredCount: number | null;
		assignments: SlotAssignment[];
	}

	let {
		fromSlot,
		allSlots,
		currentUserId,
		isResponsable = false,
		onclose,
		onswapped
	}: {
		fromSlot: Slot;
		allSlots: Slot[];
		currentUserId: string;
		isResponsable?: boolean;
		onclose: () => void;
		onswapped: () => void;
	} = $props();

	let fromMemberId = $state<string | null>(null);
	let selectedSlot = $state<Slot | null>(null);
	let selectedMemberId = $state<string | null>(null);
	let loading = $state(false);
	let errorMsg = $state('');

	let todayStr = today();

	// Non-permanent members on the from slot (for admin mode)
	let fromSlotMembers = $derived(
		fromSlot.assignments.filter((a) => !a.member.isPermanent)
	);

	// Admin needs to pick from member first; auto-select if only one
	let needsFromMemberSelection = $derived(
		isResponsable && fromSlotMembers.length > 1 && !fromMemberId
	);

	// Effective "from" member for filtering
	let effectiveFromMemberId = $derived(
		isResponsable ? fromMemberId : currentUserId
	);

	// Auto-select from member if only one option (admin mode)
	$effect(() => {
		if (isResponsable && fromSlotMembers.length === 1) {
			fromMemberId = fromSlotMembers[0].member.id;
		}
	});

	let fromMemberName = $derived(
		fromSlotMembers.find((a) => a.member.id === effectiveFromMemberId)?.member.name ?? ''
	);

	// Eligible target slots: future, open, not the same slot
	let eligibleSlots = $derived(
		allSlots.filter(
			(s) =>
				s.id !== fromSlot.id &&
				!s.isClosed &&
				s.date >= todayStr &&
				// Has at least one non-permanent member that isn't the from member
				s.assignments.some(
					(a) => a.member.id !== effectiveFromMemberId && !a.member.isPermanent
				)
		)
	);

	// Swappable members on selected slot (non-permanent, not the from member)
	let swappableMembers = $derived(
		selectedSlot?.assignments.filter(
			(a) => a.member.id !== effectiveFromMemberId && !a.member.isPermanent
		) ?? []
	);

	// Warning if different required count
	let hasDifferentCount = $derived(
		selectedSlot != null &&
			fromSlot.requiredCount != null &&
			selectedSlot.requiredCount != null &&
			fromSlot.requiredCount !== selectedSlot.requiredCount
	);

	let selectedMemberName = $derived(
		swappableMembers.find((a) => a.member.id === selectedMemberId)?.member.name ?? ''
	);

	function selectFromMember(memberId: string): void {
		fromMemberId = memberId;
		errorMsg = '';
	}

	function selectSlot(slot: Slot): void {
		selectedSlot = slot;
		// Auto-select if only one swappable member
		const swappable = slot.assignments.filter(
			(a) => a.member.id !== effectiveFromMemberId && !a.member.isPermanent
		);
		selectedMemberId = swappable.length === 1 ? swappable[0].member.id : null;
		errorMsg = '';
	}

	function back(): void {
		if (selectedSlot) {
			selectedSlot = null;
			selectedMemberId = null;
		} else if (isResponsable && fromSlotMembers.length > 1) {
			fromMemberId = null;
		}
		errorMsg = '';
	}

	async function confirmSwap(): Promise<void> {
		if (!selectedSlot || !selectedMemberId || !effectiveFromMemberId) return;
		loading = true;
		errorMsg = '';

		const payload: Record<string, string> = {
			fromSlotId: fromSlot.id,
			toSlotId: selectedSlot.id,
			toMemberId: selectedMemberId
		};

		// Admin swap: send fromMemberId so the server knows who to swap
		if (isResponsable && effectiveFromMemberId !== currentUserId) {
			payload.fromMemberId = effectiveFromMemberId;
		}

		const res = await fetchJson<{ success: boolean }>('/api/planning/swap', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		loading = false;
		if (res.ok) {
			onswapped();
		} else {
			errorMsg = res.error;
		}
	}
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<!-- Dialog -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<ArrowLeftRight size={18} class="text-royal" />
				<h2 class="text-lg font-bold text-gray-900">Échanger un samedi</h2>
			</div>
			<button onclick={onclose} class="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
				<X size={20} />
			</button>
		</div>

		<!-- From slot info -->
		<div class="mt-3 rounded-lg bg-royal-50 px-3 py-2 text-sm">
			<span class="text-gray-500">{isResponsable ? 'Samedi :' : 'Mon samedi :'}</span>
			<span class="ml-1 font-medium capitalize text-royal">{formatSamedi(fromSlot.date)}</span>
			{#if effectiveFromMemberId && isResponsable}
				<span class="ml-1 text-gray-500">—</span>
				<span class="ml-1 font-medium text-gray-700">{fromMemberName}</span>
			{/if}
		</div>

		{#if needsFromMemberSelection}
			<!-- Phase 0 (admin): Select which member to swap -->
			<p class="mt-4 text-sm text-gray-500">Quel membre échanger ?</p>
			<div class="mt-2 space-y-1">
				{#each fromSlotMembers as a}
					<button
						onclick={() => selectFromMember(a.member.id)}
						class="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:border-royal-300 hover:bg-royal-50"
					>
						<MemberPill name={a.member.name} />
					</button>
				{/each}
			</div>
		{:else if !selectedSlot}
			<!-- Phase 1: Select target slot -->
			<p class="mt-4 text-sm text-gray-500">
				{isResponsable ? 'Avec quel samedi échanger ?' : 'Avec quel samedi veux-tu échanger ?'}
			</p>

			{#if eligibleSlots.length === 0}
				<p class="mt-4 text-center text-sm text-gray-400">
					Aucun samedi disponible pour un échange.
				</p>
			{:else}
				<div class="mt-2 max-h-[40vh] space-y-1 overflow-y-auto">
					{#each eligibleSlots as slot}
						<button
							onclick={() => selectSlot(slot)}
							class="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm transition-colors hover:border-royal-300 hover:bg-royal-50"
						>
							<span class="capitalize text-gray-700">{formatSamedi(slot.date)}</span>
							<div class="flex gap-1">
								{#each slot.assignments.filter((a) => !a.member.isPermanent) as a}
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
										{a.member.name}
									</span>
								{/each}
							</div>
						</button>
					{/each}
				</div>
			{/if}

			{#if isResponsable && fromSlotMembers.length > 1}
				<button
					onclick={back}
					class="mt-2 text-xs text-gray-400 hover:text-gray-600"
				>
					Changer de membre
				</button>
			{/if}
		{:else}
			<!-- Phase 2: Select member + confirm -->
			<div class="mt-4">
				<p class="text-sm text-gray-500">
					Samedi cible :
					<span class="font-medium capitalize text-gray-900">
						{formatSamedi(selectedSlot.date)}
					</span>
				</p>

				{#if hasDifferentCount}
					<div
						class="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"
					>
						<AlertTriangle size={14} />
						Ce samedi a un nombre de places différent.
					</div>
				{/if}

				{#if swappableMembers.length > 1}
					<p class="mt-3 text-sm text-gray-500">Avec qui ?</p>
					<div class="mt-1 space-y-1">
						{#each swappableMembers as a}
							<button
								onclick={() => (selectedMemberId = a.member.id)}
								class="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors
									{selectedMemberId === a.member.id
									? 'border-royal bg-royal-50'
									: 'border-gray-200 hover:border-gray-300'}"
							>
								<MemberPill name={a.member.name} />
							</button>
						{/each}
					</div>
				{:else if swappableMembers.length === 1}
					<p class="mt-3 text-sm text-gray-500">
						Échange avec <strong>{swappableMembers[0].member.name}</strong>
					</p>
				{/if}

				{#if errorMsg}
					<p class="mt-2 text-sm text-red-600">{errorMsg}</p>
				{/if}

				<div class="mt-4 flex gap-2">
					<button
						onclick={confirmSwap}
						disabled={loading || !selectedMemberId}
						class="flex-1 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
					>
						{loading ? 'Échange...' : `Confirmer l'échange`}
					</button>
					<button
						onclick={back}
						class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
					>
						Retour
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
