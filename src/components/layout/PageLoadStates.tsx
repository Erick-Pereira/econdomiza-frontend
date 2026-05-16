import type { ReactNode } from 'react';

type PageLoadingStateProps = {
  id: string;
  message: string;
  /** Largura máxima do cartão skeleton (px ou CSS) */
  skeletonMaxWidth?: string | number;
};

/**
 * Estado de carregamento padrão para páginas de lista (skeleton + texto).
 */
export function PageLoadingState({ id, message, skeletonMaxWidth = 520 }: PageLoadingStateProps) {
  const maxW = typeof skeletonMaxWidth === 'number' ? `${skeletonMaxWidth}px` : skeletonMaxWidth;
  return (
    <div className="page page-state" id={id} role="status" aria-live="polite" aria-busy="true">
      <p>{message}</p>
      <div className="skeleton-card" style={{ width: '100%', maxWidth: maxW }}>
        <div className="skeleton-block" style={{ width: '60%' }} />
        <div className="skeleton-block" style={{ width: '100%' }} />
        <div className="skeleton-block" style={{ width: '100%' }} />
      </div>
    </div>
  );
}

type PageFatalErrorStateProps = {
  id: string;
  message: string;
  onRetry?: () => void;
  /** Conteúdo extra acima do botão (ex.: ícone ou ajuda) */
  lead?: ReactNode;
};

/**
 * Erro fatal antes de haver dados para mostrar (lista vazia por falha de rede).
 */
export function PageFatalErrorState({ id, message, onRetry, lead }: PageFatalErrorStateProps) {
  return (
    <div className="page page-state page-state--error" id={id} role="alert" aria-live="assertive">
      {lead}
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn-primary" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
