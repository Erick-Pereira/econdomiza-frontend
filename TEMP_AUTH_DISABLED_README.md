# 🚀 Modo Desenvolvimento: Autenticação Desativada

**Status**: ✅ **ATIVADO** - Aplicação em modo desenvolvimento sem backend

---

## 📋 O que foi modificado

### Arquivos Alterados (TEMP_AUTH_DISABLED)

1. **`src/context/AuthSessionContext.tsx`**
   - Injeta usuário fake e tokens na inicialização
   - Flag `TEMP_AUTH_DISABLED_MODE` no localStorage
   - Pula verificação de sessão persistida se flag ativa

2. **`src/app/layouts/MainLayout.tsx`**
   - Desativa redirecionamento para `/login` quando não autenticado
   - Permite navegação mesmo sem tokens válidos

3. **`src/App.tsx`**
   - Flag `TEMP_AUTH_DISABLED = true` (MUDE para `false` para reativar auth)
   - Redireciona `/auth.html` → `/dashboard` em modo dev
   - Seta `TEMP_AUTH_DISABLED_MODE=true` no localStorage

4. **`src/features/auth/hooks/useEstablishGatewaySession.ts`**
   - Mocka `loginWithCredentials` retornando sucesso imediato
   - Pula chamadas de API ao gateway

5. **`src/main.tsx`**
   - Importa e executa `initTempAuthBypass()`
   - Loga informações de debug no console

6. **`src/lib/temp-api-mocks.ts`** (NOVO)
   - Funções helper para mockar respostas de API
   - Exemplos: profile, tokens, dashboard summary

7. **`src/lib/temp-auth-init.ts`** (NOVO)
   - Função `initTempAuthBypass()` com logs coloridos
   - Instruções de como desativar

---

## 🔑 Usuário Mock Padrão

```javascript
{
  id: 'temp-dev-user-123',
  email: 'dev@localhost.test',
  name: 'Dev User (Mock)',
  role: 'ADMIN',
  tenantId: '00000000-0000-0000-0000-000000000000',
  createdAt: new Date().toISOString()
}
```

**Token**: JWT fake (sem validação de assinatura)
**Duração**: 8 horas

---

## 🎯 Como Usar

### 1️⃣ Iniciar a Aplicação (modo dev ativado)

```bash
npm run dev
```

Vai abrir em: `http://localhost:5173` (ou `5174` se porta em uso)

✅ **Resultado esperado**:
- Pula login
- Vai direto para `/dashboard`
- Console mostra: `⚠️ TEMP_AUTH_DISABLED - Modo Dev Ativado`
- Usuário mock exibido no sidebar: `Dev User (Mock) - ADMIN`

### 2️⃣ Navegação Funciona

Clique nos links do sidebar para testar diferentes páginas:
- Dashboard ✅
- Fornecedores ✅
- Compras ✅
- Produtos ✅
- Relatórios ✅
- Etc.

### 3️⃣ Erros de API Esperados

Como backend não está rodando, você verá:
- Erros HTTP 500/502 em algumas chamadas
- Dados vazios em tabelas
- **Isso é normal** - o frontend está funcionando corretamente

---

## 🔄 Como Reativar Autenticação Original

### Opção 1: Mudar Flag no Código (Recomendado)

Arquivo: `src/App.tsx`

```typescript
// ANTES (modo dev):
const TEMP_AUTH_DISABLED = true;

// DEPOIS (produção):
const TEMP_AUTH_DISABLED = false;
```

Salve, recarregue o navegador → autenticação original volta.

### Opção 2: Remover via Console do Navegador

Execute no console do navegador (F12):

```javascript
// Desativar modo dev:
localStorage.removeItem('TEMP_AUTH_DISABLED_MODE');
window.location.reload();
```

```javascript
// Reativar modo dev (se necessário):
localStorage.setItem('TEMP_AUTH_DISABLED_MODE', 'true');
window.location.reload();
```

### Opção 3: Limpar Tudo e Git Checkout

```bash
# Ver quais arquivos mudaram:
git status

# Descartar TODAS as mudanças:
git checkout -- .

# Ou desfazer arquivo específico:
git checkout -- src/App.tsx
```

---

## ⚙️ Código Indicador

Todos os arquivos modificados contêm comentários:

```javascript
// TEMP_AUTH_DISABLED: [descrição do que foi alterado]
```

**Busque por `TEMP_AUTH_DISABLED` no código para encontrar rapidamente todas as alterações.**

---

## 🔍 Verificar Status Atual

### No Console do Navegador (F12):

```javascript
// Ver se modo dev está ativado:
localStorage.getItem('TEMP_AUTH_DISABLED_MODE')
// Retorna: "true" ou null

// Ver dados do usuário mock:
localStorage.getItem('user_profile')
// Retorna: JSON do usuário mock (se ativado)

// Ver tokens:
localStorage.getItem('auth_tokens')
// Retorna: JSON com accessToken, refreshToken
```

### Nos Logs:

Abra o console (F12) → aba "Console"

Procure por linhas que começam com:
- `⚠️ TEMP_AUTH_DISABLED`
- `[TEMP_AUTH_DISABLED]`

---

## 📁 Resumo de Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/context/AuthSessionContext.tsx` | ✏️ Modificado | Injeta user mock na inicialização |
| `src/app/layouts/MainLayout.tsx` | ✏️ Modificado | Desativa redirecionamento de login |
| `src/App.tsx` | ✏️ Modificado | Flag `TEMP_AUTH_DISABLED = true` |
| `src/features/auth/hooks/useEstablishGatewaySession.ts` | ✏️ Modificado | Mocka loginWithCredentials |
| `src/main.tsx` | ✏️ Modificado | Chamada initTempAuthBypass() |
| `src/lib/temp-api-mocks.ts` | ✨ NOVO | Funções mock de API |
| `src/lib/temp-auth-init.ts` | ✨ NOVO | Inicialização com logs |

---

## ⚡ Dicas Importantes

### ✅ O que funciona:
- ✅ Navegação entre páginas
- ✅ Layout e UI components
- ✅ Desenvolvimento de frontend
- ✅ Testes de fluxo de usuário

### ❌ O que NÃO funciona:
- ❌ Chamadas reais de API (backend offline)
- ❌ Login/Register com credenciais reais
- ❌ Dados reais do banco de dados
- ❌ Refresh de token automático

---

## 🐛 Troubleshooting

### Problema: Ainda pede login ao entrar
**Solução:**
1. Limpe o localStorage:
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```
2. Certifique-se que `src/App.tsx` tem `TEMP_AUTH_DISABLED = true`

### Problema: "ECONNREFUSED" (backend não found)
**Solução:** É esperado! Backend está offline. O frontend tenta chamar API mas falha. Isso está funcionando corretamente.

### Problema: Não consegue navegar entre páginas
**Solução:**
1. Verifique console (F12) por erros
2. Confirme que MainLayout.tsx tem check: `!TEMP_AUTH_DISABLED`
3. Recarregue: `npm run dev` + F5 no browser

---

## 📝 Próximos Passos (Quando Backend Voltar)

1. Mude `src/App.tsx`:
   ```typescript
   const TEMP_AUTH_DISABLED = false; // ← Mude para false
   ```

2. Remova comentários `// TEMP_AUTH_DISABLED` (opcional - não quebra nada)

3. Recarregue: `npm run dev`

4. Aplicação vai pedir login novamente com autenticação real

---

## 🎓 Referência Rápida

```bash
# Iniciar em modo dev (auth desativada):
npm run dev

# Logs aparecem aqui:
Abra DevTools: F12 → Console

# Desativar temporariamente:
localStorage.removeItem('TEMP_AUTH_DISABLED_MODE');
window.location.reload();

# Reativar:
localStorage.setItem('TEMP_AUTH_DISABLED_MODE', 'true');
window.location.reload();
```

---

**Versão**: 1.0 | **Data**: 19/05/2026 | **Status**: ✅ Funcionando
