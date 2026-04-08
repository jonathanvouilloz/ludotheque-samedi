<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import { identity } from '$lib/stores/identity.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { AbsenceStatus, AbsenceType } from '$lib/server/schema';
	import { formatDay } from '$lib/utils/dates';

	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const TYPE_LABELS: Record<AbsenceType, string> = {
		vacation: 'Vacances',
		leave: 'Congé',
		training: 'Formation',
		unavailable: 'Indispo'
	};

	const TYPE_COLORS: Record<AbsenceType, string> = {
		vacation: 'bg-sky-100 text-sky-800 border-sky-200',
		leave: 'bg-emerald-100 text-emerald-800 border-emerald-200',
		training: 'bg-purple-100 text-purple-800 border-purple-200',
		unavailable: 'bg-orange-100 text-orange-800 border-orange-200'
	};

	const STATUS_COLORS: Record<AbsenceStatus, string> = {
		pending: 'bg-amber-100 text-amber-800 border-amber-200',
		approved: 'bg-green-100 text-green-800 border-green-200',
		rejected: 'bg-red-100 text-red-800 border-red-200'
	};

	const STATUS_LABELS: Record<AbsenceStatus, string> = {
		pending: 'En attente',
		approved: 'Approuvée',
		rejected: 'Refusée'
	};

	let currentMember = $derived(data.members.find((m) => m.id === identity.memberId));
	let isResponsable = $derived(
		currentMember?.label?.toLowerCase().includes('responsable') ?? false
	);

	let showForm = $state(false);
	let selectedMemberId = $state('');
	let type = $state<AbsenceType>('vacation');
	let startDate = $state('');
	let endDate = $state('');
	let useHours = $state(false);
	let startTime = $state('');
	let endTime = $state('');
	let requestNote = $state('');
	let formError = $state('');
	let loading = $state(false);

	$effect(() => {
		if (showForm && !selectedMemberId && identity.memberId) {
			selectedMemberId = identity.memberId;
		}
	});

	function resetForm() {
		selectedMemberId = identity.memberId ?? '';
		type = 'vacation';
		startDate = '';
		endDate = '';
		useHours = false;
		startTime = '';
		endTime = '';
		requestNote = '';
		formError = '';
		showForm = false;
	}

	async function submit() {
		if (!selectedMemberId || !startDate || !endDate) {
			formError = 'Membre et dates requis';
			return;
		}
		if (startDate > endDate) {
			formError = 'Date de fin avant début';
			return;
		}
		if (useHours && startDate !== endDate) {
			formError = 'Les heures ne sont utilisables que sur un jour unique';
			return;
		}
		loading = true;
		formError = '';
		const res = await fetchJson('/api/calendar/absences', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				memberId: selectedMemberId,
				type,
				startDate,
				endDate,
				startTime: useHours ? startTime : null,
				endTime: useHours ? endTime : null,
				requestNote: requestNote.trim() || null
			})
		});
		loading = false;
		if (res.ok) {
			resetForm();
			await invalidateAll();
		} else {
			formError = res.error;
		}
	}

	async function decide(id: string, status: 'approved' | 'rejected') {
		const res = await fetchJson(`/api/calendar/absences/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status })
		});
		if (res.ok) await invalidateAll();
		else alert(res.error);
	}

	async function remove(id: string) {
		if (!confirm('Supprimer cette absence ?')) return;
		const res = await fetchJson(`/api/calendar/absences/${id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
		else alert(res.error);
	}

	let pending = $derived(data.absences.filter((a) => a.status === 'pending'));
	let decided = $derived(data.absences.filter((a) => a.status !== 'pending'));
</script>

<svelte:head>
	<title>Absences — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">Absences</h1>
	</div>
	<button
		onclick={() => (showForm ? resetForm() : (showForm = true))}
		class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
	>
		<Plus size={14} />
		{isResponsable ? 'Ajouter' : 'Demander'}
	</button>
</div>

{#if showForm}
	<div class="mt-3 rounded-xl border border-royal-200 bg-royal-50 p-4 space-y-3">
		{#if isResponsable}
			<div>
				<label for="a-member" class="block text-sm font-medium text-gray-700">Membre *</label>
				<select
					id="a-member"
					bind:value={selectedMemberId}
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				>
					{#each data.members as m}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			</div>
		{/if}
		<div>
			<label for="a-type" class="block text-sm font-medium text-gray-700">Type *</label>
			<select
				id="a-type"
				bind:value={type}
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				<option value="vacation">Vacances</option>
				<option value="leave">Congé</option>
				<option value="training">Formation</option>
				<option value="unavailable">Indisponibilité</option>
			</select>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label for="a-start" class="block text-sm font-medium text-gray-700">Début *</label>
				<input
					id="a-start"
					bind:value={startDate}
					type="date"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="a-end" class="block text-sm font-medium text-gray-700">Fin *</label>
				<input
					id="a-end"
					bind:value={endDate}
					type="date"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input
				type="checkbox"
				bind:checked={useHours}
				disabled={!startDate || startDate !== endDate}
				class="rounded border-gray-300 text-royal focus:ring-royal disabled:opacity-40"
			/>
			<span class="text-gray-700">Créneau horaire (jour unique)</span>
		</label>
		{#if useHours}
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label for="a-start-time" class="block text-sm font-medium text-gray-700">De</label>
					<input
						id="a-start-time"
						bind:value={startTime}
						type="time"
						class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
					/>
				</div>
				<div>
					<label for="a-end-time" class="block text-sm font-medium text-gray-700">À</label>
					<input
						id="a-end-time"
						bind:value={endTime}
						type="time"
						class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
					/>
				</div>
			</div>
		{/if}
		<div>
			<label for="a-note" class="block text-sm font-medium text-gray-700">Note (optionnel)</label>
			<textarea
				id="a-note"
				bind:value={requestNote}
				rows="2"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			></textarea>
		</div>
		{#if formError}
			<p class="text-sm text-red-600">{formError}</p>
		{/if}
		<div class="flex gap-2">
			<button
				onclick={submit}
				disabled={loading}
				class="rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
			>
				{isResponsable ? 'Enregistrer' : 'Envoyer la demande'}
			</button>
			<button
				onclick={resetForm}
				class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
			>
				Annuler
			</button>
		</div>
	</div>
{/if}

{#if pending.length > 0}
	<h2 class="mt-6 text-sm font-semibold uppercase tracking-wide text-amber-700">
		En attente ({pending.length})
	</h2>
	<div class="mt-2 space-y-2">
		{#each pending as a (a.id)}
			{@const t = a.type as AbsenceType}
			<div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<p class="font-medium text-gray-900">{a.memberName}</p>
							<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {TYPE_COLORS[t]}">
								{TYPE_LABELS[t]}
							</span>
						</div>
						<p class="mt-1 text-xs text-gray-600">
							{formatDay(a.startDate)} → {formatDay(a.endDate)}
							{#if a.startTime && a.endTime}
								· {a.startTime}–{a.endTime}
							{/if}
						</p>
						{#if a.requestNote}
							<p class="mt-1 text-xs italic text-gray-500">"{a.requestNote}"</p>
						{/if}
					</div>
					<div class="flex shrink-0 gap-1">
						{#if isResponsable}
							<button
								onclick={() => decide(a.id, 'approved')}
								class="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-700"
								title="Approuver"
							>
								<Check size={16} />
							</button>
							<button
								onclick={() => decide(a.id, 'rejected')}
								class="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600"
								title="Refuser"
							>
								<X size={16} />
							</button>
						{/if}
						{#if isResponsable || a.requestedBy === identity.memberId}
							<button
								onclick={() => remove(a.id)}
								class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
								title="Supprimer"
							>
								<Trash2 size={16} />
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<h2 class="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
	Historique
</h2>
<div class="mt-2 space-y-2">
	{#each decided as a (a.id)}
		{@const t = a.type as AbsenceType}
		{@const s = a.status as AbsenceStatus}
		<div class="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<p class="font-medium text-gray-900">{a.memberName}</p>
					<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {TYPE_COLORS[t]}">
						{TYPE_LABELS[t]}
					</span>
					<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {STATUS_COLORS[s]}">
						{STATUS_LABELS[s]}
					</span>
				</div>
				<p class="mt-1 text-xs text-gray-600">
					{formatDay(a.startDate)} → {formatDay(a.endDate)}
					{#if a.startTime && a.endTime}
						· {a.startTime}–{a.endTime}
					{/if}
				</p>
				{#if a.requestNote}
					<p class="mt-1 text-xs italic text-gray-500">"{a.requestNote}"</p>
				{/if}
			</div>
			{#if isResponsable}
				<button
					onclick={() => remove(a.id)}
					class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
				>
					<Trash2 size={16} />
				</button>
			{/if}
		</div>
	{:else}
		<p class="py-6 text-center text-sm text-gray-400">Aucune absence</p>
	{/each}
</div>
