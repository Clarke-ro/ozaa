import { create } from 'zustand';
import { pesewas, type Pesewas } from '@/lib/brand';

export type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPricePesewas: Pesewas;
  modifierPesewas: Pesewas;
  modifierOptionIds: string[];
  note?: string;
};

type Draft = Omit<CartLine, 'key'>;

type CartState = {
  slug: string | null;
  lines: CartLine[];
  add: (slug: string, line: Draft) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

function lineKey(line: Pick<Draft, 'menuItemId' | 'modifierOptionIds' | 'note'>): string {
  return `${line.menuItemId}|${line.modifierOptionIds.join('.')}|${line.note ?? ''}`;
}

export const useCart = create<CartState>((set) => ({
  slug: null,
  lines: [],
  add: (slug, line) =>
    set((state) => {
      const lines = state.slug === slug ? state.lines : [];
      const key = lineKey(line);
      const existing = lines.find((item) => item.key === key);
      const next = existing
        ? lines.map((item) =>
            item.key === key ? { ...item, quantity: item.quantity + line.quantity } : item,
          )
        : [...lines, { ...line, key }];
      return { slug, lines: next };
    }),
  setQuantity: (key, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((item) => item.key !== key)
          : state.lines.map((item) => (item.key === key ? { ...item, quantity } : item)),
    })),
  clear: () => set({ lines: [] }),
}));

const NO_LINES: readonly CartLine[] = [];

/**
 * The basket for this venue. The store holds one venue's basket at a time, so on any other
 * venue's page it reads as empty and its dishes are never sent there.
 */
export function linesFor(
  state: Pick<CartState, 'slug' | 'lines'>,
  slug: string,
): readonly CartLine[] {
  return state.slug === slug ? state.lines : NO_LINES;
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** What the guest sees before sending. The kitchen’s total replaces it. */
export function cartEstimate(lines: readonly CartLine[]): Pesewas {
  return pesewas(
    lines.reduce(
      (sum, line) => sum + (line.unitPricePesewas + line.modifierPesewas) * line.quantity,
      0,
    ),
  );
}
