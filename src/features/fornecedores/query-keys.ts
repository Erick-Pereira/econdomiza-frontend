export const fornecedoresKeys = {
  all: ['fornecedores'] as const,
  list: () => [...fornecedoresKeys.all, 'list'] as const,
  qualityAnalysis: () => [...fornecedoresKeys.all, 'quality-analysis'] as const,
};

export type SupplierFormPayload = {
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
};
