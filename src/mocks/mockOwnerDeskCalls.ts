import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { SalesReport } from '@/lib/api/types';
import { replyFor, writtenFor } from './ownerDesk';
import { insightsFor } from './ownerInsights';
import { previousWindow, salesReport } from '@/lib/sales';
import { venueById } from './world';
import { accessOf } from './mockRules';
import type { MockContext } from './mockContext';

/** Mock calls: what the owner reads: reviews, sales, insights and guest feedback. */
export function mockOwnerDeskCalls(ctx: MockContext) {
  const { world, tokens, now, gate, remember } = ctx;
  return {
    async ownerListWrittenReviews(venueId) {
      await gate();
      accessOf(world, tokens);
      return writtenFor(world, venueId);
    },
    async ownerReplyToReview(reviewId, body, call) {
      await gate();
      accessOf(world, tokens);
      return remember(call?.idempotencyKey, () => replyFor(world, reviewId, body.text));
    },
    async ownerGetSales(venueId, filter) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      const timeZone = venue.hours.timezone;
      const taxEnabled = world.tax[venueId]?.enabled ?? false;
      // No end means "up to now and anything placed this very moment".
      const until = filter?.until;
      const rows = (from: string | undefined, to: string | undefined) =>
        world.orders
          .filter((row) => row.order.venueId === venueId)
          .filter((row) => {
            const at = Date.parse(row.order.createdAt);
            return (
              (from === undefined || at >= Date.parse(from)) &&
              (to === undefined || at < Date.parse(to))
            );
          })
          .map((row) => ({ ...row.order, handledBy: row.handledBy ?? null }));
      const current = salesReport(rows(filter?.since, until), timeZone, { taxEnabled });
      const window = previousWindow(filter?.since, until ?? new Date(now()).toISOString());
      const before = window ? salesReport(rows(window.since, window.until), timeZone) : null;
      const refundsPesewas = world.transactions
        .filter((item) => item.venueId === venueId && item.settlement === 'refunded')
        .filter((item) => {
          const at = Date.parse(item.createdAt);
          return (
            (!filter?.since || at >= Date.parse(filter.since)) && (!until || at < Date.parse(until))
          );
        })
        .reduce((sum, item) => sum + item.amountPesewas, 0);
      const report: SalesReport = {
        currency: venue.currency,
        ...current,
        refundsPesewas,
        // No orders before means nothing to compare with, so the page says so.
        previous:
          window && before && before.orderCount > 0
            ? {
                ...window,
                orderCount: before.orderCount,
                valuePesewas: before.valuePesewas,
                avgPesewas: before.avgPesewas,
              }
            : null,
      };
      return report;
    },
    async ownerGetInsights(venueId, range = '7d', window) {
      await gate();
      accessOf(world, tokens);
      return insightsFor(world, venueId, range, now(), window);
    },
    async ownerListFeedback(venueId, query) {
      await gate();
      const nowTime = now();
      let items = (world.feedback ?? []).filter((fb) => fb.venueId === venueId);
      // Enforce anonymity delay: items with future visibleAfter remain hidden
      items = items.filter((fb) => new Date(fb.visibleAfter).getTime() <= nowTime);
      if (query?.state === 'new') items = items.filter((fb) => !fb.archived);
      else if (query?.state === 'archived') items = items.filter((fb) => fb.archived);
      if (query?.search) {
        const q = query.search.toLowerCase();
        items = items.filter(
          (fb) =>
            fb.text.toLowerCase().includes(q) ||
            (fb.contactName?.toLowerCase().includes(q) ?? false) ||
            (fb.contactPhone?.includes(q) ?? false),
        );
      }
      return { items };
    },
    async ownerArchiveFeedback(venueId, feedbackId, body) {
      await gate();
      const item = (world.feedback ?? []).find((fb) => fb.id === feedbackId);
      if (!item) throw new ApiError(404, 'not_found', 'Feedback item not found');
      item.archived = body.archived;
      return item;
    },
    async ownerAskFeedbackAi(venueId, body) {
      await gate();
      const nowTime = now();
      const items = (world.feedback ?? []).filter(
        (fb) => fb.venueId === venueId && new Date(fb.visibleAfter).getTime() <= nowTime,
      );
      if (items.length === 0) {
        return {
          reply:
            "I haven't found any feedback yet for this location. Once diners leave feedback via the suggestion box, I will summarise trends and complaints here.",
          suggestions: [
            'Summarise my recent feedback',
            'What are my biggest complaints?',
            'What are customers loving?',
            'How has feedback changed this month?',
          ],
        };
      }
      const q = body.question.toLowerCase();
      if (q.includes('complaint') || q.includes('biggest')) {
        return {
          reply:
            'Based on recent feedback, 1 customer noted that kelewele was too salty and requested faster bill settlement, while another mentioned a 25-minute wait during Friday peak dinner. Overall complaints are low at under 15% of submissions.',
          suggestions: [
            'How can we speed up Friday wait times?',
            'Summarise positive comments',
            'View unhappy customer contact notes',
          ],
        };
      }
      if (q.includes('loving') || q.includes('love') || q.includes('positive')) {
        return {
          reply:
            'Guests consistently praise the grilled lake tilapia with spicy shito and the smoky firewood jollof rice. Several guests specifically mentioned warm hospitality from floor staff.',
          suggestions: ['What are our top dishes by rating?', 'Show recent 5-star comments'],
        };
      }
      return {
        reply:
          'Analyzed ' +
          items.length +
          ' feedback submissions: 75% positive, 15% neutral, and 10% negative. Top praise focuses on food seasoning and vibe. Suggestions center on peak-hour billing speed.',
        suggestions: [
          'What are my biggest complaints?',
          'What are customers loving?',
          'Summarise my recent feedback',
        ],
      };
    },
  } satisfies Partial<ApiClient>;
}
