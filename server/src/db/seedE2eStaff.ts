import { eq } from 'drizzle-orm';
import { readConfig } from '../config.ts';
import { clerkAdmin } from '../owner/clerkAdmin.ts';
import type { StaffRole } from '../shared/types.ts';
import type { Db } from './client.ts';
import { connect } from './client.ts';
import { staffMemberships, staffUsers, venues } from './schema.ts';

/**
 * For the real-server browser tests only (.github/workflows/e2e-server.yml): the mock's demo staff
 * (src/mocks/demo.ts) as real staff, each signing in with a Clerk test email. Clerk's development
 * instance accepts the code 424242 for any `+clerk_test` address and sends no email.
 */
export const E2E_STAFF: readonly {
  phone: string;
  firstName: string;
  role: StaffRole;
  slug: string;
}[] = [
  // Ama owns the business, so she is the owner at all three locations and can switch between them.
  { phone: '+233240000001', firstName: 'Ama', role: 'owner', slug: 'mamas-kitchen' },
  { phone: '+233240000001', firstName: 'Ama', role: 'owner', slug: 'bean-there' },
  { phone: '+233240000001', firstName: 'Ama', role: 'owner', slug: 'auntie-akos' },
  { phone: '+233240000002', firstName: 'Kwesi', role: 'waiter', slug: 'mamas-kitchen' },
  { phone: '+233240000003', firstName: 'Yaw', role: 'kitchen', slug: 'mamas-kitchen' },
  { phone: '+233240000004', firstName: 'Kojo', role: 'owner', slug: 'bean-there' },
  { phone: '+233240000005', firstName: 'Akosua', role: 'owner', slug: 'auntie-akos' },
];

export const e2eEmail = (firstName: string) => `${firstName.toLowerCase()}+clerk_test@example.com`;

/** Test staff go only into a database on this machine: never the live one. */
export function isLocalDatabase(url: string): boolean {
  return /^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname);
}

/** Adds the test staff and their Clerk users. Running it again changes nothing. */
export async function seedE2eStaff(
  db: Db,
  clerk: { ensureUser(input: { email: string; firstName: string }): Promise<unknown> } | null,
): Promise<void> {
  for (const person of E2E_STAFF) {
    const email = e2eEmail(person.firstName);
    const id = `usr_e2e_${person.firstName.toLowerCase()}`;
    const [venue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, person.slug));
    if (!venue) throw new Error(`Seed the sample venues first: ${person.slug} is missing.`);
    await db
      .insert(staffUsers)
      .values({ id, phone: person.phone, email, firstName: person.firstName })
      .onConflictDoNothing();
    await db
      .insert(staffMemberships)
      .values({
        id: `mem_${id}_${person.slug}`,
        venueId: venue.id,
        userId: id,
        role: person.role,
        status: 'invited',
      })
      .onConflictDoNothing();
    // The server links the Clerk user on first sign-in, by this verified email (owner/staff.ts).
    await clerk?.ensureUser({ email, firstName: person.firstName });
  }
}

// `E2E_STAFF=true npm run db:seed-e2e-staff`, after db:seed. CLERK_SECRET_KEY makes the Clerk users.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.E2E_STAFF !== 'true')
    throw new Error('Set E2E_STAFF=true: this is for the browser tests only.');
  const config = readConfig();
  if (!isLocalDatabase(config.DATABASE_URL))
    throw new Error('Test staff go only into a local database.');
  const { db, close } = connect(config.DATABASE_URL, 1);
  try {
    await seedE2eStaff(db, config.CLERK_SECRET_KEY ? clerkAdmin(config.CLERK_SECRET_KEY) : null);
  } finally {
    await close();
  }
}
