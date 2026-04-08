<script lang="ts">
	import type { DayEntries } from '$lib/utils/calendar';
	import type { EventKind, SchoolPeriodType, AbsenceType } from '$lib/server/schema';
	import { formatDay, today as todayIso } from '$lib/utils/dates';

	interface Props {
		month: string;
		dates: string[]; // all 42, we filter in-month here
		dayMap: Map<string, DayEntries>;
		memberNames: Map<string, string>;
		onDayClick: (date: string) => void;
	}

	let { month, dates, dayMap, memberNames, onDayClick }: Props = $props();

	const KIND_COLORS: Record<EventKind, string> = {
		accueil: 'bg-royal text-white',
		internal: 'bg-purple-500 text-white'
	};

	const PERIOD_COLORS: Record<SchoolPeriodType, string> = {
		vacation: 'bg-amber-100 text-amber-800',
		holiday: 'bg-red-100 text-red-800',
		pont: 'bg-purple-100 text-purple-800',
		special: 'bg-blue-100 text-blue-800'
	};

	const ABSENCE_LABELS: Record<AbsenceType, string> = {
		vacation: 'vacances',
		leave: 'congé',
		training: 'formation',
		unavailable: 'indispo'
	};

	let today = todayIso();

	let inMonthDates = $derived(dates.filter((d) => d.slice(0, 7) === month));
</script>

<div class="space-y-1">
	{#each inMonthDates as date}
		{@const entries = dayMap.get(date)}
		{@const isToday = date === today}
		{@const hasContent =
			entries &&
			(entries.events.length > 0 ||
				entries.absences.length > 0 ||
				entries.periods.length > 0 ||
				entries.isSaturdayOpen)}
		<button
			type="button"
			onclick={() => onDayClick(date)}
			class="flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-royal-200"
			class:opacity-50={!hasContent}
		>
			<div class="flex w-12 shrink-0 flex-col items-center">
				<span
					class="flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium {isToday
						? 'bg-royal text-white'
						: 'text-gray-700'}"
				>
					{parseInt(date.slice(8, 10), 10)}
				</span>
				<span class="mt-0.5 text-[9px] uppercase text-gray-400">
					{new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', {
						weekday: 'short',
						timeZone: 'UTC'
					})}
				</span>
			</div>
			<div class="min-w-0 flex-1 space-y-1">
				{#if entries?.periods}
					{#each entries.periods as p}
						<div
							class="rounded px-2 py-0.5 text-[10px] font-medium {PERIOD_COLORS[p.type as SchoolPeriodType]}"
						>
							{p.label}
						</div>
					{/each}
				{/if}
				{#if entries?.isSaturdayOpen}
					<div class="rounded bg-royal-50 px-2 py-0.5 text-[10px] font-medium text-royal">
						Samedi ludothèque
					</div>
				{/if}
				{#each entries?.events ?? [] as ev}
					<div class="flex items-center gap-2">
						<span class="rounded px-1.5 py-0.5 text-[10px] font-medium {KIND_COLORS[ev.kind as EventKind]}">
							{ev.startTime.slice(0, 5)}
						</span>
						<span class="truncate text-xs text-gray-800">{ev.title}</span>
					</div>
				{/each}
				{#each entries?.absences ?? [] as a}
					<div class="flex items-center gap-1.5 text-[10px] text-gray-600">
						<span
							class="h-1.5 w-1.5 rounded-full {a.status === 'approved'
								? 'bg-emerald-500'
								: 'bg-amber-400'}"
						></span>
						<span>{memberNames.get(a.memberId) ?? '?'} — {ABSENCE_LABELS[a.type as AbsenceType]}</span>
					</div>
				{/each}
				{#if !hasContent}
					<p class="text-[10px] text-gray-400">{formatDay(date)} — rien</p>
				{/if}
			</div>
		</button>
	{/each}
</div>
