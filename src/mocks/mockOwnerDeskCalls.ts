import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { SalesReport } from '@/lib/api/types';
import { insightsFor, replyFor, writtenFor } from './ownerDesk';
import { salesReport } from '@/lib/sales';
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
      const since = filter?.since ? Date.parse(filter.since) : -Infinity;
      const until = filter?.until ? Date.parse(filter.until) : Infinity;
      const orders = world.orders
        .map((row) => row.order)
        .filter((order) => order.venueId === venueId)
        .filter((order) => {
          const at = Date.parse(order.createdAt);
          return at >= since && at < until;
        });
      return {
        currency: venue.currency,
        ...salesReport(orders, venue.hours.timezone),
      } as SalesReport;
    },
    async ownerGetInsights(venueId, range = '7d') {
      await gate();
      accessOf(world, tokens);
      return insightsFor(world, venueId, range);
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
