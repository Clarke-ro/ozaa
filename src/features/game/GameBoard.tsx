import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PHOTO_VEIL } from '@/theme/palette';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { createStack, dropPlate, stepStack, type StackState, type StampRule } from './plateStack';

const BOARD_HEIGHT = 380;
const PLATE_HEIGHT = 18;
const PLATE_BOTTOM = 24;

/**
 * The play area. It owns the game state and redraws itself every animation frame, so the
 * rest of the game screen (scores, nickname box, top scores) only redraws when a plate drops.
 * Remount it with a new `key` to start a fresh game.
 */
export function GameBoard({
  rule,
  onScore,
  onOver,
  overOverlay,
}: {
  rule: StampRule;
  /** Called when the score changes (on a drop, not every frame). */
  onScore: (score: number) => void;
  /** Called once when a run ends, with how long it lasted. */
  onOver: (score: number, durationMs: number) => void;
  /** Shown on top of the board when the run has ended. */
  overOverlay: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [state, setState] = useState<StackState>(() => createStack());

  // Keep the latest callbacks without restarting the effects below when the parent re-renders.
  const callbacks = useRef({ onScore, onOver });
  useEffect(() => {
    callbacks.current = { onScore, onOver };
  });

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

  useEffect(() => {
    callbacks.current.onScore(state.score);
  }, [state.score]);

  // When the run started. The server uses the run's length to reject impossible scores.
  const startedAt = useRef(0);
  const finalScore = state.kind === 'over' ? state.score : null;
  useEffect(() => {
    if (state.kind === 'playing') startedAt.current = Date.now();
  }, [state.kind]);
  // Report each finished run once, from an effect: React may call a setState updater twice.
  useEffect(() => {
    if (finalScore == null) return;
    callbacks.current.onOver(finalScore, Math.max(0, Date.now() - startedAt.current));
  }, [finalScore]);

  const tap = () => setState((current) => dropPlate(current, rule));

  return (
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
          <Text variant="caption" style={styles.center}>
            {t('game.lead')}
          </Text>
          <Button label={t('game.start')} onPress={tap} />
        </View>
      ) : null}
      {state.kind === 'over' ? <View style={styles.overlay}>{overOverlay}</View> : null}
      <View pointerEvents="none" style={[styles.track, { left: state.current?.x ?? 0 }]}>
        <View
          style={[styles.plate, { width: state.current?.w ?? 0, backgroundColor: theme.fill }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { height: BOARD_HEIGHT, borderRadius: 20, overflow: 'hidden' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: PHOTO_VEIL,
  },
  center: { textAlign: 'center' },
  track: { position: 'absolute', bottom: PLATE_BOTTOM },
  plate: { height: PLATE_HEIGHT, borderRadius: 8 },
});
