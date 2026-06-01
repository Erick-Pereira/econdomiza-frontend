export const auditoriaKeys = {
  all: ['auditoria'] as const,
  expenses: () => [...auditoriaKeys.all, 'expenses'] as const,
};
