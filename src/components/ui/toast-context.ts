'use client';

import { createContext } from 'react';
import type { ToastProps } from './Toast';

export type ToastContextValue = {
  add: (message: string, type?: ToastProps['type']) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
