<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fetchJson } from '$lib/utils/api';
	import EventForm from '$lib/components/calendar/EventForm.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let prefillDate = $derived($page.url.searchParams.get('date') ?? '');

	let submitting = $state(false);
	let error = $state('');

	async function create(payload: Record<string, unknown>) {
		submitting = true;
		error = '';
		const res = await fetchJson<{ success: boolean; ids: string[] }>('/api/calendar/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		submitting = false;
		if (res.ok) {
			await goto('/calendrier/events');
		} else {
			error = res.error;
		}
	}
</script>

<svelte:head>
	<title>Nouvel événement — LudoTools</title>
</svelte:head>

<div class="flex items-center gap-2">
	<a href="/calendrier/events" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
	<h1 class="text-2xl font-bold text-royal">Nouvel événement</h1>
</div>

<div class="mt-4">
	<EventForm
		schools={data.schools}
		members={data.members}
		initial={{ date: prefillDate }}
		submitLabel="Créer"
		allowRecurrence={true}
		onsubmit={create}
		{submitting}
		{error}
	/>
</div>
