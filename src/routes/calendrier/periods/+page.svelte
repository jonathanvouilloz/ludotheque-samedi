<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { SchoolPeriod, SchoolPeriodType } from '$lib/server/schema';
	import { formatDay } from '$lib/utils/dates';

	let { data } = $props();

	const TYPE_LABELS: Record<SchoolPeriodType, string> = {
		vacation: 'Vacances scolaires',
		holiday: 'Jour férié',
		pont: 'Pont',
		special: 'Jour spécial'
	};

	const TYPE_COLORS: Record<SchoolPeriodType, string> = {
		vacation: 'bg-amber-100 text-amber-800 border-amber-200',
		holiday: 'bg-red-100 text-red-800 border-red-200',
		pont: 'bg-purple-100 text-purple-800 border-purple-200',
		special: 'bg-blue-100 text-blue-800 border-blue-200'
	};

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let label = $state('');
	let type = $state<SchoolPeriodType>('vacation');
	let startDate = $state('');
	let endDate = $state('');
	let isBlocking = $state(true);
	let formError = $state('');
	let loading = $state(false);

	let selectedYear = $state<number | 'all'>('all');
	let years = $derived(
		Array.from(new Set(data.periods.map((p) => p.year))).sort((a, b) => b - a)
	);
	let visible = $derived(
		selectedYear === 'all' ? data.periods : data.periods.filter((p) => p.year === selectedYear)
	);

	function resetForm() {
		editingId = null;
		label = '';
		type = 'vacation';
		startDate = '';
		endDate = '';
		isBlocking = true;
		formError = '';
		showForm = false;
	}

	function startEdit(p: SchoolPeriod) {
		editingId = p.id;
		label = p.label;
		type = p.type as SchoolPeriodType;
		startDate = p.startDate;
		endDate = p.endDate;
		isBlocking = p.isBlocking;
		showForm = true;
		formError = '';
	}

	async function save() {
		if (!label.trim() || !startDate || !endDate) {
			formError = 'Label et dates requis';
			return;
		}
		if (startDate > endDate) {
			formError = 'Date de fin avant début';
			return;
		}
		loading = true;
		formError = '';
		const payload = { label: label.trim(), type, startDate, endDate, isBlocking };
		const url = editingId ? `/api/calendar/periods/${editingId}` : '/api/calendar/periods';
		const res = await fetchJson(url, {
			method: editingId ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		loading = false;
		if (res.ok) {
			resetForm();
			await invalidateAll();
		} else {
			formError = res.error;
		}
	}

	async function remove(p: SchoolPeriod) {
		if (!confirm(`Supprimer "${p.label}" ?`)) return;
		const res = await fetchJson(`/api/calendar/periods/${p.id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
		else alert(res.error);
	}
</script>

<svelte:head>
	<title>Périodes scolaires — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">Périodes scolaires</h1>
	</div>
	<button
		onclick={() => (showForm ? resetForm() : (showForm = true))}
		class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
	>
		<Plus size={14} />
		Ajouter
	</button>
</div>

<p class="mt-1 text-sm text-gray-500">
	Vacances scolaires, fériés, ponts, journées spéciales. Les périodes bloquantes empêchent la
	planification d'accueils scolaires.
</p>

{#if showForm}
	<div class="mt-3 rounded-xl border border-royal-200 bg-royal-50 p-4 space-y-3">
		<div>
			<label for="p-label" class="block text-sm font-medium text-gray-700">Label *</label>
			<input
				id="p-label"
				bind:value={label}
				type="text"
				placeholder="ex: Vacances d'octobre"
				class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div>
			<label for="p-type" class="block text-sm font-medium text-gray-700">Type *</label>
			<select
				id="p-type"
				bind:value={type}
				class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				<option value="vacation">Vacances scolaires</option>
				<option value="holiday">Jour férié</option>
				<option value="pont">Pont</option>
				<option value="special">Jour spécial</option>
			</select>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label for="p-start" class="block text-sm font-medium text-gray-700">Début *</label>
				<input
					id="p-start"
					bind:value={startDate}
					type="date"
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="p-end" class="block text-sm font-medium text-gray-700">Fin *</label>
				<input
					id="p-end"
					bind:value={endDate}
					type="date"
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={isBlocking} class="rounded border-gray-300 text-royal focus:ring-royal" />
			<span class="text-gray-700">Bloquer la planification d'accueils scolaires</span>
		</label>
		{#if formError}
			<p class="text-sm text-red-600">{formError}</p>
		{/if}
		<div class="flex gap-2">
			<button
				onclick={save}
				disabled={loading}
				class="rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
			>
				{editingId ? 'Enregistrer' : 'Ajouter'}
			</button>
			<button
				onclick={resetForm}
				class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
			>
				Annuler
			</button>
		</div>
	</div>
{/if}

{#if years.length > 1}
	<div class="mt-4 flex gap-1 overflow-x-auto">
		<button
			onclick={() => (selectedYear = 'all')}
			class="rounded-lg px-3 py-1 text-xs font-medium {selectedYear === 'all' ? 'bg-royal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
		>
			Toutes
		</button>
		{#each years as y}
			<button
				onclick={() => (selectedYear = y)}
				class="rounded-lg px-3 py-1 text-xs font-medium {selectedYear === y ? 'bg-royal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
			>
				{y}
			</button>
		{/each}
	</div>
{/if}

<div class="mt-4 space-y-2">
	{#each visible as period (period.id)}
		{@const typeKey = period.type as SchoolPeriodType}
		<div class="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<p class="font-medium text-gray-900">{period.label}</p>
					<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {TYPE_COLORS[typeKey]}">
						{TYPE_LABELS[typeKey]}
					</span>
					{#if period.isBlocking}
						<span class="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
							Bloquant
						</span>
					{/if}
				</div>
				<p class="mt-1 text-xs text-gray-500">
					{formatDay(period.startDate)} → {formatDay(period.endDate)} ({period.year})
				</p>
			</div>
			<div class="flex shrink-0 gap-1">
				<button
					onclick={() => startEdit(period)}
					class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
				>
					<Pencil size={16} />
				</button>
				<button
					onclick={() => remove(period)}
					class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
				>
					<Trash2 size={16} />
				</button>
			</div>
		</div>
	{:else}
		<p class="py-8 text-center text-sm text-gray-400">Aucune période enregistrée</p>
	{/each}
</div>
