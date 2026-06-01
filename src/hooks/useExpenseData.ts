import { useState } from 'react';

export const useExpenseData = (_expenseId?: string) => {
  const [data] = useState(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return { data, isLoading, error };
};
