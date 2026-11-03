export type SetupStepId = 'details' | 'look' | 'menu' | 'tables' | 'wifi' | 'team';

/** What the app already knows about the venue, boiled down to what the checklist needs. */
export type SetupFacts = {
  hasDescription: boolean;
  hasLocation: boolean;
  hasLogo: boolean;
  dishCount: number;
  tableCount: number;
  hasWifi: boolean;
  /** Includes the owner, so 1 means nobody has been invited yet. */
  staffCount: number;
};

export type SetupStep = { id: SetupStepId; done: boolean; href: string };

export type SetupChecklist = {
  steps: SetupStep[];
  /** 0 to 100, whole numbers. */
  percent: number;
  /** The first step not done yet, or null when the venue is ready. */
  next: SetupStep | null;
};

/** The "Complete your setup" card on Today, in the order a new owner should do it. */
export function setupChecklist(facts: SetupFacts): SetupChecklist {
  const steps: SetupStep[] = [
    { id: 'details', done: facts.hasDescription && facts.hasLocation, href: '/owner/branding' },
    { id: 'look', done: facts.hasLogo, href: '/owner/branding' },
    { id: 'menu', done: facts.dishCount > 0, href: '/owner/menu' },
    { id: 'tables', done: facts.tableCount > 0, href: '/owner/tables' },
    { id: 'wifi', done: facts.hasWifi, href: '/owner/services' },
    { id: 'team', done: facts.staffCount > 1, href: '/owner/staff' },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  return {
    steps,
    percent: Math.round((doneCount / steps.length) * 100),
    next: steps.find((step) => !step.done) ?? null,
  };
}
