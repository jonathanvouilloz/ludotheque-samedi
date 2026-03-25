<script lang="ts">
	import { goto } from '$app/navigation';
	import { identity } from '$lib/stores/identity.svelte';
	import Dice5 from 'lucide-svelte/icons/dice-5';

	let { data } = $props();

	function select(member: { id: string; name: string }) {
		identity.setIdentity(member.id, member.name);
		goto('/');
	}
</script>

<svelte:head>
	<title>Identification — LudoTools</title>
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4">
	<div class="mb-8 flex flex-col items-center">
		<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-royal text-white">
			<Dice5 size={32} />
		</div>
		<h1 class="text-2xl font-bold text-gray-900">LudoTools</h1>
		<p class="mt-2 text-center text-gray-500">Qui es-tu ?</p>
	</div>

	{#if data.members.length === 0}
		<div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
			<p class="text-gray-500">Aucun membre enregistré.</p>
			<p class="mt-1 text-sm text-gray-400">
				Demande à la responsable d'ajouter les membres de l'équipe.
			</p>
		</div>
	{:else}
		<div class="w-full space-y-2">
			{#each data.members as member}
				<button
					onclick={() => select(member)}
					class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-royal-300 hover:bg-royal-50 active:scale-[0.98]"
				>
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-royal-100 text-sm font-semibold text-royal"
					>
						{member.name.charAt(0).toUpperCase()}
					</div>
					<div class="flex-1">
						<span class="font-medium text-gray-900">{member.name}</span>
						{#if member.label}
							<span class="ml-2 text-xs text-gray-400">{member.label}</span>
						{/if}
					</div>
					{#if member.isPermanent}
						<span
							class="rounded-full bg-royal-100 px-2 py-0.5 text-xs font-medium text-royal"
						>
							Permanent
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
