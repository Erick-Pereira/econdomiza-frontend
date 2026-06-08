import type { ReactNode } from 'react';
import { cn, transitionInteractiveClass } from '../../lib/cn';

export type BadgeVariant = 'ok' | 'warn' | 'danger' | 'neutral' | 'error' | 'warning';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  ok: 'bg-status-success/15 text-status-success border border-status-success/30',
  warn: 'bg-status-warning/15 text-status-warning border border-status-warning/30',
  warning: 'bg-status-warning/15 text-status-warning border border-status-warning/30',
  danger: 'bg-status-error/15 text-status-error border border-status-error/30',
  error: 'bg-status-error/15 text-status-error border border-status-error/30',
  neutral: 'bg-surface-muted text-text-muted border border-surface-border',
};

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
}

export function Badge({ children, variant = 'neutral', className, title }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wide',
        VARIANT_CLASS[variant],
        transitionInteractiveClass,
        className
      )}
      title={title}
    >
      {children}
    </span>
  );
}
