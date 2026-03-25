import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'LudoTools',
				short_name: 'Ludo',
				description: 'Outils internes pour la Ludothèque Pâquis-Sécheron',
				display: 'standalone',
				orientation: 'portrait',
				theme_color: '#1e40af',
				background_color: '#ffffff',
				start_url: '/',
				scope: '/',
				id: '/',
				categories: ['productivity'],
				icons: [
					{
						src: 'pwa-192x192.svg',
						sizes: '192x192',
						type: 'image/svg+xml'
					},
					{
						src: 'pwa-512x512.svg',
						sizes: '512x512',
						type: 'image/svg+xml',
						purpose: 'maskable any'
					}
				]
			},
			workbox: {
				runtimeCaching: [
					{
						urlPattern: /\/api\//,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 86400
							},
							networkTimeoutSeconds: 5
						}
					}
				]
			}
		})
	]
});
