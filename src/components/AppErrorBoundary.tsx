import React, { type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Evita ecrã em branco se um componente da árvore falhar em renderização.
 * Erros assíncronos continuam a ser tratados por `formatApiError` / banners nas páginas.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="page page-state page-state--error" role="alert">
          <h1>Ocorreu um erro inesperado</h1>
          <p className="form-help" style={{ marginTop: '0.75rem' }}>
            A interface deixou de responder de forma segura. Pode tentar recarregar a página. Se o problema persistir,
            contacte o suporte e indique quando aconteceu.
          </p>
          <p style={{ marginTop: '1.25rem' }}>
            <button type="button" className="btn-primary" onClick={this.handleReload}>
              Recarregar página
            </button>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
