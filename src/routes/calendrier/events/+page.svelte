<script lang="ts">
	import Plus from 'lucide-svelte/icons/plus';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Repeat from 'lucide-svelte/icons/repeat';
	import { formatDay } from '$lib/utils/dates';
	import type { PageData } from './$types';
	import type { EventKind, EventStatus } from '$lib/server/schema';

	let { data }: { data: PageData } = $props();

	const KIND_LABELS: Record<EventKind, string> = {
		accueil: 'Accueil',
		internal: 'Interne'
	};

	const STATUS_LABELS: Record<EventStatus, string> = {
		draft: 'Brouillon',
		sent: 'Envoyé',
		confirmed: 'Confirmé'
	};

	const STATUS_COLORS: Record<EventStatus, string> = {
		draft: 'bg-gray-100 text-gray-700 border-gray-200',
		sent: 'bg-blue-100 text-blue-700 border-blue-200',
		confirmed: 'bg-green-100 text-green-700 border-green-200'
	};

	// Group by month
	let grouped = $derived.by(() => {
		const map = new Map<string, typeof data.events>();
		for (const ev of data.events) {
			const key = ev.date.slice(0, 7);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(ev);
		}
		return Array.from(map.entries());
	});
</script>

<svelte:head>
	<title>Événements internes — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">Événements internes</h1>
	</div>
	<a
		href="/calendrier/events/new"
		class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
	>
		<Plus size={14} />
		Créer
	</a>
</div>

<div class="mt-4 space-y-6">
	{#each grouped as [month, list] (month)}
		<div>
			<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
				{new Date(month + '-01T00:00:00Z').toLocaleDateString('fr-FR', {
					month: 'long',
					year: 'numeric',
					timeZone: 'UTC'
				})}
			</h2>
			<div class="mt-2 space-y-2">
				{#each list as ev (ev.id)}
					{@const kind = ev.kind as EventKind}
					{@const status = ev.status as EventStatus}
					<a
						href="/calendrier/events/{ev.id}"
						class="block rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-royal-200 hover:bg-royal-50/40"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-medium text-gray-900">{ev.title}</p>
									<span
										class="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
									>
										{KIND_LABELS[kind]}
									</span>
									<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {STATUS_COLORS[status]}">
										{STATUS_LABELS[status]}
									</span>
									{#if ev.recurrenceGroupId}
										<Repeat size={12} class="text-gray-400" />
									{/if}
								</div>
								<p class="mt-1 text-xs text-gray-600">
									{formatDay(ev.date)} · {ev.startTime}–{ev.endTime}
									{#if ev.schoolName}· {ev.schoolName}{/if}
									{#if ev.location}· {ev.location}{/if}
								</p>
								{#if ev.members.length > 0}
									<p class="mt-1 text-xs text-gray-500">
										{ev.members.map((m) => m.memberName ?? '?').join(', ')}
									</p>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<p class="py-8 text-center text-sm text-gray-400">Aucun événement planifié</p>
	{/each}
</div>
