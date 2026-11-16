import { integer, timestamp } from 'drizzle-orm/pg-core';

/** Every time is stored with its time zone, in UTC (api/openapi.yaml conventions). */
export const at = (name: string) => timestamp(name, { withTimezone: true });

/** Money: whole pesewas (or the venue's minor unit), never a decimal (AGENTS.md rule 5). */
export const money = (name: string) => integer(name);
