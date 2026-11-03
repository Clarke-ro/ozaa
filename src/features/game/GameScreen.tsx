import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useVenue } from '@/features/venue';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { createStack, dropPlate, stepStack, topOfBoard, type StackState } from './plateStack';
import { guestKeys } from '@/lib/queryKeys';

// The contract's example stamp rule, used until the venue's own rule has loaded.
const DEFAULT_MIN_SCORE = 15;

export function GameScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const venue = useVenue(slug);
  const [state, setState] = useState<StackState>(() => createStack());
  const [best, setBest] = useState(0);
  const [nick, setNick] = useState('');
  const [saved, setSaved] = useState<{ nickname: string; score: number; mine: true }[]>([]);
  const [stampEarned, setStampEarned] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  useEffect(() => {
    if (state.kind !== 'playing') return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setState((current) => (current.kind === 'playing' ? stepStack(current, dt) : current));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.kind]);

  const rule = {
    minScore: venue.data?.game?.minScore ?? DEFAULT_MIN_SCORE,
    alreadyToday: false,
  };

  // When the run started. The server uses the run's length to reject impossible scores.
  const startedAt = useRef(0);
  useEffect(() => {
    if (state.kind === 'playing') startedAt.current = Date.now();
  }, [state.kind]);

  // Send each finished run once. This lives in an effect, not in the setState updater,
  // because React may call an updater twice and the score would be sent twice.
  const finalScore = state.kind === 'over' ? state.score : null;
  useEffect(() => {
    if (finalScore == null) return;
    const durationMs = Math.max(0, Date.now() - startedAt.current);
    api
      .submitScore(slug, { score: finalScore, runId: Crypto.randomUUID(), durationMs })
      .then((res) => {
        if (res.stampEarned) setStampEarned(true);
        void client.invalidateQueries({ queryKey: guestKeys.loyaltyAll() });
      })
      .catch(() => setSendFailed(true));
  }, [finalScore, slug, client]);

  const tap = () => setState((current) => dropPlate(current, rule));
  // Best of the earlier runs, plus the one just finished.
  const shownBest = Math.max(best, finalScore ?? 0);
  const playAgain = () => {
    setBest(shownBest);
    setSendFailed(false);
    setState(createStack());
  };

  return (
    <SafeScreen>
      <PageHeader title={t('game.title')} subtitle={venue.data?.name} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={styles.scores}>
          <View>
            <Text variant="caption">{t('game.score')}</Text>
            <Text variant="display-l">{state.score}</Text>
          </View>
          <View>
            <Text variant="caption">{t('game.best')}</Text>
            <Text variant="display-l">{shownBest}</Text>
          </View>
        </View>
        <View style={[styles.board, { backgroundColor: theme.wash }]}>
          {/* The tap layer sits behind the overlays, so their buttons are never inside another button. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.drop')}
            onPress={tap}
            style={StyleSheet.absoluteFill}
          />
          {state.kind === 'ready' ? (
            <View style={styles.overlay}>
              <Text variant="display-m">{t('game.name')}</Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {t('game.lead')}
              </Text>
              <Button label={t('game.start')} onPress={tap} />
            </View>
          ) : null}
          {state.kind === 'over' ? (
            <View style={styles.overlay}>
              <Text variant="display-l">{state.score}</Text>
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
                maxLength={14}
                onChangeText={setNick}
                placeholder={t('game.nick')}
                style={[styles.nick, { borderColor: theme.line }]}
              />
              <Button
                label={t('game.save')}
                onPress={() =>
                  nick.trim() &&
                  setSaved((rows) => [
                    ...rows,
                    { nickname: nick.trim(), score: state.score, mine: true },
                  ])
                }
              />
              <Button label={t('game.again')} tone="secondary" onPress={playAgain} />
            </View>
          ) : null}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 24, left: state.current?.x ?? 0 }}
          >
            <View
              style={{
                width: state.current?.w ?? 0,
                height: 18,
                borderRadius: 8,
                backgroundColor: theme.fill,
              }}
            />
          </View>
        </View>
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
  scores: { flexDirection: 'row', justifyContent: 'space-between' },
  board: { height: 380, borderRadius: 20, overflow: 'hidden' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  nick: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    width: '100%',
  },
});
