<script lang="ts">
	import type { CalendarFilters } from '$lib/utils/calendar';
	import type { School } from '$lib/server/schema';

	interface Props {
		filters: CalendarFilters;
		members: { id: string; name: string }[];
		schools: School[];
		onreset: () => void;
	}

	let { filters = $bindable(), members, schools, onreset }: Props = $props();

	function toggleMember(id: string) {
		const next = new Set(filters.memberIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		filters.memberIds = next;
	}

	function toggleSchool(id: string) {
		const next = new Set(filters.schoolIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		filters.schoolIds = next;
	}
</script>

<div class="space-y-4 text-sm">
	<div>
		<div class="flex items-center justify-between">
			<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Catégories</h3>
			<button onclick={onreset} class="text-[10px] text-royal hover:underline">Réinitialiser</button>
		</div>
		<div class="mt-2 space-y-1.5">
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={filters.showAccueils}
					class="rounded border-gray-300 text-royal focus:ring-royal"
				/>
				<span class="inline-block h-2 w-2 rounded-full bg-royal"></span>
				<span>Accueils</span>
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={filters.showInternal}
					class="rounded border-gray-300 text-royal focus:ring-royal"
				/>
				<span class="inline-block h-2 w-2 rounded-full bg-purple-500"></span>
				<span>Internes</span>
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={filters.showAbsences}
					class="rounded border-gray-300 text-royal focus:ring-royal"
				/>
				<span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
				<span>Absences</span>
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={filters.showPeriods}
					class="rounded border-gray-300 text-royal focus:ring-royal"
				/>
				<span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
				<span>Périodes scolaires</span>
			</label>
		</div>
	</div>

	<div>
		<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Membres</h3>
		<div class="mt-2 flex flex-wrap gap-1">
			{#each members as m}
				{@const active = filters.memberIds.has(m.id)}
				<button
					type="button"
					onclick={() => toggleMember(m.id)}
					class="rounded-full px-2.5 py-1 text-[11px] font-medium {active
						? 'bg-royal text-white'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					{m.name}
				</button>
			{/each}
		</div>
	</div>

	{#if schools.length > 0}
		<div>
			<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Partenaires</h3>
			<div class="mt-2 flex flex-wrap gap-1">
				{#each schools as s}
					{@const active = filters.schoolIds.has(s.id)}
					<button
						type="button"
						onclick={() => toggleSchool(s.id)}
						class="rounded-full px-2.5 py-1 text-[11px] font-medium {active
							? 'bg-royal text-white'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					>
						{s.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
