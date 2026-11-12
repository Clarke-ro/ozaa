import { quickReplies } from './quickReplies';

test('a bill call offers "Bringing your bill"; "something else" gets only the general ones', () => {
  expect(quickReplies('bill')).toEqual(['now', 'twoMin', 'bill']);
  expect(quickReplies('other')).toEqual(['now', 'twoMin']);
});
