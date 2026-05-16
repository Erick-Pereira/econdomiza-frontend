import React, { useCallback, useEffect, useState } from 'react';
import { normalizeListPayload } from '../lib/api-normalize';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';

interface SupplierItem {
  id: string;
  name: string;
  document: string;
  category: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

function mapRow(s: Record<string, unknown>): SupplierItem {
  return {
    id: String(s.id ?? ''),
    name: String(s.normalizedName ?? s.name ?? ''),
    document: String(s.document ?? s.cnpj ?? s.cpf ?? ''),
    category: String(s.category ?? '-'),
    phone: (s.phone as string) ?? null,
    email: (s.email as string) ?? null,
    isActive: s.isActive !== false,
  };
}

const emptyForm = {
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  category: '',
};

const FornecedoresPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    const result = await EcondomizaApi.listSuppliers({});
    const suppliersData = normalizeListPayload(result.data);
    const activeSuppliers: SupplierItem[] = (suppliersData as Record<string, unknown>[])
      .filter((row) => row.isActive !== false)
      .map(mapRow)
      .filter((s) => s.id);
    setSuppliers(activeSuppliers);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await loadList();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch suppliers data:', err);
          setError(formatApiError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setModalMode('create');
  };

  const openEdit = (s: SupplierItem) => {
    setForm({
      name: s.name,
      document: s.document.replace(/\D/g, ''),
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: '',
      category: s.category === '-' ? '' : s.category,
    });
    setEditingId(s.id);
    setFormError(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setFormError(null);
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const name = form.name.trim();
    const document = form.document.replace(/\D/g, '');
    if (!name) {
      setFormError('Indique o nome do fornecedor.');
      return;
    }
    if (!document) {
      setFormError('Indique CNPJ ou CPF (apenas dígitos).');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await EcondomizaApi.createSupplier({
          name,
          document,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          category: form.category.trim() || null,
        });
      } else if (modalMode === 'edit' && editingId) {
        await EcondomizaApi.updateSupplier(editingId, {
          name,
          document,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          category: form.category.trim() || null,
        });
      }
      await loadList();
      closeModal();
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (s: SupplierItem) => {
    if (!window.confirm(`Desativar o fornecedor "${s.name}"?`)) return;
    try {
      await EcondomizaApi.deactivateSupplier(s.id);
      await loadList();
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const formatCnpjCpf = (digits: string): string => {
    const s = String(digits || '').replace(/\D/g, '');
    if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return digits || '';
  };

  if (loading) {
    return (
      <div className="page page-state" id="fornecedores-page">
        <p>Carregando fornecedores…</p>
        <div className="skeleton-card" style={{ width: '100%', maxWidth: 520 }}>
          <div className="skeleton-block" style={{ width: '50%' }} />
          <div className="skeleton-block" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (error && !suppliers.length) {
    return (
      <div className="page page-state page-state--error" id="fornecedores-page">
        <p>{error}</p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const modalTitle = modalMode === 'create' ? 'Novo fornecedor' : 'Editar fornecedor';

  return (
    <div className="page" id="fornecedores-page">
      <PageHeader
        title="Fornecedores"
        description="Cadastro para uso operacional nas despesas. Cadastro ativo não significa validação documental."
        quickLinks={[
          { to: '/compras', label: 'Compras' },
          { to: '/produtos', label: 'Produtos' },
          { to: '/auditoria', label: 'Auditoria' },
        ]}
      />

      {error && suppliers.length > 0 && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      <div className="page-actions">
        <button type="button" className="btn-primary" id="addSupplierBtn" onClick={openCreate}>
          <i className="fas fa-plus" aria-hidden /> Novo Fornecedor
        </button>
      </div>

      <div className="card mt-section">
        <p className="form-help" style={{ margin: 0 }}>
          O sistema ainda não possui critérios formais de validação documental, integração externa ou aprovação manual
          de fornecedores. Esta página indica apenas fornecedores cadastrados e ativos para uso nos lançamentos.
        </p>
      </div>

      <div className="suppliers-grid" id="suppliersGridMount">
        {suppliers.length > 0 ? (
          suppliers.map((supplier) => (
            <div key={supplier.id} className="supplier-card" data-supplier-id={supplier.id}>
              <div className="supplier-header">
                <h3>{supplier.name}</h3>
                <div className="rating">
                  <span className="supplier-doc-label">
                    Cadastro ativo · {supplier.document
                      ? supplier.document.replace(/\D/g, '').length === 14
                        ? 'CNPJ'
                        : supplier.document.replace(/\D/g, '').length === 11
                          ? 'CPF'
                          : 'Doc'
                      : '-'}
                  </span>
                </div>
              </div>
              <div className="supplier-info">
                <p>
                  <strong>CNPJ/CPF:</strong> {formatCnpjCpf(supplier.document)}
                </p>
                <p>
                  <strong>Categoria:</strong> {supplier.category}
                </p>
                <p>
                  <strong>Contatos:</strong> {supplier.phone || supplier.email || '-'}
                </p>
              </div>
              <div className="supplier-actions">
                <button type="button" className="btn-small" onClick={() => openEdit(supplier)}>
                  Editar
                </button>
                <button type="button" className="btn-small danger" onClick={() => void handleDeactivate(supplier)}>
                  Desativar
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">Nenhum fornecedor cadastrado.</p>
        )}
      </div>

      {modalMode !== 'closed' && (
        <div
          className="condo-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              closeModal();
            }
          }}
        >
          <button type="button" className="condo-modal__backdrop" aria-label="Fechar" onClick={closeModal} />
          <div className="condo-modal__panel">
            <div className="condo-modal__head">
              <h3 id="supplier-modal-title">{modalTitle}</h3>
              <button type="button" className="condo-modal__icon-btn" onClick={closeModal} aria-label="Fechar diálogo">
                <i className="fas fa-times" aria-hidden />
              </button>
            </div>
            <p className="condo-modal__lead">Nome e documento (CNPJ ou CPF) são obrigatórios.</p>

            <form onSubmit={(e) => void handleSubmit(e)} className="supplier-form">
              {formError && (
                <p className="auth-screen-error condo-modal__status" role="alert">
                  {formError}
                </p>
              )}

              <label className="field-label" htmlFor="supplier-name">
                Nome
              </label>
              <input
                id="supplier-name"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="organization"
                required
              />

              <label className="field-label" htmlFor="supplier-doc">
                CNPJ ou CPF (só números)
              </label>
              <input
                id="supplier-doc"
                className="form-input"
                inputMode="numeric"
                value={form.document}
                onChange={(e) => setForm((f) => ({ ...f, document: e.target.value.replace(/\D/g, '') }))}
                autoComplete="off"
                required
              />

              <label className="field-label" htmlFor="supplier-email">
                E-mail
              </label>
              <input
                id="supplier-email"
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />

              <label className="field-label" htmlFor="supplier-phone">
                Telefone
              </label>
              <input
                id="supplier-phone"
                className="form-input"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
              />

              <label className="field-label" htmlFor="supplier-address">
                Morada
              </label>
              <input
                id="supplier-address"
                className="form-input"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                autoComplete="street-address"
              />

              <label className="field-label" htmlFor="supplier-category">
                Categoria
              </label>
              <input
                id="supplier-category"
                className="form-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />

              <div className="condo-modal__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-small" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando…' : modalMode === 'create' ? 'Criar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FornecedoresPage;
