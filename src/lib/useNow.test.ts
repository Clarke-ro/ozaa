import { act, renderHook } from '@testing-library/react-native';
import { useNow } from './useNow';

jest.useFakeTimers();

test('re-reads the clock on its interval and stops when unmounted', async () => {
  jest.setSystemTime(new Date('2026-11-15T10:00:00Z'));
  const hook = await renderHook(() => useNow(1000));
  const first = hook.result.current;
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(hook.result.current).toBe(first + 1000);
  // Closing the screen must stop the ticking, or it keeps running in the background.
  const clear = jest.spyOn(globalThis, 'clearInterval');
  await hook.unmount();
  expect(clear).toHaveBeenCalled();
  clear.mockRestore();
});
