<script lang="ts">
	import X from 'lucide-svelte/icons/x';
	import Plus from 'lucide-svelte/icons/plus';
	import CalendarX from 'lucide-svelte/icons/calendar-x';
	import { formatSamedi } from '$lib/utils/dates';
	import type { DayEntries } from '$lib/utils/calendar';
	import type { SchoolPeriodType, AbsenceType, EventKind } from '$lib/server/schema';

	interface Props {
		date: string | null;
		entries: DayEntries | null;
		memberNames: Map<string, string>;
		schoolNames: Map<string, string>;
		open: boolean;
		onclose: () => void;
	}

	let { date, entries, memberNames, schoolNames, open, onclose }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	const PERIOD_COLORS: Record<SchoolPeriodType, string> = {
		vacation: 'bg-amber-100 text-amber-800',
		holiday: 'bg-red-100 text-red-800',
		pont: 'bg-purple-100 text-purple-800',
		special: 'bg-blue-100 text-blue-800'
	};

	const ABSENCE_LABELS: Record<AbsenceType, string> = {
		vacation: 'Vacances',
		leave: 'Congé',
		training: 'Formation',
		unavailable: 'Indispo'
	};

	const KIND_LABELS: Record<EventKind, string> = {
		accueil: 'Accueil',
		internal: 'Interne'
	};

	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
		if (!open && dialog?.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={onclose}
	class="m-auto max-h-[85vh] w-[min(90vw,32rem)] rounded-xl p-0 backdrop:bg-black/40"
>
	{#if date && entries}
		<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
			<h2 class="text-lg font-semibold text-gray-900">{formatSamedi(date)}</h2>
			<button
				onclick={onclose}
				class="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
				aria-label="Fermer"
			>
				<X size={18} />
			</button>
		</div>

		<div class="max-h-[calc(85vh-8rem)] overflow-y-auto p-4 space-y-4">
			{#if entries.periods.length > 0}
				<div>
					<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Périodes</h3>
					<div class="mt-1 space-y-1">
						{#each entries.periods as p}
							<div class="rounded-lg px-3 py-2 text-sm {PERIOD_COLORS[p.type as SchoolPeriodType]}">
								<div class="flex items-center gap-2">
									<CalendarX size={14} />
									<span class="font-medium">{p.label}</span>
									{#if p.isBlocking}
										<span class="text-[10px] uppercase">Bloquant</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if entries.isSaturdayOpen}
				<div>
					<a
						href="/"
						class="flex items-center gap-2 rounded-lg bg-royal-50 px-3 py-2 text-sm text-royal hover:bg-royal-100"
					>
						<div class="flex h-6 w-6 items-center justify-center rounded bg-royal text-[10px] font-bold text-white">L</div>
						Samedi ludothèque ouvert
					</a>
				</div>
			{/if}

			{#if entries.events.length > 0}
				<div>
					<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Événements</h3>
					<div class="mt-1 space-y-1">
						{#each entries.events as ev}
							<a
								href="/calendrier/events/{ev.id}"
								class="block rounded-lg border border-gray-200 bg-white p-3 hover:border-royal-200 hover:bg-royal-50/40"
							>
								<div class="flex items-center justify-between gap-2">
									<p class="font-medium text-gray-900">{ev.title}</p>
									<span class="text-xs text-gray-500">{ev.startTime}–{ev.endTime}</span>
								</div>
								<p class="mt-0.5 text-xs text-gray-500">
									{KIND_LABELS[ev.kind as EventKind]}
									{#if ev.schoolId && schoolNames.get(ev.schoolId)}· {schoolNames.get(ev.schoolId)}{/if}
									{#if ev.location}· {ev.location}{/if}
								</p>
								{#if ev.memberIds.length > 0}
									<p class="mt-0.5 text-xs text-gray-600">
										{ev.memberIds.map((id) => memberNames.get(id) ?? '?').join(', ')}
									</p>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}

			{#if entries.absences.length > 0}
				<div>
					<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Absences</h3>
					<div class="mt-1 space-y-1">
						{#each entries.absences as a}
							<div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
								<div class="flex items-center justify-between">
									<span class="font-medium text-gray-900">{memberNames.get(a.memberId) ?? '?'}</span>
									<span class="text-xs text-gray-500">{ABSENCE_LABELS[a.type as AbsenceType]}</span>
								</div>
								{#if a.status === 'pending'}
									<p class="mt-0.5 text-[10px] text-amber-700">En attente d'approbation</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if entries.events.length === 0 && entries.absences.length === 0 && entries.periods.length === 0 && !entries.isSaturdayOpen}
				<p class="py-4 text-center text-sm text-gray-400">Rien de prévu ce jour</p>
			{/if}
		</div>

		<div class="border-t border-gray-100 px-4 py-3">
			<a
				href="/calendrier/events/new?date={date}"
				class="flex items-center justify-center gap-2 rounded-lg bg-royal px-3 py-2 text-sm font-medium text-white hover:bg-royal-700"
			>
				<Plus size={14} />
				Nouvel événement ce jour
			</a>
		</div>
	{/if}
</dialog>
