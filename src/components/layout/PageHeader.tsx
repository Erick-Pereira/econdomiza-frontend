import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type PageHeaderQuickLink = { to: string; label: string };

export type PageHeaderBreadcrumb = { to?: string; label: string };

export interface PageHeaderProps {
  /** Linha curta acima do título (contexto da área). */
  eyebrow?: string;
  title: string;
  description?: string;
  toolbar?: ReactNode;
  /** `split`: título e toolbar lado a lado em ecrã largo. `stack`: bloco único (menos “dashboard enterprise”). */
  layout?: 'split' | 'stack';
  /** Trilha de navegação contextual (último item sem `to` = página atual). */
  breadcrumbs?: PageHeaderBreadcrumb[];
  /** Atalhos contextuais (ex.: saltar para Compras a partir de Auditoria). */
  quickLinks?: PageHeaderQuickLink[];
  /** Extra classes on the outer header element */
  className?: string;
}

/**
 * Cabeçalho padrão de página (`.page-header` + variantes em `styles.css`).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  toolbar,
  layout = 'stack',
  breadcrumbs,
  quickLinks,
  className,
}: PageHeaderProps) {
  const rootClass = [
    'page-header',
    layout === 'split' ? 'page-header--split' : null,
    'w-full max-w-full overflow-x-hidden',
    'rounded-2xl border border-surface-border bg-surface-card shadow-macro-sm',
    'px-4 py-5 md:px-6 md:py-6 lg:px-8',
    'flex flex-col gap-4',
    layout === 'split' ? 'md:flex-row md:items-start md:justify-between' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <header className={rootClass}>
      <div className="page-header__lead flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-2 text-sm text-text-muted" aria-label="Navegação">
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
                    {idx > 0 ? <span aria-hidden>/</span> : null}
                    {crumb.to && !isLast ? (
                      <Link to={crumb.to} className="hover:text-brand-primary">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? 'font-medium text-text-main' : undefined}>{crumb.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <span className="page-kicker">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {quickLinks && quickLinks.length > 0 ? (
          <nav className="page-header__quick flex flex-wrap gap-2 mt-3" aria-label="Atalhos da página">
            <ul className="page-header__quick-nav flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
      {toolbar ? (
        <div className="page-header__toolbar flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
