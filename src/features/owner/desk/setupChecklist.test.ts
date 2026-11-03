import { setupChecklist, type SetupFacts } from './setupChecklist';

const done: SetupFacts = {
  hasDescription: true,
  hasLocation: true,
  hasLogo: true,
  dishCount: 12,
  tableCount: 8,
  hasWifi: true,
  staffCount: 3,
};

test('a venue with everything set is 100% and has nothing left', () => {
  const list = setupChecklist(done);
  expect(list.percent).toBe(100);
  expect(list.steps.every((step) => step.done)).toBe(true);
  expect(list.next).toBeNull();
});

test('a brand-new venue starts at 0% and points at the first step', () => {
  const list = setupChecklist({
    hasDescription: false,
    hasLocation: false,
    hasLogo: false,
    dishCount: 0,
    tableCount: 0,
    hasWifi: false,
    staffCount: 1,
  });
  expect(list.percent).toBe(0);
  expect(list.next?.id).toBe('details');
});

test('details need both a description and a location', () => {
  const list = setupChecklist({ ...done, hasLocation: false });
  expect(list.steps.find((step) => step.id === 'details')?.done).toBe(false);
});

test('the owner alone does not count as a team; one invite does', () => {
  expect(setupChecklist({ ...done, staffCount: 1 }).next?.id).toBe('team');
  expect(setupChecklist({ ...done, staffCount: 2 }).next).toBeNull();
});

test('percent rounds to a whole number: 4 of 6 is 67%', () => {
  const list = setupChecklist({ ...done, hasWifi: false, staffCount: 1 });
  expect(list.percent).toBe(67);
});
