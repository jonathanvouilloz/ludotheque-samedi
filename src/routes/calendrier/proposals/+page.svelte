<script lang="ts">
	import Plus from 'lucide-svelte/icons/plus';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import { formatDay } from '$lib/utils/dates';
	import type { PageData } from './$types';
	import type { ProposalStatus } from '$lib/server/schema';

	let { data }: { data: PageData } = $props();

	const STATUS_LABELS: Record<ProposalStatus, string> = {
		draft: 'Brouillon',
		sent: 'Envoyée',
		submitted: 'À valider',
		confirmed: 'Confirmée',
		expired: 'Expirée'
	};

	const STATUS_COLORS: Record<ProposalStatus, string> = {
		draft: 'bg-gray-100 text-gray-700 border-gray-200',
		sent: 'bg-blue-100 text-blue-700 border-blue-200',
		submitted: 'bg-amber-100 text-amber-800 border-amber-200',
		confirmed: 'bg-green-100 text-green-700 border-green-200',
		expired: 'bg-red-50 text-red-700 border-red-200'
	};

	const STATUS_ORDER: ProposalStatus[] = ['submitted', 'sent', 'draft', 'confirmed', 'expired'];

	let grouped = $derived.by(() => {
		const map = new Map<ProposalStatus, typeof data.proposals>();
		for (const s of STATUS_ORDER) map.set(s, []);
		for (const p of data.proposals) {
			map.get(p.status as ProposalStatus)?.push(p);
		}
		return STATUS_ORDER.map((s) => ({ status: s, items: map.get(s) ?? [] })).filter(
			(g) => g.items.length > 0
		);
	});
</script>

<svelte:head>
	<title>Propositions — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">Propositions</h1>
	</div>
	<a
		href="/calendrier/proposals/new"
		class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white hover:bg-royal-700"
	>
		<Plus size={14} />
		Nouvelle
	</a>
</div>

<p class="mt-1 text-sm text-gray-500">
	Préparer et envoyer des lots de créneaux aux partenaires.
</p>

<div class="mt-6 space-y-6">
	{#each grouped as group (group.status)}
		<div>
			<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
				{STATUS_LABELS[group.status]} ({group.items.length})
			</h2>
			<div class="mt-2 space-y-2">
				{#each group.items as p (p.id)}
					<a
						href="/calendrier/proposals/{p.id}"
						class="block rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-royal-200 hover:bg-royal-50/40"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-medium text-gray-900">{p.title}</p>
									<span
										class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {STATUS_COLORS[p.status as ProposalStatus]}"
									>
										{STATUS_LABELS[p.status as ProposalStatus]}
									</span>
								</div>
								<p class="mt-1 text-xs text-gray-500">
									{p.schoolName ?? '—'} · Deadline {formatDay(p.deadline)}
								</p>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<p class="py-8 text-center text-sm text-gray-400">Aucune proposition pour le moment</p>
	{/each}
</div>
