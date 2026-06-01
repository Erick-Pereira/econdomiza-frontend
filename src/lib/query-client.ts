import { QueryClient } from '@tanstack/react-query';

const STALE_TIME_MS = 30_000;
const GC_TIME_MS = 5 * 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        retry: 3,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
