/** Helpers para prova real de referências de preço de mercado. */

export type MarketEvidenceRow = {
  scope?: string;
  phase?: string;
  message?: string;
  detail?: string;
};

export type MarketReferenceLinkRow = {
  label?: string;
  url?: string;
};

export type MarketPriceSampleRow = {
  label?: string;
  url?: string;
  priceBrl?: number;
  provider?: string;
};

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export function formatMarketSourceLabel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return 'Fonte não registrada (análise anterior à trilha de evidências)';

  if (s.startsWith('PostgreSQL:PriceHistory')) {
    return 'Histórico de preços no banco (observações anteriores)';
  }
  if (s.startsWith('CuratedCategoryBenchmark:')) {
    const id = s.slice('CuratedCategoryBenchmark:'.length);
    return `Referência legada (catálogo removido: ${id.replace(/_/g, ' ')})`;
  }
  if (s.startsWith('WebScrape:')) {
    return 'Pesquisa web agregada (SearXNG / Bing / DuckDuckGo)';
  }
  if (s === 'DocumentDeclaredReference') {
    return 'Valor declarado na nota fiscal (âncora documental — sem cotação externa confiável)';
  }
  if (s.startsWith('PostgreSQL:')) {
    return `Base interna de preços (${s.slice('PostgreSQL:'.length)})`;
  }
  if (s.startsWith('RedisCache:')) {
    return 'Cache Redis (cotação reutilizada ≤ 1 h)';
  }
  if (s.startsWith('SerpApi')) {
    return 'SerpAPI (Google Shopping)';
  }
  return s;
}

export function formatMarketConfidenceLabel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'document-anchor-only') return 'Somente âncora documental';
  if (s === 'high') return 'Alta';
  if (s === 'medium') return 'Média';
  if (s === 'low') return 'Baixa';
  return (raw ?? '').trim();
}

export type ConfidenceBadgeVariant = 'ok' | 'warn' | 'danger' | 'neutral';

/** Variante visual do badge de confiança (usa valor bruto do backend). */
export function mapConfidenceBadgeVariant(raw: string | null | undefined): ConfidenceBadgeVariant {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return 'neutral';
  if (s === 'high') return 'ok';
  if (s === 'medium') return 'warn';
  if (s === 'document-anchor-only') return 'neutral';
  if (s === 'low') return 'danger';
  return 'neutral';
}

export function isDocumentAnchorSource(source: string | null | undefined): boolean {
  const s = (source ?? '').trim();
  return s === 'DocumentDeclaredReference' || s.startsWith('DocumentDeclared') || /document.?anchor/i.test(s);
}

export function pickDocumentAnchorPrice(row: Record<string, unknown>): number | null {
  const v = row.marketDocumentAnchorPrice ?? row.MarketDocumentAnchorPrice;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function humanizeProviderScope(scope: string | undefined): string {
  const s = (scope ?? '').trim();
  if (!s) return '—';
  if (s.startsWith('provider:')) {
    const id = s.slice('provider:'.length);
    switch (id) {
      case 'searxng':
        return 'SearXNG';
      case 'ddg_lite':
        return 'DuckDuckGo Lite';
      case 'ddg_html':
        return 'DuckDuckGo HTML';
      case 'bing_html':
        return 'Bing HTML';
      case 'bing_rss':
        return 'Bing RSS';
      default:
        return id;
    }
  }
  return s;
}

export function formatProviderOutcome(message: string | undefined): string {
  const m = (message ?? '').trim();
  switch (m) {
    case 'ok':
      return 'OK';
    case 'parse_empty':
      return 'Sem preços parseáveis';
    case 'circuit_open':
      return 'Indisponível (cooldown)';
    case 'http_not_success':
      return 'HTTP erro';
    case 'antibot_html':
      return 'Bloqueio anti-bot';
    case 'connection_refused':
      return 'Conexão recusada';
    default:
      return m || '—';
  }
}

export function extractUrlsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(URL_REGEX)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

/** Links para reproduzir a consulta quando o backend não enviou referenceLinks. */
export function buildReproSearchLinks(query: string | null | undefined): MarketReferenceLinkRow[] {
  const q = (query ?? '').trim();
  if (!q) return [];

  const links: MarketReferenceLinkRow[] = [
    { label: 'Reproduzir no Google', url: `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    { label: 'Reproduzir no Bing', url: `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  ];

  if (/mercadolivre/i.test(q)) {
    const slug = q
      .replace(/site:mercadolivre\.com\.br/gi, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug) {
      links.push({ label: 'Mercado Livre (lista)', url: `https://lista.mercadolivre.com.br/${slug}` });
    }
  }

  return links;
}

export function mergeReferenceLinks(
  primary: MarketReferenceLinkRow[],
  fallback: MarketReferenceLinkRow[],
  evidence: MarketEvidenceRow[]
): MarketReferenceLinkRow[] {
  const seen = new Set<string>();
  const out: MarketReferenceLinkRow[] = [];

  const add = (row: MarketReferenceLinkRow) => {
    const url = (row.url ?? '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({
      label: (row.label ?? '').trim() || 'Referência',
      url,
    });
  };

  for (const row of primary) add(row);
  for (const row of fallback) add(row);

  for (const ev of evidence) {
    for (const url of extractUrlsFromText(ev.detail ?? ev.message)) {
      add({ label: 'URL na evidência', url });
    }
  }

  return out;
}

export function readMarketReferenceLinks(row: Record<string, unknown>): MarketReferenceLinkRow[] {
  const raw = row.marketReferenceLinks ?? row.MarketReferenceLinks;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const url = String(o.url ?? o.Url ?? '').trim();
      if (!url) return null;
      return {
        label: String(o.label ?? o.Label ?? 'Referência').trim(),
        url,
      };
    })
    .filter((x) => x != null) as MarketReferenceLinkRow[];
}

export function readMarketSamples(row: Record<string, unknown>): MarketPriceSampleRow[] {
  const raw = row.marketSamples ?? row.MarketSamples;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const label = String(o.label ?? o.Label ?? '').trim();
      const url = String(o.url ?? o.Url ?? '').trim();
      const priceRaw = o.priceBrl ?? o.PriceBrl;
      const priceBrl =
        typeof priceRaw === 'number'
          ? priceRaw
          : priceRaw != null && priceRaw !== ''
            ? Number(priceRaw)
            : undefined;
      if (!label && !url) return null;
      return {
        label: label || 'Referência',
        url,
        priceBrl: Number.isFinite(priceBrl) && (priceBrl as number) > 0 ? (priceBrl as number) : undefined,
        provider: String(o.provider ?? o.Provider ?? '').trim() || undefined,
      };
    })
    .filter((x) => x != null) as MarketPriceSampleRow[];
}

export function readQuantity(row: Record<string, unknown>): number | null {
  const nfQty = row.nfQuantity ?? row.NfQuantity;
  const nf = typeof nfQty === 'number' ? nfQty : Number(nfQty);
  if (Number.isFinite(nf) && nf > 0) return nf;

  const raw = row.quantity ?? row.Quantity;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readNfUnitPrice(row: Record<string, unknown>): number | null {
  const raw = row.nfUnitPrice ?? row.NfUnitPrice;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readAuditUnitPrice(row: Record<string, unknown>): number {
  const raw = row.lastPrice ?? row.LastPrice ?? 0;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function isPriceAuditCorrected(row: Record<string, unknown>): boolean {
  const raw = row.priceAuditCorrected ?? row.PriceAuditCorrected;
  return raw === true || raw === 'true';
}

export function normalizeExpenseItemKey(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function matchExpenseItem(
  productName: string,
  expenseItems: Record<string, unknown>[]
): Record<string, unknown> | null {
  const key = normalizeExpenseItemKey(productName);
  if (!key) return null;

  let best: Record<string, unknown> | null = null;
  let bestScore = 0;

  for (const item of expenseItems) {
    const desc = String(item.description ?? item.Description ?? '');
    const itemKey = normalizeExpenseItemKey(desc);
    if (!itemKey) continue;

    let score: number;
    if (itemKey === key) {
      score = 100;
    } else if (itemKey.includes(key) || key.includes(itemKey)) {
      score = 80;
    } else {
      const tokensA = key.split('-').filter(Boolean);
      const tokensB = itemKey.split('-').filter(Boolean);
      const overlap = tokensA.filter((t) => tokensB.includes(t)).length;
      score = Math.round((100 * overlap) / Math.max(tokensA.length, tokensB.length));
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= 60 ? best : null;
}

export function readExpenseItemUnit(item: Record<string, unknown>): number | null {
  const raw = item.unitPrice ?? item.UnitPrice;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function readExpenseItemQty(item: Record<string, unknown>): number | null {
  const raw = item.quantity ?? item.Quantity;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isInstallmentSample(
  sample: MarketPriceSampleRow,
  declaredUnitPrice: number | null | undefined
): boolean {
  const label = `${sample.label ?? ''} ${sample.provider ?? ''}`.toLowerCase();
  if (/\b\d{1,2}\s*x\b/.test(label) || /em\s+at[eé]\s+\d{1,2}\s*x/.test(label)) {
    return true;
  }

  if (
    declaredUnitPrice != null &&
    declaredUnitPrice > 0 &&
    sample.priceBrl != null &&
    sample.priceBrl > 0 &&
    sample.priceBrl / declaredUnitPrice < 0.15
  ) {
    return true;
  }

  return false;
}

export type PriceAnalysisSummary = {
  total: number;
  criticalCount: number;
  worstDeviation: number;
  needsLinkConfirmation: boolean;
};

export function summarizePriceAnalyses(rows: Record<string, unknown>[]): PriceAnalysisSummary {
  let criticalCount = 0;
  let worstDeviation = 0;
  let needsLinkConfirmation = false;

  for (const row of rows) {
    const severity = String(row.severity ?? row.Severity ?? '').toUpperCase();
    if (severity === 'CRITICAL') criticalCount += 1;

    const dev = Number(row.deviationPercentage ?? row.DeviationPercentage ?? 0);
    if (Number.isFinite(dev) && Math.abs(dev) > Math.abs(worstDeviation)) {
      worstDeviation = dev;
    }

    const conf = String(row.marketConfidence ?? row.MarketConfidence ?? '').toLowerCase();
    const spreadRaw = row.marketRelativeSpread ?? row.MarketRelativeSpread;
    const spread = typeof spreadRaw === 'number' ? spreadRaw : Number(spreadRaw);
    if (conf === 'low' || (Number.isFinite(spread) && spread > 0.85)) {
      needsLinkConfirmation = true;
    }
  }

  return { total: rows.length, criticalCount, worstDeviation, needsLinkConfirmation };
}

export function readLineTotal(row: Record<string, unknown>): number | null {
  const nfTotal = row.nfLineTotal ?? row.NfLineTotal;
  const nf = typeof nfTotal === 'number' ? nfTotal : Number(nfTotal);
  if (Number.isFinite(nf) && nf > 0) return nf;

  const raw = row.lineTotal ?? row.LineTotal;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readMarketEvidence(row: Record<string, unknown>): MarketEvidenceRow[] {
  const raw = row.marketEvidence ?? row.MarketEvidence;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const scope = String(o.scope ?? o.Scope ?? '');
      const message = String(o.message ?? o.Message ?? '');
      if (!scope && !message) return null;
      return {
        scope,
        phase: String(o.phase ?? o.Phase ?? ''),
        message,
        detail: String(o.detail ?? o.Detail ?? '') || undefined,
      };
    })
    .filter((x) => x != null) as MarketEvidenceRow[];
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
