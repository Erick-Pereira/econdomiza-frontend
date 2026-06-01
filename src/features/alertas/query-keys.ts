export const alertasKeys = {
  all: ['alertas'] as const,
  list: () => [...alertasKeys.all, 'list'] as const,
};
