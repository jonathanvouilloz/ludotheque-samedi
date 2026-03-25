<script lang="ts">
	import ArrowLeftRight from 'lucide-svelte/icons/arrow-left-right';
	import Gamepad2 from 'lucide-svelte/icons/gamepad-2';
	import Package from 'lucide-svelte/icons/package';
	import UserPlus from 'lucide-svelte/icons/user-plus';
	import UserMinus from 'lucide-svelte/icons/user-minus';
	import CalendarCheck from 'lucide-svelte/icons/calendar-check';
	import Pencil from 'lucide-svelte/icons/pencil';
	import type { Component } from 'svelte';

	let {
		type,
		description,
		actorName = null,
		createdAt
	}: {
		type: string;
		description: string;
		actorName?: string | null;
		createdAt: string;
	} = $props();

	const iconMap: Record<string, { icon: Component; color: string }> = {
		swap: { icon: ArrowLeftRight, color: 'text-blue-500 bg-blue-50' },
		game_added: { icon: Gamepad2, color: 'text-green-500 bg-green-50' },
		game_purchased: { icon: Gamepad2, color: 'text-green-600 bg-green-50' },
		game_unpurchased: { icon: Gamepad2, color: 'text-amber-500 bg-amber-50' },
		supply_added: { icon: Package, color: 'text-orange-500 bg-orange-50' },
		supply_purchased: { icon: Package, color: 'text-orange-600 bg-orange-50' },
		supply_unpurchased: { icon: Package, color: 'text-amber-500 bg-amber-50' },
		member_added: { icon: UserPlus, color: 'text-purple-500 bg-purple-50' },
		member_updated: { icon: Pencil, color: 'text-purple-500 bg-purple-50' },
		member_removed: { icon: UserMinus, color: 'text-red-500 bg-red-50' },
		season_created: { icon: CalendarCheck, color: 'text-royal bg-royal-50' }
	};

	let iconInfo = $derived(iconMap[type] ?? { icon: Pencil, color: 'text-gray-400 bg-gray-50' });

	const formatter = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});

	let formattedDate = $derived(formatter.format(new Date(createdAt + 'Z')));
</script>

<div class="flex items-start gap-3 py-2">
	<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {iconInfo.color}">
		<iconInfo.icon size={16} />
	</div>
	<div class="flex-1 min-w-0">
		<p class="text-sm text-gray-700">{description}</p>
		<p class="mt-0.5 text-xs text-gray-400">{formattedDate}</p>
	</div>
</div>
