import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_API_MODE: z.enum(['mock', 'http']).default('mock'),
  EXPO_PUBLIC_API_URL: z.string().default('http://localhost:4000/v1'),
  EXPO_PUBLIC_API_LIVE: z.string().default(''),
  EXPO_PUBLIC_MOCK_LATENCY_MS: z.coerce.number().default(400),
  EXPO_PUBLIC_MOCK_FAIL_RATE: z.coerce.number().min(0).max(1).default(0),
  EXPO_PUBLIC_MOCK_FAST: z.enum(['0', '1']).default('0'),
});

export type Env = z.infer<typeof schema> & { live: string[] };

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.parse({
    EXPO_PUBLIC_API_MODE: source.EXPO_PUBLIC_API_MODE || undefined,
    EXPO_PUBLIC_API_URL: source.EXPO_PUBLIC_API_URL || undefined,
    EXPO_PUBLIC_API_LIVE: source.EXPO_PUBLIC_API_LIVE || undefined,
    EXPO_PUBLIC_MOCK_LATENCY_MS: source.EXPO_PUBLIC_MOCK_LATENCY_MS || undefined,
    EXPO_PUBLIC_MOCK_FAIL_RATE: source.EXPO_PUBLIC_MOCK_FAIL_RATE || undefined,
    EXPO_PUBLIC_MOCK_FAST: source.EXPO_PUBLIC_MOCK_FAST || undefined,
  });
  return { ...parsed, live: parsed.EXPO_PUBLIC_API_LIVE.split(',').map((item) => item.trim()).filter(Boolean) };
}

export const env = readEnv();
