/**
 * TEMP_AUTH_DISABLED: Script de inicialização para modo desenvolvimento sem autenticação
 *
 * Execute isto no console do navegador para ativar modo dev:
 *
 * ```js
 * // Ativar:
 * localStorage.setItem('TEMP_AUTH_DISABLED_MODE', 'true');
 * window.location.reload();
 *
 * // Desativar:
 * localStorage.removeItem('TEMP_AUTH_DISABLED_MODE');
 * window.location.reload();
 * ```
 */

export function initTempAuthBypass() {
  const isEnabled = localStorage.getItem('TEMP_AUTH_DISABLED_MODE') === 'true';

  if (isEnabled) {
    console.group('%c⚠️ TEMP_AUTH_DISABLED - Modo Dev Ativado', 'color: #ff6b6b; font-weight: bold; font-size: 14px');
    console.log(
      '%cAUTENTICAÇÃO DESATIVADA - Desenvolvendo sem backend',
      'color: #ff6b6b; font-weight: bold'
    );
    console.log('Usuário Mock:', {
      email: 'dev@localhost.test',
      name: 'Dev User (Mock)',
      role: 'ADMIN',
      tenantId: '00000000-0000-0000-0000-000000000000',
    });
    console.log('%cPara desativar:', 'font-weight: bold');
    console.log('1. Execute: localStorage.removeItem("TEMP_AUTH_DISABLED_MODE")');
    console.log('2. Recarregue a página: window.location.reload()');
    console.groupEnd();
  }
}

// Executar na inicialização
if (typeof window !== 'undefined') {
  initTempAuthBypass();
}
