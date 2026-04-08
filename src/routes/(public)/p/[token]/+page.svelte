<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Check from 'lucide-svelte/icons/check';
	import Send from 'lucide-svelte/icons/send';
	import { formatSamedi, formatDay } from '$lib/utils/dates';
	import type { PageData } from './$types';
	import type { ProposalStatus } from '$lib/server/schema';

	let { data }: { data: PageData } = $props();

	let status = $derived(data.proposal.status as ProposalStatus);
	let isEditable = $derived(status === 'sent' || status === 'submitted');
	let isConfirmed = $derived(status === 'confirmed');
	let isExpired = $derived(status === 'expired');

	// Local editing state mirrored from server
	interface LocalSlot {
		id: string;
		date: string;
		startTime: string;
		endTime: string;
		location: string | null;
		memberNames: string[];
		classLabel: string;
		contactName: string;
		contactEmail: string;
		ageRange: string;
		childCount: string;
		notes: string;
		declined: boolean;
		saving: boolean;
		savedAt: number;
	}

	let localSlots = $state<LocalSlot[]>(
		data.events.map((e) => ({
			id: e.id,
			date: e.date,
			startTime: e.startTime,
			endTime: e.endTime,
			location: e.location,
			memberNames: e.memberNames,
			classLabel: e.classLabel ?? '',
			contactName: e.contactName ?? '',
			contactEmail: e.contactEmail ?? '',
			ageRange: e.ageRange ?? '',
			childCount: e.childCount?.toString() ?? '',
			notes: e.notes ?? '',
			declined: e.declined,
			saving: false,
			savedAt: 0
		}))
	);

	let submitted = $state(status === 'submitted');
	let submitting = $state(false);

	async function saveField(slot: LocalSlot, field: string) {
		if (!isEditable) return;
		slot.saving = true;
		const payload: Record<string, unknown> = { eventId: slot.id };
		if (field === 'classLabel') payload.classLabel = slot.classLabel;
		if (field === 'contactName') payload.contactName = slot.contactName;
		if (field === 'contactEmail') payload.contactEmail = slot.contactEmail;
		if (field === 'ageRange') payload.ageRange = slot.ageRange;
		if (field === 'childCount')
			payload.childCount = slot.childCount ? parseInt(slot.childCount, 10) : null;
		if (field === 'notes') payload.notes = slot.notes;
		if (field === 'declined') payload.declined = slot.declined;

		try {
			const res = await fetch(`/api/calendar/proposals/public/${data.proposal.token}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				slot.savedAt = Date.now();
			}
		} catch {}
		slot.saving = false;
	}

	async function toggleDeclined(slot: LocalSlot) {
		slot.declined = !slot.declined;
		await saveField(slot, 'declined');
	}

	async function submit() {
		if (!confirm('Soumettre vos réponses ? Vous pourrez encore les modifier tant que la responsable n\'a pas confirmé.')) return;
		submitting = true;
		const res = await fetch(`/api/calendar/proposals/public/${data.proposal.token}/submit`, {
			method: 'POST'
		});
		submitting = false;
		if (res.ok) {
			submitted = true;
			await invalidateAll();
		} else {
			alert('Erreur lors de la soumission');
		}
	}
</script>

<svelte:head>
	<title>{data.proposal.title} — LudoTools</title>
</svelte:head>

<div class="min-h-dvh bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
			<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-royal text-sm font-bold text-white">
				L
			</div>
			<div>
				<p class="text-base font-bold text-gray-900">LudoTools</p>
				<p class="text-[11px] text-gray-500">Ludothèque Pâquis-Sécheron</p>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-6">
		<h1 class="text-xl font-bold text-royal sm:text-2xl">{data.proposal.title}</h1>
		<p class="mt-1 text-sm text-gray-600">
			Destinataire : <span class="font-medium">{data.proposal.schoolName}</span>
		</p>
		<p class="mt-0.5 text-sm text-gray-600">
			Réponse attendue avant le <span class="font-medium">{formatDay(data.proposal.deadline)}</span>
		</p>

		{#if data.proposal.message}
			<p class="mt-4 rounded-lg border border-royal-200 bg-royal-50 p-4 text-sm italic text-gray-700 whitespace-pre-line">
				{data.proposal.message}
			</p>
		{/if}

		{#if isConfirmed}
			<div class="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
				<p class="font-semibold">✓ Proposition confirmée</p>
				<p class="mt-1">Merci pour votre retour. Les créneaux sont désormais définitifs.</p>
			</div>
		{:else if isExpired}
			<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
				<p class="font-semibold">Proposition expirée</p>
				<p class="mt-1">La date limite de réponse est dépassée. Contactez la ludothèque pour rouvrir la proposition si nécessaire.</p>
			</div>
		{:else if submitted}
			<div class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
				<p class="font-semibold">Réponses soumises</p>
				<p class="mt-1">
					La responsable va valider votre proposition. Vous pouvez encore modifier vos réponses tant qu'elle n'a pas confirmé.
				</p>
			</div>
		{/if}

		<div class="mt-6 space-y-4">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">
				Créneaux proposés ({localSlots.length})
			</h2>
			{#each localSlots as slot (slot.id)}
				<div
					class="rounded-xl border border-gray-200 bg-white p-4 {slot.declined ? 'opacity-60' : ''}"
				>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="font-semibold text-gray-900">{formatSamedi(slot.date)}</p>
							<p class="text-sm text-gray-600">
								{slot.startTime}–{slot.endTime}
								{#if slot.location}· {slot.location}{/if}
							</p>
							{#if slot.memberNames.length > 0}
								<p class="mt-0.5 text-xs text-gray-500">
									Animé par {slot.memberNames.join(', ')}
								</p>
							{/if}
						</div>
						{#if isEditable}
							<button
								type="button"
								onclick={() => toggleDeclined(slot)}
								class="rounded-lg border px-2.5 py-1 text-xs font-medium {slot.declined
									? 'border-red-300 bg-red-50 text-red-700'
									: 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}"
							>
								{slot.declined ? 'Décliné ✕' : 'Non intéressée'}
							</button>
						{/if}
					</div>

					{#if !slot.declined}
						<div class="mt-4 grid gap-3 sm:grid-cols-2">
							<div>
								<label for="class-{slot.id}" class="block text-xs font-medium text-gray-700">Classe</label>
								<input
									id="class-{slot.id}"
									bind:value={slot.classLabel}
									onblur={() => saveField(slot, 'classLabel')}
									disabled={!isEditable}
									type="text"
									placeholder="ex: 5P-2"
									class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none disabled:bg-gray-50"
								/>
							</div>
							<div>
								<label for="age-{slot.id}" class="block text-xs font-medium text-gray-700">Âge moyen</label>
								<input
									id="age-{slot.id}"
									bind:value={slot.ageRange}
									onblur={() => saveField(slot, 'ageRange')}
									disabled={!isEditable}
									type="text"
									placeholder="ex: 8-10 ans"
									class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none disabled:bg-gray-50"
								/>
							</div>
							<div>
								<label for="contact-{slot.id}" class="block text-xs font-medium text-gray-700">Contact enseignant·e</label>
								<input
									id="contact-{slot.id}"
									bind:value={slot.contactName}
									onblur={() => saveField(slot, 'contactName')}
									disabled={!isEditable}
									type="text"
									class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none disabled:bg-gray-50"
								/>
							</div>
							<div>
								<label for="email-{slot.id}" class="block text-xs font-medium text-gray-700">Email</label>
								<input
									id="email-{slot.id}"
									bind:value={slot.contactEmail}
									onblur={() => saveField(slot, 'contactEmail')}
									disabled={!isEditable}
									type="email"
									class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none disabled:bg-gray-50"
								/>
							</div>
							<div>
								<label for="count-{slot.id}" class="block text-xs font-medium text-gray-700">Nb enfants</label>
								<input
									id="count-{slot.id}"
									bind:value={slot.childCount}
									onblur={() => saveField(slot, 'childCount')}
									disabled={!isEditable}
									type="number"
									min="0"
									class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none disabled:bg-gray-50"
								/>
							</div>
							<div class="sm:col-span-2">
								<label for="notes-{slot.id}" class="block text-xs font-medium text-gray-700">Notes</label>
								<textarea
									id="notes-{slot.id}"
									bind:value={slot.notes}
									onblur={() => saveField(slot, 'notes')}
									disabled={!isEditable}
									rows="2"
									class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none disabled:bg-gray-50"
								></textarea>
							</div>
						</div>
						{#if slot.savedAt > 0}
							<p class="mt-2 flex items-center gap-1 text-[10px] text-green-600">
								<Check size={10} /> Enregistré
							</p>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		{#if isEditable && !submitted}
			<div class="mt-6 flex justify-end">
				<button
					type="button"
					onclick={submit}
					disabled={submitting}
					class="flex items-center gap-2 rounded-lg bg-royal px-4 py-2.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
				>
					<Send size={16} />
					Soumettre la réponse
				</button>
			</div>
		{/if}
	</main>
</div>
