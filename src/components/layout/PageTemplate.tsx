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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {children}
      </div>
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex-1">
        {children}
      </div>
      {footer && (
        <footer className="border-t border-surface-border mt-auto pt-6 sm:pt-8">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 text-center">
            <p className="text-xs sm:text-sm text-text-muted">
              © 2026 Econdomiza. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};
