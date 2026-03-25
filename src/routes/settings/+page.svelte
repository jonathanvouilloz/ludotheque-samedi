<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { identity } from '$lib/stores/identity.svelte';
	import { fetchJson } from '$lib/utils/api';
	import CalendarPlus from 'lucide-svelte/icons/calendar-plus';
	import UserPlus from 'lucide-svelte/icons/user-plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import UserX from 'lucide-svelte/icons/user-x';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import type { Member } from '$lib/server/schema';

	let { data } = $props();

	// Responsable check
	let currentMember = $derived(
		data.members.find((m: Member) => m.id === identity.memberId)
	);
	let isResponsable = $derived(
		currentMember?.label?.toLowerCase().includes('responsable') ?? false
	);

	// Add member form
	let showAddForm = $state(false);
	let newName = $state('');
	let newLabel = $state('');
	let newIsPermanent = $state(false);
	let addError = $state('');
	let addLoading = $state(false);

	// Edit state
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editLabel = $state('');
	let editIsPermanent = $state(false);
	let editLoading = $state(false);

	// Delete state
	let deleteLoading = $state<string | null>(null);

	function changeIdentity() {
		identity.clear();
		goto('/identify');
	}

	async function addMember() {
		if (!newName.trim()) return;
		addLoading = true;
		addError = '';

		const res = await fetchJson<Member>('/api/members', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: newName.trim(),
				label: newLabel.trim() || undefined,
				isPermanent: newIsPermanent
			})
		});

		addLoading = false;
		if (res.ok) {
			newName = '';
			newLabel = '';
			newIsPermanent = false;
			showAddForm = false;
			await invalidateAll();
		} else {
			addError = res.error;
		}
	}

	function startEdit(member: Member) {
		editingId = member.id;
		editName = member.name;
		editLabel = member.label ?? '';
		editIsPermanent = member.isPermanent;
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit() {
		if (!editingId || !editName.trim()) return;
		editLoading = true;

		const res = await fetchJson<Member>(`/api/members/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: editName.trim(),
				label: editLabel.trim(),
				isPermanent: editIsPermanent
			})
		});

		editLoading = false;
		if (res.ok) {
			editingId = null;
			await invalidateAll();
		}
	}

	async function deactivateMember(member: Member, force = false) {
		const url = force
			? `/api/members/${member.id}?force=true`
			: `/api/members/${member.id}`;

		deleteLoading = member.id;
		const res = await fetchJson<{ success?: boolean; futureAssignments?: string[] }>(
			url,
			{ method: 'DELETE' }
		);
		deleteLoading = null;

		if (res.ok) {
			// If the deactivated member is currently identified, clear identity
			if (member.id === identity.memberId) {
				identity.clear();
				goto('/identify');
				return;
			}
			await invalidateAll();
		} else if (!res.ok && res.status === 409) {
			const confirmed = confirm(
				`${member.name} est assigné à des samedis futurs. Désactiver quand même ?`
			);
			if (confirmed) {
				await deactivateMember(member, true);
			}
		}
	}
</script>

<svelte:head>
	<title>Paramètres — LudoTools</title>
</svelte:head>

<h1 class="text-2xl font-bold text-royal">Paramètres</h1>

<!-- Identity section -->
<section class="mt-6">
	<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">Identité</h2>
	<div
		class="mt-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
	>
		<div>
			<p class="text-sm text-gray-500">Connecté en tant que</p>
			<p class="font-semibold text-gray-900">{identity.memberName ?? '—'}</p>
		</div>
		<button
			onclick={changeIdentity}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
		>
			Changer
		</button>
	</div>
</section>

<!-- Season management (responsable only) -->
{#if isResponsable}
	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">
				Saisons
			</h2>
			<a
				href="/settings/season/new"
				class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
			>
				<CalendarPlus size={14} />
				Nouvelle saison
			</a>
		</div>
	</section>
{/if}

<!-- Member management (responsable only) -->
{#if isResponsable}
	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">
				Gestion des membres
			</h2>
			<button
				onclick={() => (showAddForm = !showAddForm)}
				class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
			>
				<UserPlus size={14} />
				Ajouter
			</button>
		</div>

		<!-- Add form -->
		{#if showAddForm}
			<div class="mt-3 rounded-xl border border-royal-200 bg-royal-50 p-4">
				<div class="space-y-3">
					<div>
						<label for="new-name" class="block text-sm font-medium text-gray-700"
							>Nom *</label
						>
						<input
							id="new-name"
							bind:value={newName}
							type="text"
							placeholder="Prénom"
							class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
						/>
					</div>
					<div>
						<label for="new-label" class="block text-sm font-medium text-gray-700"
							>Rôle</label
						>
						<input
							id="new-label"
							bind:value={newLabel}
							type="text"
							placeholder="ex: animateur, responsable"
							class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
						/>
					</div>
					<label class="flex items-center gap-2">
						<input
							bind:checked={newIsPermanent}
							type="checkbox"
							class="h-4 w-4 rounded border-gray-300 text-royal focus:ring-royal"
						/>
						<span class="text-sm text-gray-700">Permanent (présent chaque samedi)</span>
					</label>
					{#if addError}
						<p class="text-sm text-red-600">{addError}</p>
					{/if}
					<div class="flex gap-2">
						<button
							onclick={addMember}
							disabled={addLoading || !newName.trim()}
							class="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-700 disabled:opacity-50"
						>
							{addLoading ? 'Ajout...' : 'Ajouter'}
						</button>
						<button
							onclick={() => (showAddForm = false)}
							class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
						>
							Annuler
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Members list -->
		<div class="mt-3 space-y-2">
			{#each data.members as member}
				<div
					class="rounded-xl border bg-white px-4 py-3 {member.isActive
						? 'border-gray-200'
						: 'border-gray-100 opacity-50'}"
				>
					{#if editingId === member.id}
						<!-- Edit mode -->
						<div class="space-y-2">
							<input
								bind:value={editName}
								type="text"
								class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
							/>
							<input
								bind:value={editLabel}
								type="text"
								placeholder="Rôle"
								class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
							/>
							<label class="flex items-center gap-2">
								<input
									bind:checked={editIsPermanent}
									type="checkbox"
									class="h-4 w-4 rounded border-gray-300 text-royal focus:ring-royal"
								/>
								<span class="text-sm text-gray-700">Permanent</span>
							</label>
							<div class="flex gap-2">
								<button
									onclick={saveEdit}
									disabled={editLoading}
									class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm text-white hover:bg-royal-700"
								>
									<Check size={14} />
									{editLoading ? '...' : 'Sauver'}
								</button>
								<button
									onclick={cancelEdit}
									class="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
								>
									<X size={14} />
									Annuler
								</button>
							</div>
						</div>
					{:else}
						<!-- Display mode -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold {member.isActive
										? 'bg-royal-100 text-royal'
										: 'bg-gray-100 text-gray-400'}"
								>
									{member.name.charAt(0).toUpperCase()}
								</div>
								<div>
									<span class="font-medium text-gray-900">{member.name}</span>
									{#if member.label}
										<span class="ml-1 text-xs text-gray-400">{member.label}</span>
									{/if}
									{#if member.isPermanent}
										<span
											class="ml-1 rounded-full bg-royal-100 px-1.5 py-0.5 text-xs text-royal"
											>Perm.</span
										>
									{/if}
									{#if !member.isActive}
										<span
											class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
											>Inactif</span
										>
									{/if}
								</div>
							</div>
							{#if member.isActive}
								<div class="flex gap-1">
									<button
										onclick={() => startEdit(member)}
										class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
										title="Modifier"
									>
										<Pencil size={16} />
									</button>
									<button
										onclick={() => deactivateMember(member)}
										disabled={deleteLoading === member.id}
										class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
										title="Désactiver"
									>
										<UserX size={16} />
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}
