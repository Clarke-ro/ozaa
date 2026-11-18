import { z } from 'zod';

/**
 * The nested venue settings the owner app saves. The route used to store these as any object.
 * These match the contract and the forms (hours, menu look, socials, online ordering, notices):
 * money is a whole number of pesewas and cannot be negative, and a string cannot land in a
 * number field. Unknown keys are dropped rather than rejected, so an older app that sends an
 * extra field still saves.
 */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const pesewas = z.number().int().min(0).max(100_000_000);
const slot = z.object({ opens: hhmm, closes: hhmm });

export const hoursInput = z.object({
  timezone: z.string().trim().min(1).max(64),
  weekly: z.array(z.array(slot).max(4)).min(7).max(7),
  exceptions: z
    .array(
      z.object({
        date: z.iso.date(),
        closed: z.boolean(),
        name: z.string().max(40).optional(),
        opens: hhmm.optional(),
        closes: hhmm.optional(),
      }),
    )
    .max(400)
    .optional(),
});

export const menuStyleInput = z.object({
  itemSort: z.enum(['manual', 'name', 'price_low', 'price_high', 'popular_first']).optional(),
  layout: z.enum(['list', 'grid']).optional(),
  colorScheme: z.enum(['light', 'dark', 'auto']).optional(),
});

// Handles ("mamaskitchen"), phones and links. The guest page turns them into safe URLs.
const socialValue = z.string().max(500).nullable();
export const socialsInput = z.object({
  googleReviewUrl: socialValue.optional(),
  instagram: socialValue.optional(),
  facebook: socialValue.optional(),
  tiktok: socialValue.optional(),
  tripadvisor: socialValue.optional(),
  whatsapp: socialValue.optional(),
  x: socialValue.optional(),
  youtube: socialValue.optional(),
  phone: socialValue.optional(),
  email: socialValue.optional(),
  website: socialValue.optional(),
  enabledLinks: z.array(z.string().max(40)).max(20).optional(),
});

export const onlineOrderingInput = z.object({
  enabled: z.boolean(),
  pickup: z.object({
    enabled: z.boolean(),
    prepMinutes: z.number().int().min(0).max(240),
  }),
  delivery: z.object({
    enabled: z.boolean(),
    minimumFeePesewas: pesewas,
    feePerKmPesewas: pesewas,
    maxDistanceKm: z.number().min(0.5).max(50),
    freeOverPesewas: pesewas.nullable().optional(),
  }),
});

// The app sends both "2026-11-05T18:00:00Z" and a time with milliseconds.
const when = z.iso.datetime({ offset: true });
const noticeInput = z.object({
  enabled: z.boolean(),
  title: z.string().max(60).optional(),
  text: z.string().min(1).max(280),
  startsAt: when.nullable().optional(),
  endsAt: when.nullable().optional(),
});

export const noticeSettingsInput = z.object({
  banner: noticeInput.nullable().optional(),
  popup: noticeInput.nullable().optional(),
});
