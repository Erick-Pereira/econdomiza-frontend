import React, { type ReactNode } from 'react';
import { PageHeader } from './PageHeader';

export interface PageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Template base para páginas internas com cabeçalho e área de conteúdo limitada. */
export const PageTemplate: React.FC<PageLayoutProps> = ({ eyebrow, title, description, children }) => {
  return (
    <div className="page min-h-screen bg-surface-background" role="main">
      <PageHeader eyebrow={eyebrow} title={title} description={description} layout="stack" />
      <div className="max-w-7xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
};

export const PageTemplateWithFooter: React.FC<PageLayoutProps> = ({
  eyebrow,
  title,
  description,
  children,
  footer,
}) => {
  return (
    <div className="page min-h-screen bg-surface-background" role="main">
      <PageHeader eyebrow={eyebrow} title={title} description={description} layout="stack" />
      <div className="max-w-7xl mx-auto px-4 py-8 flex-1">{children}</div>
      {footer && (
        <footer className="border-t border-surface-border mt-8 pt-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-xs text-text-muted">© 2026 Econdomiza. Todos os direitos reservados.</p>
          </div>
        </footer>
      )}
    </div>
  );
};
