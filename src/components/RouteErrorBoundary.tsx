import React, { type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Troca de rota limpa o erro capturado (ex.: `location.pathname`). */
  resetKey: string;
};

type State = { error: Error | null };

/**
 * Isola falhas de renderização da subárvore da rota atual.
 * Mantém shell (sidebar, header) intacto quando usado dentro de `MainLayout`.
 */
export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RouteErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="page page-state page-state--error" role="alert">
          <h1>Esta página encontrou um problema</h1>
          <p className="form-help" style={{ marginTop: '0.75rem' }}>
            O resto da aplicação continua disponível. Pode tentar recarregar só esta secção ou navegar para
            outra área pelo menu.
          </p>
          <p style={{ marginTop: '1.25rem' }}>
            <button type="button" className="btn-primary" onClick={this.handleRetry}>
              Tentar novamente
            </button>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
