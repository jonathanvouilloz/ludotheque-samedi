<script lang="ts">
	import { fetchJson } from '$lib/utils/api';
	import type { EventKind, EventStatus, School } from '$lib/server/schema';
	import type { Conflict } from '$lib/utils/conflicts';
	import { formatDay } from '$lib/utils/dates';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';

	interface Props {
		schools: School[];
		members: { id: string; name: string }[];
		initial?: {
			title?: string;
			kind?: EventKind;
			schoolId?: string | null;
			classLabel?: string | null;
			contactName?: string | null;
			contactEmail?: string | null;
			ageRange?: string | null;
			childCount?: number | null;
			date?: string;
			startTime?: string;
			endTime?: string;
			location?: string | null;
			status?: EventStatus;
			notes?: string | null;
			memberIds?: string[];
		};
		submitLabel?: string;
		excludeEventId?: string;
		allowRecurrence?: boolean;
		lockKind?: boolean;
		onsubmit: (payload: Record<string, unknown>) => Promise<void> | void;
		submitting?: boolean;
		error?: string;
	}

	let {
		schools,
		members,
		initial = {},
		submitLabel = 'Créer',
		excludeEventId,
		allowRecurrence = false,
		lockKind = false,
		onsubmit,
		submitting = false,
		error = ''
	}: Props = $props();

	let title = $state(initial.title ?? '');
	let kind = $state<EventKind>(initial.kind ?? 'accueil');
	let schoolId = $state<string>(initial.schoolId ?? '');
	let classLabel = $state(initial.classLabel ?? '');
	let contactName = $state(initial.contactName ?? '');
	let contactEmail = $state(initial.contactEmail ?? '');
	let ageRange = $state(initial.ageRange ?? '');
	let childCount = $state<string>(initial.childCount?.toString() ?? '');
	let date = $state(initial.date ?? '');
	let startTime = $state(initial.startTime ?? '');
	let endTime = $state(initial.endTime ?? '');
	let location = $state(initial.location ?? '');
	let status = $state<EventStatus>(initial.status ?? 'draft');
	let notes = $state(initial.notes ?? '');
	let memberIds = $state<string[]>(initial.memberIds ?? []);
	let repeat = $state(false);
	let weeks = $state(4);

	let conflictResults = $state<{ date: string; conflicts: Conflict[] }[]>([]);
	let conflictLoading = $state(false);
	let hasBlocking = $derived(
		conflictResults.some((r) => r.conflicts.some((c) => c.severity === 'blocking'))
	);

	function toggleMember(id: string) {
		if (memberIds.includes(id)) {
			memberIds = memberIds.filter((m) => m !== id);
		} else {
			memberIds = [...memberIds, id];
		}
	}

	// Live conflict check
	$effect(() => {
		// Capture dependencies
		const d = date;
		const st = startTime;
		const et = endTime;
		const k = kind;
		const loc = location;
		const mids = memberIds;
		const w = repeat && allowRecurrence ? weeks : 1;
		if (!d || !st || !et || st >= et) {
			conflictResults = [];
			return;
		}
		const payload = {
			date: d,
			startTime: st,
			endTime: et,
			memberIds: mids,
			location: loc || null,
			kind: k,
			excludeEventId,
			weeks: w
		};
		conflictLoading = true;
		fetchJson<{ results: { date: string; conflicts: Conflict[] }[] }>(
			'/api/calendar/events/check-conflicts',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}
		).then((res) => {
			conflictLoading = false;
			if (res.ok) conflictResults = res.data.results;
		});
	});

	async function handleSubmit() {
		const payload: Record<string, unknown> = {
			title: title.trim(),
			kind,
			schoolId: kind === 'accueil' ? schoolId || null : null,
			classLabel: classLabel.trim() || null,
			contactName: contactName.trim() || null,
			contactEmail: contactEmail.trim() || null,
			ageRange: ageRange.trim() || null,
			childCount: childCount ? parseInt(childCount, 10) : null,
			date,
			startTime,
			endTime,
			location: location.trim() || null,
			status,
			notes: notes.trim() || null,
			memberIds
		};
		if (allowRecurrence && repeat && weeks > 1) {
			payload.recurrence = { weeks };
		}
		await onsubmit(payload);
	}
</script>

<div class="space-y-4">
	<div>
		<label for="e-title" class="block text-sm font-medium text-gray-700">Titre *</label>
		<input
			id="e-title"
			bind:value={title}
			type="text"
			placeholder="ex: Accueil classe 5P"
			class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		/>
	</div>

	{#if !lockKind}
		<div>
			<label for="e-kind" class="block text-sm font-medium text-gray-700">Type *</label>
			<select
				id="e-kind"
				bind:value={kind}
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				<option value="accueil">Accueil partenaire</option>
				<option value="internal">Événement interne</option>
			</select>
		</div>
	{/if}

	{#if kind === 'accueil'}
		<div>
			<label for="e-school" class="block text-sm font-medium text-gray-700">Partenaire</label>
			<select
				id="e-school"
				bind:value={schoolId}
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			>
				<option value="">— Aucune / autre —</option>
				{#each schools as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label for="e-class" class="block text-sm font-medium text-gray-700">Classe</label>
				<input
					id="e-class"
					bind:value={classLabel}
					type="text"
					placeholder="ex: 5P-2"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="e-age" class="block text-sm font-medium text-gray-700">Âge moyen</label>
				<input
					id="e-age"
					bind:value={ageRange}
					type="text"
					placeholder="ex: 8-10 ans"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="e-contact" class="block text-sm font-medium text-gray-700">Contact</label>
				<input
					id="e-contact"
					bind:value={contactName}
					type="text"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="e-email" class="block text-sm font-medium text-gray-700">Email</label>
				<input
					id="e-email"
					bind:value={contactEmail}
					type="email"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="e-count" class="block text-sm font-medium text-gray-700">Nb enfants</label>
				<input
					id="e-count"
					bind:value={childCount}
					type="number"
					min="0"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
		</div>
	{/if}

	<div>
		<label for="e-date" class="block text-sm font-medium text-gray-700">Date *</label>
		<input
			id="e-date"
			bind:value={date}
			type="date"
			class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		/>
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div>
			<label for="e-start" class="block text-sm font-medium text-gray-700">Début *</label>
			<input
				id="e-start"
				bind:value={startTime}
				type="time"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div>
			<label for="e-end" class="block text-sm font-medium text-gray-700">Fin *</label>
			<input
				id="e-end"
				bind:value={endTime}
				type="time"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
	</div>

	<div>
		<label for="e-location" class="block text-sm font-medium text-gray-700">Lieu</label>
		<input
			id="e-location"
			bind:value={location}
			type="text"
			placeholder="ex: Ludothèque Pâquis"
			class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		/>
	</div>

	<div>
		<span class="block text-sm font-medium text-gray-700">Membres assignés</span>
		<div class="mt-1 flex flex-wrap gap-1.5">
			{#each members as m}
				{@const selected = memberIds.includes(m.id)}
				<button
					type="button"
					onclick={() => toggleMember(m.id)}
					class="rounded-full px-3 py-1 text-xs font-medium transition-colors {selected
						? 'bg-royal text-white'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					{m.name}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<label for="e-status" class="block text-sm font-medium text-gray-700">Statut</label>
		<select
			id="e-status"
			bind:value={status}
			class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		>
			<option value="draft">Brouillon</option>
			<option value="sent">Envoyé</option>
			<option value="confirmed">Confirmé</option>
		</select>
	</div>

	<div>
		<label for="e-notes" class="block text-sm font-medium text-gray-700">Notes</label>
		<textarea
			id="e-notes"
			bind:value={notes}
			rows="2"
			class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
		></textarea>
	</div>

	{#if allowRecurrence}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					bind:checked={repeat}
					class="rounded border-gray-300 text-royal focus:ring-royal"
				/>
				<span class="font-medium text-gray-700">Répéter chaque semaine</span>
			</label>
			{#if repeat}
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-600">Nombre d'occurrences :</span>
					<input
						type="number"
						bind:value={weeks}
						min="2"
						max="52"
						class="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
					/>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Conflicts -->
	{#if conflictResults.length > 0 && conflictResults.some((r) => r.conflicts.length > 0)}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
			<p class="text-sm font-semibold text-amber-900">Conflits détectés</p>
			{#each conflictResults as result}
				{#if result.conflicts.length > 0}
					<div>
						{#if conflictResults.length > 1}
							<p class="text-xs font-medium text-gray-700">{formatDay(result.date)}</p>
						{/if}
						<ul class="mt-1 space-y-1">
							{#each result.conflicts as c}
								<li
									class="flex items-start gap-2 text-xs {c.severity === 'blocking'
										? 'text-red-700'
										: 'text-amber-800'}"
								>
									{#if c.severity === 'blocking'}
										<ShieldAlert size={14} class="shrink-0 mt-0.5" />
									{:else}
										<AlertTriangle size={14} class="shrink-0 mt-0.5" />
									{/if}
									<span>{c.message}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}

	<div class="flex gap-2">
		<button
			type="button"
			onclick={handleSubmit}
			disabled={submitting || !title.trim() || !date || !startTime || !endTime}
			class="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
		>
			{submitLabel}
		</button>
		{#if hasBlocking}
			<p class="text-xs self-center text-red-600">⚠ Conflits bloquants détectés</p>
		{/if}
	</div>
</div>
