import { identity } from '$lib/stores/identity.svelte';

export async function fetchAs(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	const headers = new Headers(options.headers);
	if (identity.memberId) {
		headers.set('x-member-id', identity.memberId);
	}
	return fetch(url, { ...options, headers });
}

export async function fetchJson<T>(
	url: string,
	options: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
	try {
		const res = await fetchAs(url, options);
		const body = await res.json();
		if (res.ok) {
			return { ok: true, data: body as T };
		}
		return { ok: false, error: body.message ?? 'Erreur inconnue', status: res.status };
	} catch {
		return { ok: false, error: 'Erreur réseau', status: 0 };
	}
}
