import type { Context } from 'hono';

/**
 * An error in the contract's Problem shape (RFC 9457): `code` for the app to act on, `detail` in
 * plain words. Throw it anywhere in a route; app.ts turns it into the response.
 */
export class Problem extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 503,
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail);
  }
}

export function problemResponse(c: Context, problem: Problem) {
  return c.json(
    {
      type: `https://cravins.app/problems/${problem.code}`,
      title: problem.detail,
      status: problem.status,
      detail: problem.detail,
      code: problem.code,
    },
    problem.status,
    { 'Content-Type': 'application/problem+json' },
  );
}

/** Reads a JSON body against a zod schema; anything else is a 400 the app can show. */
export async function body<T>(c: Context, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }): Promise<T> {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new Problem(400, 'validation', 'Check the details and try again.');
  return parsed.data;
}
