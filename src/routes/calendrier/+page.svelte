<script lang="ts">
	import { goto } from '$app/navigation';
	import MonthGrid from '$lib/components/calendar/MonthGrid.svelte';
	import AgendaList from '$lib/components/calendar/AgendaList.svelte';
	import CalendarFilters from '$lib/components/calendar/CalendarFilters.svelte';
	import DayDetailDialog from '$lib/components/calendar/DayDetailDialog.svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import SlidersHorizontal from 'lucide-svelte/icons/sliders-horizontal';
	import Send from 'lucide-svelte/icons/send';
	import School from 'lucide-svelte/icons/school';
	import CalendarX from 'lucide-svelte/icons/calendar-x';
	import CalendarClock from 'lucide-svelte/icons/calendar-clock';
	import CalendarDays from 'lucide-svelte/icons/calendar-days';
	import X from 'lucide-svelte/icons/x';
	import { formatMonth, today } from '$lib/utils/dates';
	import {
		buildDayMap,
		buildMonthGrid,
		emptyFilters,
		nextMonth,
		prevMonth
	} from '$lib/utils/calendar';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let filters = $state(emptyFilters());

	let gridDates = $derived(buildMonthGrid(data.month));
	let dayMap = $derived(
		buildDayMap(
			gridDates,
			{
				events: data.events,
				assignments: data.assignments,
				absences: data.absences,
				periods: data.periods,
				saturdays: data.saturdays
			},
			filters
		)
	);

	let memberNames = $derived(new Map(data.members.map((m) => [m.id, m.name])));
	let schoolNames = $derived(new Map(data.schools.map((s) => [s.id, s.name])));

	let selectedDate = $state<string | null>(null);
	let dialogOpen = $state(false);

	function openDay(date: string) {
		selectedDate = date;
		dialogOpen = true;
	}

	function closeDay() {
		dialogOpen = false;
		selectedDate = null;
	}

	function navMonth(newMonth: string) {
		goto(`/calendrier?month=${newMonth}`, { noScroll: true, keepFocus: true });
	}

	function goToday() {
		navMonth(today().slice(0, 7));
	}

	let showMobileFilters = $state(false);
</script>

<svelte:head>
	<title>Calendrier — LudoTools</title>
</svelte:head>

<div class="flex flex-col gap-6 lg:h-[calc(100dvh-3rem)] lg:flex-row lg:items-stretch lg:gap-6">
	<!-- Main content -->
	<div class="min-w-0 flex-1 lg:flex lg:min-h-0 lg:flex-col">
		<div class="flex items-center justify-between gap-3 lg:shrink-0">
			<h1 class="text-xl font-bold text-royal lg:text-2xl">
				{formatMonth(data.month + '-01')}
			</h1>
			<div class="flex items-center gap-1.5">
				<button
					onclick={() => navMonth(prevMonth(data.month))}
					class="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
					aria-label="Mois précédent"
				>
					<ChevronLeft size={18} />
				</button>
				<button
					onclick={goToday}
					class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Aujourd'hui
				</button>
				<button
					onclick={() => navMonth(nextMonth(data.month))}
					class="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
					aria-label="Mois suivant"
				>
					<ChevronRight size={18} />
				</button>
				<button
					onclick={() => (showMobileFilters = true)}
					class="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 lg:hidden"
					aria-label="Filtres"
				>
					<SlidersHorizontal size={18} />
				</button>
			</div>
		</div>

		<!-- Sub-pages quick access -->
		<div class="mt-2 flex flex-wrap gap-2 lg:shrink-0">
			<a
				href="/calendrier/events"
				class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-royal-200 hover:text-royal"
			>
				<CalendarDays size={14} /> Événements
			</a>
			<a
				href="/calendrier/proposals"
				class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-royal-200 hover:text-royal"
			>
				<Send size={14} /> Propositions
			</a>
			<a
				href="/calendrier/absences"
				class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-royal-200 hover:text-royal"
			>
				<CalendarClock size={14} /> Absences
			</a>
			<a
				href="/calendrier/periods"
				class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-royal-200 hover:text-royal"
			>
				<CalendarX size={14} /> Périodes
			</a>
			<a
				href="/calendrier/schools"
				class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-royal-200 hover:text-royal"
			>
				<School size={14} /> Écoles
			</a>
		</div>

		<!-- Desktop grid -->
		<div class="mt-3 hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
			<MonthGrid month={data.month} dates={gridDates} {dayMap} onDayClick={openDay} />
		</div>

		<!-- Mobile agenda -->
		<div class="mt-4 lg:hidden">
			<AgendaList
				month={data.month}
				dates={gridDates}
				{dayMap}
				{memberNames}
				onDayClick={openDay}
			/>
		</div>
	</div>

	<!-- Desktop sidebar filters -->
	<aside
		class="hidden w-72 shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 lg:block"
	>
		<CalendarFilters bind:filters members={data.members} schools={data.schools} onreset={() => (filters = emptyFilters())} />
	</aside>
</div>

<!-- Mobile filter sheet -->
{#if showMobileFilters}
	<div
		class="fixed inset-0 z-50 flex items-end lg:hidden"
		role="dialog"
		aria-modal="true"
	>
		<button
			type="button"
			onclick={() => (showMobileFilters = false)}
			class="absolute inset-0 bg-black/40"
			aria-label="Fermer"
		></button>
		<div class="relative w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold text-gray-900">Filtres</h2>
				<button
					onclick={() => (showMobileFilters = false)}
					class="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
					aria-label="Fermer"
				>
					<X size={18} />
				</button>
			</div>
			<CalendarFilters
				bind:filters
				members={data.members}
				schools={data.schools}
				onreset={() => (filters = emptyFilters())}
			/>
		</div>
	</div>
{/if}

<DayDetailDialog
	date={selectedDate}
	entries={selectedDate ? dayMap.get(selectedDate) ?? null : null}
	{memberNames}
	{schoolNames}
	open={dialogOpen}
	onclose={closeDay}
/>
