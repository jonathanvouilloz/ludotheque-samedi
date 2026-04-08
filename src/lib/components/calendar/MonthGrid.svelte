<script lang="ts">
	import type { DayEntries } from '$lib/utils/calendar';
	import type { EventKind, SchoolPeriodType } from '$lib/server/schema';
	import { today as todayIso } from '$lib/utils/dates';

	interface Props {
		month: string; // YYYY-MM
		dates: string[]; // 42 dates
		dayMap: Map<string, DayEntries>;
		onDayClick: (date: string) => void;
	}

	let { month, dates, dayMap, onDayClick }: Props = $props();

	const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	const KIND_COLORS: Record<EventKind, string> = {
		accueil: 'bg-royal text-white',
		internal: 'bg-purple-500 text-white'
	};

	const PERIOD_BG: Record<SchoolPeriodType, string> = {
		vacation: 'bg-amber-50',
		holiday: 'bg-red-50',
		pont: 'bg-purple-50',
		special: 'bg-blue-50'
	};

	let today = todayIso();
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
	<div class="grid shrink-0 grid-cols-7 border-b border-gray-200 bg-gray-50">
		{#each WEEKDAYS as wd}
			<div class="px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
				{wd}
			</div>
		{/each}
	</div>
	<div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px bg-gray-200">
		{#each dates as date}
			{@const entries = dayMap.get(date)}
			{@const inMonth = date.slice(0, 7) === month}
			{@const isToday = date === today}
			{@const periodBg = entries?.periods[0]
				? PERIOD_BG[entries.periods[0].type as SchoolPeriodType]
				: 'bg-white'}
			<button
				type="button"
				onclick={() => onDayClick(date)}
				class="relative flex min-h-0 flex-col overflow-hidden text-left transition-colors hover:bg-royal-50/60 {periodBg} {inMonth
					? ''
					: 'opacity-40'}"
			>
				<div class="flex shrink-0 items-start justify-between px-1.5 pt-1">
					<span
						class="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold {isToday
							? 'bg-royal text-white'
							: 'text-gray-700'}"
					>
						{parseInt(date.slice(8, 10), 10)}
					</span>
					{#if entries?.isSaturdayOpen}
						<span
							class="flex h-4 w-4 items-center justify-center rounded bg-royal text-[9px] font-bold text-white"
							title="Samedi ludothèque ouvert"
						>
							L
						</span>
					{/if}
				</div>
				{#if entries}
					<div class="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-hidden px-1 pb-1">
						{#each entries.events as ev}
							<div
								class="truncate rounded px-1 py-0.5 text-[10px] font-medium {KIND_COLORS[ev.kind as EventKind]}"
							>
								{ev.startTime.slice(0, 5)} {ev.title}
							</div>
						{/each}
						{#if entries.absences.length > 0}
							<div class="flex flex-wrap gap-0.5 pt-0.5">
								{#each entries.absences as a}
									<span
										class="h-1.5 w-1.5 rounded-full {a.status === 'approved'
											? 'bg-emerald-500'
											: 'bg-amber-400'}"
										title={a.memberId}
									></span>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>
