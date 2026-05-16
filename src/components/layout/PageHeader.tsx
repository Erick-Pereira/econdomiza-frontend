import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type PageHeaderQuickLink = { to: string; label: string };

export interface PageHeaderProps {
  /** Linha curta acima do título (contexto da área). */
  eyebrow?: string;
  title: string;
  description?: string;
  toolbar?: ReactNode;
  /** `split`: título e toolbar lado a lado em ecrã largo. `stack`: bloco único (menos “dashboard enterprise”). */
  layout?: 'split' | 'stack';
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
  quickLinks,
  className,
}: PageHeaderProps) {
  const rootClass = [
    'page-header',
    layout === 'split' ? 'page-header--split' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <header className={rootClass}>
      <div className="page-header__lead">
        {eyebrow ? <span className="page-kicker">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {quickLinks && quickLinks.length > 0 ? (
          <nav className="page-header__quick" aria-label="Atalhos da página">
            <ul className="page-header__quick-nav">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
      {toolbar ? <div className="page-header__toolbar">{toolbar}</div> : null}
    </header>
  );
}
