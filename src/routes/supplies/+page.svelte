<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import WishlistItem from '$lib/components/ui/WishlistItem.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Package from 'lucide-svelte/icons/package';

	let { data } = $props();

	let showForm = $state(false);
	let name = $state('');
	let link = $state('');
	let price = $state('');
	let category = $state('autre');
	let urgency = $state('normal');
	let addError = $state('');
	let addLoading = $state(false);
	let toggleLoading = $state<string | null>(null);

	let unpurchased = $derived(data.supplies.filter((s) => !s.isPurchased));
	let purchased = $derived(data.supplies.filter((s) => s.isPurchased));
	let showHistory = $state(false);

	const categories = [
		{ value: 'ménage', label: 'Ménage' },
		{ value: 'bureau', label: 'Bureau' },
		{ value: 'animation', label: 'Animation' },
		{ value: 'autre', label: 'Autre' }
	];

	async function addSupply() {
		if (!name.trim()) return;
		addLoading = true;
		addError = '';

		const res = await fetchJson('/api/supplies', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: name.trim(),
				link: link.trim() || undefined,
				price: price ? parseFloat(price) : undefined,
				category,
				urgency
			})
		});

		addLoading = false;
		if (res.ok) {
			name = '';
			link = '';
			price = '';
			category = 'autre';
			urgency = 'normal';
			showForm = false;
			await invalidateAll();
		} else {
			addError = res.error;
		}
	}

	async function togglePurchased(supplyId: string, isPurchased: boolean) {
		toggleLoading = supplyId;
		await fetchJson(`/api/supplies/${supplyId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isPurchased })
		});
		toggleLoading = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Matériel — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold text-royal">Matériel & Fournitures</h1>
	<button
		onclick={() => (showForm = !showForm)}
		class="flex items-center gap-1 rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-royal-700"
	>
		<Plus size={14} />
		Ajouter
	</button>
</div>

{#if showForm}
	<div class="mt-3 rounded-xl border border-royal-200 bg-royal-50 p-4">
		<div class="space-y-3">
			<div>
				<label for="supply-name" class="block text-sm font-medium text-gray-700">Article *</label>
				<input
					id="supply-name"
					bind:value={name}
					type="text"
					placeholder="ex: Papier ménage"
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="supply-category" class="block text-sm font-medium text-gray-700">Catégorie</label>
					<select
						id="supply-category"
						bind:value={category}
						class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
					>
						{#each categories as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="supply-urgency" class="block text-sm font-medium text-gray-700">Urgence</label>
					<select
						id="supply-urgency"
						bind:value={urgency}
						class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
					>
						<option value="normal">Normal</option>
						<option value="urgent">Urgent</option>
					</select>
				</div>
			</div>
			<div>
				<label for="supply-link" class="block text-sm font-medium text-gray-700">Lien (optionnel)</label>
				<input
					id="supply-link"
					bind:value={link}
					type="url"
					placeholder="https://..."
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="supply-price" class="block text-sm font-medium text-gray-700">Prix estimé CHF (optionnel)</label>
				<input
					id="supply-price"
					bind:value={price}
					type="number"
					step="0.05"
					min="0"
					placeholder="12.50"
					class="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			{#if addError}
				<p class="text-sm text-red-600">{addError}</p>
			{/if}
			<div class="flex gap-2">
				<button
					onclick={addSupply}
					disabled={addLoading || !name.trim()}
					class="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
				>
					{addLoading ? 'Ajout...' : 'Ajouter'}
				</button>
				<button
					onclick={() => (showForm = false)}
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
				>
					Annuler
				</button>
			</div>
		</div>
	</div>
{/if}

{#if unpurchased.length === 0 && purchased.length === 0}
	<div class="mt-12 flex flex-col items-center text-center">
		<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
			<Package size={28} class="text-gray-400" />
		</div>
		<p class="text-gray-500">Aucun besoin en matériel signalé.</p>
		<p class="mt-1 text-sm text-gray-400">Signale un besoin pour que l'équipe le voie !</p>
	</div>
{:else}
	<div class="mt-4 space-y-2">
		{#each unpurchased as supply}
			<WishlistItem
				name={supply.name}
				link={supply.link}
				price={supply.price}
				addedByName={supply.addedByName}
				isPurchased={false}
				category={supply.category}
				urgency={supply.urgency}
				loading={toggleLoading === supply.id}
				onTogglePurchased={() => togglePurchased(supply.id, true)}
			/>
		{/each}
	</div>

	{#if purchased.length > 0}
		<button
			onclick={() => (showHistory = !showHistory)}
			class="mt-6 text-sm text-gray-400 hover:text-gray-600"
		>
			{showHistory ? 'Masquer' : 'Afficher'} les articles achetés ({purchased.length})
		</button>

		{#if showHistory}
			<div class="mt-2 space-y-2">
				{#each purchased as supply}
					<WishlistItem
						name={supply.name}
						link={supply.link}
						price={supply.price}
						addedByName={supply.addedByName}
						isPurchased={true}
						purchasedByName={supply.purchasedByName}
						purchasedAt={supply.purchasedAt}
						category={supply.category}
						urgency={supply.urgency}
						loading={toggleLoading === supply.id}
						onTogglePurchased={() => togglePurchased(supply.id, false)}
					/>
				{/each}
			</div>
		{/if}
	{/if}
{/if}
