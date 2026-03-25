import { defineConfig } from 'drizzle-kit';

const isRemote = !!process.env.TURSO_AUTH_TOKEN;

export default defineConfig(
	isRemote
		? {
				schema: './src/lib/server/schema.ts',
				out: './drizzle',
				dialect: 'turso',
				dbCredentials: {
					url: process.env.TURSO_DATABASE_URL!,
					authToken: process.env.TURSO_AUTH_TOKEN!
				}
			}
		: {
				schema: './src/lib/server/schema.ts',
				out: './drizzle',
				dialect: 'sqlite',
				dbCredentials: {
					url: 'file:local.db'
				}
			}
);
