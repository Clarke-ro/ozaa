import { pickTag } from './customerTag';

describe('pickTag', () => {
  it('puts a reward to claim first', () => {
    expect(pickTag({ tags: ['regular'], rewardsAvailable: 1 })).toBe('reward_ready');
  });
  it('falls back to the activity tags in order', () => {
    expect(pickTag({ tags: ['quiet', 'regular'], rewardsAvailable: 0 })).toBe('regular');
  });
  it('gives nothing for a member with no tags', () => {
    expect(pickTag({ rewardsAvailable: 0 })).toBeUndefined();
  });
});
