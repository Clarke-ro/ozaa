import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` writes a new SQL migration in drizzle/ after a change to the schema.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
