import React, { useEffect, useState } from 'react';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services/api';

interface ExpenseRow {
  id: string;
  description: string;
  supplierName: string;
  totalAmount: number;
  status: string;
  issueDate: string;
}

const AuditoriaPage: React.FC = () => {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const result = await EcondomizaApi.listExpenses({ page: 1, pageSize: 100 });
      const raw = normalizeListPayload(result.data);
      const mapped: ExpenseRow[] = (raw as Record<string, unknown>[]).map((ex) => {
        const supplier = ex.supplier as Record<string, unknown> | undefined;
        const name =
          (supplier?.normalizedName as string) ||
          (supplier?.name as string) ||
          (ex.supplierName as string) ||
          '—';
        return {
          id: String(ex.id ?? ''),
          description: String(ex.description ?? ex.category ?? ''),
          supplierName: name,
          totalAmount: Number(ex.amount ?? ex.totalAmount ?? 0),
          status: String(ex.status ?? '—'),
          issueDate: String(ex.date ?? ex.issueDate ?? ''),
        };
      });
      setRows(mapped);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const file = files[0];
    setUploading(true);
    setUploadMsg(null);
    try {
      await EcondomizaApi.uploadDocument(file, { documentType: 'INVOICE', source: 'frontend' });
      setUploadMsg(`Ficheiro "${file.name}" enviado para ingestão.`);
      await load();
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const formatDatePt = (iso: string): string => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading && rows.length === 0) {
    return (
      <div className="auditoria-loading">
        <p>Carregando…</p>
      </div>
    );
  }

  if (error && !rows.length) {
    return (
      <div className="auditoria-error">
        <p>{error}</p>
        <button type="button" onClick={() => void load()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="page" id="auditoria-page">
      <div className="page-header">
        <h1>Auditoria</h1>
        <p>Despesas processadas e upload para ingestão (documentos)</p>
      </div>

      {uploadMsg && (
        <div className="card upload-result">
          <p>{uploadMsg}</p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Upload de documentos</h2>
        </div>
        <div className="upload-area" id="uploadArea">
          <i className="fas fa-cloud-upload-alt"></i>
          <p>Arraste ficheiros ou clique para selecionar</p>
          <small>PDF, JPG, PNG (conforme política do gateway)</small>
          <input
            type="file"
            id="fileInput"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
            onChange={(e) => void handleFileChange(e)}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <p>
            <button type="button" className="btn-primary" disabled={uploading} onClick={() => document.getElementById('fileInput')?.click()}>
              {uploading ? 'A enviar…' : 'Selecionar ficheiro'}
            </button>
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Despesas / auditoria</h2>
        </div>
        <div className="audits-table">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Data</th>
                <th>Estado</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody id="auditoriaExpensesTbody">
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id} data-expense-id={r.id}>
                    <td>{r.description}</td>
                    <td>{r.supplierName}</td>
                    <td>{formatDatePt(r.issueDate)}</td>
                    <td>{r.status}</td>
                    <td>{formatCurrency(r.totalAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Sem despesas. Verifique permissões (Conselho) ou carregue documentos acima.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaPage;
