<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import EventForm from '$lib/components/calendar/EventForm.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Repeat from 'lucide-svelte/icons/repeat';
	import type { PageData } from './$types';
	import type { EventKind, EventStatus } from '$lib/server/schema';

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);
	let error = $state('');
	let scope = $state<'one' | 'series'>('one');

	let isRecurring = $derived(!!data.event.recurrenceGroupId);

	async function save(payload: Record<string, unknown>) {
		submitting = true;
		error = '';
		const res = await fetchJson(`/api/calendar/events/${data.event.id}?scope=${scope}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		submitting = false;
		if (res.ok) {
			await invalidateAll();
			await goto('/calendrier/events');
		} else {
			error = res.error;
		}
	}

	async function remove() {
		const label = scope === 'series' ? 'toute la série' : 'cette occurrence';
		if (!confirm(`Supprimer ${label} ?`)) return;
		const res = await fetchJson(`/api/calendar/events/${data.event.id}?scope=${scope}`, {
			method: 'DELETE'
		});
		if (res.ok) await goto('/calendrier/events');
		else alert(res.error);
	}
</script>

<svelte:head>
	<title>{data.event.title} — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier/events" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">Éditer</h1>
	</div>
	<button
		onclick={remove}
		class="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
	>
		<Trash2 size={14} />
		Supprimer
	</button>
</div>

{#if isRecurring}
	<div class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
		<div class="flex items-center gap-2 text-sm text-blue-900">
			<Repeat size={14} />
			<span class="font-medium">Événement récurrent</span>
		</div>
		<div class="mt-2 flex gap-2 text-xs">
			<label class="flex items-center gap-1">
				<input type="radio" bind:group={scope} value="one" class="text-royal focus:ring-royal" />
				<span>Cette occurrence seulement</span>
			</label>
			<label class="flex items-center gap-1">
				<input type="radio" bind:group={scope} value="series" class="text-royal focus:ring-royal" />
				<span>Toute la série</span>
			</label>
		</div>
	</div>
{/if}

<div class="mt-4">
	<EventForm
		schools={data.schools}
		members={data.members}
		initial={{
			title: data.event.title,
			kind: data.event.kind as EventKind,
			schoolId: data.event.schoolId,
			classLabel: data.event.classLabel,
			contactName: data.event.contactName,
			contactEmail: data.event.contactEmail,
			ageRange: data.event.ageRange,
			childCount: data.event.childCount,
			date: data.event.date,
			startTime: data.event.startTime,
			endTime: data.event.endTime,
			location: data.event.location,
			status: data.event.status as EventStatus,
			notes: data.event.notes,
			memberIds: data.memberIds
		}}
		submitLabel="Enregistrer"
		excludeEventId={data.event.id}
		onsubmit={save}
		{submitting}
		{error}
	/>
</div>
