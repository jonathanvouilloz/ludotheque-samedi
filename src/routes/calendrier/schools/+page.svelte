<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { School } from '$lib/server/schema';

	let { data } = $props();

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let name = $state('');
	let address = $state('');
	let contactName = $state('');
	let contactEmail = $state('');
	let phone = $state('');
	let notes = $state('');
	let formError = $state('');
	let loading = $state(false);

	function resetForm() {
		editingId = null;
		name = '';
		address = '';
		contactName = '';
		contactEmail = '';
		phone = '';
		notes = '';
		formError = '';
		showForm = false;
	}

	function startEdit(s: School) {
		editingId = s.id;
		name = s.name;
		address = s.address ?? '';
		contactName = s.contactName ?? '';
		contactEmail = s.contactEmail ?? '';
		phone = s.phone ?? '';
		notes = s.notes ?? '';
		showForm = true;
		formError = '';
	}

	async function save() {
		if (!name.trim()) {
			formError = 'Nom requis';
			return;
		}
		loading = true;
		formError = '';
		const payload = {
			name: name.trim(),
			address: address.trim() || null,
			contactName: contactName.trim() || null,
			contactEmail: contactEmail.trim() || null,
			phone: phone.trim() || null,
			notes: notes.trim() || null
		};
		const url = editingId ? `/api/calendar/schools/${editingId}` : '/api/calendar/schools';
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

	async function remove(s: School) {
		if (!confirm(`Supprimer le partenaire "${s.name}" ?`)) return;
		const res = await fetchJson(`/api/calendar/schools/${s.id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
		else alert(res.error);
	}
</script>

<svelte:head>
	<title>Partenaires — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<a href="/calendrier" class="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></a>
		<h1 class="text-2xl font-bold text-royal">Partenaires</h1>
	</div>
	<button
		onclick={() => (showForm ? resetForm() : (showForm = true))}
		class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
	>
		<Plus size={14} />
		Ajouter
	</button>
</div>

{#if showForm}
	<div class="mt-3 rounded-xl border border-royal-200 bg-royal-50 p-4 space-y-3">
		<div>
			<label for="s-name" class="block text-sm font-medium text-gray-700">Nom *</label>
			<input
				id="s-name"
				bind:value={name}
				type="text"
				placeholder="ex: École des Pâquis, foyer, MJC…"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div>
			<label for="s-address" class="block text-sm font-medium text-gray-700">Adresse</label>
			<input
				id="s-address"
				bind:value={address}
				type="text"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label for="s-contact-name" class="block text-sm font-medium text-gray-700">Contact</label>
				<input
					id="s-contact-name"
					bind:value={contactName}
					type="text"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="s-contact-email" class="block text-sm font-medium text-gray-700">Email</label>
				<input
					id="s-contact-email"
					bind:value={contactEmail}
					type="email"
					class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
		</div>
		<div>
			<label for="s-phone" class="block text-sm font-medium text-gray-700">Téléphone</label>
			<input
				id="s-phone"
				bind:value={phone}
				type="tel"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			/>
		</div>
		<div>
			<label for="s-notes" class="block text-sm font-medium text-gray-700">Notes</label>
			<textarea
				id="s-notes"
				bind:value={notes}
				rows="2"
				class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
			></textarea>
		</div>
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
				class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
			>
				Annuler
			</button>
		</div>
	</div>
{/if}

<div class="mt-4 space-y-2">
	{#each data.schools as school (school.id)}
		<div class="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
			<div class="min-w-0 flex-1">
				<p class="font-medium text-gray-900">{school.name}</p>
				{#if school.address}
					<p class="text-xs text-gray-500">{school.address}</p>
				{/if}
				{#if school.contactName || school.contactEmail}
					<p class="mt-1 text-xs text-gray-600">
						{school.contactName ?? ''}{school.contactName && school.contactEmail ? ' · ' : ''}{school.contactEmail ?? ''}
					</p>
				{/if}
				{#if school.phone}
					<p class="text-xs text-gray-500">{school.phone}</p>
				{/if}
				{#if school.notes}
					<p class="mt-1 text-xs italic text-gray-500">{school.notes}</p>
				{/if}
			</div>
			<div class="flex shrink-0 gap-1">
				<button
					onclick={() => startEdit(school)}
					class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
					title="Modifier"
				>
					<Pencil size={16} />
				</button>
				<button
					onclick={() => remove(school)}
					class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
					title="Supprimer"
				>
					<Trash2 size={16} />
				</button>
			</div>
		</div>
	{:else}
		<p class="py-8 text-center text-sm text-gray-400">Aucun partenaire enregistré</p>
	{/each}
</div>
