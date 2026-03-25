<script lang="ts">
	let { name, isPermanent = false, isCurrentUser = false } = $props();
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {isCurrentUser
		? 'bg-royal-100 text-royal ring-1 ring-royal-300'
		: 'bg-gray-100 text-gray-700'}"
>
	{name}
	{#if isPermanent}
		<span class="ml-1 text-[10px] text-gray-400">P</span>
	{/if}
</span>
