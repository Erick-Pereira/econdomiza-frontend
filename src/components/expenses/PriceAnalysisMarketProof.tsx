import React from 'react';
import { AlertTriangle, ExternalLink, FileText, Link2, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui';
import type { BadgeVariant } from '../ui/Badge';
import {
  buildReproSearchLinks,
  formatMarketConfidenceLabel,
  formatMarketSourceLabel,
  formatProviderOutcome,
  humanizeProviderScope,
  isDocumentAnchorSource,
  isInstallmentSample,
  isPriceAuditCorrected,
  isSafeExternalUrl,
  mapConfidenceBadgeVariant,
  matchExpenseItem,
  mergeReferenceLinks,
  pickDocumentAnchorPrice,
  readAuditUnitPrice,
  readExpenseItemQty,
  readExpenseItemUnit,
  readLineTotal,
  readMarketEvidence,
  readMarketReferenceLinks,
  readMarketSamples,
  readNfUnitPrice,
  readQuantity,
  type MarketEvidenceRow,
} from '../../lib/market-price-proof';

export type PriceAnalysisRow = Record<string, unknown>;
export type ExpenseItemRow = Record<string, unknown>;

type Props = {
  row: PriceAnalysisRow;
  expenseItems?: ExpenseItemRow[];
  formatCurrency: (value: number | null | undefined) => string;
  formatAnalyzedAt?: (iso: string) => string;
};

function providerEvidence(evidence: MarketEvidenceRow[]) {
  return evidence.filter((e) => (e.scope ?? '').startsWith('provider:'));
}

export const PriceAnalysisMarketProof: React.FC<Props> = ({
  row,
  expenseItems = [],
  formatCurrency,
  formatAnalyzedAt,
}) => {
  const productName = String(row.productName ?? row.ProductName ?? row.productId ?? row.ProductId ?? '—');
  const auditUnitPrice = readAuditUnitPrice(row);
  const nfUnitFromAudit = readNfUnitPrice(row);
  const matchedItem = matchExpenseItem(productName, expenseItems);
  const nfUnitFromItem = matchedItem ? readExpenseItemUnit(matchedItem) : null;
  const nfUnitPrice = nfUnitFromAudit ?? nfUnitFromItem ?? auditUnitPrice;
  const quantity = readQuantity(row) ?? (matchedItem ? readExpenseItemQty(matchedItem) : null);
  const lineTotal = readLineTotal(row);
  const auditCorrected =
    isPriceAuditCorrected(row) ||
    (nfUnitFromAudit != null && Math.abs(nfUnitFromAudit - auditUnitPrice) > 0.05);
  const unitMismatch =
    auditCorrected ||
    (nfUnitPrice > 0 && auditUnitPrice > 0 && Math.abs(nfUnitPrice - auditUnitPrice) / nfUnitPrice > 0.05);

  const market = Number(row.marketAverage ?? row.MarketAverage ?? 0);
  const historical = Number(row.historicalAverage ?? row.HistoricalAverage ?? 0);
  const deviation = Number(row.deviationPercentage ?? row.DeviationPercentage ?? 0);
  const severity = String(row.severity ?? row.Severity ?? '');
  const analyzedAt = String(row.analyzedAt ?? row.AnalyzedAt ?? '');
  const marketSourceRaw = String(row.marketSource ?? row.MarketSource ?? '');
  const marketSearchQuery = String(row.marketSearchQuery ?? row.MarketSearchQuery ?? '');
  const marketSampleCount = row.marketSampleCount ?? row.MarketSampleCount;
  const marketRelativeSpread = row.marketRelativeSpread ?? row.MarketRelativeSpread;
  const marketConfidenceRaw = String(row.marketConfidence ?? row.MarketConfidence ?? '');
  const marketConfidence = formatMarketConfidenceLabel(marketConfidenceRaw);
  const confidenceVariant = mapConfidenceBadgeVariant(marketConfidenceRaw) as BadgeVariant;
  const isLowConfidence =
    marketConfidenceRaw.trim().toLowerCase() === 'low' ||
    marketConfidenceRaw.trim().toLowerCase() === 'baixa';
  const spreadNum =
    typeof marketRelativeSpread === 'number'
      ? marketRelativeSpread
      : marketRelativeSpread != null
        ? Number(marketRelativeSpread)
        : NaN;
  const hasHighSpread = Number.isFinite(spreadNum) && spreadNum > 0.85;
  const documentAnchor = pickDocumentAnchorPrice(row);
  const isDocAnchor = isDocumentAnchorSource(marketSourceRaw) || documentAnchor != null;
  const displayMarketRef = market > 0 ? market : documentAnchor;
  const marketRefIsAnchor = market <= 0 && documentAnchor != null;

  const evidence = readMarketEvidence(row);
  const providers = providerEvidence(evidence);
  const marketSamples = readMarketSamples(row);
  const referenceLinks = mergeReferenceLinks(
    readMarketReferenceLinks(row),
    marketSamples.length === 0 ? buildReproSearchLinks(marketSearchQuery) : [],
    marketSamples.length === 0 ? evidence : []
  ).filter((l) => isSafeExternalUrl(l.url ?? ''));

  const severityVariant =
    severity.toUpperCase() === 'CRITICAL'
      ? 'error'
      : severity.toUpperCase() === 'WARNING'
        ? 'warning'
        : 'neutral';

  const deviationBarWidth = Number.isFinite(deviation) ? `${Math.min(100, Math.abs(deviation) / 5)}%` : '0%';

  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="font-medium text-text-main">{productName}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {marketConfidence && (
            <Badge variant={confidenceVariant} title="Confiança da referência de mercado">
              <ShieldCheck size={12} aria-hidden />
              {marketConfidence}
            </Badge>
          )}
          {severity && <Badge variant={severityVariant}>{severity}</Badge>}
        </div>
      </div>

      {unitMismatch && (
        <div className="mb-3 rounded-md border border-red-200/70 bg-red-50/80 dark:bg-red-950/30 px-3 py-2 text-xs text-red-900 dark:text-red-100 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Pipeline usou total da linha como unitário ({formatCurrency(auditUnitPrice)}). Exibindo valor da
            NF: {formatCurrency(nfUnitPrice)}
            {quantity != null ? ` · ${quantity} un.` : ''}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <section className="rounded-md border border-surface-border/60 bg-surface-base/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1">
            <FileText size={12} aria-hidden />
            Nota fiscal
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-text-muted">Preço unitário</dt>
              <dd className="font-semibold tabular-nums text-lg">{formatCurrency(nfUnitPrice)}</dd>
            </div>
            {quantity != null && (
              <div>
                <dt className="text-text-muted">Quantidade</dt>
                <dd className="font-medium tabular-nums">{quantity} un.</dd>
              </div>
            )}
            <div>
              <dt className="text-text-muted">Total linha</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(lineTotal ?? (quantity != null ? nfUnitPrice * quantity : nfUnitPrice))}
              </dd>
            </div>
          </dl>
          {matchedItem && quantity != null && (
            <p className="mt-2 text-[11px] text-text-muted">
              Conferido com item da NF: {quantity} × {formatCurrency(nfUnitPrice)}
            </p>
          )}
        </section>

        <section className="rounded-md border border-surface-border/60 bg-surface-base/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Mercado</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-text-muted">Referência</dt>
              <dd className="font-semibold tabular-nums text-lg">{formatCurrency(displayMarketRef)}</dd>
              {marketRefIsAnchor && (
                <dd className="text-[11px] text-text-muted mt-0.5">Âncora documental (NF)</dd>
              )}
            </div>
            <div>
              <dt className="text-text-muted">Confiança</dt>
              <dd>{marketConfidence || '—'}</dd>
            </div>
            {Number.isFinite(spreadNum) && spreadNum > 0 && (
              <div>
                <dt className="text-text-muted">Dispersão</dt>
                <dd className="tabular-nums">{(spreadNum * 100).toFixed(0)}%</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-md border border-surface-border/60 bg-surface-base/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Desvio</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-text-muted">vs mercado</dt>
              <dd className="font-semibold tabular-nums text-lg">
                {Number.isFinite(deviation) ? `${deviation.toFixed(1)}%` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Média histórica</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(historical > 0 ? historical : null)}
              </dd>
            </div>
          </dl>
          {Number.isFinite(deviation) && (
            <div className="mt-3 h-1.5 rounded-full bg-surface-border/60 overflow-hidden">
              <div
                className={`h-full rounded-full ${deviation > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: deviationBarWidth }}
              />
            </div>
          )}
        </section>
      </div>

      {isDocAnchor && (
        <p className="mt-3 text-xs text-text-muted rounded-md border border-surface-border/50 bg-surface-base/40 px-2.5 py-2">
          A pesquisa web não devolveu preço utilizável. A referência exibida é o valor declarado na nota
          fiscal. Use os links abaixo para verificar independentemente.
        </p>
      )}

      {!isDocAnchor &&
        (isLowConfidence || hasHighSpread) &&
        displayMarketRef != null &&
        displayMarketRef > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2.5 text-xs text-text-main">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-warning" aria-hidden />
            <p>
              Referência de mercado com confiança baixa ou alta dispersão — confirme nos links antes de
              concluir.
            </p>
          </div>
        )}

      <details className="mt-4 group">
        <summary className="text-xs cursor-pointer text-brand-primary hover:underline list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Detalhes técnicos e referências
        </summary>
        <div className="mt-3 pt-3 border-t border-surface-border/60 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
              Fonte da referência de mercado
            </p>
            <p className="text-sm text-text-main">{formatMarketSourceLabel(marketSourceRaw)}</p>
            {marketSearchQuery && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-text-muted">
                <Search size={12} className="mt-0.5 shrink-0 opacity-70" aria-hidden />
                <span className="break-all">{marketSearchQuery}</span>
              </div>
            )}
            {marketSampleCount != null && Number(marketSampleCount) > 0 && (
              <p className="mt-1 text-xs text-text-muted">Amostras web: {String(marketSampleCount)}</p>
            )}
          </div>

          {marketSamples.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1">
                <Link2 size={12} aria-hidden />
                Referências de mercado
              </p>
              <ul className="flex flex-col gap-1.5">
                {marketSamples.map((sample) => {
                  const href = (sample.url ?? '').trim();
                  const hasLink = isSafeExternalUrl(href);
                  const hasConfirmedPrice = sample.priceBrl != null && sample.priceBrl > 0;
                  const installment = isInstallmentSample(sample, nfUnitPrice);
                  const key = `${sample.label}-${href || String(sample.priceBrl ?? 'no-price')}`;
                  return (
                    <li
                      key={key}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-2 text-sm ${
                        installment
                          ? 'border-status-warning/30 bg-status-warning/5 opacity-90'
                          : 'border-surface-border/50 bg-surface-base/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hasLink ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-start gap-1.5 font-medium text-brand-primary hover:underline break-all"
                            >
                              <ExternalLink size={14} className="mt-0.5 shrink-0" aria-hidden />
                              <span>{sample.label || 'Referência'}</span>
                            </a>
                          ) : (
                            <span className="font-medium text-text-main">{sample.label || 'Referência'}</span>
                          )}
                          {installment && <Badge variant="warning">Parcela — não usar como referência</Badge>}
                        </div>
                        {hasLink && !hasConfirmedPrice && (
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Preço não confirmado no snippet — abra o link para verificar.
                          </p>
                        )}
                      </div>
                      {hasConfirmedPrice && (
                        <span
                          className={`font-semibold tabular-nums shrink-0 ${
                            installment ? 'line-through text-text-muted' : 'text-text-main'
                          }`}
                        >
                          {formatCurrency(sample.priceBrl)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {referenceLinks.length > 0 && marketSamples.length === 0 && (
            <ul className="flex flex-col gap-1.5">
              {referenceLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-sm text-brand-primary hover:underline break-all"
                  >
                    <ExternalLink size={14} className="mt-0.5 shrink-0" aria-hidden />
                    <span>{link.label || 'Referência'}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {providers.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {providers.map((p, i) => (
                <li
                  key={`${p.scope}-${i}`}
                  className="flex items-center justify-between gap-2 rounded border border-surface-border/50 bg-surface-base/40 px-2 py-1.5"
                >
                  <span className="font-medium text-text-main">{humanizeProviderScope(p.scope)}</span>
                  <span className="text-text-muted tabular-nums">{formatProviderOutcome(p.message)}</span>
                </li>
              ))}
            </ul>
          )}

          {evidence.length > 0 && (
            <ul className="space-y-1.5 text-xs text-text-muted max-h-52 overflow-y-auto">
              {evidence.map((ev, evIdx) => (
                <li
                  key={evIdx}
                  className="rounded border border-surface-border/50 bg-surface-base/50 px-2 py-1.5"
                >
                  <span className="font-medium text-text-main">{humanizeProviderScope(ev.scope) || '—'}</span>
                  {ev.message && <p>{formatProviderOutcome(ev.message)}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {analyzedAt && (
        <p className="text-xs text-text-muted mt-2">
          Analisado em {formatAnalyzedAt ? formatAnalyzedAt(analyzedAt) : analyzedAt}
        </p>
      )}
    </div>
  );
};
