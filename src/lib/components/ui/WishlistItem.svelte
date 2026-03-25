<script lang="ts">
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import Undo2 from 'lucide-svelte/icons/undo-2';
	import ExternalLink from 'lucide-svelte/icons/external-link';

	let {
		name,
		link = null,
		price = null,
		addedByName = '',
		isPurchased = false,
		purchasedByName = null,
		purchasedAt = null,
		category = null,
		urgency = null,
		onTogglePurchased,
		loading = false
	}: {
		name: string;
		link?: string | null;
		price?: number | null;
		addedByName?: string;
		isPurchased?: boolean;
		purchasedByName?: string | null;
		purchasedAt?: string | null;
		category?: string | null;
		urgency?: string | null;
		onTogglePurchased: () => void;
		loading?: boolean;
	} = $props();

	const categoryLabels: Record<string, string> = {
		ménage: 'Ménage',
		bureau: 'Bureau',
		animation: 'Animation',
		autre: 'Autre'
	};
</script>

<div
	class="flex items-start gap-3 rounded-xl border bg-white px-4 py-3 {isPurchased
		? 'border-gray-100 opacity-60'
		: 'border-gray-200'}"
>
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 flex-wrap">
			<span class="font-medium text-gray-900 {isPurchased ? 'line-through' : ''}">{name}</span>
			{#if link}
				<a
					href={link}
					target="_blank"
					rel="noopener noreferrer"
					class="text-royal hover:text-royal-700"
				>
					<ExternalLink size={14} />
				</a>
			{/if}
			{#if price != null}
				<span class="text-sm text-gray-400">{price.toFixed(2)} CHF</span>
			{/if}
			{#if urgency === 'urgent'}
				<span class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
					Urgent
				</span>
			{/if}
			{#if category}
				<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
					{categoryLabels[category] ?? category}
				</span>
			{/if}
		</div>
		<div class="mt-1 text-xs text-gray-400">
			{#if isPurchased && purchasedByName}
				Acheté par {purchasedByName}
				{#if purchasedAt}
					le {new Date(purchasedAt).toLocaleDateString('fr-FR')}
				{/if}
			{:else}
				Ajouté par {addedByName}
			{/if}
		</div>
	</div>

	<button
		onclick={onTogglePurchased}
		disabled={loading}
		class="flex-shrink-0 rounded-lg p-2 transition-colors {isPurchased
			? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
			: 'text-green-500 hover:bg-green-50'}"
		title={isPurchased ? 'Remettre à acheter' : 'Marquer comme acheté'}
	>
		{#if isPurchased}
			<Undo2 size={18} />
		{:else}
			<ShoppingCart size={18} />
		{/if}
	</button>
</div>
