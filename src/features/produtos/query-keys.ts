export const produtosKeys = {
  all: ['produtos'] as const,
  catalog: (filters: { query: string; category: string; page: number }) =>
    [...produtosKeys.all, 'catalog', filters] as const,
};
