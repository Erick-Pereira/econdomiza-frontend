import type { ReactNode } from 'react';
import { cn, transitionInteractiveClass } from '../../lib/cn';

export type BadgeVariant = 'ok' | 'warn' | 'danger' | 'neutral' | 'error' | 'warning';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  ok: 'op-badge op-badge--ok',
  warn: 'op-badge op-badge--warn',
  warning: 'op-badge op-badge--warning',
  danger: 'op-badge op-badge--danger',
  error: 'op-badge op-badge--error',
  neutral: 'op-badge op-badge--neutral',
};

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
}

export function Badge({ children, variant = 'neutral', className, title }: BadgeProps) {
  return (
    <span className={cn(VARIANT_CLASS[variant], transitionInteractiveClass, className)} title={title}>
      {children}
    </span>
  );
}
