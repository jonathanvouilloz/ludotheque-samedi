<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetchJson } from '$lib/utils/api';
	import Boxes from 'lucide-svelte/icons/boxes';
	import Plus from 'lucide-svelte/icons/plus';
	import ClipboardCheck from 'lucide-svelte/icons/clipboard-check';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';

	let { data } = $props();

	// ── Modal changement de thème ─────────────────────────────────────
	let showChangeModal = $state(false);
	let changeView = $state<'pick' | 'new'>('pick');
	let newThemeName = $state('');
	let newThemeItems = $state<string[]>(['']);
	let changeLoading = $state(false);
	let changeError = $state('');
	let showConfirm = $state(false);
	let pendingThemeId = $state<string | null>(null);
	let pendingThemeName = $state('');

	// ── Items panel ───────────────────────────────────────────────────
	let showItemsPanel = $state(false);
	let newItemName = $state('');
	let newItemQty = $state(1);
	let addItemLoading = $state(false);
	let addItemError = $state('');
	// inline edit per item
	let editingItemId = $state<string | null>(null);
	let editName = $state('');
	let editQty = $state(1);
	let editLoading = $state(false);

	// ── History ───────────────────────────────────────────────────────
	let showAllCheckups = $state(false);

	// ── Status helpers ────────────────────────────────────────────────
	const STATUS_LABELS: Record<string, { label: string; color: string }> = {
		present: { label: 'OK', color: 'bg-green-100 text-green-700' },
		broken: { label: 'Cassé', color: 'bg-orange-100 text-orange-700' },
		missing: { label: 'Perdu', color: 'bg-red-100 text-red-700' },
		needs_more: { label: 'À rajouter', color: 'bg-blue-100 text-blue-700' }
	};

	function openChangeModal() {
		changeView = 'pick';
		newThemeName = '';
		newThemeItems = [''];
		changeError = '';
		showConfirm = false;
		showChangeModal = true;
	}

	function requestInstall(themeId: string, themeName: string) {
		if (data.activePeriod) {
			pendingThemeId = themeId;
			pendingThemeName = themeName;
			showConfirm = true;
		} else {
			installTheme(themeId);
		}
	}

	async function installTheme(themeId: string) {
		changeLoading = true;
		changeError = '';
		const res = await fetchJson('/api/themes/periods', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ themeId })
		});
		changeLoading = false;
		if (res.ok) {
			showChangeModal = false;
			showConfirm = false;
			await invalidateAll();
		} else {
			changeError = res.error;
		}
	}

	async function createAndInstallTheme() {
		const name = newThemeName.trim();
		if (!name) return;
		changeLoading = true;
		changeError = '';
		const createRes = await fetchJson('/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (!createRes.ok) {
			changeError = createRes.error;
			changeLoading = false;
			return;
		}
		const themeId: string = createRes.data.id;
		for (const itemName of newThemeItems.map((i) => i.trim()).filter(Boolean)) {
			await fetchJson(`/api/themes/${themeId}/items`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: itemName, quantity: 1 })
			});
		}
		const installRes = await fetchJson('/api/themes/periods', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ themeId })
		});
		changeLoading = false;
		if (installRes.ok) {
			showChangeModal = false;
			await invalidateAll();
		} else {
			changeError = installRes.error;
		}
	}

	async function addItem() {
		if (!newItemName.trim() || !data.activeTheme) return;
		addItemLoading = true;
		addItemError = '';
		const res = await fetchJson(`/api/themes/${data.activeTheme.id}/items`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newItemName.trim(), quantity: newItemQty })
		});
		addItemLoading = false;
		if (res.ok) {
			newItemName = '';
			newItemQty = 1;
			await invalidateAll();
		} else {
			addItemError = res.error;
		}
	}

	function startEdit(item: { id: string; name: string; quantity: number }) {
		editingItemId = item.id;
		editName = item.name;
		editQty = item.quantity;
	}

	async function saveEdit(itemId: string) {
		if (!data.activeTheme || !editName.trim()) return;
		editLoading = true;
		await fetchJson(`/api/themes/${data.activeTheme.id}/items/${itemId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: editName.trim(), quantity: editQty })
		});
		editLoading = false;
		editingItemId = null;
		await invalidateAll();
	}

	async function archiveItem(itemId: string) {
		if (!data.activeTheme) return;
		await fetchJson(`/api/themes/${data.activeTheme.id}/items/${itemId}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' }
		});
		await invalidateAll();
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function formatShortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
	}

	let visibleCheckups = $derived(showAllCheckups ? data.recentCheckups : data.recentCheckups.slice(0, 3));
</script>

<svelte:head>
	<title>Thèmes — LudoTools</title>
</svelte:head>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold text-royal">Thèmes d'animation</h1>
	<button
		onclick={openChangeModal}
		class="flex items-center gap-1 rounded-lg border border-royal px-3 py-1.5 text-sm font-medium text-royal transition-colors hover:bg-royal-50"
	>
		<Boxes size={14} />
		Changement de thème
	</button>
</div>

{#if data.activeTheme && data.activePeriod}
	<!-- Active theme card -->
	<div class="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
		<div class="flex items-center gap-2">
			<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Actif</span>
			<h2 class="text-lg font-bold text-gray-900">{data.activeTheme.name}</h2>
		</div>
		<p class="mt-0.5 text-sm text-gray-500">
			Installé le {formatDate(data.activePeriod.createdAt)} · {data.activeItems.length} objet{data.activeItems.length !== 1 ? 's' : ''}
		</p>

		<!-- Last checkup row -->
		{#if data.recentCheckups.length > 0}
			{@const last = data.recentCheckups.find((c) => c.completedAt)}
			{#if last}
				<a
					href="/themes/checkup/{last.id}"
					class="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
				>
					<ClipboardCheck size={14} class="shrink-0 text-gray-400" />
					<span class="text-gray-600">
						Dernier check-up le <strong>{formatShortDate(last.completedAt!)}</strong> par {last.doneByName}
					</span>
					{#if last.unresolvedCount > 0}
						<span class="ml-auto shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
							⚠ {last.unresolvedCount} actif{last.unresolvedCount !== 1 ? 's' : ''}
						</span>
					{:else}
						<span class="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Tout OK</span>
					{/if}
				</a>
			{:else}
				<p class="mt-3 text-sm text-gray-400 italic">Check-up en cours…</p>
			{/if}
		{:else}
			<p class="mt-3 text-sm text-gray-400 italic">Aucun check-up effectué pour ce thème.</p>
		{/if}

		<!-- Actions -->
		<div class="mt-4 flex flex-wrap gap-2">
			<a
				href="/themes/checkup/new"
				class="flex items-center gap-1.5 rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700"
			>
				<ClipboardCheck size={14} />
				Faire un check-up
			</a>
			<button
				onclick={() => (showItemsPanel = !showItemsPanel)}
				class="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
			>
				{#if showItemsPanel}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
				Gérer les objets
			</button>
		</div>
	</div>

	<!-- Unresolved problems -->
	{#if data.unresolvedProblems.length > 0}
		<a
			href="/themes/checkup/{data.unresolvedProblems[0]?.checkupId}"
			class="mt-3 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100 transition-colors"
		>
			<span class="mt-0.5 shrink-0 text-orange-500">⚠</span>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-medium text-orange-800">
					{data.unresolvedProblems.length} problème{data.unresolvedProblems.length !== 1 ? 's' : ''} en cours
				</p>
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#each data.unresolvedProblems as p}
						{@const cfg = STATUS_LABELS[p.status]}
						<span class="inline-flex items-center gap-1 rounded-full {cfg?.color ?? 'bg-gray-100 text-gray-600'} px-2 py-0.5 text-xs">
							{p.itemName} — {cfg?.label ?? p.status}
						</span>
					{/each}
				</div>
			</div>
			<ChevronRight size={16} class="shrink-0 text-orange-400 mt-0.5" />
		</a>
	{/if}

	<!-- Items panel -->
	{#if showItemsPanel}
		<div class="mt-2 rounded-xl border border-gray-200 bg-white p-4">
			<h3 class="mb-3 text-sm font-semibold text-gray-700">Objets du thème</h3>
			{#if data.activeItems.length === 0}
				<p class="text-sm text-gray-400 italic">Aucun objet. Ajoutes-en ci-dessous.</p>
			{:else}
				<ul class="mb-3 space-y-1.5">
					{#each data.activeItems as item}
						<li class="rounded-lg border border-gray-100 px-3 py-2 text-sm">
							{#if editingItemId === item.id}
								<!-- Edit mode -->
								<div class="flex items-center gap-2">
									<input
										bind:value={editName}
										type="text"
										class="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
									/>
									<input
										bind:value={editQty}
										type="number"
										min="1"
										max="99"
										class="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
									/>
									<button
										onclick={() => saveEdit(item.id)}
										disabled={editLoading || !editName.trim()}
										class="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40"
									>
										<Check size={15} />
									</button>
									<button
										onclick={() => (editingItemId = null)}
										class="rounded p-1 text-gray-400 hover:bg-gray-100"
									>
										<X size={15} />
									</button>
								</div>
							{:else}
								<!-- View mode -->
								<div class="flex items-center justify-between gap-2">
									<div class="flex items-center gap-2 min-w-0">
										<span class="text-gray-800 truncate">{item.name}</span>
										{#if item.quantity > 1}
											<span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">×{item.quantity}</span>
										{/if}
									</div>
									<div class="flex items-center gap-1.5 shrink-0">
										{#if item.lastStatus && item.lastStatus !== 'present'}
											{@const cfg = STATUS_LABELS[item.lastStatus]}
											<span class="rounded-full px-2 py-0.5 text-xs {item.lastStatusResolved ? 'bg-gray-100 text-gray-400 line-through' : (cfg?.color ?? '')}">
												{cfg?.label ?? item.lastStatus}
											</span>
										{/if}
										<button
											onclick={() => startEdit(item)}
											class="rounded p-1 text-gray-300 hover:bg-blue-50 hover:text-blue-500"
											title="Modifier"
										>
											<Pencil size={13} />
										</button>
										<button
											onclick={() => archiveItem(item.id)}
											class="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
											title="Retirer"
										>
											<Trash2 size={13} />
										</button>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<div class="flex items-end gap-2">
				<div class="flex-1">
					<input
						bind:value={newItemName}
						type="text"
						placeholder="Nom de l'objet"
						onkeydown={(e) => e.key === 'Enter' && addItem()}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
					/>
				</div>
				<div class="w-16">
					<input
						bind:value={newItemQty}
						type="number"
						min="1"
						max="99"
						title="Quantité"
						class="w-full rounded-lg border border-gray-300 px-2 py-2 text-center text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
					/>
				</div>
				<button
					onclick={addItem}
					disabled={addItemLoading || !newItemName.trim()}
					class="rounded-lg bg-royal px-3 py-2 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
				>
					<Plus size={16} />
				</button>
			</div>
			{#if addItemError}
				<p class="mt-1 text-sm text-red-600">{addItemError}</p>
			{/if}
		</div>
	{/if}

	<!-- Checkup history -->
	{#if data.recentCheckups.length > 0}
		<div class="mt-6">
			<h3 class="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">Historique des check-ups</h3>
			<div class="space-y-2">
				{#each visibleCheckups as cu}
					<a
						href="/themes/checkup/{cu.id}"
						class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-royal-200 hover:bg-royal-50 transition-colors"
					>
						<div>
							<span class="font-medium text-gray-800">
								{cu.completedAt ? formatDate(cu.completedAt) : 'En cours…'}
							</span>
							<span class="ml-2 text-gray-400">par {cu.doneByName}</span>
						</div>
						{#if !cu.completedAt}
							<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">En cours</span>
						{:else if cu.unresolvedCount > 0}
							<span class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">⚠ {cu.unresolvedCount}</span>
						{:else}
							<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">OK</span>
						{/if}
					</a>
				{/each}
			</div>
			{#if data.recentCheckups.length > 3}
				<button
					onclick={() => (showAllCheckups = !showAllCheckups)}
					class="mt-2 text-sm text-gray-400 hover:text-gray-600"
				>
					{showAllCheckups ? 'Voir moins' : `Voir tous (${data.recentCheckups.length})`}
				</button>
			{/if}
		</div>
	{/if}

{:else}
	<div class="mt-12 flex flex-col items-center text-center">
		<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
			<Boxes size={28} class="text-gray-400" />
		</div>
		<p class="text-gray-500">Aucun thème installé pour l'instant.</p>
		<p class="mt-1 text-sm text-gray-400">Lance un changement de thème pour commencer.</p>
		<button
			onclick={openChangeModal}
			class="mt-4 flex items-center gap-1.5 rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-royal-700"
		>
			<Boxes size={14} />
			Changement de thème
		</button>
	</div>
{/if}

<!-- ── Modal changement de thème ──────────────────────────────────── -->
{#if showChangeModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
		onclick={(e) => e.target === e.currentTarget && (showChangeModal = false)}
	>
		<div class="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-bold text-gray-900">Changement de thème</h2>
				<button onclick={() => (showChangeModal = false)} class="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
					<X size={18} />
				</button>
			</div>

			{#if !showConfirm}
				<div class="mb-4 flex rounded-lg border border-gray-200 p-0.5">
					<button
						onclick={() => (changeView = 'pick')}
						class="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors {changeView === 'pick' ? 'bg-royal text-white' : 'text-gray-500 hover:text-gray-700'}"
					>
						Thème existant
					</button>
					<button
						onclick={() => (changeView = 'new')}
						class="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors {changeView === 'new' ? 'bg-royal text-white' : 'text-gray-500 hover:text-gray-700'}"
					>
						Nouveau thème
					</button>
				</div>

				{#if changeView === 'pick'}
					{#if data.allThemes.length === 0}
						<p class="py-4 text-center text-sm text-gray-400">Aucun thème enregistré. Crée un nouveau thème.</p>
					{:else}
						<div class="max-h-64 overflow-y-auto space-y-2">
							{#each data.allThemes as theme}
								{@const isActive = data.activeTheme?.id === theme.id}
								<button
									onclick={() => requestInstall(theme.id, theme.name)}
									disabled={isActive}
									class="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors {isActive ? 'border-green-200 bg-green-50 opacity-60 cursor-not-allowed' : 'border-gray-200 hover:border-royal-300 hover:bg-royal-50'}"
								>
									<span class="font-medium text-gray-800">{theme.name}</span>
									{#if isActive}
										<span class="text-xs text-green-600 font-medium">Actif</span>
									{:else}
										<ChevronRight size={16} class="text-gray-300" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
					{#if changeError}
						<p class="mt-2 text-sm text-red-600">{changeError}</p>
					{/if}
				{:else}
					<div class="space-y-3">
						<div>
							<label for="new-theme-name" class="block text-sm font-medium text-gray-700">Nom du thème *</label>
							<input
								id="new-theme-name"
								bind:value={newThemeName}
								type="text"
								placeholder="ex: Espace forêt"
								class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Objets (optionnel)</label>
							<div class="mt-1 space-y-1.5">
								{#each newThemeItems as _, i}
									<div class="flex gap-2">
										<input
											bind:value={newThemeItems[i]}
											type="text"
											placeholder="Nom de l'objet"
											class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-1 focus:ring-royal focus:outline-none"
										/>
										{#if newThemeItems.length > 1}
											<button
												onclick={() => (newThemeItems = newThemeItems.filter((_, j) => j !== i))}
												class="rounded-lg border border-gray-200 px-2 text-gray-400 hover:text-red-500"
											>
												<X size={14} />
											</button>
										{/if}
									</div>
								{/each}
								<button
									onclick={() => (newThemeItems = [...newThemeItems, ''])}
									class="flex items-center gap-1 text-sm text-royal hover:underline"
								>
									<Plus size={13} /> Ajouter un objet
								</button>
							</div>
						</div>
					</div>
					{#if changeError}
						<p class="mt-2 text-sm text-red-600">{changeError}</p>
					{/if}
					<button
						onclick={createAndInstallTheme}
						disabled={changeLoading || !newThemeName.trim()}
						class="mt-4 w-full rounded-lg bg-royal py-2.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
					>
						{changeLoading ? 'Installation…' : 'Créer et installer ce thème'}
					</button>
				{/if}
			{:else}
				<div class="rounded-xl border border-orange-200 bg-orange-50 p-4">
					<p class="text-sm text-orange-800">
						Cela clôturera <strong>«{data.activeTheme?.name}»</strong> et installera <strong>«{pendingThemeName}»</strong>.
					</p>
				</div>
				{#if changeError}
					<p class="mt-2 text-sm text-red-600">{changeError}</p>
				{/if}
				<div class="mt-4 flex gap-2">
					<button
						onclick={() => installTheme(pendingThemeId!)}
						disabled={changeLoading}
						class="flex-1 rounded-lg bg-royal py-2.5 text-sm font-medium text-white hover:bg-royal-700 disabled:opacity-50"
					>
						{changeLoading ? 'Installation…' : 'Confirmer le changement'}
					</button>
					<button
						onclick={() => (showConfirm = false)}
						class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
					>
						Annuler
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
