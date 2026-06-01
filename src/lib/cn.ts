import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Mescla classes Tailwind com resolução de conflitos (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Estilos de foco acessível — WCAG; usar em inputs, botões e controles interativos. */
export const focusRingClass =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';

/** Transição padrão para micro-interações (:hover, :focus-visible, :active). */
export const transitionInteractiveClass = 'transition-all duration-200 ease-in-out';
