import React, { useState } from 'react';
import type { MarketPriceBand } from '../services/api-market';
import mercadoService from '../services/MercadoService';
import { formatApiError } from '../lib/api-error-message';

/**
 * Referência de mercado via gateway `GET /api/market-data/price`.
 * Não há catálogo de produtos no contrato atual (lista vazia em MercadoService.buscarProdutos).
 */
const MercadoPage: React.FC = () => {
  const [category, setCategory] = useState('Limpeza Predial');
  const [region, setRegion] = useState('SP');
  const [band, setBand] = useState<MarketPriceBand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await mercadoService.referenciaMercado(category.trim() || 'Limpeza Predial', region.trim() || 'SP');
      setBand(data);
    } catch (err: unknown) {
      setBand(null);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n?: number) =>
    n != null && Number.isFinite(n)
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
      : '—';

  return (
    <div className="page" id="mercado-page">
      <div className="page-header">
        <h1>Mercado</h1>
        <p>Referência agregada de preços por categoria (dados reais do gateway quando disponíveis).</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Consulta de referência</h2>
        </div>
        <form onSubmit={handleConsultar} className="settings-form" style={{ maxWidth: 480 }}>
          <div className="form-group">
            <label className="field-label" htmlFor="mercado-categoria">
              Categoria
            </label>
            <input
              id="mercado-categoria"
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Limpeza Predial"
              required
            />
          </div>
          <div className="form-group">
            <label className="field-label" htmlFor="mercado-regiao">
              Região
            </label>
            <input
              id="mercado-regiao"
              className="form-input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="SP"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'A consultar…' : 'Consultar'}
          </button>
        </form>
      </div>

      {error && <p className="auth-screen-error" style={{ marginTop: 16 }}>{error}</p>}

      {band && Object.keys(band).length > 0 && (
        <div className="metrics-grid" style={{ marginTop: 24 }}>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Média</h3>
            </div>
            <div className="metric-value">{fmt(band.average)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Mediana</h3>
            </div>
            <div className="metric-value">{fmt(band.median)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Mín / Máx</h3>
            </div>
            <div className="metric-value">
              {fmt(band.min)} / {fmt(band.max)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Amostras</h3>
            </div>
            <div className="metric-value">{band.sampleSize != null ? String(band.sampleSize) : '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MercadoPage;
