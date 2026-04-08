<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import {
		buildMonthGrid,
		buildDayMap,
		emptyFilters,
		nextMonth,
		prevMonth
	} from '$lib/utils/calendar';
	import { formatMonth, today as todayIso } from '$lib/utils/dates';
	import type {
		Event,
		EventAssignment,
		Absence,
		SchoolPeriod,
		SaturdaySlot,
		SchoolPeriodType
	} from '$lib/server/schema';

	interface Props {
		selectedDates: Set<string>;
		events: Event[];
		assignments: EventAssignment[];
		absences: Absence[];
		periods: SchoolPeriod[];
		saturdays: SaturdaySlot[];
		memberIds?: string[]; // to highlight conflicts with assigned members
		onToggle: (date: string) => void;
	}

	let {
		selectedDates,
		events,
		assignments,
		absences,
		periods,
		saturdays,
		memberIds = [],
		onToggle
	}: Props = $props();

	const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const PERIOD_BG: Record<SchoolPeriodType, string> = {
		vacation: 'bg-amber-100',
		holiday: 'bg-red-100',
		pont: 'bg-purple-100',
		special: 'bg-blue-50'
	};

	let month = $state(todayIso().slice(0, 7));
	let gridDates = $derived(buildMonthGrid(month));
	let dayMap = $derived(
		buildDayMap(
			gridDates,
			{ events, assignments, absences, periods, saturdays },
			emptyFilters()
		)
	);

	const today = todayIso();

	function isMemberBusy(date: string): boolean {
		if (memberIds.length === 0) return false;
		const entries = dayMap.get(date);
		if (!entries) return false;
		// Check if any assigned member is absent that day
		for (const a of entries.absences) {
			if (a.status !== 'rejected' && memberIds.includes(a.memberId)) return true;
		}
		// Check if any existing event uses one of the assigned members
		for (const ev of entries.events) {
			if (ev.memberIds.some((m) => memberIds.includes(m))) return true;
		}
		return false;
	}
</script>

<div class="rounded-xl border border-gray-200 bg-white">
	<div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
		<h3 class="text-sm font-semibold text-gray-900">{formatMonth(month + '-01')}</h3>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={() => (month = prevMonth(month))}
				class="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
				aria-label="Mois précédent"
			>
				<ChevronLeft size={16} />
			</button>
			<button
				type="button"
				onclick={() => (month = todayIso().slice(0, 7))}
				class="rounded-lg px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
			>
				Aujourd'hui
			</button>
			<button
				type="button"
				onclick={() => (month = nextMonth(month))}
				class="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
				aria-label="Mois suivant"
			>
				<ChevronRight size={16} />
			</button>
		</div>
	</div>

	<div class="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
		{#each WEEKDAYS as wd}
			<div class="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
				{wd}
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-px bg-gray-100 p-px">
		{#each gridDates as date}
			{@const entries = dayMap.get(date)}
			{@const inMonth = date.slice(0, 7) === month}
			{@const isToday = date === today}
			{@const isPast = date < today}
			{@const selected = selectedDates.has(date)}
			{@const periodBg = entries?.periods[0]
				? PERIOD_BG[entries.periods[0].type as SchoolPeriodType]
				: 'bg-white'}
			{@const hasBlockingPeriod = entries?.periods.some(
				(p) => p.isBlocking && (p.type === 'vacation' || p.type === 'holiday')
			)}
			{@const memberBusy = !isPast && isMemberBusy(date)}
			{@const hasConflict = hasBlockingPeriod || memberBusy}
			<button
				type="button"
				onclick={() => onToggle(date)}
				disabled={isPast}
				class="relative flex min-h-[88px] flex-col items-stretch p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 {selected
					? 'bg-royal text-white hover:bg-royal-700'
					: periodBg} {!inMonth ? 'opacity-40' : ''} {!selected && !isPast ? 'hover:bg-royal-50' : ''}"
			>
				<div class="flex items-center justify-between">
					<span
						class="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold {selected
							? 'bg-white text-royal'
							: isToday
								? 'bg-royal text-white'
								: 'text-gray-700'}"
					>
						{parseInt(date.slice(8, 10), 10)}
					</span>
					{#if entries?.isSaturdayOpen}
						<span class="text-[9px] font-bold {selected ? 'text-white' : 'text-royal'}">L</span>
					{/if}
				</div>
				{#if entries && (entries.events.length > 0 || entries.absences.length > 0 || entries.periods.length > 0)}
					<div class="mt-0.5 flex flex-wrap gap-0.5">
						{#each entries.events.slice(0, 3) as ev}
							<span
								class="h-1.5 w-1.5 rounded-full {selected
									? 'bg-white/70'
									: ev.kind === 'accueil'
										? 'bg-royal'
										: 'bg-purple-500'}"
								title={ev.title}
							></span>
						{/each}
						{#each entries.absences.slice(0, 3) as a}
							<span
								class="h-1.5 w-1.5 rounded-full {selected
									? 'bg-white/70'
									: a.status === 'approved'
										? 'bg-emerald-500'
										: 'bg-amber-400'}"
							></span>
						{/each}
					</div>
					{#if entries.periods[0]}
						<p class="mt-auto truncate text-[8px] font-medium {selected ? 'text-white/80' : 'text-gray-500'}">
							{entries.periods[0].label}
						</p>
					{/if}
				{/if}
				{#if hasConflict && !selected}
					<span class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" title="Conflit"></span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="flex flex-wrap gap-3 border-t border-gray-100 px-3 py-2 text-[10px] text-gray-500">
		<span class="flex items-center gap-1">
			<span class="h-2 w-2 rounded-full bg-royal"></span> Accueil
		</span>
		<span class="flex items-center gap-1">
			<span class="h-2 w-2 rounded-full bg-purple-500"></span> Interne
		</span>
		<span class="flex items-center gap-1">
			<span class="h-2 w-2 rounded-full bg-emerald-500"></span> Absence
		</span>
		<span class="flex items-center gap-1">
			<span class="h-2 w-2 rounded bg-amber-100"></span> Vacances
		</span>
		<span class="flex items-center gap-1">
			<span class="h-2 w-2 rounded bg-red-100"></span> Férié
		</span>
		<span class="flex items-center gap-1">
			<span class="h-1.5 w-1.5 rounded-full bg-red-500"></span> Conflit membre
		</span>
	</div>
</div>
