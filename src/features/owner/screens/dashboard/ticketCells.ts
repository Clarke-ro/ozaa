import { tokens } from '@/theme/tokens';

// The next-step button ("Start cooking", "Mark ready") gets one fixed width, so the buttons line
// up down the Live orders list whatever the step says. Sized so the longest English step,
// "Start preparing", stays on one line.
export const ACTION_WIDTH = tokens.space[16] * 2 + tokens.space[12];

// Totals get a fixed slot on wide screens for the same reason: "GH₵ 8.00" and "GH₵ 128.50" end
// on the same edge, so the eye can run down the money.
export const TOTAL_WIDTH = tokens.space[16] + tokens.space[8];

// The table code tile, a little smaller than the touch target so it never sets the row height.
export const TILE = tokens.space[10];
