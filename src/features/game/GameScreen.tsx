import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { guestKeys } from '@/lib/queryKeys';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { GameBoard } from './GameBoard';

// The contract's example stamp rule, used until the venue's own rule has loaded.
const DEFAULT_MIN_SCORE = 15;
const NICK_MAX = 14;

export function GameScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const venue = useVenue(slug);
  // Each run gets a fresh board: Play again bumps this, which remounts GameBoard.
  const [run, setRun] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [nick, setNick] = useState('');
  // The round just played. Save sends it again with the name, so the server names that score.
  const [round, setRound] = useState<{ runId: string; score: number; durationMs: number } | null>(
    null,
  );
  const [savedName, setSavedName] = useState<string | null>(null);
  // Which round the name was saved for, so "Saved as …" shows for that round only.
  const [savedRun, setSavedRun] = useState<string | null>(null);
  // This week's top five at the venue, from the server (the demo mixes in sample players).
  const board = useQuery({
    queryKey: guestKeys.leaderboard(slug),
    queryFn: () => api.getLeaderboard(slug),
  });
  const [stampEarned, setStampEarned] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const rule = {
    minScore: venue.data?.game?.minScore ?? DEFAULT_MIN_SCORE,
    alreadyToday: false,
  };

  const finish = (finalScore: number, durationMs: number) => {
    setBest((value) => Math.max(value, finalScore));
    const played = { runId: Crypto.randomUUID(), score: finalScore, durationMs };
    setRound(played);
    api
      .submitScore(slug, played)
      .then((res) => {
        if (res.stampEarned) setStampEarned(true);
        void client.invalidateQueries({ queryKey: guestKeys.loyaltyAll() });
        void client.invalidateQueries({ queryKey: guestKeys.leaderboard(slug) });
      })
      .catch(() => setSendFailed(true));
  };

  const saveName = () => {
    const nickname = nick.trim();
    if (!nickname || !round) return;
    api
      .submitScore(slug, { ...round, nickname })
      .then(() => {
        setSavedName(nickname);
        setSavedRun(round.runId);
        void client.invalidateQueries({ queryKey: guestKeys.leaderboard(slug) });
      })
      .catch(() => setSendFailed(true));
  };

  const playAgain = () => {
    setSendFailed(false);
    setScore(0);
    setRun((n) => n + 1);
  };

  const overOverlay = (
    <>
      <Text variant="display-l">{score}</Text>
      {stampEarned ? (
        <Text variant="caption" style={{ color: theme.fill }}>
          {t('game.earned')}
        </Text>
      ) : null}
      {sendFailed ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {t('game.sendFailed')}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={t('game.nick')}
        value={nick}
        maxLength={NICK_MAX}
        onChangeText={setNick}
        placeholder={t('game.nick')}
        style={[styles.nick, { borderColor: theme.line }]}
      />
      <Button label={t('game.save')} onPress={saveName} />
      {savedName && savedRun === round?.runId ? (
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('game.saved', { name: savedName })}
        </Text>
      ) : null}
      <Button label={t('game.again')} tone="secondary" onPress={playAgain} />
    </>
  );

  return (
    <SafeScreen>
      <PageHeader title={t('game.title')} subtitle={venue.data?.name} />
      <View style={styles.page}>
        <View style={styles.scores}>
          <View>
            <Text variant="caption">{t('game.score')}</Text>
            <Text variant="display-l">{score}</Text>
          </View>
          <View>
            <Text variant="caption">{t('game.best')}</Text>
            <Text variant="display-l">{best}</Text>
          </View>
        </View>
        <GameBoard
          key={run}
          rule={rule}
          onScore={setScore}
          onOver={finish}
          overOverlay={overOverlay}
        />
        <Text variant="body-strong">{t('game.board', { name: venue.data?.name ?? '' })}</Text>
        {(board.data?.entries ?? []).map((row) => (
          <Text key={`${row.rank}-${row.nickname}`}>
            {row.rank} {row.nickname}{' '}
            {row.sample ? t('game.sample') : row.nickname === savedName ? t('game.you') : ''}{' '}
            {row.score}
          </Text>
        ))}
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('game.offline')}
        </Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  scores: { flexDirection: 'row', justifyContent: 'space-between' },
  nick: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    width: '100%',
  },
});
