import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/ui/theme';

/** A small 2 px trend line for a metric tile. Decorative: the tile's own number carries the value. */
export function Sparkline({ values, height = 32 }: { values: number[]; height?: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const d = values
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`,
    )
    .join(' ');
  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && values.length > 1 ? (
        <Svg width={width} height={height}>
          <Path
            d={d}
            stroke={theme.ink}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
