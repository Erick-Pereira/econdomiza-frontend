/**
 * Referência de mercado via gateway SIMC-AG (sem dados fictícios).
 * @see docs/api-contracts.md — GET /api/market-data/price
 */
import { EcondomizaApi } from '../lib/econdomiza-api';

export interface MarketPriceBand {
  category?: string;
  region?: string;
  average?: number;
  median?: number;
  min?: number;
  max?: number;
  sampleSize?: number;
  lastUpdated?: string;
}

export async function fetchMarketPriceReference(category: string, region = 'SP'): Promise<MarketPriceBand> {
  const res = (await EcondomizaApi.getMarketPrice({ category, region })) as { data: MarketPriceBand };
  return res.data ?? {};
}

/** Sem catálogo de produtos no contrato atual — devolve lista vazia. */
export async function searchProducts(): Promise<never[]> {
  return [];
}

export type Product = { id: string; name: string; sku: string; price: number; supplier_name: string; image_url: string };
export type Supplier = { id: string; name: string; email: string; phone: string; country: string; status: string };
export type Category = string;
