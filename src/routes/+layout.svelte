<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { identity } from '$lib/stores/identity.svelte';
	import Calendar from 'lucide-svelte/icons/calendar';
	import CalendarDays from 'lucide-svelte/icons/calendar-days';
	import Gamepad2 from 'lucide-svelte/icons/gamepad-2';
	import Package from 'lucide-svelte/icons/package';
	import ScrollText from 'lucide-svelte/icons/scroll-text';
	import Settings from 'lucide-svelte/icons/settings';
	import LogOut from 'lucide-svelte/icons/log-out';
	import Download from 'lucide-svelte/icons/download';
	import Share from 'lucide-svelte/icons/share';
	import X from 'lucide-svelte/icons/x';
	import '../app.css';

	let { children } = $props();

	const tabs = [
		{ href: '/', label: 'Planning', icon: Calendar },
		{ href: '/calendrier', label: 'Calendrier', icon: CalendarDays },
		{ href: '/games', label: 'Jeux', icon: Gamepad2 },
		{ href: '/supplies', label: 'Matériel', icon: Package },
		{ href: '/log', label: 'Log', icon: ScrollText },
		{ href: '/settings', label: 'Réglages', icon: Settings }
	];

	let isOnIdentifyPage = $derived($page.url.pathname === '/identify');
	let isOnPublicPage = $derived($page.url.pathname.startsWith('/p/'));
	let showNav = $derived(!isOnIdentifyPage && !isOnPublicPage);

	// PWA install prompt
	let installPromptEvent = $state<Event | null>(null);
	let showInstallBanner = $state(false);
	let isIOS = $state(false);

	onMount(async () => {
		identity.init();

		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}

		// Install banner logic
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		const dismissed = localStorage.getItem('ludotools_install_dismissed');

		if (!isStandalone && !dismissed) {
			// iOS detection
			const ua = navigator.userAgent;
			isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

			if (isIOS) {
				showInstallBanner = true;
			}

			window.addEventListener('beforeinstallprompt', (e) => {
				e.preventDefault();
				installPromptEvent = e;
				showInstallBanner = true;
			});
		}

		checkNewLogs();
		checkPendingCalendar();

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
		if (identity.initialized && !identity.memberId && !isOnIdentifyPage && !isOnPublicPage) {
			goto('/identify');
		}
	});

	let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	// Wide pages use more horizontal space on desktop (calendar grid needs room)
	let isWidePage = $derived(
		$page.url.pathname === '/calendrier' ||
			$page.url.pathname.startsWith('/calendrier/proposals/new') ||
			/^\/calendrier\/proposals\/[^/]+$/.test($page.url.pathname)
	);

	// Badge: count new log entries since last visit
	let newLogCount = $state(0);
	let pendingCalendarCount = $state(0);

	async function checkPendingCalendar() {
		try {
			const [absRes, propRes] = await Promise.all([
				fetch('/api/calendar/absences'),
				fetch('/api/calendar/proposals')
			]);
			let count = 0;
			if (absRes.ok) {
				const rows = (await absRes.json()) as { status: string }[];
				count += rows.filter((r) => r.status === 'pending').length;
			}
			if (propRes.ok) {
				const rows = (await propRes.json()) as { status: string }[];
				count += rows.filter((r) => r.status === 'submitted').length;
			}
			pendingCalendarCount = count;
		} catch {}
	}

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

	$effect(() => {
		if ($page.url.pathname.startsWith('/calendrier')) {
			checkPendingCalendar();
		}
	});

	async function installApp(): Promise<void> {
		if (!installPromptEvent) return;
		(installPromptEvent as any).prompt();
		const result = await (installPromptEvent as any).userChoice;
		if (result.outcome === 'accepted') {
			showInstallBanner = false;
		}
		installPromptEvent = null;
	}

	function dismissInstall(): void {
		showInstallBanner = false;
		localStorage.setItem('ludotools_install_dismissed', '1');
	}

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
						{#if tab.href === '/calendrier' && pendingCalendarCount > 0}
							<span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
								{pendingCalendarCount > 99 ? '99+' : pendingCalendarCount}
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
		{#if isOnPublicPage}
			<main class="flex-1 overflow-y-auto">
				{@render children()}
			</main>
		{:else}
			<main class="flex-1 overflow-y-auto px-4 pt-6 {showNav ? 'pb-20 lg:pb-6' : ''} lg:px-8">
				<div class="mx-auto {isWidePage ? 'max-w-[1600px]' : 'max-w-2xl'}">
					{@render children()}
				</div>
			</main>
		{/if}

		<!-- PWA Install banner -->
		{#if showInstallBanner && showNav}
			<div class="fixed bottom-14 left-0 right-0 z-50 px-3 pb-2 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 lg:px-0">
				<div class="flex items-center gap-3 rounded-xl border border-royal-200 bg-white px-4 py-3 shadow-lg">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-royal text-white">
						<Download size={20} />
					</div>
					<div class="min-w-0 flex-1">
						{#if isIOS}
							<p class="text-sm font-medium text-gray-900">Installer LudoTools</p>
							<p class="text-xs text-gray-500">
								Appuie sur <Share size={12} class="inline text-royal" /> puis "Sur l'écran d'accueil"
							</p>
						{:else}
							<p class="text-sm font-medium text-gray-900">Installer LudoTools</p>
							<p class="text-xs text-gray-500">Accès rapide depuis l'écran d'accueil</p>
						{/if}
					</div>
					{#if !isIOS}
						<button
							onclick={installApp}
							class="shrink-0 rounded-lg bg-royal px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-700"
						>
							Installer
						</button>
					{/if}
					<button
						onclick={dismissInstall}
						class="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
					>
						<X size={16} />
					</button>
				</div>
			</div>
		{/if}

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
							{#if tab.href === '/calendrier' && pendingCalendarCount > 0}
								<span class="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
									{pendingCalendarCount > 99 ? '99+' : pendingCalendarCount}
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
