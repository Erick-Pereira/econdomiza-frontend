/**
 * Dica para ecrãs estreitos: tabelas com `.table-scroll` podem exigir deslize horizontal.
 */
export function TableScrollHint() {
  return (
    <p className="table-scroll-hint form-help" role="note">
      Em ecrãs pequenos, deslize horizontalmente na tabela para ver todas as colunas.
    </p>
  );
}
