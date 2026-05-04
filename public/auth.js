function showScreen(screenId) {
  document.querySelectorAll('.form-screen').forEach((screen) => {
    screen.classList.remove('active');
  });
  const el = document.getElementById(screenId);
  if (el) el.classList.add('active');
  document.getElementById('login-screen-error') && (document.getElementById('login-screen-error').textContent = '');
  document.getElementById('register-screen-error') && (document.getElementById('register-screen-error').textContent = '');
}

function setLoginError(msg) {
  const p = document.getElementById('login-screen-error');
  if (p) p.textContent = msg || '';
}

function setRegisterError(msg) {
  const p = document.getElementById('register-screen-error');
  if (p) p.textContent = msg || '';
}

function formatCondoRow(c) {
  const nome = c.nome || c.Nome || '';
  const cnpj = c.cnpj || c.Cnpj || '';
  const id = c.id || c.Id;
  return { id: String(id), nome, cnpj, label: `${nome} — ${cnpj}` };
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

/** @type {{ context: 'login'|'register'|null, all: Array<{id:string,nome:string,cnpj:string,label:string}>, selectedId: string|null }} */
const condoModal = {
  context: null,
  all: [],
  selectedId: null
};

function getModalEls() {
  return {
    root: document.getElementById('condo-lookup-modal'),
    filter: document.getElementById('condoModalFilter'),
    list: document.getElementById('condoModalList'),
    err: document.getElementById('condoModalError'),
    confirm: document.getElementById('condoModalConfirm')
  };
}

function setModalError(msg) {
  const { err } = getModalEls();
  if (err) err.textContent = msg || '';
}

function filterCondoList(items, q) {
  const term = (q || '').trim().toLowerCase();
  const digitTerm = digitsOnly(q);
  if (!term && !digitTerm) return items.slice();
  return items.filter((row) => {
    const nome = (row.nome || '').toLowerCase();
    const cnpjDigits = digitsOnly(row.cnpj);
    if (term && nome.includes(term)) return true;
    if (digitTerm && cnpjDigits.includes(digitTerm)) return true;
    if (term && (row.cnpj || '').toLowerCase().includes(term)) return true;
    return false;
  });
}

function renderCondoModalList() {
  const { list, filter, confirm } = getModalEls();
  if (!list) return;
  const q = filter?.value ?? '';
  const rows = filterCondoList(condoModal.all, q);
  list.innerHTML = '';
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'condo-modal__lead';
    empty.style.margin = '16px';
    empty.textContent = condoModal.all.length
      ? 'Nenhum condomínio corresponde ao filtro.'
      : 'Nenhum condomínio disponível.';
    list.appendChild(empty);
    if (confirm) confirm.disabled = true;
    return;
  }
  rows.forEach((row) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'condo-modal__row';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', row.id === condoModal.selectedId ? 'true' : 'false');
    if (row.id === condoModal.selectedId) btn.classList.add('is-selected');
    btn.dataset.id = row.id;
    const nameEl = document.createElement('div');
    nameEl.className = 'condo-modal__row-name';
    nameEl.textContent = row.nome || '(sem nome)';
    const cnpjEl = document.createElement('div');
    cnpjEl.className = 'condo-modal__row-cnpj';
    cnpjEl.textContent = row.cnpj || '—';
    btn.appendChild(nameEl);
    btn.appendChild(cnpjEl);
    btn.addEventListener('click', () => {
      condoModal.selectedId = row.id;
      renderCondoModalList();
    });
    list.appendChild(btn);
  });

  if (confirm) {
    const visibleIds = new Set(rows.map((r) => r.id));
    confirm.disabled = !condoModal.selectedId || !visibleIds.has(condoModal.selectedId);
  }
}

function applySelectionToForm() {
  if (!condoModal.context || !condoModal.selectedId) return;
  const row = condoModal.all.find((r) => r.id === condoModal.selectedId);
  if (!row) return;
  const summary = document.getElementById(
    condoModal.context === 'login' ? 'loginCondoSummary' : 'registerCondoSummary'
  );
  const hidden = document.getElementById(
    condoModal.context === 'login' ? 'loginTenantId' : 'registerTenantId'
  );
  if (hidden) hidden.value = row.id;
  if (summary) {
    summary.textContent = row.label;
    summary.classList.remove('condo-summary--empty');
  }
}

function closeCondoModal() {
  const { root, filter } = getModalEls();
  if (root) {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  }
  if (filter) filter.value = '';
  condoModal.context = null;
  condoModal.all = [];
  condoModal.selectedId = null;
  setModalError('');
}

async function openCondoModal(context) {
  if (!window.SimcagApi) {
    const errFn = context === 'login' ? setLoginError : setRegisterError;
    errFn('Cliente API não carregado. Use npm run dev.');
    return;
  }
  const { root, filter, confirm } = getModalEls();
  if (!root) return;

  condoModal.context = context;
  condoModal.all = [];
  condoModal.selectedId = null;
  if (filter) filter.value = '';
  if (confirm) confirm.disabled = true;
  setModalError('');
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');

  const hidden = document.getElementById(context === 'login' ? 'loginTenantId' : 'registerTenantId');
  const current = hidden?.value?.trim() || null;

  getModalEls().list.innerHTML = '';
  const loading = document.createElement('p');
  loading.className = 'condo-modal__lead';
  loading.style.margin = '16px';
  loading.textContent = 'Carregando condomínios…';
  getModalEls().list.appendChild(loading);

  try {
    const raw = await SimcagApi.lookupCondominios('');
    const list = Array.isArray(raw) ? raw : [];
    condoModal.all = list.map(formatCondoRow);
    getModalEls().list.innerHTML = '';
    renderCondoModalList();
    if (current && condoModal.all.some((r) => r.id === current)) {
      condoModal.selectedId = current;
      if (confirm) confirm.disabled = false;
      renderCondoModalList();
    }
  } catch (e) {
    getModalEls().list.innerHTML = '';
    setModalError(e.message || 'Falha ao carregar condomínios');
  }

  filter?.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const modalRoot = document.getElementById('condo-lookup-modal');
  const filter = document.getElementById('condoModalFilter');

  document.getElementById('loginCondoPickBtn')?.addEventListener('click', () => openCondoModal('login'));
  document.getElementById('registerCondoPickBtn')?.addEventListener('click', () => openCondoModal('register'));

  filter?.addEventListener('input', () => {
    const visible = filterCondoList(condoModal.all, filter.value);
    if (condoModal.selectedId && !visible.some((r) => r.id === condoModal.selectedId)) {
      condoModal.selectedId = null;
    }
    renderCondoModalList();
  });

  document.getElementById('condoModalConfirm')?.addEventListener('click', () => {
    if (!condoModal.selectedId) return;
    applySelectionToForm();
    closeCondoModal();
  });

  modalRoot?.querySelectorAll('[data-condo-modal-close]').forEach((el) => {
    el.addEventListener('click', () => closeCondoModal());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalRoot && !modalRoot.hidden) {
      e.preventDefault();
      closeCondoModal();
    }
  });

  document.getElementById('loginSubmitBtn')?.addEventListener('click', async () => {
    if (!window.SimcagApi) {
      setLoginError('Cliente API não carregado. Use npm run dev e sirva com Vite.');
      return;
    }
    const tenantId = document.getElementById('loginTenantId')?.value?.trim() ?? '';
    const email = document.getElementById('loginEmail')?.value?.trim() ?? '';
    const password = document.getElementById('loginPassword')?.value ?? '';
    if (!tenantId) {
      setLoginError('Abra Buscar e escolha um condomínio.');
      return;
    }
    if (!email || !password) {
      setLoginError('Preencha e-mail e senha.');
      return;
    }
    setLoginError('');
    try {
      await SimcagApi.login(tenantId, email, password);
      window.location.href = new URL('index.html', window.location.href).href;
    } catch (err) {
      setLoginError(err.message || 'Falha no login');
    }
  });

  document.getElementById('registerSubmitBtn')?.addEventListener('click', async () => {
    if (!window.SimcagApi) {
      setRegisterError('Cliente API não carregado. Use npm run dev.');
      return;
    }
    const tenantId = document.getElementById('registerTenantId')?.value?.trim() ?? '';
    const name = document.getElementById('registerName')?.value?.trim() ?? '';
    const email = document.getElementById('registerEmail')?.value?.trim() ?? '';
    const password = document.getElementById('registerPassword')?.value ?? '';
    const role = document.getElementById('registerRole')?.value ?? 'Sindico';
    if (!tenantId) {
      setRegisterError('Abra Buscar e escolha um condomínio.');
      return;
    }
    if (!name || !email || !password) {
      setRegisterError('Preencha nome, e-mail e senha (mín. 8 caracteres).');
      return;
    }
    if (password.length < 8) {
      setRegisterError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setRegisterError('');
    try {
      await SimcagApi.register({ tenantId, email, password, name, role });
      window.location.href = new URL('index.html', window.location.href).href;
    } catch (err) {
      setRegisterError(err.message || 'Falha no registro');
    }
  });
});
