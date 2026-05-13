import { fetchMarketPriceReference, searchProducts, type Product, type Supplier, type Category } from './api-market';

export type { Product, Supplier, Category };

export interface SearchParams {
  query?: string;
  brand?: string;
  supplier_name?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

/** Serviço mínimo: catálogo não existe no contrato; apenas referência de preço por categoria. */
export class MercadoService {
  async buscarProdutos(_params: SearchParams = {}) {
    return searchProducts();
  }

  async buscarPorCategoria(_categoria: string) {
    return searchProducts();
  }

  async buscarPorFornecedor(_nome: string) {
    return searchProducts();
  }

  async buscarPorMarca(_marca: string) {
    return searchProducts();
  }

  async listarFornecedores(): Promise<Supplier[]> {
    return [];
  }

  async listarCategorias(): Promise<Category[]> {
    return [];
  }

  referenciaMercado(category: string, region?: string) {
    return fetchMarketPriceReference(category, region);
  }
}

export const mercadoService = new MercadoService();
export default mercadoService;
