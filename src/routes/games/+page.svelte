<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import WishlistItem from '$lib/components/ui/WishlistItem.svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Gamepad2 from 'lucide-svelte/icons/gamepad-2';

	let { data } = $props();

	let showForm = $state(false);
	let name = $state('');
	let link = $state('');
	let price = $state('');
	let addError = $state('');
	let addLoading = $state(false);
	let toggleLoading = $state<string | null>(null);

	let unpurchased = $derived(data.games.filter((g) => !g.isPurchased));
	let purchased = $derived(data.games.filter((g) => g.isPurchased));
	let showHistory = $state(false);

	async function addGame() {
		if (!name.trim()) return;
		addLoading = true;
		addError = '';

		const res = await fetchJson('/api/games', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: name.trim(),
				link: link.trim() || undefined,
				price: price ? parseFloat(price) : undefined
			})
		});

		addLoading = false;
		if (res.ok) {
			name = '';
			link = '';
			price = '';
			showForm = false;
			await invalidateAll();
		} else {
			addError = res.error;
		}
	}

	async function togglePurchased(gameId: string, isPurchased: boolean) {
		toggleLoading = gameId;
		await fetchJson(`/api/games/${gameId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isPurchased })
		});
		toggleLoading = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Jeux — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold text-royal">Wishlist Jeux</h1>
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
				<label for="game-name" class="block text-sm font-medium text-gray-700">Nom du jeu *</label>
				<input
					id="game-name"
					bind:value={name}
					type="text"
					placeholder="ex: Catan"
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="game-link" class="block text-sm font-medium text-gray-700">Lien (optionnel)</label>
				<input
					id="game-link"
					bind:value={link}
					type="url"
					placeholder="https://..."
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			<div>
				<label for="game-price" class="block text-sm font-medium text-gray-700">Prix estimé CHF (optionnel)</label>
				<input
					id="game-price"
					bind:value={price}
					type="number"
					step="0.05"
					min="0"
					placeholder="29.90"
					class="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
				/>
			</div>
			{#if addError}
				<p class="text-sm text-red-600">{addError}</p>
			{/if}
			<div class="flex gap-2">
				<button
					onclick={addGame}
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
			<Gamepad2 size={28} class="text-gray-400" />
		</div>
		<p class="text-gray-500">Aucun jeu dans la wishlist.</p>
		<p class="mt-1 text-sm text-gray-400">Ajoute un jeu que tu aimerais qu'on achète !</p>
	</div>
{:else}
	<div class="mt-4 space-y-2">
		{#each unpurchased as game}
			<WishlistItem
				name={game.name}
				link={game.link}
				price={game.price}
				addedByName={game.addedByName}
				isPurchased={false}
				loading={toggleLoading === game.id}
				onTogglePurchased={() => togglePurchased(game.id, true)}
			/>
		{/each}
	</div>

	{#if purchased.length > 0}
		<button
			onclick={() => (showHistory = !showHistory)}
			class="mt-6 text-sm text-gray-400 hover:text-gray-600"
		>
			{showHistory ? 'Masquer' : 'Afficher'} les jeux achetés ({purchased.length})
		</button>

		{#if showHistory}
			<div class="mt-2 space-y-2">
				{#each purchased as game}
					<WishlistItem
						name={game.name}
						link={game.link}
						price={game.price}
						addedByName={game.addedByName}
						isPurchased={true}
						purchasedByName={game.purchasedByName}
						purchasedAt={game.purchasedAt}
						loading={toggleLoading === game.id}
						onTogglePurchased={() => togglePurchased(game.id, false)}
					/>
				{/each}
			</div>
		{/if}
	{/if}
{/if}
