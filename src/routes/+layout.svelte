<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { identity } from '$lib/stores/identity.svelte';
	import Calendar from 'lucide-svelte/icons/calendar';
	import Gamepad2 from 'lucide-svelte/icons/gamepad-2';
	import Package from 'lucide-svelte/icons/package';
	import ScrollText from 'lucide-svelte/icons/scroll-text';
	import Settings from 'lucide-svelte/icons/settings';
	import LogOut from 'lucide-svelte/icons/log-out';
	import '../app.css';

	let { children } = $props();

	const tabs = [
		{ href: '/', label: 'Planning', icon: Calendar },
		{ href: '/games', label: 'Jeux', icon: Gamepad2 },
		{ href: '/supplies', label: 'Matériel', icon: Package },
		{ href: '/log', label: 'Log', icon: ScrollText },
		{ href: '/settings', label: 'Réglages', icon: Settings }
	];

	let isOnIdentifyPage = $derived($page.url.pathname === '/identify');
	let showNav = $derived(!isOnIdentifyPage);

	onMount(async () => {
		identity.init();

		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}

		checkNewLogs();

		if (identity.memberId) {
			try {
				const res = await fetch('/api/members');
				if (res.ok) {
					const members = await res.json();
					const found = members.some(
						(m: { id: string }) => m.id === identity.memberId
					);
					if (!found) {
						identity.clear();
					}
				}
			} catch {}
		}
	});

	$effect(() => {
		if (identity.initialized && !identity.memberId && !isOnIdentifyPage) {
			goto('/identify');
		}
	});

	let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	// Badge: count new log entries since last visit
	let newLogCount = $state(0);

	async function checkNewLogs() {
		if (typeof window === 'undefined') return;
		const lastVisit = localStorage.getItem('ludotools_last_log_visit');
		if (!lastVisit) {
			try {
				const res = await fetch('/api/log?limit=1&offset=0');
				if (res.ok) {
					const data = await res.json();
					newLogCount = data.total > 0 ? data.total : 0;
				}
			} catch {}
			return;
		}
		try {
			const res = await fetch(`/api/log?since=${encodeURIComponent(lastVisit)}`);
			if (res.ok) {
				const data = await res.json();
				newLogCount = data.newCount ?? 0;
			}
		} catch {}
	}

	$effect(() => {
		if ($page.url.pathname === '/log') {
			newLogCount = 0;
		}
	});

	function changeUser(): void {
		identity.clear();
		goto('/identify');
	}

	function isActive(tabHref: string): boolean {
		return (
			$page.url.pathname === tabHref ||
			(tabHref !== '/' && $page.url.pathname.startsWith(tabHref))
		);
	}
</script>

<svelte:head>
	{@html webManifest}
	<meta name="theme-color" content="#1e40af" />
</svelte:head>

<div class="flex min-h-dvh bg-gray-50">
	<!-- Desktop sidebar (lg+) -->
	{#if showNav}
		<aside class="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-gray-200 bg-white lg:flex lg:flex-col">
			<div class="flex h-14 items-center gap-2 px-5 border-b border-gray-100">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-royal text-sm font-bold text-white">L</div>
				<span class="text-lg font-bold text-gray-900">LudoTools</span>
			</div>
			<nav class="flex-1 px-3 py-4 space-y-1">
				{#each tabs as tab}
					{@const active = isActive(tab.href)}
					<a
						href={tab.href}
						class="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors {active
							? 'bg-royal-50 text-royal font-semibold'
							: 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}"
					>
						<tab.icon size={18} strokeWidth={active ? 2.5 : 2} />
						{tab.label}
						{#if tab.href === '/log' && newLogCount > 0}
							<span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
								{newLogCount > 99 ? '99+' : newLogCount}
							</span>
						{/if}
					</a>
				{/each}
			</nav>
			{#if identity.memberName}
				<div class="border-t border-gray-100 px-5 py-3">
					<div class="flex items-center justify-between">
						<div class="min-w-0">
							<p class="text-xs text-gray-400">Connecté</p>
							<p class="text-sm font-medium text-gray-700 truncate">{identity.memberName}</p>
						</div>
						<button
							onclick={changeUser}
							class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
							title="Changer d'utilisateur"
						>
							<LogOut size={16} />
						</button>
					</div>
				</div>
			{/if}
		</aside>
	{/if}

	<!-- Main content -->
	<div class="flex flex-1 flex-col {showNav ? 'lg:ml-56' : ''}">
		<!-- Mobile user bar -->
		{#if showNav && identity.memberName}
			<div class="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2 lg:hidden">
				<span class="text-sm text-gray-500">
					<span class="font-medium text-gray-700">{identity.memberName}</span>
				</span>
				<button
					onclick={changeUser}
					class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
				>
					<LogOut size={14} />
					Changer
				</button>
			</div>
		{/if}
		<main class="flex-1 overflow-y-auto px-4 pt-6 {showNav ? 'pb-20 lg:pb-6' : ''}">
			<div class="mx-auto max-w-2xl">
				{@render children()}
			</div>
		</main>

		<!-- Mobile bottom nav -->
		{#if showNav}
			<nav
				class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
			>
				<div class="mx-auto flex max-w-lg justify-around">
					{#each tabs as tab}
						{@const active = isActive(tab.href)}
						<a
							href={tab.href}
							class="relative flex flex-1 flex-col items-center py-2 text-xs transition-colors {active
								? 'text-royal font-semibold'
								: 'text-gray-400 hover:text-gray-600'}"
						>
							<tab.icon size={20} strokeWidth={active ? 2.5 : 2} />
							{#if tab.href === '/log' && newLogCount > 0}
								<span class="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
									{newLogCount > 99 ? '99+' : newLogCount}
								</span>
							{/if}
							<span class="mt-1">{tab.label}</span>
						</a>
					{/each}
				</div>
			</nav>
		{/if}
	</div>
</div>
