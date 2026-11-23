import { signedInMock } from './testOwner';

test('a round saved without a name, then named, joins the board with that score', async () => {
  const { api, setGuest } = await signedInMock();
  setGuest(
    (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '12' })).guestToken,
  );
  const round = { runId: '1b4e28ba-2fa1-41d2-883f-0016d3cca427', score: 30, durationMs: 90_000 };
  await api.submitScore('mamas-kitchen', round);
  const names = async () =>
    (await api.getLeaderboard('mamas-kitchen')).entries
      .filter((e) => !e.sample)
      .map((e) => `${e.nickname} ${e.score}`);
  expect(await names()).toEqual([]);
  await api.submitScore('mamas-kitchen', { ...round, nickname: 'Adwoa' });
  expect(await names()).toEqual(['Adwoa 30']);
  // The board still holds five, the samples below the real score.
  const board = (await api.getLeaderboard('mamas-kitchen')).entries;
  expect(board).toHaveLength(5);
  expect(board[0]).toMatchObject({ rank: 1, nickname: 'Adwoa', score: 30 });
});
