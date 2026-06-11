import { test, expect } from '@playwright/test';

/**
 * Smoke tests — não exigem backend.
 * Fluxo autenticado completo: defina E2E_TENANT_ID, E2E_EMAIL, E2E_PASSWORD e gateway em execução.
 */
test.describe('Smoke — shell público', () => {
  test('página de login carrega', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('rota protegida redireciona para login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe('Demo banca — autenticado', () => {
  test.beforeEach(async ({}, testInfo) => {
    const required = ['E2E_TENANT_ID', 'E2E_EMAIL', 'E2E_PASSWORD'];
    const missing = required.filter((k) => !process.env[k]?.trim());
    if (missing.length > 0) {
      testInfo.skip(true, `Defina ${missing.join(', ')} para executar fluxo autenticado`);
    }
  });

  async function login(page: import('@playwright/test').Page) {
    const tenantId = process.env.E2E_TENANT_ID!.trim();
    const email = process.env.E2E_EMAIL!.trim();
    const password = process.env.E2E_PASSWORD!.trim();
    const condoSearch = process.env.E2E_CONDO_SEARCH?.trim() ?? tenantId.slice(0, 6);

    await page.goto('/login');
    await page.getByRole('button', { name: 'Buscar' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
    await dialog.getByPlaceholder('Nome ou CNPJ…').fill(condoSearch);
    await dialog.getByRole('button', { name: 'Buscar' }).click();
    await dialog.locator('.condo-modal__list-item').first().click({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Confirmar' }).click();
    await page.getByLabel(/^e-mail$/i).fill(email);
    await page.getByLabel(/^senha$/i).fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/(dashboard|morador)/, { timeout: 20_000 });
  }

  test('login → dashboard com gráfico mensal', async ({ page }) => {
    await login(page);
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard');
    }
    await expect(page.getByRole('heading', { name: /painel principal/i })).toBeVisible();
    await expect(page.getByLabel(/gráfico de gastos mensais/i)).toBeVisible({ timeout: 20_000 });
  });

  test('central de notificações acessível', async ({ page }) => {
    await login(page);
    await page.goto('/notificacoes');
    await expect(page.getByRole('heading', { name: /notifica/i })).toBeVisible({ timeout: 15_000 });
  });
});
