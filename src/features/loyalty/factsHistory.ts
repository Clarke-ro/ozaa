import { type Fact, type HistoryRow } from './factsTypes';

/** A card's activity list: one row per earn or redemption, in the order the facts were kept. */
export function historyOf(facts: readonly Fact[]): HistoryRow[] {
  return facts.flatMap<HistoryRow>((fact): HistoryRow[] => {
    if (fact.kind === 'earn' && fact.source.type === 'paid_visit') {
      return [
        {
          at: fact.at,
          source: 'paid_visit',
          direction: 'in',
          units: fact.units,
          title: null,
          amountMinor: fact.source.amountMinor,
          currency: fact.source.currency,
        },
      ];
    }
    if (fact.kind === 'earn' && fact.source.type === 'game') {
      return [
        {
          at: fact.at,
          source: 'game',
          direction: 'in',
          units: fact.units,
          title: null,
          amountMinor: null,
          currency: null,
        },
      ];
    }
    if (fact.kind === 'earn' && fact.source.type === 'birthday') {
      return [
        {
          at: fact.at,
          source: 'birthday',
          direction: 'in',
          units: fact.units,
          title: fact.source.title,
          amountMinor: null,
          currency: null,
        },
      ];
    }
    if (fact.kind === 'confirm') {
      return [
        {
          at: fact.at,
          source: 'redeem',
          direction: 'out',
          units: fact.units,
          title: fact.title,
          amountMinor: null,
          currency: null,
        },
      ];
    }
    return [];
  });
}
