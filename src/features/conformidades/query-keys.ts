export const conformidadesKeys = {
  all: ['conformidades'] as const,
  hub: (tenantId: string) => [...conformidadesKeys.all, 'hub', tenantId] as const,
  expense: (expenseId: string) => [...conformidadesKeys.all, 'expense', expenseId] as const,
};

export type AddConformityPayload = {
  description: string;
  dueDate: string | null;
};
