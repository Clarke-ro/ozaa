import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useVenue } from '@/features/venue';
import { PageHeader } from '@/ui/PageHeader';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { createStack, dropAligned, dropPlate, stepStack, topOfBoard, type StackState } from './plateStack';

export function GameScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const venue = useVenue(slug);
  const [state, setState] = useState<StackState>(() => createStack());
  const [best, setBest] = useState(0);
  const [nick, setNick] = useState('');
  const [saved, setSaved] = useState<{ nickname: string; score: number; mine: true }[]>([]);

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

  const rule = { minScore: venue.data?.game?.minScore ?? 15, alreadyToday: false };
  const tap = () => {
    setState((current) => {
      const next = dropPlate(current, rule);
      if (next.kind === 'over') setBest((value) => Math.max(value, next.score));
      return next;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.white }}>
      <PageHeader title={t('game.title')} subtitle={venue.data?.name} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={styles.scores}>
          <View>
            <Text variant="caption">{t('game.score')}</Text>
            <Text variant="display-l">{state.score}</Text>
          </View>
          <View>
            <Text variant="caption">{t('game.best')}</Text>
            <Text variant="display-l">{best}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('game.start')} onPress={tap} style={[styles.board, { backgroundColor: theme.wash }]}>
          {state.kind === 'ready' ? (
            <View style={styles.overlay}>
              <Text variant="display-m">{t('game.name')}</Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>{t('game.lead')}</Text>
              <Button label={t('game.start')} onPress={tap} />
            </View>
          ) : null}
          {state.kind === 'over' ? (
            <View style={styles.overlay}>
              <Text variant="display-l">{state.score}</Text>
              <TextInput accessibilityLabel={t('game.nick')} value={nick} maxLength={14} onChangeText={setNick} placeholder={t('game.nick')} style={styles.nick} />
              <Button label={t('game.save')} onPress={() => nick.trim() && setSaved((rows) => [...rows, { nickname: nick.trim(), score: state.score, mine: true }])} />
              <Button label={t('game.again')} tone="secondary" onPress={() => setState(createStack())} />
            </View>
          ) : null}
          <View style={{ position: 'absolute', bottom: 24, left: state.current?.x ?? 0 }}>
            <View style={{ width: state.current?.w ?? 0, height: 18, borderRadius: 8, backgroundColor: theme.fill }} />
          </View>
        </Pressable>
        <Text variant="body-strong">{t('game.board', { name: venue.data?.name ?? '' })}</Text>
        {topOfBoard(saved).map((row, index) => (
          <Text key={`${row.nickname}-${index}`}>
            {index + 1} {row.nickname} {row.sample ? t('game.sample') : row.mine ? t('game.you') : ''} {row.score}
          </Text>
        ))}
        <Text variant="caption" style={{ color: theme.meta }}>{t('game.offline')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Align" onPress={() => setState((current) => dropAligned(current, rule))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scores: { flexDirection: 'row', justifyContent: 'space-between' },
  board: { height: 380, borderRadius: 20, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, backgroundColor: 'rgba(255,255,255,0.92)' },
  nick: { borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12, height: 48, paddingHorizontal: 12, width: '100%' },
});
