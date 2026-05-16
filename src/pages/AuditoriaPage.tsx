import React, { useEffect, useState } from 'react';
import { useAuthSession } from '../context/AuthSessionContext';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { roleAllowsAuditDocumentUpload } from '../features/auditoria';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { TableScrollHint } from '../components/layout/TableScrollHint';

interface ExpenseRow {
  id: string;
  description: string;
  supplierName: string;
  totalAmount: number;
  status: string;
  issueDate: string;
}

const AuditoriaPage: React.FC = () => {
  const { profile } = useAuthSession();
  const canUpload = roleAllowsAuditDocumentUpload(profile?.role);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadPipelineNote, setUploadPipelineNote] = useState<string | null>(null);

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
    if (!files?.length || !canUpload) return;
    const file = files[0];
    setUploading(true);
    setUploadMsg(null);
    setUploadPipelineNote(null);
    try {
      const res = await EcondomizaApi.uploadDocument(file, { documentType: 'INVOICE', source: 'frontend' });
      const d = (res.data ?? {}) as Record<string, unknown>;
      const processingNote = String(d.processingNote ?? '').trim();
      const deduplicated = d.deduplicated === true;
      const documentId = d.documentId != null ? String(d.documentId) : '';

      if (deduplicated) {
        setUploadMsg(
          `Este arquivo já foi enviado para o mesmo condomínio (conteúdo duplicado). Documento existente: ${
            documentId || '—'
          }.`
        );
      } else {
        setUploadMsg(`Ficheiro "${file.name}" aceite pela ingestão.${documentId ? ` Documento: ${documentId}.` : ''}`);
      }

      if (processingNote) {
        setUploadPipelineNote(processingNote);
      }
      if (d.publishedDataIngestedEvent === false && !processingNote) {
        setUploadPipelineNote(
          'O processamento downstream pode não ter sido notificado (verifique tenant no JWT e filas RabbitMQ).'
        );
      }

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
      <div className="page page-state" id="auditoria-page">
        <p>Carregando despesas…</p>
        <div className="skeleton-card" style={{ width: '100%', maxWidth: 520 }}>
          <div className="skeleton-block" style={{ width: '55%' }} />
          <div className="skeleton-block" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (error && !rows.length) {
    return (
      <div className="page page-state page-state--error" id="auditoria-page">
        <p>{error}</p>
        <button type="button" className="btn-primary" onClick={() => void load()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="page" id="auditoria-page">
      <PageHeader
        title="Auditoria"
        description="Consulte despesas já processadas e envie novas notas ou documentos para ingestão."
        layout="stack"
        quickLinks={[
          { to: '/compras', label: 'Compras / despesas' },
          { to: '/fornecedores', label: 'Fornecedores' },
          { to: '/produtos', label: 'Produtos' },
        ]}
      />

      {error && rows.length > 0 && <div className="banner banner--error">{error}</div>}

      {uploadPipelineNote && (
        <div className="banner banner--info" role="status">
          <strong>Pipeline de processamento.</strong> {uploadPipelineNote}
        </div>
      )}

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
          <p>Arraste arquivos ou clique para selecionar</p>
          <small>PDF, JPG, PNG ou Excel, conforme política de ingestão do sistema</small>
          {!canUpload && (
            <p className="form-help" style={{ marginTop: 'var(--spacing-md)' }}>
              O envio de documentos está reservado ao <strong>Síndico</strong> (ou administrador). O seu perfil tem
              acesso de leitura às despesas; não é possível iniciar ingestão a partir desta conta.
            </p>
          )}
          <input
            type="file"
            id="fileInput"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
            onChange={(e) => void handleFileChange(e)}
            style={{ display: 'none' }}
            disabled={uploading || !canUpload}
          />
          <p>
            <button
              type="button"
              className="btn-primary"
              disabled={uploading || !canUpload}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              {uploading ? 'Enviando…' : 'Selecionar arquivo'}
            </button>
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Despesas / auditoria</h2>
        </div>
        <TableScrollHint />
        <div className="audits-table table-scroll">
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
                  <td colSpan={5}>
                    Sem despesas listadas. {canUpload ? 'Envie um documento acima ou aguarde o processamento.' : 'Com o perfil Conselho pode consultar dados quando existirem; o envio é feito pelo Síndico.'}
                  </td>
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
