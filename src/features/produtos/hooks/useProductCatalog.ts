import { useQuery } from '@tanstack/react-query';
import { EcondomizaApi } from '../../../services';
import { parseProductCatalogResult } from '../lib/product-catalog-map';
import { produtosKeys } from '../query-keys';

export type ProductCatalogFilters = {
  query: string;
  category: string;
  page: number;
};

export function useProductCatalog(filters: ProductCatalogFilters) {
  return useQuery({
    queryKey: produtosKeys.catalog(filters),
    queryFn: async () => {
      const res = await EcondomizaApi.listProductCatalog({
        query: filters.query.trim() || undefined,
        category: filters.category.trim() || undefined,
        page: filters.page,
        pageSize: 20,
      });
      return parseProductCatalogResult(res.data);
    },
  });
}
