import { describe, expect, it } from 'vitest';
import {
  buildReproSearchLinks,
  extractUrlsFromText,
  formatMarketSourceLabel,
  mapConfidenceBadgeVariant,
  mergeReferenceLinks,
  pickDocumentAnchorPrice,
  readMarketSamples,
} from './market-price-proof';

describe('market-price-proof', () => {
  it('formatMarketSourceLabel traduz histórico PostgreSQL', () => {
    expect(formatMarketSourceLabel('PostgreSQL:PriceHistory')).toContain('Histórico');
  });

  it('buildReproSearchLinks inclui Google e Mercado Livre quando site: presente', () => {
    const links = buildReproSearchLinks('NVR 16 canais IP preço site:mercadolivre.com.br');
    expect(links.some((l) => l.label?.includes('Google'))).toBe(true);
    expect(links.some((l) => l.url?.includes('lista.mercadolivre.com.br'))).toBe(true);
  });

  it('extractUrlsFromText encontra URLs em texto', () => {
    const urls = extractUrlsFromText('ver https://example.com/produto e http://loja.test/item');
    expect(urls).toEqual(['https://example.com/produto', 'http://loja.test/item']);
  });

  it('mergeReferenceLinks deduplica por URL', () => {
    const merged = mergeReferenceLinks(
      [{ label: 'A', url: 'https://example.com/x' }],
      [{ label: 'B', url: 'https://example.com/x' }],
      [{ detail: 'ref https://other.com/y' }]
    );
    expect(merged).toHaveLength(2);
    expect(merged.map((l) => l.url)).toContain('https://other.com/y');
  });

  it('mapConfidenceBadgeVariant mapeia níveis', () => {
    expect(mapConfidenceBadgeVariant('high')).toBe('ok');
    expect(mapConfidenceBadgeVariant('medium')).toBe('warn');
    expect(mapConfidenceBadgeVariant('low')).toBe('danger');
    expect(mapConfidenceBadgeVariant('document-anchor-only')).toBe('neutral');
  });

  it('pickDocumentAnchorPrice lê valor numérico', () => {
    expect(pickDocumentAnchorPrice({ marketDocumentAnchorPrice: 950000 })).toBe(950000);
    expect(pickDocumentAnchorPrice({})).toBeNull();
  });

  it('readMarketSamples lê amostras com preço e link', () => {
    const samples = readMarketSamples({
      marketSamples: [
        { label: 'Mercado Livre', url: 'https://mercadolivre.com.br/x', priceBrl: 890, provider: 'searxng' },
      ],
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.priceBrl).toBe(890);
    expect(samples[0]?.url).toContain('mercadolivre');
  });
});
