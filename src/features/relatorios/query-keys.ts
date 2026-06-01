export const relatoriosKeys = {
  all: ['relatorios'] as const,
  yearOverYear: (yearsBack: number) => [...relatoriosKeys.all, 'year-over-year', yearsBack] as const,
};

export type ReportPeriod = 'monthly' | 'quarterly' | 'annual';
