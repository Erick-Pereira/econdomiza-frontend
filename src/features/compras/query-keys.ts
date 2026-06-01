export const comprasKeys = {
  all: ['compras'] as const,
  list: (processingFilter: string) => [...comprasKeys.all, 'list', processingFilter] as const,
};
