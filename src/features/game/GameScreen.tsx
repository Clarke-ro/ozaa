import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
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
import { topOfBoard } from './plateStack';

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
  const [saved, setSaved] = useState<{ nickname: string; score: number; mine: true }[]>([]);
  const [stampEarned, setStampEarned] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const rule = {
    minScore: venue.data?.game?.minScore ?? DEFAULT_MIN_SCORE,
    alreadyToday: false,
  };

  const finish = (finalScore: number, durationMs: number) => {
    setBest((value) => Math.max(value, finalScore));
    api
      .submitScore(slug, { score: finalScore, runId: Crypto.randomUUID(), durationMs })
      .then((res) => {
        if (res.stampEarned) setStampEarned(true);
        void client.invalidateQueries({ queryKey: guestKeys.loyaltyAll() });
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
      <Button
        label={t('game.save')}
        onPress={() =>
          nick.trim() && setSaved((rows) => [...rows, { nickname: nick.trim(), score, mine: true }])
        }
      />
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
        {topOfBoard(saved).map((row, index) => (
          <Text key={`${row.nickname}-${index}`}>
            {index + 1} {row.nickname}{' '}
            {row.sample ? t('game.sample') : row.mine ? t('game.you') : ''} {row.score}
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
