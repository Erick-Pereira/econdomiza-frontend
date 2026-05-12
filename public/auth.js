function showScreen(screenId) {
  document.querySelectorAll('.form-screen').forEach((screen) => {
    screen.classList.remove('active');
  });

  const el = document.getElementById(screenId);

  if (el) el.classList.add('active');

  document.getElementById('login-screen-error') &&
    (document.getElementById('login-screen-error').textContent = '');

  document.getElementById('register-screen-error') &&
    (document.getElementById('register-screen-error').textContent = '');
}

// deixa disponível globalmente pro onclick=""
window.showScreen = showScreen;

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

  return {
    id: String(id),
    nome,
    cnpj,
    label: `${nome} — ${cnpj}`
  };
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

// ===============================
// MOCK DE CONDOMÍNIOS
// ===============================

const MOCK_CONDOS = [
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    nome: 'Condomínio Solar das Palmeiras',
    cnpj: '12.345.678/0001-90'
  },
  {
    id: '6be8c8b2-2c7e-4a8b-9c2f-123456789abc',
    nome: 'Residencial Águas Claras',
    cnpj: '98.765.432/0001-10'
  },
  {
    id: '9f7c2a11-8b0f-44d2-a123-abcdef123456',
    nome: 'Edifício Monte Bello',
    cnpj: '11.222.333/0001-44'
  }
];

// ===============================
// EVENT LISTENERS E FUNCIONALIDADES
// ===============================

document.addEventListener('DOMContentLoaded', function() {
  console.log('auth.js carregado');

  // Verificar se SimcagApi está disponível
  if (typeof window.SimcagApi === 'undefined') {
    console.error('SimcagApi não está disponível. Verifique se api.js foi carregado.');
    return;
  }

  console.log('SimcagApi disponível:', window.SimcagApi);

  // ===============================
  // LOGIN
  // ===============================

  const loginBtn = document.getElementById('loginSubmitBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', async function() {
      console.log('Botão LOGIN clicado');

      setLoginError('');

      const tenantId = document.getElementById('loginTenantId').value.trim();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!tenantId) {
        setLoginError('Selecione um condomínio');
        return;
      }

      if (!email || !password) {
        setLoginError('Preencha email e senha');
        return;
      }

      try {
        console.log('Chamando SimcagApi.login com:', {
          tenantId,
          email
        });

        const result = await window.SimcagApi.login(
          tenantId,
          email,
          password
        );

        console.log('Login bem-sucedido:', result);

        // ===============================
        // SALVAR TOKENS
        // ===============================

        const authData = result.data || result;

        if (authData.accessToken) {
          localStorage.setItem('accessToken', authData.accessToken);
        }

        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken);
        }

        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
        }

        alert('Login realizado com sucesso!');

        // REDIRECIONAR
        // window.location.href = '/dashboard.html';

      } catch (error) {
        console.error('Erro no login:', error);

        setLoginError(
          error.message || 'Erro ao realizar login'
        );
      }
    });
  } else {
    console.error('Botão loginSubmitBtn não encontrado');
  }

  // ===============================
  // REGISTRO
  // ===============================

  const registerBtn = document.getElementById('registerSubmitBtn');

  if (registerBtn) {
    registerBtn.addEventListener('click', async function() {
      console.log('Botão REGISTRAR clicado');

      setRegisterError('');

      const tenantId = document.getElementById('registerTenantId').value.trim();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const role = document.getElementById('registerRole').value;

      if (!tenantId) {
        setRegisterError('Selecione um condomínio');
        return;
      }

      if (!name || !email || !password || !role) {
        setRegisterError('Preencha todos os campos');
        return;
      }

      if (password.length < 8) {
        setRegisterError('A senha deve ter pelo menos 8 caracteres');
        return;
      }

      try {

        const payload = {
          tenantId,
          name,
          email,
          password,
          role
        };

        console.log('Chamando SimcagApi.register com:', payload);

        const result = await window.SimcagApi.register(payload);

        console.log('Registro bem-sucedido:', result);

        alert('Registro realizado com sucesso!');

        // VOLTA PARA LOGIN
        showScreen('login-screen');

      } catch (error) {
        console.error('Erro no registro:', error);

        setRegisterError(
          error.message || 'Erro ao realizar registro'
        );
      }
    });
  } else {
    console.error('Botão registerSubmitBtn não encontrado');
  }

  // ===============================
  // MODAL CONDOMÍNIO
  // ===============================

  const loginCondoPickBtn = document.getElementById('loginCondoPickBtn');
  const registerCondoPickBtn = document.getElementById('registerCondoPickBtn');

  const modal = document.getElementById('condo-lookup-modal');
  const modalList = document.getElementById('condoModalList');
  const modalFilter = document.getElementById('condoModalFilter');
  const modalConfirm = document.getElementById('condoModalConfirm');
  const modalError = document.getElementById('condoModalError');

  let selectedCondo = null;
  let currentScreen = '';

  function openModal(screen) {
    currentScreen = screen;

    selectedCondo = null;

    modalFilter.value = '';

    modalError.textContent = '';

    modalConfirm.disabled = true;

    loadCondos('');

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
  }

  async function loadCondos(q) {
    modalError.textContent = '';

    let condos = [];

    try {
      console.log('Buscando condomínios com query:', q);

      const response = await window.SimcagApi.lookupCondominios(q);

      console.log('Condomínios encontrados:', response);

      if (response && Array.isArray(response.data)) {
        condos = response.data;
      }
    } catch (error) {
      console.error('Erro ao buscar condomínios:', error);
    }

    if (!Array.isArray(condos) || condos.length === 0) {
      condos = Array.isArray(MOCK_CONDOS) ? MOCK_CONDOS : [];
    }

    if (typeof q === 'string' && q.trim()) {
      const query = q.trim().toLowerCase();
      condos = condos.filter((condo) => {
        const row = formatCondoRow(condo);
        return (`${row.nome} ${row.cnpj}`.toLowerCase().includes(query));
      });
    }

    renderCondos(condos);
  }

  function renderCondos(condos) {
    modalList.innerHTML = '';

    if (!Array.isArray(condos)) {
      condos = [];
    }

    if (condos.length === 0) {
      modalList.innerHTML = `
        <li class="condo-modal__empty">
          Nenhum condomínio encontrado
        </li>
      `;

      return;
    }

    condos.forEach((condo) => {

      const row = formatCondoRow(condo);

      const li = document.createElement('li');

      li.className = 'condo-modal__item';
      li.setAttribute('role', 'option');
      li.innerHTML = `
        <strong>${row.nome}</strong>
        <br>
        <small>${row.cnpj}</small>
      `;

      li.addEventListener('click', function (event) {
        selectCondo(row, event.currentTarget);
      });

      modalList.appendChild(li);
    });
  }

  function selectCondo(condo, element) {

    selectedCondo = condo;

    modalConfirm.disabled = false;

    document
      .querySelectorAll('.condo-modal__item')
      .forEach((item) => {
        item.classList.remove('selected');
      });

    if (element) {
      element.classList.add('selected');
    }
  }

  function closeModal() {

    modal.hidden = true;

    modal.setAttribute('aria-hidden', 'true');
  }

  if (loginCondoPickBtn) {
    loginCondoPickBtn.addEventListener('click', () => {
      openModal('login');
    });
  }

  if (registerCondoPickBtn) {
    registerCondoPickBtn.addEventListener('click', () => {
      openModal('register');
    });
  }

  // ===============================
  // FECHAR MODAL
  // ===============================

  document
    .querySelectorAll('[data-condo-modal-close]')
    .forEach((btn) => {

      btn.addEventListener('click', closeModal);
    });

  // ===============================
  // FILTRO
  // ===============================

  if (modalFilter) {

    modalFilter.addEventListener('input', (e) => {

      loadCondos(e.target.value);
    });
  }

  // ===============================
  // CONFIRMAR CONDOMÍNIO
  // ===============================

  if (modalConfirm) {

    modalConfirm.addEventListener('click', () => {

      if (!selectedCondo) {
        return;
      }

      const summaryEl = document.getElementById(
        currentScreen + 'CondoSummary'
      );

      const tenantIdEl = document.getElementById(
        currentScreen + 'TenantId'
      );

      if (summaryEl) {
        summaryEl.textContent = selectedCondo.label;
        summaryEl.classList.remove('condo-summary--empty');
      }

      if (tenantIdEl) {
        tenantIdEl.value = selectedCondo.id;
      }

      closeModal();
    });
  }
});