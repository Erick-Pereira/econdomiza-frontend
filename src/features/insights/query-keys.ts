export const insightsKeys = {
  all: ['insights'] as const,
  bundle: () => [...insightsKeys.all, 'bundle'] as const,
};
