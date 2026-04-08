<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { fetchJson } from '$lib/utils/api';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Copy from 'lucide-svelte/icons/copy';
	import Check from 'lucide-svelte/icons/check';
	import Send from 'lucide-svelte/icons/send';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ShieldCheck from 'lucide-svelte/icons/shield-check';
	import { formatDay, formatSamedi } from '$lib/utils/dates';
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

	let copied = $state(false);
	let publicUrl = $derived(`${$page.url.origin}/p/${data.proposal.token}`);
	let status = $derived(data.proposal.status as ProposalStatus);
	let deleteDeclined = $state(true);
	let loading = $state('');

	async function copyLink() {
		await navigator.clipboard.writeText(publicUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function send() {
		loading = 'send';
		const res = await fetchJson(`/api/calendar/proposals/${data.proposal.id}/send`, {
			method: 'POST'
		});
		loading = '';
		if (res.ok) await invalidateAll();
		else alert(res.error);
	}

	async function confirmProposal() {
		if (!confirm('Confirmer la proposition ? Les créneaux non-déclinés deviendront définitifs.')) return;
		loading = 'confirm';
		const res = await fetchJson(`/api/calendar/proposals/${data.proposal.id}/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ deleteDeclined })
		});
		loading = '';
		if (res.ok) await invalidateAll();
		else alert(res.error);
	}

	async function reopenDraft() {
		loading = 'reopen';
		const res = await fetchJson(`/api/calendar/proposals/${data.proposal.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'draft' })
		});
		loading = '';
		if (res.ok) await invalidateAll();
	}

	async function remove() {
		if (!confirm('Supprimer définitivement cette proposition et tous ses créneaux ?')) return;
		const res = await fetchJson(`/api/calendar/proposals/${data.proposal.id}`, {
			method: 'DELETE'
		});
		if (res.ok) await goto('/calendrier/proposals');
		else alert(res.error);
	}

	let filledCount = $derived(
		data.events.filter((e) => !e.declined && (e.classLabel || e.contactName || e.contactEmail))
			.length
	);
	let declinedCount = $derived(data.events.filter((e) => e.declined).length);
</script>

<svelte:head>
	<title>{data.proposal.title} — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier/proposals" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">{data.proposal.title}</h1>
	</div>
	<span
		class="rounded-md border px-2 py-1 text-xs font-medium {STATUS_COLORS[status]}"
	>
		{STATUS_LABELS[status]}
	</span>
</div>

<p class="mt-1 text-sm text-gray-500">
	{data.proposal.schoolName ?? '—'} · Deadline {formatDay(data.proposal.deadline)}
</p>

{#if data.proposal.message}
	<p class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm italic text-gray-600">
		{data.proposal.message}
	</p>
{/if}

<!-- Actions bar -->
<div class="mt-4 rounded-xl border border-gray-200 bg-white p-3">
	{#if status === 'draft'}
		<div class="flex flex-wrap gap-2">
			<button
				onclick={send}
				disabled={loading === 'send'}
				class="flex items-center gap-1.5 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
			>
				<Send size={14} /> Activer le lien
			</button>
			<button
				onclick={remove}
				class="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
			>
				<Trash2 size={14} /> Supprimer
			</button>
		</div>
	{:else if status === 'sent' || status === 'submitted'}
		<div class="space-y-3">
			<div class="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
				<input
					value={publicUrl}
					readonly
					class="min-w-0 flex-1 bg-transparent px-2 text-xs text-gray-700 outline-none"
				/>
				<button
					onclick={copyLink}
					class="flex items-center gap-1 rounded-lg bg-royal px-2.5 py-1 text-xs font-medium text-white hover:bg-royal-700"
				>
					{#if copied}
						<Check size={12} /> Copié
					{:else}
						<Copy size={12} /> Copier le lien
					{/if}
				</button>
			</div>
			{#if status === 'submitted'}
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
					<p class="text-sm font-medium text-amber-900">
						Le partenaire a soumis sa réponse ({filledCount} rempli·s, {declinedCount} décliné·s)
					</p>
					<label class="mt-2 flex items-center gap-2 text-xs text-amber-800">
						<input
							type="checkbox"
							bind:checked={deleteDeclined}
							class="rounded border-amber-300 text-royal focus:ring-royal"
						/>
						Supprimer les créneaux déclinés lors de la confirmation
					</label>
					<button
						onclick={confirmProposal}
						disabled={loading === 'confirm'}
						class="mt-2 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
					>
						<ShieldCheck size={14} /> Confirmer la proposition
					</button>
				</div>
			{/if}
			<div class="flex flex-wrap gap-2">
				<button
					onclick={reopenDraft}
					class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
				>
					Repasser en brouillon
				</button>
				<button
					onclick={remove}
					class="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
				>
					<Trash2 size={12} /> Supprimer
				</button>
			</div>
		</div>
	{:else if status === 'confirmed'}
		<p class="text-sm text-green-700">
			Proposition confirmée. Les créneaux sont dans le calendrier normal.
		</p>
	{:else if status === 'expired'}
		<div class="space-y-2">
			<p class="text-sm text-red-700">
				Deadline dépassée. Modifier la deadline pour réactiver le lien.
			</p>
			<button
				onclick={reopenDraft}
				class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
			>
				Repasser en brouillon
			</button>
		</div>
	{/if}
</div>

<!-- Slots list -->
<h2 class="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
	Créneaux ({data.events.length})
</h2>
<div class="mt-2 space-y-2">
	{#each data.events as ev (ev.id)}
		<div class="rounded-xl border border-gray-200 bg-white p-3 {ev.declined ? 'opacity-50' : ''}">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-medium text-gray-900">{formatSamedi(ev.date)}</p>
						<span class="text-xs text-gray-500">{ev.startTime}–{ev.endTime}</span>
						{#if ev.location}<span class="text-xs text-gray-500">· {ev.location}</span>{/if}
						{#if ev.declined}
							<span class="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
								Décliné
							</span>
						{/if}
					</div>
					{#if ev.members.length > 0}
						<p class="mt-1 text-xs text-gray-500">
							Animé par : {ev.members.map((m) => m.memberName ?? '?').join(', ')}
						</p>
					{/if}
					{#if ev.classLabel || ev.contactName || ev.contactEmail || ev.ageRange || ev.childCount}
						<div class="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700 space-y-0.5">
							{#if ev.classLabel}<p><span class="text-gray-500">Classe :</span> {ev.classLabel}</p>{/if}
							{#if ev.contactName}<p><span class="text-gray-500">Contact :</span> {ev.contactName}{#if ev.contactEmail} · {ev.contactEmail}{/if}</p>{/if}
							{#if ev.ageRange}<p><span class="text-gray-500">Âge :</span> {ev.ageRange}</p>{/if}
							{#if ev.childCount}<p><span class="text-gray-500">Enfants :</span> {ev.childCount}</p>{/if}
							{#if ev.notes}<p class="italic">{ev.notes}</p>{/if}
						</div>
					{:else if status !== 'draft' && !ev.declined}
						<p class="mt-2 text-xs italic text-gray-400">En attente de saisie par le partenaire</p>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>
